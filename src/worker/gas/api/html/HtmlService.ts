import { MessagePort, parentPort, receiveMessageOnPort } from "worker_threads";

import { HtmlOutput } from "./HtmlOutput";

export function HtmlService(ctx: {
  parentPort: MessagePort | null;
  port: MessagePort;
  sharedArray: Int32Array;
}): GoogleAppsScript.HTML.HtmlService {
  return {
    SandboxMode: { EMULATED: 0, IFRAME: 1, NATIVE: 2 },
    XFrameOptionsMode: { ALLOWALL: 0, DEFAULT: 1 },
    createHtmlOutput: function (
      html?: string | GoogleAppsScript.Base.BlobSource,
    ): GoogleAppsScript.HTML.HtmlOutput {
      if (typeof html !== "string") {
        throw new Error("Method not implemented.");
      }
      const output = HtmlOutput();
      return output.setContent(html);
    },
    createHtmlOutputFromFile: function (filename: string): GoogleAppsScript.HTML.HtmlOutput {
      // const filePath = `${parse(filename).name}.html`;
      // const html = ctx.web.map.get(filePath);
      parentPort!.postMessage({ message: "vegas:htmlservice", filename });
      Atomics.store(ctx.sharedArray, 0, 1);
      Atomics.wait(ctx.sharedArray, 0, 1);
      const received = receiveMessageOnPort(ctx.port);
      if (!received) {
        throw new Error(`No HTML file named ${filename} was found.`);
      }

      return this.createHtmlOutput(received.message);
    },
    createTemplate: function (
      _html: string | GoogleAppsScript.Base.BlobSource,
    ): GoogleAppsScript.HTML.HtmlTemplate {
      throw new Error("Function not implemented.");
    },
    createTemplateFromFile: function (_filename: string): GoogleAppsScript.HTML.HtmlTemplate {
      throw new Error("Function not implemented.");
    },
    getUserAgent: function (): string {
      throw new Error("Function not implemented.");
    },
  };
}
