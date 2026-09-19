import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const VEGAS_ROOT = path.join(ROOT, "packages", "vegas");
const RUNTIME_ROOT = path.join(VEGAS_ROOT, "src", "node", "runtime");
const RUNTIME_GLOBALS_PATH = path.join(RUNTIME_ROOT, "runtime-globals.ts");
const OUTPUT_PATH = path.join(ROOT, "docs", "guide", "runtime-api-coverage.md");
const SUPPLEMENT_PATH = path.join(ROOT, "scripts", "runtime-api-supplement.json");
const PNPM = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const STANDALONE_GLOBAL_ENUMS = new Set(["MimeType"]);

const API_SURFACES = {
  DriveApp: [
    ["DriveApp", "drive-app.ts", "DriveApp"],
    ["File", "drive-file.ts", "DriveFile"],
    ["Folder", "drive-folder.ts", "DriveFolder"],
    ["FileIterator", "drive-file-iterator.ts", "DriveFileIterator"],
    ["FolderIterator", "drive-folder-iterator.ts", "DriveFolderIterator"],
  ],
  SpreadsheetApp: [
    ["SpreadsheetApp", "spreadsheet-app.ts", "SpreadsheetApp"],
    ["Spreadsheet", "spreadsheet-spreadsheet.ts", "Spreadsheet"],
    ["Sheet", "spreadsheet-sheet.ts", "Sheet"],
    ["Range", "spreadsheet-range.ts", "Range"],
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
    ["CacheService", "cache-service.ts", "CacheService"],
    ["Cache", "cache.ts", "Cache"],
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

export function extractInterfaceEnumPropertyNames(source, interfaceName) {
  const enumNames = new Set(
    [...source.matchAll(/^\s*enum\s+([A-Za-z_$][\w$]*)\s*\{/gm)].map((match) => match[1]),
  );
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
    return null;
  }

  const closingPattern = new RegExp(`^${escapeRegExp(indent)}\\}\\s*$`);
  const properties = [];
  const seen = new Set();

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];

    if (closingPattern.test(line)) {
      return properties;
    }

    const property = /^\s*([A-Za-z_$][\w$]*)\s*:\s*typeof\s+([A-Za-z_$][\w$]*)\s*;/.exec(line);

    if (!property || !enumNames.has(property[2]) || seen.has(property[1])) {
      continue;
    }

    seen.add(property[1]);
    properties.push(property[1]);
  }

  throw new Error(`Could not find closing brace for interface ${interfaceName}.`);
}

export function hasEnumDeclaration(source, enumName) {
  return new RegExp(`^\\s*enum\\s+${escapeRegExp(enumName)}\\b`, "m").test(source);
}

export function isStandaloneGlobalEnum(name, declaration) {
  const interfaceName = extractInterfaceName(declaration.typeReference);

  if (interfaceName === null) {
    return false;
  }

  return hasEnumDeclaration(declaration.source, interfaceName) || STANDALONE_GLOBAL_ENUMS.has(name);
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

export function extractClassPropertyNames(source, className) {
  const lines = source.split(/\r?\n/);
  const startPattern = new RegExp(`^export class ${escapeRegExp(className)}\\b.*\\{\\s*$`);
  const startIndex = lines.findIndex((line) => startPattern.test(line));

  if (startIndex < 0) {
    throw new Error(`Could not find Runtime class ${className}.`);
  }

  const properties = [];
  const seen = new Set();

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];

    if (/^}\s*$/.test(line)) {
      return properties;
    }

    const property = /^  (?:readonly\s+)?([A-Za-z_$][\w$]*)\s*=/.exec(line);

    if (!property || seen.has(property[1])) {
      continue;
    }

    seen.add(property[1]);
    properties.push(property[1]);
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

export function validateRuntimeApiSupplement(supplement) {
  if (supplement.schemaVersion !== 1 || typeof supplement.globals !== "object") {
    throw new Error("Invalid Runtime API supplement schema.");
  }

  for (const [name, entry] of Object.entries(supplement.globals)) {
    if (entry.mode !== "augment" && entry.mode !== "complete") {
      throw new Error(`Invalid Runtime API supplement mode for ${name}.`);
    }

    if (
      !Array.isArray(entry.methods) ||
      entry.methods.some((method) => typeof method !== "string")
    ) {
      throw new Error(`Invalid Runtime API supplement methods for ${name}.`);
    }

    if (new Set(entry.methods).size !== entry.methods.length) {
      throw new Error(`Duplicate Runtime API supplement methods for ${name}.`);
    }

    const source = new URL(entry.source);

    if (source.protocol !== "https:" || source.hostname !== "developers.google.com") {
      throw new Error(`Runtime API supplement source for ${name} must use Google official docs.`);
    }
  }
}

export function mergeMethodSurface(methods, supplementalMethods = []) {
  return [...new Set([...methods, ...supplementalMethods])];
}

function resolveMethodSurface(globalName, declaration, supplement) {
  const entry = supplement.globals[globalName];

  if (!declaration) {
    return entry?.mode === "complete" ? [...entry.methods] : null;
  }

  if (entry?.mode === "complete") {
    throw new Error(
      `Runtime API supplement for ${globalName} is complete, but @types now declares the Global Object.`,
    );
  }

  const interfaceName = extractInterfaceName(declaration.typeReference);

  if (interfaceName === null) {
    return null;
  }

  const methods = extractInterfaceMethodNames(declaration.source, interfaceName);

  if (methods === null) {
    return null;
  }

  return mergeMethodSurface(methods, entry?.methods);
}

function formatNames(names) {
  if (names.length === 0) {
    return "—";
  }

  return names.map((name) => `\`${name}\``).join("<br>");
}

function percentage(implemented, total) {
  if (total === 0) {
    return "—";
  }

  return `${((implemented / total) * 100).toFixed(1)}%`;
}

function buildRow(global, declaration, runtimeMethods, supplement) {
  const officialMethods = resolveMethodSurface(global.name, declaration, supplement);

  if (officialMethods === null && !declaration) {
    return {
      name: global.name,
      implemented: null,
      total: null,
      percentage: "—",
      missing: "Not declared by installed `@types/google-apps-script`",
    };
  }

  if (officialMethods === null) {
    return {
      name: global.name,
      implemented: null,
      total: null,
      percentage: "—",
      missing: `Could not resolve \`${declaration.typeReference.replaceAll("|", "\\|")}\` as a method interface`,
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

function loadRuntimeProperties(global) {
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
  return extractClassPropertyNames(source, className);
}

function buildDetailSections(runtimeGlobals, declarations, supplement) {
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

    for (const [index, [interfaceName, relativePath, className]] of surfaces.entries()) {
      const declaredMethods = extractInterfaceMethodNames(declaration.source, interfaceName);

      if (declaredMethods === null) {
        continue;
      }

      const officialMethods =
        index === 0
          ? mergeMethodSurface(declaredMethods, supplement.globals[global.name]?.methods)
          : declaredMethods;
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

function buildEnumRows(runtimeGlobals, declarations) {
  const rows = [];

  for (const global of runtimeGlobals) {
    const declaration = declarations.get(global.name);

    if (!declaration) {
      continue;
    }

    const interfaceName = extractInterfaceName(declaration.typeReference);

    if (interfaceName === null || hasEnumDeclaration(declaration.source, interfaceName)) {
      continue;
    }

    const officialProperties = extractInterfaceEnumPropertyNames(declaration.source, interfaceName);

    if (!officialProperties || officialProperties.length === 0) {
      continue;
    }

    const runtimeProperties = new Set(loadRuntimeProperties(global));
    const implemented = officialProperties.filter((property) => runtimeProperties.has(property));
    const missing = officialProperties.filter((property) => !runtimeProperties.has(property));

    rows.push({
      name: global.name,
      implemented: implemented.length,
      total: officialProperties.length,
      percentage: percentage(implemented.length, officialProperties.length),
      missing: formatNames(missing),
    });
  }

  return rows;
}

function buildStandaloneEnumRows(runtimeGlobals, declarations) {
  const rows = [];

  for (const global of runtimeGlobals) {
    const declaration = declarations.get(global.name);

    if (!declaration) {
      continue;
    }

    if (!isStandaloneGlobalEnum(global.name, declaration)) {
      continue;
    }

    rows.push({
      name: global.name,
      implemented: global.implemented ? 1 : 0,
      total: 1,
      percentage: global.implemented ? "100.0%" : "0.0%",
    });
  }

  return rows;
}

export function renderCoverageMarkdown({ version, runtimeGlobals, declarations, supplement }) {
  const standaloneEnums = buildStandaloneEnumRows(runtimeGlobals, declarations);
  const standaloneEnumNames = new Set(standaloneEnums.map(({ name }) => name));
  const rows = runtimeGlobals
    .filter(
      (global) =>
        (declarations.has(global.name) || supplement.globals[global.name]?.mode === "complete") &&
        !standaloneEnumNames.has(global.name),
    )
    .map((global) =>
      buildRow(global, declarations.get(global.name), loadRuntimeMethods(global), supplement),
    );
  const methodRows = rows.filter((row) => row.total > 0);
  const nestedRows = rows.filter((row) => row.total === 0);
  const untrackedGlobals = runtimeGlobals.filter(
    (global) =>
      !declarations.has(global.name) && supplement.globals[global.name]?.mode !== "complete",
  );
  const supplementedGlobals = Object.entries(supplement.globals);
  const implemented = methodRows.reduce((sum, row) => sum + row.implemented, 0);
  const total = methodRows.reduce((sum, row) => sum + row.total, 0);
  const enumRows = buildEnumRows(runtimeGlobals, declarations);
  const implementedEnums = enumRows.reduce((sum, row) => sum + row.implemented, 0);
  const totalEnums = enumRows.reduce((sum, row) => sum + row.total, 0);
  const implementedStandaloneEnums = standaloneEnums.reduce((sum, row) => sum + row.implemented, 0);
  const totalStandaloneEnums = standaloneEnums.reduce((sum, row) => sum + row.total, 0);
  const details = buildDetailSections(runtimeGlobals, declarations, supplement);
  const lines = [
    "<!-- Generated by `pnpm docs:api-coverage`. Do not edit manually. -->",
    "",
    "# Runtime API coverage",
    "",
    "This page is generated from the installed `@types/google-apps-script` declarations and the Vegas Runtime source.",
    "",
    `- Google API declarations: \`@types/google-apps-script@${version}\``,
    "- Global implementation inventory: `packages/vegas/src/node/runtime/runtime-globals.ts`",
    "- Supplemental API declarations: `scripts/runtime-api-supplement.json`, sourced from Google official documentation.",
    "- Coverage unit: unique method names (overloads count once); properties and enum values are not counted.",
    "- Enum surface coverage is measured separately by enum properties exposed on Global Objects; enum members are not counted individually.",
    "- Standalone Global enums are measured separately from methods and service enum properties.",
    "- Global Objects absent from the installed `@types/google-apps-script` are excluded from numeric coverage and listed as untracked.",
    "- Declared Global Objects with no direct methods are excluded from method coverage until nested collection/resource APIs are measured recursively.",
    "- Deprecated methods remain in the denominator while they are present in the installed type declarations.",
    "- The global summary measures methods declared directly on each Global Object interface.",
    "- Returned Runtime objects such as `Spreadsheet`, `Sheet`, and `Range` are shown separately below when Vegas has an explicit implementation mapping.",
    "",
    `Measured Global Object method coverage: **${implemented} / ${total} (${percentage(implemented, total)})**`,
    "",
    "## Global Object methods",
    "",
    "| API (Global Object) | Coverage | Coverage (%) | Unimplemented API (methods) |",
    "| --- | ---: | ---: | --- |",
  ];

  for (const row of methodRows) {
    lines.push(
      `| \`${row.name}\` | ${row.implemented} / ${row.total} | ${row.percentage} | ${row.missing} |`,
    );
  }

  lines.push(
    "",
    `Measured Global Object enum surface coverage: **${implementedEnums} / ${totalEnums} (${percentage(implementedEnums, totalEnums)})**`,
    "",
    "## Global Object enums",
    "",
    "| API (Global Object) | Coverage | Coverage (%) | Unimplemented API (enums) |",
    "| --- | ---: | ---: | --- |",
  );

  for (const row of enumRows) {
    lines.push(
      `| \`${row.name}\` | ${row.implemented} / ${row.total} | ${row.percentage} | ${row.missing} |`,
    );
  }

  lines.push(
    "",
    `Measured standalone Global enum coverage: **${implementedStandaloneEnums} / ${totalStandaloneEnums} (${percentage(implementedStandaloneEnums, totalStandaloneEnums)})**`,
    "",
    "## Standalone Global enums",
    "",
    "| Global enum | Coverage | Coverage (%) |",
    "| --- | ---: | ---: |",
  );

  for (const row of standaloneEnums) {
    lines.push(`| \`${row.name}\` | ${row.implemented} / ${row.total} | ${row.percentage} |`);
  }

  lines.push(
    "",
    "## Supplemental API declarations",
    "",
    "These checked-in declarations cover API surface confirmed in Google official documentation but missing from the installed `@types/google-apps-script`. `augment` entries add missing members to an existing type surface. `complete` entries may be used only after the full Global Object surface has been audited.",
    "",
    "| API (Global Object) | Mode | Supplemental methods | Source |",
    "| --- | --- | --- | --- |",
  );

  for (const [name, entry] of supplementedGlobals) {
    lines.push(
      `| \`${name}\` | \`${entry.mode}\` | ${formatMissing(entry.methods)} | <${entry.source}> |`,
    );
  }

  lines.push(
    "",
    "## Declared nested APIs not yet measured",
    "",
    "These Global Objects are declared by the installed type package but expose no direct methods. Advanced services commonly expose nested collection/resource objects instead. They are excluded from the headline method coverage until recursive API measurement is added.",
    "",
    "| API (Global Object) | Vegas status |",
    "| --- | --- |",
  );

  for (const row of nestedRows) {
    const global = runtimeGlobals.find(({ name }) => name === row.name);
    lines.push(`| \`${row.name}\` | ${global?.implemented ? "Implemented" : "Not implemented"} |`);
  }

  lines.push(
    "",
    "## Untracked by installed @types",
    "",
    "These Global Objects exist in the Vegas Runtime inventory but are not declared by the installed `@types/google-apps-script`, and do not yet have a `complete` supplemental surface. They are excluded from numeric coverage. The coverage generator remains deterministic and does not fetch live documentation during CI.",
    "",
    "| API (Global Object) | Vegas status |",
    "| --- | --- |",
  );

  for (const global of untrackedGlobals) {
    lines.push(
      `| \`${global.name}\` | ${global.implemented ? "Implemented" : "Not implemented"} |`,
    );
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
  const supplement = JSON.parse(fs.readFileSync(SUPPLEMENT_PATH, "utf8"));

  validateRuntimeApiSupplement(supplement);

  const markdown = renderCoverageMarkdown({
    version: packageJson.version,
    runtimeGlobals,
    declarations,
    supplement,
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
