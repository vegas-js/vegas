import vm from "node:vm";
import { MessagePort, receiveMessageOnPort, workerData } from "node:worker_threads";

import { Console } from "./api/base/console";
import { Logger } from "./api/base/Logger";
import { Session } from "./api/base/Session";
import { CacheService } from "./api/cache/CacheService";
import { HtmlService } from "./api/html/HtmlService";

type GASWorkerData = {
  fn: string;
  args: any[];
};

const script = new vm.Script(workerData.code);
const scriptContext = vm.createContext({
  console: new Console(),
  Logger: new Logger(),
  HtmlService: new HtmlService(),
  Session: new Session(),
  CacheService: new CacheService(),
});
script.runInContext(scriptContext);

const sharedArray: Int32Array = workerData.sharedArray;
const port: MessagePort = workerData.port;

export function requestSync(message: string, payload?: any) {
  port.postMessage({ message, payload });
  Atomics.store(sharedArray, 0, 1);
  Atomics.wait(sharedArray, 0, 1);
  const received = receiveMessageOnPort(port);

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

  setTimeout(() => process.exit(0), 10);
});
