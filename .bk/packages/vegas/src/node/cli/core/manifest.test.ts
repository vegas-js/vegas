import path from "node:path";

import { fs, vol } from "memfs";
import { beforeEach, expect, test, vi } from "vitest";

import type { GASManifest } from "../../../shared/config";
import { generateGASManifest } from "./manifest";

vi.mock("node:fs", () => {
  return {
    default: fs,
  };
});

const outputDir = path.join(process.cwd(), "dist");
const manifestPath = path.join(outputDir, "appsscript.json");

beforeEach(() => {
  vol.reset();
  vol.mkdirSync(outputDir, { recursive: true });
});

test("the GAS manifest file is output to the specified directory.", () => {
  const gasManifest: GASManifest = {};
  generateGASManifest(outputDir, gasManifest);

  expect(fs.existsSync(manifestPath)).toBe(true);
});

test("the settings you configured will be output exactly as they are.", () => {
  const gasManifest: GASManifest = {
    dependencies: {},
    exceptionLogging: "STACKDRIVER",
    runtimeVersion: "V8",
    oauthScopes: [],
    timeZone: "UTC",
    webapp: {
      access: "MYSELF",
      executeAs: "USER_ACCESSING",
    },
  };
  generateGASManifest(outputDir, gasManifest);
  const content = fs.readFileSync(manifestPath, "utf8").toString();
  const outputManifest = JSON.parse(content);

  expect(outputManifest).toStrictEqual(gasManifest);
});
