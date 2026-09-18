import type { ViteDevServer } from "vite";

import type { ServerFunctionCallRequest } from "../../../shared/webapp-protocol";
import type { ArtifactStore } from "../../build";
import type { Executor, InvocationEnvironment, InvocationScope } from "../../runtime";
import type { BuildCoordinator } from "../build-coordinator";
import { createRuntimeProgram } from "../runtime-program";
import { executeServerFunctionCall } from "./server-function-call";
import type { WebAppSessionRegistry } from "./session-registry";

interface HostWebSocketOptions {
  readonly server: ViteDevServer;
  readonly builds: Pick<BuildCoordinator, "waitForIdle">;
  readonly sessions: Pick<WebAppSessionRegistry, "consume">;
  readonly artifacts: ArtifactStore;
  readonly executor: Executor;
  readonly environment: InvocationEnvironment;
  readonly scope: InvocationScope;
}

export function registerHostWebSocketHandlers(options: HostWebSocketOptions): void {
  const { server, builds, sessions, artifacts, executor, environment, scope } = options;

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

    const program = createRuntimeProgram(artifacts);
    const response = await executeServerFunctionCall(executor, data, program, environment, scope);

    client.send("vegas:return", response);
  });
}
