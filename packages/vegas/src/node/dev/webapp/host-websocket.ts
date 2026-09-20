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

function formatWebSocketError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function runWebSocketTask(
  task: () => Promise<void>,
  handleError: (error: unknown) => void,
): Promise<void> {
  try {
    await task();
  } catch (error) {
    try {
      handleError(error);
    } catch {
      // The client is no longer usable, so there is nowhere else to report the error.
    }
  }
}

export function registerHostWebSocketHandlers(options: HostWebSocketOptions): void {
  const { server, builds, sessions, runtime } = options;

  server.ws.on("vegas:init", (data, client) =>
    runWebSocketTask(
      async () => {
        await builds.waitForIdle();

        if (sessions.consume(data.payload.id)) {
          client.send("vegas:init");
        } else {
          client.close();
        }
      },
      () => {
        client.close();
      },
    ),
  );

  server.ws.on("vegas:server-function-call", (data: ServerFunctionCallRequest, client) =>
    runWebSocketTask(
      async () => {
        await builds.waitForIdle();

        const response = await executeServerFunctionCall(runtime, data);

        client.send("vegas:return", response);
      },
      (error) => {
        try {
          client.send("vegas:return", {
            requestId: data.requestId,
            status: "err",
            message: formatWebSocketError(error),
          });
        } catch {
          client.close();
        }
      },
    ),
  );
}
