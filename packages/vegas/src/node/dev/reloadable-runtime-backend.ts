import type { RuntimeBackend, RuntimeExecutionRequest } from "../runtime";

export class ReloadableRuntimeBackend implements RuntimeBackend {
  #backend: RuntimeBackend;

  constructor(backend: RuntimeBackend) {
    this.#backend = backend;
  }

  execute(request: RuntimeExecutionRequest): Promise<unknown> {
    return this.#backend.execute(request);
  }

  replace(backend: RuntimeBackend): void {
    this.#backend = backend;
  }
}
