import events from "node:events";
import worker from "node:worker_threads";

import { excludesGASUserFunctionNames } from "../../shared/gas";

export class TriggerEvent extends events.EventEmitter {
  #port: worker.MessagePort;

  constructor(port: worker.MessagePort) {
    super();
    this.#port = port;
  }

  isTarget(eventName: string) {
    return (excludesGASUserFunctionNames as unknown as string[]).includes(eventName);
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
    this.#port.postMessage({ message: "resolve", payload: data });
  }
}
