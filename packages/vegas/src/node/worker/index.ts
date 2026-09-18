import vm from "node:vm";
import worker from "node:worker_threads";

import {
  createRuntimeGlobals,
  serializeHtmlOutput,
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
  fn: string;
  args: any[];
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

async function invokeFn(fn: Function, ...args: any[]) {
  const result = await fn(...args);
  if (fn.name === "doGet") {
    return serializeHtmlOutput(result);
  } else if (fn.name === "doPost") {
    return {
      mimeType: typeof result.getMimeType === "function" ? result.getMimeType() : "text/html",
      content: result.getContent(),
    };
  }

  return result;
}

port.on("message", async (data: GASWorkerData) => {
  const targetFn = scriptContext[data.fn];
  if (typeof targetFn !== "function") {
    throw new Error(`${data.fn} is not a function`);
  }

  const result = await invokeFn(targetFn, ...data.args);
  port.postMessage({ message: "resolve", payload: result });
});

port.on("close", () => process.exit());
