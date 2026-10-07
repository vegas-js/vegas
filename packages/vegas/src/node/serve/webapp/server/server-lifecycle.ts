import { createServer, type InlineConfig, type ViteDevServer } from "vite";

export class WebAppServerLifecycle {
  readonly #createServer: typeof createServer;
  readonly #servers: ViteDevServer[] = [];
  #disposed = false;

  constructor(createViteServer: typeof createServer = createServer) {
    this.#createServer = createViteServer;
  }

  async create(config: InlineConfig): Promise<ViteDevServer> {
    if (this.#disposed) {
      throw new Error("Web app server lifecycle is disposed.");
    }

    const server = await this.#createServer(config);
    this.#servers.push(server);

    return server;
  }

  async dispose(): Promise<void> {
    if (this.#disposed) {
      return;
    }

    this.#disposed = true;
    const errors: unknown[] = [];

    for (const server of [...this.#servers].reverse()) {
      try {
        await server.close();
      } catch (error) {
        errors.push(error);
      }
    }

    this.#servers.length = 0;

    if (errors.length === 1) {
      throw errors[0];
    }

    if (errors.length > 1) {
      throw new AggregateError(errors, "Failed to close web app servers.");
    }
  }
}
