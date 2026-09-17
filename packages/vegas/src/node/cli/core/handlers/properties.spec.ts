import { describe, expect, test } from "vitest";

import { ArtifactStore } from "../../../build";
import type { ResolvedProject } from "../../../project";
import { InMemoryPropertiesStore, type InvocationScope } from "../../../runtime";
import { createServeContext } from "../context";
import { PropertiesHandler } from "./properties";

const project = {
  root: "/project",
  configFile: null,
  clientDir: "/project/src/client",
  serverDir: "/project/src/server",
  runtimeDataDir: "/project/runtime",
  outputDir: "/project/dist",
  appType: "spa",
  plugins: [],
  appsScript: {
    manifest: {},
  },
} satisfies ResolvedProject;

const invocationScope: InvocationScope = {
  scriptKey: "script-a",
  userKey: "user-a",
};

function createHandler() {
  const ctx = createServeContext(project, new ArtifactStore());
  const store = new InMemoryPropertiesStore();

  return {
    ctx,
    handler: new PropertiesHandler(store),
  };
}

// https://developers.google.com/apps-script/reference/properties/properties
describe("PropertiesHandler", () => {
  test("route script and user properties by invocation scope", async () => {
    const { ctx, handler } = createHandler();

    await handler.setProperty(
      ctx,
      {
        scope: "script",
        property: {
          key: "value",
          value: 1,
        },
      },
      invocationScope,
    );
    await handler.setProperty(
      ctx,
      {
        scope: "user",
        property: {
          key: "value",
          value: 2,
        },
      },
      invocationScope,
    );

    expect(await handler.getProperty(ctx, { scope: "script", key: "value" }, invocationScope)).toBe(
      "1",
    );
    expect(await handler.getProperty(ctx, { scope: "user", key: "value" }, invocationScope)).toBe(
      "2",
    );
  });

  test("merge, replace, and delete properties", async () => {
    const { ctx, handler } = createHandler();

    await handler.setProperties(
      ctx,
      {
        scope: "script",
        properties: {
          first: "one",
          keep: "keep",
        },
        deleteAllOthers: false,
      },
      invocationScope,
    );
    await handler.setProperties(
      ctx,
      {
        scope: "script",
        properties: {
          first: "updated",
          added: 3,
        },
        deleteAllOthers: false,
      },
      invocationScope,
    );

    expect(await handler.getProperties(ctx, { scope: "script" }, invocationScope)).toStrictEqual({
      first: "updated",
      keep: "keep",
      added: "3",
    });
    expect(await handler.getKeys(ctx, { scope: "script" }, invocationScope)).toStrictEqual([
      "first",
      "keep",
      "added",
    ]);

    await handler.setProperties(
      ctx,
      {
        scope: "script",
        properties: {
          replacement: "value",
        },
        deleteAllOthers: true,
      },
      invocationScope,
    );

    expect(await handler.getProperties(ctx, { scope: "script" }, invocationScope)).toStrictEqual({
      replacement: "value",
    });

    await handler.deleteProperty(
      ctx,
      {
        scope: "script",
        key: "replacement",
      },
      invocationScope,
    );

    expect(
      await handler.getProperty(ctx, { scope: "script", key: "replacement" }, invocationScope),
    ).toBeNull();

    await handler.setProperty(
      ctx,
      {
        scope: "script",
        property: {
          key: "temporary",
          value: "value",
        },
      },
      invocationScope,
    );
    await handler.deleteAllProperties(ctx, { scope: "script" }, invocationScope);

    expect(await handler.getProperties(ctx, { scope: "script" }, invocationScope)).toStrictEqual(
      {},
    );
  });

  test("treat missing document context as unavailable", async () => {
    const { ctx, handler } = createHandler();

    await handler.setProperty(
      ctx,
      {
        scope: "document",
        property: {
          key: "value",
          value: "ignored",
        },
      },
      invocationScope,
    );

    expect(
      await handler.getProperty(ctx, { scope: "document", key: "value" }, invocationScope),
    ).toBeNull();
    expect(await handler.getProperties(ctx, { scope: "document" }, invocationScope)).toStrictEqual(
      {},
    );
    expect(await handler.getKeys(ctx, { scope: "document" }, invocationScope)).toStrictEqual([]);
  });
});
