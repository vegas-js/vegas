import type { ViteDevServer } from "vite";
import { describe, expect, test } from "vitest";

import { getListeningPort } from "./server-port";

function createServer(address: ReturnType<NonNullable<ViteDevServer["httpServer"]>["address"]>) {
  return {
    httpServer: {
      address: () => address,
    },
  } as unknown as Pick<ViteDevServer, "httpServer">;
}

describe("getListeningPort", () => {
  test("return the bound TCP port", () => {
    const server = createServer({
      address: "127.0.0.1",
      family: "IPv4",
      port: 62000,
    });

    expect(getListeningPort(server)).toBe(62000);
  });

  test.each([null, "/tmp/vegas.sock"])("reject a server without a TCP port: %s", (address) => {
    expect(() => getListeningPort(createServer(address))).toThrow(
      "Vite dev server is not listening on a TCP port.",
    );
  });
});
