import events from "node:events";
import vm from "node:vm";
import worker from "node:worker_threads";

import { excludesGASUserFunctionNames } from "../../../shared/gas";
import { Console } from "./api/base/console";
import { Logger } from "./api/base/Logger";
import { Session } from "./api/base/Session";
import { Cache } from "./api/cache/Cache";
import { CacheService } from "./api/cache/CacheService";
import { HtmlService } from "./api/html/HtmlService";
import { Lock } from "./api/lock/Lock";
import { LockService } from "./api/lock/LockService";
import { Properties } from "./api/properties/Properties";
import { PropertiesService } from "./api/properties/PropertiesService";
import { Utilities } from "./api/utilities/Utilities";

type GASWorkerData = {
  fn: string;
  args: any[];
};

const Scope = {
  DOCUMENT: "document",
  SCRIPT: "script",
  USER: "user",
} as const;

export type Scope = (typeof Scope)[keyof typeof Scope];

export function requestSync(request: { message: string; payload?: any }, timeout?: number) {
  port.postMessage(request);
  Atomics.store(sharedArray, 0, 1);
  Atomics.wait(sharedArray, 0, 1, timeout);
  const received = worker.receiveMessageOnPort(port);

  return received?.message ?? null;
}

export type RequestSyncFn = typeof requestSync;

const script = new vm.Script(worker.workerData.code);
const scriptContext = vm.createContext({
  console: new Console(),
  Logger: new Logger(),
  HtmlService: new HtmlService(),
  Session: new Session(),
  CacheService: new CacheService(
    new Cache(Scope.DOCUMENT, requestSync),
    new Cache(Scope.SCRIPT, requestSync),
    new Cache(Scope.USER, requestSync),
  ),
  PropertiesService: new PropertiesService(
    new Properties(Scope.DOCUMENT, requestSync),
    new Properties(Scope.SCRIPT, requestSync),
    new Properties(Scope.USER, requestSync),
  ),
  LockService: new LockService(
    new Lock(Scope.DOCUMENT),
    new Lock(Scope.SCRIPT),
    new Lock(Scope.USER),
  ),
  Utilities: new Utilities(),
});
script.runInContext(scriptContext);

const sharedArray: Int32Array = worker.workerData.sharedArray;
const port: worker.MessagePort = worker.workerData.port;

interface DoGetResult {
  metaTags: { name: string; content: string }[];
  title: string;
  faviconUrl: string;
  content: string;
  xFrameOptionsMode: string;
}

function doGetHandler(this: TriggerEvent, htmlOutput: GoogleAppsScript.HTML.HtmlOutput) {
  const result: DoGetResult = {
    metaTags: htmlOutput.getMetaTags().map((metaTag) => {
      return { name: metaTag.getName(), content: metaTag.getContent() };
    }),
    title: htmlOutput.getTitle(),
    faviconUrl: htmlOutput.getFaviconUrl(),
    content: htmlOutput.getContent(),
    xFrameOptionsMode: (htmlOutput as any).getXFrameOptionsMode(),
  };
  this.postMessage(result);
}

class TriggerEvent extends events.EventEmitter {
  #port: worker.MessagePort;

  constructor(port: worker.MessagePort) {
    super();
    this.#port = port;
  }

  on(event: "doGet", listener: (arg: GoogleAppsScript.HTML.HtmlOutput) => void): this;
  on(
    event: (typeof excludesGASUserFunctionNames)[number],
    listener: (...args: any[]) => void,
  ): this {
    super.on(event, listener);
    return this;
  }

  postMessage(data: any) {
    const payload = JSON.stringify(data);
    this.#port.postMessage({ message: "resolve", payload });
  }
}

const triggerEvent = new TriggerEvent(port);
triggerEvent.on("doGet", doGetHandler);

port.on("message", async (data: GASWorkerData) => {
  const result = await scriptContext[data.fn](...data.args);

  if ((excludesGASUserFunctionNames as unknown as string[]).includes(data.fn)) {
    triggerEvent.emit(data.fn, result);
  } else {
    const payload = JSON.stringify(result);
    port.postMessage({ message: "resolve", payload });
  }
});

port.on("close", () => process.exit());
