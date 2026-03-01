import vm from "node:vm";
import worker from "node:worker_threads";

import { Console } from "./api/base/console";
import { Logger } from "./api/base/Logger";
import { Session } from "./api/base/Session";
import { CacheService } from "./api/cache/CacheService";
import { HtmlService } from "./api/html/HtmlService";

type GASWorkerData = {
  fn: string;
  args: any[];
};

const script = new vm.Script(worker.workerData.code);
const scriptContext = vm.createContext({
  console: new Console(),
  Logger: new Logger(),
  HtmlService: new HtmlService(),
  Session: new Session(),
  CacheService: new CacheService(),
});
script.runInContext(scriptContext);

const sharedArray: Int32Array = worker.workerData.sharedArray;
const port: worker.MessagePort = worker.workerData.port;

export function requestSync(request: { message: string; payload?: any }, timeout?: number) {
  port.postMessage(request);
  Atomics.store(sharedArray, 0, 1);
  Atomics.wait(sharedArray, 0, 1, timeout);
  const received = worker.receiveMessageOnPort(port);

  return received?.message ?? null;
}

port.on("message", async (data: GASWorkerData) => {
  const result = await scriptContext[data.fn](...data.args);

  let payload = "";
  if (data.fn === "doGet") {
    const htmlOutput = result as GoogleAppsScript.HTML.HtmlOutput;
    const doGetResult: any = {
      metaTags: htmlOutput.getMetaTags().map((metaTag) => {
        return { name: metaTag.getName(), content: metaTag.getContent() };
      }),
      title: htmlOutput.getTitle(),
      faviconUrl: htmlOutput.getFaviconUrl(),
      content: htmlOutput.getContent(),
    };

    payload = JSON.stringify(doGetResult);
  } else {
    payload = JSON.stringify(result);
  }

  port.postMessage({ message: "vegas:resolve", payload });

  globalThis.setTimeout(() => process.exit(0), 10);
});
