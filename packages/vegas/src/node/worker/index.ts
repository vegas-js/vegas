import vm from "node:vm";
import worker from "node:worker_threads";

import {
  createRuntimeGlobals,
  executeRuntimeFunction,
  type InvocationEnvironment,
  type Program,
} from "../runtime";
import { createNodeUtilities, createWorkerHostBridge } from "../runtime/node";

type RuntimeWorkerData = {
  readonly program: Program;
  readonly environment: InvocationEnvironment;
  readonly port: worker.MessagePort;
  readonly sharedArray: Int32Array;
};

type GASWorkerData = {
  readonly fn: string;
  readonly args: readonly unknown[];
};

const runtimeWorkerData = worker.workerData as RuntimeWorkerData;
const sharedArray = runtimeWorkerData.sharedArray;
const port = runtimeWorkerData.port;
const hostBridge = createWorkerHostBridge(port, sharedArray);

const script = new vm.Script(runtimeWorkerData.program.source);
const scriptContext = vm.createContext(
  createRuntimeGlobals({
    hostBridge,
    environment: runtimeWorkerData.environment,
    htmlFiles: runtimeWorkerData.program.htmlFiles,
    loggingTarget: console,
    utilities: createNodeUtilities(),
  }),
);
script.runInContext(scriptContext);

port.on("message", async (data: GASWorkerData) => {
  const result = await executeRuntimeFunction(scriptContext, data.fn, data.args);
  port.postMessage({ message: "resolve", payload: result });
});

port.on("close", () => process.exit());
