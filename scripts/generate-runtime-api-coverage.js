import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const VEGAS_ROOT = path.join(ROOT, "packages", "vegas");
const RUNTIME_ROOT = path.join(VEGAS_ROOT, "src", "node", "runtime");
const RUNTIME_GLOBALS_PATH = path.join(RUNTIME_ROOT, "runtime-globals.ts");
const OUTPUT_PATH = path.join(ROOT, "docs", "guide", "runtime-api-coverage.md");
const PNPM = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const API_SURFACES = {
  DriveApp: [
    ["DriveApp", "drive-objects.ts", "DriveApp"],
    ["File", "drive-objects.ts", "DriveFile"],
    ["Folder", "drive-objects.ts", "DriveFolder"],
    ["FileIterator", "drive-objects.ts", "DriveFileIterator"],
    ["FolderIterator", "drive-objects.ts", "DriveFolderIterator"],
  ],
  SpreadsheetApp: [
    ["SpreadsheetApp", "spreadsheet-objects.ts", "SpreadsheetApp"],
    ["Spreadsheet", "spreadsheet-objects.ts", "Spreadsheet"],
    ["Sheet", "spreadsheet-objects.ts", "Sheet"],
    ["Range", "spreadsheet-objects.ts", "Range"],
  ],
  UrlFetchApp: [
    ["UrlFetchApp", "url-fetch-app.ts", "UrlFetchApp"],
    ["HTTPResponse", "url-fetch-http-response.ts", "HTTPResponse"],
  ],
  Utilities: [["Utilities", "utilities.ts", "Utilities"]],
  HtmlService: [
    ["HtmlService", "html-service.ts", "HtmlService"],
    ["HtmlOutput", "html-output.ts", "HtmlOutput"],
  ],
  Logger: [["Logger", "logging.ts", "Logger"]],
  Session: [
    ["Session", "session-objects.ts", "Session"],
    ["User", "session-objects.ts", "User"],
  ],
  console: [["Console", "logging.ts", "AppsScriptConsole"]],
  CacheService: [
    ["CacheService", "cache-objects.ts", "CacheService"],
    ["Cache", "cache-objects.ts", "Cache"],
  ],
  LockService: [
    ["LockService", "lock-objects.ts", "LockService"],
    ["Lock", "lock-objects.ts", "Lock"],
  ],
  PropertiesService: [
    ["PropertiesService", "properties-objects.ts", "PropertiesService"],
    ["Properties", "properties-objects.ts", "Properties"],
  ],
};

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractRuntimeGlobals(source) {
  const start = source.indexOf("  return {");
  const end = source.indexOf("\n  };", start);

  if (start < 0 || end < 0) {
    throw new Error("Could not locate createRuntimeGlobals return object.");
  }

  const globals = [];
  const lines = source.slice(start, end).split(/\r?\n/).slice(1);

  for (const line of lines) {
    const match = /^    ([A-Za-z_$][\w$]*):\s*(.+)$/.exec(line);

    if (!match) {
      continue;
    }

    const expression = match[2].replace(/,\s*(?:\/\/.*)?$/, "").trim();

    globals.push({
      name: match[1],
      implemented: expression !== "undefined",
    });
  }

  return globals;
}

export function extractInterfaceMethodNames(source, interfaceName) {
  const lines = source.split(/\r?\n/);
  const startPattern = new RegExp(
    `^(\\s*)interface\\s+${escapeRegExp(interfaceName)}(?:\\s+extends\\s+[^\\{]+)?\\s*\\{\\s*$`,
  );
  let startIndex = -1;
  let indent = "";

  for (let index = 0; index < lines.length; index += 1) {
    const match = startPattern.exec(lines[index]);

    if (match) {
      startIndex = index;
      indent = match[1];
      break;
    }
  }

  if (startIndex < 0) {
    const nonInterfacePattern = new RegExp(
      `^\\s*(?:enum|type|class)\\s+${escapeRegExp(interfaceName)}\\b`,
      "m",
    );

    return nonInterfacePattern.test(source) ? [] : null;
  }

  const closingPattern = new RegExp(`^${escapeRegExp(indent)}\\}\\s*$`);
  const methods = [];
  const seen = new Set();

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];

    if (closingPattern.test(line)) {
      return methods;
    }

    const method = /^\s*(?:\/\*\*.*\*\/\s*)?([A-Za-z_$][\w$]*)\s*(?:<[^>]+>)?\s*\(/.exec(line);

    if (method && !seen.has(method[1])) {
      seen.add(method[1]);
      methods.push(method[1]);
    }
  }

  throw new Error(`Could not find closing brace for interface ${interfaceName}.`);
}

export function extractClassMethodNames(source, className) {
  const lines = source.split(/\r?\n/);
  const startPattern = new RegExp(`^export class ${escapeRegExp(className)}\\b.*\\{\\s*$`);
  const startIndex = lines.findIndex((line) => startPattern.test(line));

  if (startIndex < 0) {
    throw new Error(`Could not find Runtime class ${className}.`);
  }

  const methods = [];
  const seen = new Set();

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];

    if (/^}\s*$/.test(line)) {
      return methods;
    }

    const method = /^  (?:async\s+)?([A-Za-z_$][\w$]*)\s*(?:<[^>]+>)?\s*\(/.exec(line);

    if (!method || method[1] === "constructor" || seen.has(method[1])) {
      continue;
    }

    seen.add(method[1]);
    methods.push(method[1]);
  }

  throw new Error(`Could not find closing brace for Runtime class ${className}.`);
}

function loadTypeSources(typeRoot) {
  const sources = new Map();
  const pending = ["index.d.ts"];

  while (pending.length > 0) {
    const relativePath = pending.shift();

    if (sources.has(relativePath)) {
      continue;
    }

    const absolutePath = path.join(typeRoot, relativePath);
    const source = fs.readFileSync(absolutePath, "utf8");
    sources.set(relativePath, source);

    for (const match of source.matchAll(/<reference path="([^"]+)"/g)) {
      const referenced = path.normalize(path.join(path.dirname(relativePath), match[1]));

      if (!referenced.startsWith("..")) {
        pending.push(referenced);
      }
    }
  }

  return sources;
}

function collectGlobalDeclarations(typeSources) {
  const globals = new Map();

  for (const [relativePath, source] of typeSources) {
    for (const match of source.matchAll(/^declare var\s+([A-Za-z_$][\w$]*)\s*:\s*([^;]+);/gm)) {
      globals.set(match[1], {
        typeReference: match[2].trim(),
        source,
        relativePath,
      });
    }
  }

  return globals;
}

export function extractInterfaceName(typeReference) {
  const candidates = typeReference
    .split("|")
    .map((candidate) => candidate.trim())
    .filter((candidate) => candidate !== "undefined" && candidate !== "null");

  if (candidates.length !== 1) {
    return null;
  }

  return candidates[0]
    .replace(/^typeof\s+/, "")
    .split(".")
    .at(-1);
}

function formatMissing(methods, prefix = "") {
  if (methods.length === 0) {
    return "—";
  }

  return methods.map((method) => `\`${prefix}${method}()\``).join("<br>");
}

function percentage(implemented, total) {
  if (total === 0) {
    return "—";
  }

  return `${((implemented / total) * 100).toFixed(1)}%`;
}

function buildRow(global, declaration, runtimeMethods) {
  if (!declaration) {
    return {
      name: global.name,
      implemented: null,
      total: null,
      percentage: "—",
      missing: "Not declared by installed `@types/google-apps-script`",
    };
  }

  const interfaceName = extractInterfaceName(declaration.typeReference);

  if (interfaceName === null) {
    return {
      name: global.name,
      implemented: null,
      total: null,
      percentage: "—",
      missing: `Could not resolve \`${declaration.typeReference.replaceAll("|", "\\|")}\` as a single method interface`,
    };
  }

  const officialMethods = extractInterfaceMethodNames(declaration.source, interfaceName);

  if (officialMethods === null) {
    return {
      name: global.name,
      implemented: null,
      total: null,
      percentage: "—",
      missing: `Could not resolve \`${declaration.typeReference}\` as a method interface`,
    };
  }

  const runtimeSet = new Set(runtimeMethods);
  const implementedMethods = officialMethods.filter((method) => runtimeSet.has(method));
  const missingMethods = officialMethods.filter((method) => !runtimeSet.has(method));

  return {
    name: global.name,
    implemented: implementedMethods.length,
    total: officialMethods.length,
    percentage: percentage(implementedMethods.length, officialMethods.length),
    missing: formatMissing(missingMethods),
  };
}

function loadRuntimeMethods(global) {
  if (!global.implemented) {
    return [];
  }

  const surfaces = API_SURFACES[global.name];

  if (!surfaces) {
    throw new Error(
      `Runtime global ${global.name} is implemented but has no API_SURFACES mapping. ` +
        "Add the implementation class so coverage can be measured.",
    );
  }

  const [, relativePath, className] = surfaces[0];
  const source = fs.readFileSync(path.join(RUNTIME_ROOT, relativePath), "utf8");
  return extractClassMethodNames(source, className);
}

function buildDetailSections(runtimeGlobals, declarations) {
  const sections = [];

  for (const global of runtimeGlobals) {
    if (!global.implemented) {
      continue;
    }

    const surfaces = API_SURFACES[global.name];
    const declaration = declarations.get(global.name);

    if (!surfaces || !declaration) {
      continue;
    }

    const rows = [];

    for (const [interfaceName, relativePath, className] of surfaces) {
      const officialMethods = extractInterfaceMethodNames(declaration.source, interfaceName);

      if (officialMethods === null) {
        continue;
      }

      const runtimeSource = fs.readFileSync(path.join(RUNTIME_ROOT, relativePath), "utf8");
      const runtimeMethods = new Set(extractClassMethodNames(runtimeSource, className));
      const implemented = officialMethods.filter((method) => runtimeMethods.has(method));
      const missing = officialMethods.filter((method) => !runtimeMethods.has(method));

      rows.push({
        interfaceName,
        implemented: implemented.length,
        total: officialMethods.length,
        percentage: percentage(implemented.length, officialMethods.length),
        missing: formatMissing(missing),
      });
    }

    if (rows.length > 0) {
      sections.push({ name: global.name, rows });
    }
  }

  return sections;
}

export function renderCoverageMarkdown({ version, runtimeGlobals, declarations }) {
  const rows = runtimeGlobals.map((global) =>
    buildRow(global, declarations.get(global.name), loadRuntimeMethods(global)),
  );
  const measurableRows = rows.filter((row) => row.total !== null && row.total > 0);
  const implemented = measurableRows.reduce((sum, row) => sum + row.implemented, 0);
  const total = measurableRows.reduce((sum, row) => sum + row.total, 0);
  const details = buildDetailSections(runtimeGlobals, declarations);
  const lines = [
    "<!-- Generated by `pnpm docs:api-coverage`. Do not edit manually. -->",
    "",
    "# Runtime API coverage",
    "",
    "This page is generated from the installed `@types/google-apps-script` declarations and the Vegas Runtime source.",
    "",
    `- Google API declarations: \`@types/google-apps-script@${version}\``,
    "- Global implementation inventory: `packages/vegas/src/node/runtime/runtime-globals.ts`",
    "- Coverage unit: unique method names (overloads count once); properties and enum values are not counted.",
    "- Deprecated methods remain in the denominator while they are present in the installed type declarations.",
    "- The global summary measures methods declared directly on each Global Object interface.",
    "- Returned Runtime objects such as `Spreadsheet`, `Sheet`, and `Range` are shown separately below when Vegas has an explicit implementation mapping.",
    "",
    `Measured Global Object method coverage: **${implemented} / ${total} (${percentage(implemented, total)})**`,
    "",
    "## Global Objects",
    "",
    "| API (Global Object) | Coverage | Coverage (%) | Unimplemented API (methods) |",
    "| --- | ---: | ---: | --- |",
  ];

  for (const row of rows) {
    const coverage = row.total === null ? "—" : `${row.implemented} / ${row.total}`;
    lines.push(`| \`${row.name}\` | ${coverage} | ${row.percentage} | ${row.missing} |`);
  }

  lines.push("", "## Modeled Runtime objects", "");
  lines.push(
    "These detail tables cover returned object types that already have a Vegas Runtime class. They are intentionally separate from the Global Object summary so the meaning of the headline coverage remains stable.",
    "",
  );

  for (const section of details) {
    lines.push(`### ${section.name}`, "");
    lines.push("| Object type | Coverage | Coverage (%) | Unimplemented API (methods) |");
    lines.push("| --- | ---: | ---: | --- |");

    for (const row of section.rows) {
      lines.push(
        `| \`${row.interfaceName}\` | ${row.implemented} / ${row.total} | ${row.percentage} | ${row.missing} |`,
      );
    }

    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function resolveTypesRoot() {
  const requireFromVegas = createRequire(path.join(VEGAS_ROOT, "package.json"));
  return path.dirname(requireFromVegas.resolve("@types/google-apps-script/package.json"));
}

function formatGeneratedMarkdown(source) {
  const result = spawnSync(PNPM, ["exec", "oxfmt", "--stdin-filepath", OUTPUT_PATH], {
    cwd: ROOT,
    input: source,
    encoding: "utf8",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      ["Failed to format Runtime API coverage documentation.", result.stdout, result.stderr]
        .filter(Boolean)
        .join("\n"),
    );
  }

  return result.stdout;
}

function generate() {
  const typesRoot = resolveTypesRoot();
  const packageJson = JSON.parse(fs.readFileSync(path.join(typesRoot, "package.json"), "utf8"));
  const typeSources = loadTypeSources(typesRoot);
  const declarations = collectGlobalDeclarations(typeSources);
  const runtimeGlobals = extractRuntimeGlobals(fs.readFileSync(RUNTIME_GLOBALS_PATH, "utf8"));

  const markdown = renderCoverageMarkdown({
    version: packageJson.version,
    runtimeGlobals,
    declarations,
  });

  return formatGeneratedMarkdown(markdown);
}

function main() {
  const generated = generate();
  const check = process.argv.includes("--check");

  if (check) {
    if (!fs.existsSync(OUTPUT_PATH) || fs.readFileSync(OUTPUT_PATH, "utf8") !== generated) {
      console.error("Runtime API coverage documentation is stale.");
      console.error("Run `pnpm docs:api-coverage` and commit the generated Markdown.");
      process.exitCode = 1;
      return;
    }

    console.log("Runtime API coverage documentation is up to date.");
    return;
  }

  fs.writeFileSync(OUTPUT_PATH, generated);
  console.log(`Generated ${path.relative(ROOT, OUTPUT_PATH)}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  main();
}
