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

const RPC_CLIENT_DISCONNECTED_MESSAGE = "Vegas RPC client disconnected.";

function formatWebSocketError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function sendServerFunctionResponse(
  client: { send(event: string, data: unknown): void; close(): void },
  response: unknown,
): void {
  try {
    client.send("vegas:return", response);
  } catch {
    try {
      client.close();
    } catch {
      // The client is no longer usable, so there is nowhere else to report the error.
    }
  }
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
  const activeExecutions = new WeakMap<object, Set<AbortController>>();

  const trackExecution = (client: object, controller: AbortController): (() => void) => {
    let controllers = activeExecutions.get(client);

    if (controllers === undefined) {
      controllers = new Set();
      activeExecutions.set(client, controllers);
    }

    controllers.add(controller);

    return () => {
      controllers.delete(controller);

      if (controllers.size === 0) {
        activeExecutions.delete(client);
      }
    };
  };

  server.ws.on("vite:client:disconnect", (_data, client) => {
    const controllers = activeExecutions.get(client);

    if (controllers === undefined) {
      return;
    }

    activeExecutions.delete(client);

    for (const controller of controllers) {
      controller.abort(new Error(RPC_CLIENT_DISCONNECTED_MESSAGE));
    }
  });

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

  server.ws.on("vegas:server-function-call", (data: ServerFunctionCallRequest, client) => {
    const controller = new AbortController();
    const untrackExecution = trackExecution(client, controller);

    return runWebSocketTask(
      async () => {
        try {
          await builds.waitForIdle();

          if (controller.signal.aborted) {
            return;
          }

          const response = await executeServerFunctionCall(runtime, data, controller.signal);

          if (!controller.signal.aborted) {
            sendServerFunctionResponse(client, response);
          }
        } finally {
          untrackExecution();
        }
      },
      (error) => {
        if (!controller.signal.aborted) {
          sendServerFunctionResponse(client, {
            requestId: data.requestId,
            status: "err",
            message: formatWebSocketError(error),
          });
        }
      },
    );
  });
}
