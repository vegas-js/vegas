import vm from "node:vm";
import { MessagePort, receiveMessageOnPort, workerData } from "node:worker_threads";

import { HTML } from "../../core";
import { Console } from "./api/base/console";
import { Logger } from "./api/base/Logger";
import { Session } from "./api/base/Session";
import { CacheService } from "./api/cache/CacheService";
import { HtmlService } from "./api/html/HtmlService";

type GASWorkerData = {
  fn: string;
  args: any[];
  contentBaseUrl: string;
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
    const html = new HTML();

    const htmlOutputMetaTags = htmlOutput.getMetaTags();
    if (htmlOutputMetaTags.length > 0) {
      htmlOutputMetaTags.forEach((metaTag) => {
        html.appendToHead("meta", [
          { name: "name", value: metaTag.getName() },
          { name: "content", value: metaTag.getContent() },
        ]);
      });
    }

    const htmlOutputTitle = htmlOutput.getTitle();
    if (htmlOutputTitle) {
      html.appendToHead("title", htmlOutputTitle);
    }

    const htmlOutputFaviconUrl = result.getFaviconUrl();
    if (htmlOutputFaviconUrl) {
      html.appendToHead("link", [
        { name: "rel", value: "shortcut icon" },
        { name: "type", value: "image/png" },
        { name: "href", value: htmlOutputFaviconUrl },
      ]);
    }

    html.appendToHead(
      "style",
      "html,body,iframe#sandboxFrame{margin:0;padding:0;height:100%;width:100%;}iframe#sandboxFrame{border:none;display:block;};",
    );

    html.appendToBody("iframe", [
      { name: "id", value: "sandboxFrame" },
      {
        name: "allow",
        value:
          "accelerometer *; ambient-light-sensor *; autoplay *; camera *; clipboard-read *; clipboard-write *; encrypted-media *; fullscreen *; geolocation *; gyroscope *; local-network-access *; magnetometer *; microphone *; midi *; payment *; picture-in-picture *; screen-wake-lock *; speaker *; sync-xhr *; usb *; vibrate *; vr *; web-share *",
      },
      {
        name: "sandbox",
        value:
          "allow-downloads allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-top-navigation-by-user-activation allow-storage-access-by-user-activation",
      },
      { name: "src", value: `${data.contentBaseUrl}/userCodeAppPanel` },
    ]);
    const initRecord: Record<string, any> = {};
    initRecord["userHtml"] = result.getContent();
    html.appendToBody(
      "script",
      `if (import.meta.hot) {
  import.meta.hot.on("vegas:gasreturn", (data) => {
    document.getElementById("sandboxFrame").contentWindow.postMessage({ type: "vegas:gasreturn", payload: data }, "${data.contentBaseUrl}");
  });
  window.addEventListener("message", (event) => {
    if (event.origin !== "${data.contentBaseUrl}") return;
    if (event.data.type === "vegas:gascall") import.meta.hot.send(event.data.type, event.data.payload);
  });
}
document.getElementById("sandboxFrame").onload = (event) => {
  event.currentTarget.contentWindow.postMessage({ type: "vegas:gasinit", payload: { host: window.location.origin, serverData: JSON.parse(decodeURIComponent("${encodeURIComponent(JSON.stringify(initRecord))}"))}}, "${data.contentBaseUrl}");
}`,
      [{ name: "type", value: "module" }],
    );

    payload = html.toString();
  } else {
    payload = JSON.stringify(result);
  }

  port.postMessage({ message: "vegas:resolve", payload });

  setTimeout(() => process.exit(0), 10);
});
