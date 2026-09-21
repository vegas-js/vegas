import type {
  LocalRuntime,
  LocalRuntimeResources,
  RuntimeBackend,
  RuntimeExecutionRequest,
} from "../runtime";

export class ReloadableLocalRuntime implements RuntimeBackend {
  #runtime: LocalRuntime;

  constructor(runtime: LocalRuntime) {
    this.#runtime = runtime;
  }

  get resources(): LocalRuntimeResources {
    return this.#runtime.resources;
  }

  execute(request: RuntimeExecutionRequest): Promise<unknown> {
    return this.#runtime.execute(request);
  }

  replace(runtime: LocalRuntime): void {
    this.#runtime = runtime;
  }
}
