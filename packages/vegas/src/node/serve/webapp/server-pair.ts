import path from "node:path";

import { createServer, type ViteDevServer } from "vite";

import { createHostServerConfig } from "./host-server";
import { WebAppServerLifecycle } from "./server-lifecycle";
import { getListeningPort } from "./server-port";
import { createUserContentServerConfig } from "./user-content-server";

const LOOPBACK_HOST = "127.0.0.1";

export interface WebAppServerEndpoint {
  readonly server: ViteDevServer;
  readonly port: number;
  readonly origin: string;
}

export interface WebAppServerPair {
  readonly host: WebAppServerEndpoint;
  readonly userContent: WebAppServerEndpoint;
  readonly dispose: () => Promise<void>;
}

interface WebAppServerPairOptions {
  readonly root: string;
  readonly configFile: string | null;
  readonly mode: "development" | "production";
  readonly bridgeFilePath?: string;
}

interface WebAppServerPairDependencies {
  readonly createServer?: typeof createServer;
}

function createHttpOrigin(port: number): string {
  return `http://${LOOPBACK_HOST}:${port}`;
}

export async function startEphemeralWebAppServerPair(
  options: WebAppServerPairOptions,
  dependencies: WebAppServerPairDependencies = {},
): Promise<WebAppServerPair> {
  const lifecycle = new WebAppServerLifecycle(dependencies.createServer);

  try {
    const hostServer = await lifecycle.create(
      createHostServerConfig({
        root: options.root,
        configFile: options.configFile,
        mode: options.mode,
        host: LOOPBACK_HOST,
        port: 0,
        open: false,
      }),
    );

    await hostServer.listen();
    const hostPort = getListeningPort(hostServer);

    const userContentServer = await lifecycle.create(
      createUserContentServerConfig({
        root: options.root,
        mode: options.mode,
        host: LOOPBACK_HOST,
        port: 0,
        bridgeFilePath:
          options.bridgeFilePath ?? path.join(import.meta.dirname, "webapp-bridge.js"),
      }),
    );

    await userContentServer.listen();
    const userContentPort = getListeningPort(userContentServer);

    return {
      host: {
        server: hostServer,
        port: hostPort,
        origin: createHttpOrigin(hostPort),
      },
      userContent: {
        server: userContentServer,
        port: userContentPort,
        origin: createHttpOrigin(userContentPort),
      },
      dispose: () => lifecycle.dispose(),
    };
  } catch (error) {
    try {
      await lifecycle.dispose();
    } catch {
      // Preserve the startup error that triggered cleanup.
    }

    throw error;
  }
}
