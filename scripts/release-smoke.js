import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const VEGAS_ROOT = path.join(ROOT, "packages", "vegas");

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

    run(pnpm, ["add", "--offline", "--ignore-scripts", "--no-lockfile", tarballPath], {
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

    console.log(`@vegasjs/vegas ${packageJson.version} release smoke passed`);
  } finally {
    fs.rmSync(tempRoot, {
      recursive: true,
      force: true,
    });
  }
}

smokeVegasPackage();
