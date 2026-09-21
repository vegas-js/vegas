import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const VEGAS_ROOT = path.join(ROOT, "packages", "vegas");
const CREATE_VEGAS_ROOT = path.join(ROOT, "packages", "create-vegas");
const VANILLA_TEMPLATE_ROOT = path.join(CREATE_VEGAS_ROOT, "template-vanilla");

const CREATE_VEGAS_TEMPLATE_CASES = [
  ["template-vanilla", "src/client/index.html"],
  ["template-apps-script-scriptlet", "src/client/index.html"],
  ["template-lit", "src/client/index.html"],
  ["template-react", "src/client/main.tsx"],
  ["template-preact", "src/client/main.tsx"],
  ["template-vue", "src/client/main.tsx"],
  ["template-svelte", "src/client/main.ts"],
  ["template-solid", "src/client/main.tsx"],
];

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      [`Command failed: ${command} ${args.join(" ")}`, result.stdout, result.stderr]
        .filter(Boolean)
        .join("\n"),
    );
  }

  return result.stdout ?? "";
}

function assertFile(root, relativePath) {
  const filePath = path.join(root, relativePath);

  assert.equal(fs.existsSync(filePath), true, `Expected packed package file: ${relativePath}`);
}

function assertPackedLicense(root, requiredSections) {
  const relativePath = "LICENSE.md";

  assertFile(root, relativePath);

  const licenseText = fs.readFileSync(path.join(root, relativePath), "utf8");
  const coreLicense = fs.readFileSync(path.join(ROOT, "LICENSE"), "utf8").trim();

  assert.equal(
    licenseText.includes(coreLicense),
    true,
    "Expected packed package license to include the Vegas core license",
  );

  for (const section of requiredSections) {
    assert.equal(
      licenseText.includes(section),
      true,
      `Expected packed package license section: ${section}`,
    );
  }
}

function smokeVanillaConsumer(tarballPath, tempRoot) {
  const consumerRoot = path.join(tempRoot, "vanilla-consumer");

  fs.cpSync(VANILLA_TEMPLATE_ROOT, consumerRoot, {
    recursive: true,
  });

  const packageJsonPath = path.join(consumerRoot, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

  const tarballSpecifier = `file:${path
    .relative(consumerRoot, tarballPath)
    .split(path.sep)
    .join("/")}`;

  packageJson.name = "vegas-release-smoke-consumer";
  packageJson.devDependencies["@vegasjs/vegas"] = tarballSpecifier;

  fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

  fs.writeFileSync(
    path.join(consumerRoot, "config-surface-smoke.ts"),
    `
      import {
        defineConfig,
        type AppsScriptConfig,
        type AppsScriptManifest,
        type UserConfig,
      } from "@vegasjs/vegas";

      const manifest: AppsScriptManifest = {
        runtimeVersion: "V8",
      };

      const appsScript: AppsScriptConfig = {
        scriptId: "",
        manifest,
      };

      const config: UserConfig = {
        appType: "spa",
        appsScript,
      };

      const defined = defineConfig(config);

      void defined;
    `,
  );

  fs.writeFileSync(
    path.join(consumerRoot, "tsconfig.release-smoke.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2023",
          module: "ESNext",
          moduleResolution: "bundler",
          strict: true,
          noEmit: true,
          skipLibCheck: true,
        },
        files: ["config-surface-smoke.ts"],
      },
      null,
      2,
    ),
  );

  fs.writeFileSync(
    path.join(consumerRoot, "tsconfig.node16-release-smoke.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2023",
          module: "Node16",
          moduleResolution: "Node16",
          lib: ["ES2023", "DOM", "DOM.Iterable"],
          strict: true,
          noEmit: true,
          skipLibCheck: false,
        },
        files: ["src/client/release-smoke.ts"],
      },
      null,
      2,
    ),
  );

  const clientSmokePath = path.join(consumerRoot, "src", "client", "release-smoke.ts");

  fs.writeFileSync(
    clientSmokePath,
    `
      import {
        createServerFunctionClient,
        type ServerFunctionClient,
      } from "@vegasjs/vegas/client";

      interface ServerApi {
        greet(name: string): string;
        hidden_(): string;
        value: string;
      }

      const client: ServerFunctionClient<ServerApi> =
        createServerFunctionClient<ServerApi>();

      const greeting: Promise<string> = client.greet("Vegas");
      void greeting;

      const endpoint: string = import.meta.env.ENDPOINT_URL;
      void endpoint;

      google.script.run.withSuccessHandler(() => {});

      // @ts-expect-error server functions ending in "_" are private
      client.hidden_();

      // @ts-expect-error non-functions are not exposed
      client.value;
    `,
  );

  const serverSmokePath = path.join(consumerRoot, "src", "server", "release-smoke.ts");

  fs.writeFileSync(
    serverSmokePath,
    `
      const dev: boolean = import.meta.env.DEV;
      const mode: string = import.meta.env.MODE;

      console.log(dev, mode);

      const output = HtmlService.createHtmlOutput("release-smoke");
      output.setTitle("Vegas release smoke");
    `,
  );

  run(pnpm, ["install", "--ignore-scripts", "--no-lockfile"], {
    cwd: consumerRoot,
  });

  run(pnpm, ["exec", "tsc", "-p", "tsconfig.release-smoke.json"], {
    cwd: consumerRoot,
  });

  run(pnpm, ["exec", "tsc", "-p", "tsconfig.node16-release-smoke.json"], {
    cwd: consumerRoot,
  });

  run(pnpm, ["exec", "tsc", "-p", "tsconfig.client.json"], {
    cwd: consumerRoot,
  });

  run(pnpm, ["exec", "tsc", "-p", "tsconfig.server.json"], {
    cwd: consumerRoot,
  });

  fs.rmSync(clientSmokePath);
  fs.rmSync(serverSmokePath);
  fs.rmSync(path.join(consumerRoot, "config-surface-smoke.ts"));
  fs.rmSync(path.join(consumerRoot, "tsconfig.release-smoke.json"));
  fs.rmSync(path.join(consumerRoot, "tsconfig.node16-release-smoke.json"));

  run(pnpm, ["run", "build"], {
    cwd: consumerRoot,
  });

  for (const file of ["dist/Code.js", "dist/index.html", "dist/appsscript.json"]) {
    assertFile(consumerRoot, file);
  }

  console.log("Vanilla packed-package consumer smoke passed");
}

function smokeCreateVegasPackage() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "create-vegas-release-smoke-"));

  try {
    const tarballPath = path.join(tempRoot, "create-vegas.tgz");
    const consumerRoot = path.join(tempRoot, "consumer");

    fs.mkdirSync(consumerRoot);

    run(pnpm, ["pack", "--out", tarballPath], {
      cwd: CREATE_VEGAS_ROOT,
    });

    assert.equal(fs.existsSync(tarballPath), true, "Expected pnpm pack to create create-vegas.tgz");

    fs.writeFileSync(
      path.join(consumerRoot, "package.json"),
      JSON.stringify(
        {
          name: "create-vegas-release-smoke",
          private: true,
          type: "module",
        },
        null,
        2,
      ),
    );

    run(pnpm, ["add", "--prefer-offline", "--ignore-scripts", "--no-lockfile", tarballPath], {
      cwd: consumerRoot,
    });

    const installedRoot = path.join(consumerRoot, "node_modules", "create-vegas");

    assertFile(installedRoot, "package.json");
    assertFile(installedRoot, "dist/create-vegas.js");

    const packageJson = JSON.parse(
      fs.readFileSync(path.join(installedRoot, "package.json"), "utf8"),
    );

    assert.equal(packageJson.name, "create-vegas");
    assert.equal(packageJson.license, "MIT");

    assertPackedLicense(installedRoot, [
      '# License of the files in the directories starting with "template-" in create-vegas',
      "CC0 1.0 Universal",
      "# Bundled Third-Party Licenses",
    ]);

    assert.deepEqual(packageJson.bin, {
      "create-vegas": "dist/create-vegas.js",
    });

    for (const [templateName, clientEntry] of CREATE_VEGAS_TEMPLATE_CASES) {
      for (const relativePath of [
        "package.json",
        "_gitignore",
        "vegas.config.ts",
        "tsconfig.client.json",
        "tsconfig.server.json",
        clientEntry,
        "src/server/Code.ts",
      ]) {
        assertFile(installedRoot, path.join(templateName, relativePath));
      }
    }

    const helpOutput = run(pnpm, ["exec", "create-vegas", "--help"], {
      cwd: consumerRoot,
      capture: true,
    });

    assert.equal(
      helpOutput.includes("create-vegas"),
      true,
      "Expected create-vegas CLI help output",
    );

    for (const [templateName] of CREATE_VEGAS_TEMPLATE_CASES) {
      assert.equal(
        helpOutput.includes(templateName),
        true,
        `Expected create-vegas help to list ${templateName}`,
      );
    }

    console.log(`create-vegas ${packageJson.version} release smoke passed`);
  } finally {
    fs.rmSync(tempRoot, {
      recursive: true,
      force: true,
    });
  }
}

function smokeVegasPackage() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-release-smoke-"));

  try {
    const tarballPath = path.join(tempRoot, "vegas.tgz");
    const consumerRoot = path.join(tempRoot, "consumer");

    fs.mkdirSync(consumerRoot);

    run(pnpm, ["pack", "--out", tarballPath], { cwd: VEGAS_ROOT });

    assert.equal(fs.existsSync(tarballPath), true, "Expected pnpm pack to create vegas.tgz");

    fs.writeFileSync(
      path.join(consumerRoot, "package.json"),
      JSON.stringify(
        {
          name: "vegas-release-smoke",
          private: true,
          type: "module",
        },
        null,
        2,
      ),
    );

    run(pnpm, ["add", "--prefer-offline", "--ignore-scripts", "--no-lockfile", tarballPath], {
      cwd: consumerRoot,
    });

    const installedRoot = path.join(consumerRoot, "node_modules", "@vegasjs", "vegas");

    for (const file of [
      "package.json",
      "client.d.ts",
      "server.d.ts",
      "types/google.d.ts",
      "types/import-meta.d.ts",
      "dist/config.js",
      "dist/config.d.ts",
      "dist/client.js",
      "dist/client.d.ts",
      "dist/vegas.js",
      "dist/worker.js",
      "dist/webapp-bridge.js",
    ]) {
      assertFile(installedRoot, file);
    }

    const packageJson = JSON.parse(
      fs.readFileSync(path.join(installedRoot, "package.json"), "utf8"),
    );

    assert.equal(packageJson.license, "MIT");

    assertPackedLicense(installedRoot, [
      "# Licenses of bundled dependencies",
      "# Bundled Third-Party Licenses",
    ]);

    assert.deepEqual(packageJson.exports["."], {
      types: "./dist/config.d.ts",
      import: "./dist/config.js",
    });

    assert.deepEqual(packageJson.exports["./client"], {
      types: "./client.d.ts",
      import: "./dist/client.js",
    });

    assert.deepEqual(packageJson.exports["./server"], {
      types: "./server.d.ts",
    });

    assert.deepEqual(packageJson.bin, {
      vegas: "dist/vegas.js",
    });

    const runtimeSmokePath = path.join(consumerRoot, "runtime-smoke.js");

    fs.writeFileSync(
      runtimeSmokePath,
      `
        import assert from "node:assert/strict";
        import * as vegas from "@vegasjs/vegas";
        import * as client from "@vegasjs/vegas/client";

        assert.equal(typeof vegas.defineConfig, "function");

        const config = { appType: "script" };
        assert.equal(vegas.defineConfig(config), config);

        assert.equal(
          typeof client.createServerFunctionClient,
          "function",
        );

        assert.equal("createGASClient" in vegas, false);
        assert.equal("createGASClient" in client, false);
        assert.equal("mockProperties" in vegas, false);
        assert.equal("mockSession" in vegas, false);
      `,
    );

    run(process.execPath, [runtimeSmokePath], {
      cwd: consumerRoot,
    });

    const versionOutput = run(pnpm, ["exec", "vegas", "--version"], {
      cwd: consumerRoot,
      capture: true,
    }).trim();

    const [cliVersion] = versionOutput.split(/\s+/);

    assert.equal(cliVersion, `vegas/${packageJson.version}`);

    smokeVanillaConsumer(tarballPath, tempRoot);

    console.log(`@vegasjs/vegas ${packageJson.version} release smoke passed`);
  } finally {
    fs.rmSync(tempRoot, {
      recursive: true,
      force: true,
    });
  }
}

smokeVegasPackage();
smokeCreateVegasPackage();
