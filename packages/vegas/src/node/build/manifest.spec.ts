import { describe, expect, test } from "vitest";

import type { GASManifest } from "../../shared/config";
import { createGASManifestArtifact } from "./manifest";

describe("createGASManifestArtifact", () => {
  test("create manifest artifact for web app", () => {
    const manifest: GASManifest = {
      dependencies: {},
      exceptionLogging: "STACKDRIVER",
      runtimeVersion: "V8",
      oauthScopes: [],
      timeZone: "UTC",
      webapp: {
        access: "ANYONE",
        executeAs: "USER_DEPLOYING",
      },
    };

    const artifact = createGASManifestArtifact(manifest, true);

    expect(artifact.path).toBe("appsscript.json");
    expect(typeof artifact.content).toBe("string");

    if (typeof artifact.content !== "string") {
      throw new Error("Expected text manifest artifact");
    }

    expect(JSON.parse(artifact.content)).toStrictEqual(manifest);
  });

  test("remove webapp config for non-web app", () => {
    const manifest: GASManifest = {
      runtimeVersion: "V8",
      timeZone: "UTC",
      webapp: {
        access: "ANYONE",
        executeAs: "USER_DEPLOYING",
      },
    };

    const artifact = createGASManifestArtifact(manifest, false);

    expect(JSON.parse(artifact.content as string)).toStrictEqual({
      runtimeVersion: "V8",
      timeZone: "UTC",
    });
  });

  test("does not mutate source manifest", () => {
    const manifest: GASManifest = {
      runtimeVersion: "V8",
      webapp: {
        access: "MYSELF",
        executeAs: "USER_ACCESSING",
      },
    };

    const original = structuredClone(manifest);
    createGASManifestArtifact(manifest, false);

    expect(manifest).toStrictEqual(original);
  });
});
