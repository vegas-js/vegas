import type { ViteDevServer } from "vite";

import type { ServerFunctionCallRequest } from "../../../shared/webapp-protocol";
import type { RuntimeBackend } from "../../runtime";
import type { BuildCoordinator } from "../build-coordinator";
import { executeServerFunctionCall } from "./server-function-call";
import type { WebAppSessionRegistry } from "./session-registry";

interface HostWebSocketOptions {
  readonly server: ViteDevServer;
  readonly builds: Pick<BuildCoordinator, "waitForIdle">;
  readonly sessions: Pick<WebAppSessionRegistry, "consume">;
  readonly runtime: RuntimeBackend;
}

export function registerHostWebSocketHandlers(options: HostWebSocketOptions): void {
  const { server, builds, sessions, runtime } = options;

  server.ws.on("vegas:init", async (data, client) => {
    await builds.waitForIdle();

    if (sessions.consume(data.payload.id)) {
      client.send("vegas:init");
    } else {
      client.close();
    }
  });

  server.ws.on("vegas:server-function-call", async (data: ServerFunctionCallRequest, client) => {
    await builds.waitForIdle();

    const response = await executeServerFunctionCall(runtime, data);

    client.send("vegas:return", response);
  });
}
