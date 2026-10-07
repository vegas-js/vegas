import type { ViteDevServer } from "vite";

export function getListeningPort(server: Pick<ViteDevServer, "httpServer">): number {
  const address = server.httpServer?.address();

  if (address === undefined || address === null || typeof address === "string") {
    throw new Error("Vite dev server is not listening on a TCP port.");
  }

  return address.port;
}
