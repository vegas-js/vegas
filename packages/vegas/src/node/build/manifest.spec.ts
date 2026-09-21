import { describe, expect, test } from "vitest";

import type { AppsScriptManifest } from "../../shared/config";
import { createAppsScriptManifestArtifact } from "./manifest";

describe("createAppsScriptManifestArtifact", () => {
  test("create manifest artifact for web app", () => {
    const manifest: AppsScriptManifest = {
      dependencies: {},
      exceptionLogging: "STACKDRIVER",
      runtimeVersion: "V8",
      oauthScopes: [],
      timeZone: "UTC",
      urlFetchWhitelist: ["https://example.com/api/"],
      webapp: {
        access: "ANYONE",
        executeAs: "USER_DEPLOYING",
      },
    };

    const artifact = createAppsScriptManifestArtifact(manifest, true);

    expect(artifact.path).toBe("appsscript.json");
    expect(typeof artifact.content).toBe("string");

    if (typeof artifact.content !== "string") {
      throw new Error("Expected text manifest artifact");
    }

    expect(JSON.parse(artifact.content)).toStrictEqual(manifest);
  });

  test("remove webapp config for non-web app", () => {
    const manifest: AppsScriptManifest = {
      runtimeVersion: "V8",
      timeZone: "UTC",
      webapp: {
        access: "ANYONE",
        executeAs: "USER_DEPLOYING",
      },
    };

    const artifact = createAppsScriptManifestArtifact(manifest, false);

    expect(JSON.parse(artifact.content as string)).toStrictEqual({
      runtimeVersion: "V8",
      timeZone: "UTC",
    });
  });

  test("does not mutate source manifest", () => {
    const manifest: AppsScriptManifest = {
      runtimeVersion: "V8",
      webapp: {
        access: "MYSELF",
        executeAs: "USER_ACCESSING",
      },
    };

    const original = structuredClone(manifest);
    createAppsScriptManifestArtifact(manifest, false);

    expect(manifest).toStrictEqual(original);
  });
});
