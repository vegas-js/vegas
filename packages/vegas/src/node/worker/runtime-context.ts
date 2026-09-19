import vm, { type Context } from "node:vm";
import type { MessagePort } from "node:worker_threads";

import { createRuntimeGlobals, type InvocationEnvironment, type Program } from "../runtime";
import { createNodeUtilities, createWorkerHostBridge } from "../runtime/node";

export interface RuntimeWorkerData {
  readonly program: Program;
  readonly environment: InvocationEnvironment;
  readonly port: MessagePort;
  readonly sharedArray: Int32Array;
}

export function createWorkerRuntimeContext(data: RuntimeWorkerData): Context {
  const hostBridge = createWorkerHostBridge(data.port, data.sharedArray);
  const context = vm.createContext(
    createRuntimeGlobals({
      hostBridge,
      environment: data.environment,
      htmlFiles: data.program.htmlFiles,
      loggingTarget: console,
      utilities: createNodeUtilities(),
    }),
  );

  new vm.Script(data.program.source).runInContext(context);

  return context;
}
