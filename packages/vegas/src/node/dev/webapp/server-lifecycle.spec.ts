import type { InlineConfig, ViteDevServer } from "vite";
import { describe, expect, test, vi } from "vitest";

import { WebAppServerLifecycle } from "./server-lifecycle";

function createServer(name: string, closed: string[], closeError?: Error) {
  const close = vi.fn(async () => {
    closed.push(name);

    if (closeError !== undefined) {
      throw closeError;
    }
  });

  return {
    server: {
      close,
    } as unknown as ViteDevServer,
    close,
  };
}

describe("WebAppServerLifecycle", () => {
  test("create servers and dispose them in reverse order", async () => {
    const closed: string[] = [];
    const first = createServer("first", closed);
    const second = createServer("second", closed);
    const created = [first.server, second.server];
    const createViteServer = vi.fn(async (_config?: InlineConfig) => {
      const server = created.shift();

      if (server === undefined) {
        throw new Error("Unexpected server creation.");
      }

      return server;
    });
    const lifecycle = new WebAppServerLifecycle(
      createViteServer as typeof import("vite").createServer,
    );

    await lifecycle.create({ mode: "development" });
    await lifecycle.create({ mode: "production" });
    await lifecycle.dispose();
    await lifecycle.dispose();

    expect(createViteServer).toHaveBeenCalledTimes(2);
    expect(closed).toStrictEqual(["second", "first"]);
    expect(first.close).toHaveBeenCalledOnce();
    expect(second.close).toHaveBeenCalledOnce();
  });

  test("close every server before reporting disposal errors", async () => {
    const closed: string[] = [];
    const firstError = new Error("first close failed");
    const secondError = new Error("second close failed");
    const first = createServer("first", closed, firstError);
    const second = createServer("second", closed, secondError);
    const created = [first.server, second.server];
    const lifecycle = new WebAppServerLifecycle((async () => {
      const server = created.shift();

      if (server === undefined) {
        throw new Error("Unexpected server creation.");
      }

      return server;
    }) as typeof import("vite").createServer);

    await lifecycle.create({});
    await lifecycle.create({});

    await expect(lifecycle.dispose()).rejects.toStrictEqual(
      new AggregateError([secondError, firstError], "Failed to close web app servers."),
    );
    expect(closed).toStrictEqual(["second", "first"]);
  });

  test("reject server creation after disposal", async () => {
    const lifecycle = new WebAppServerLifecycle((async () => {
      throw new Error("Server should not be created.");
    }) as typeof import("vite").createServer);

    await lifecycle.dispose();

    await expect(lifecycle.create({})).rejects.toThrow("Web app server lifecycle is disposed.");
  });
});
