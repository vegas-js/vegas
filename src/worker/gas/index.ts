import vm from "node:vm";
import { MessagePort, parentPort, receiveMessageOnPort } from "node:worker_threads";

import { defaultTreeAdapter, html, serialize } from "parse5";

import { GASManifest } from "../../shared/config";
import { Console } from "./api/base/console";
import { Logger } from "./api/base/Logger";
import { Session } from "./api/base/Session";
import { CacheService } from "./api/cache/CacheService";
import { HtmlService } from "./api/html/HtmlService";

type GASWorkerData = {
  gasManifest: GASManifest;
  code: string;
  mockSeed: Record<string, any>;
  fn: string;
  args: any[];
  contentBaseUrl: string;
  port: MessagePort;
  sharedBuffer: SharedArrayBuffer;
};

export type RequestSyncFn = (message: string, payload?: any) => any;

parentPort!.on("message", async (data: GASWorkerData) => {
  const script = new vm.Script(data.code);
  const port = data.port;
  const sharedArray = new Int32Array(data.sharedBuffer);

  function requestSync(message: string, payload?: any) {
    parentPort!.postMessage({ message, payload });
    Atomics.store(sharedArray, 0, 1);
    Atomics.wait(sharedArray, 0, 1);
    const received = receiveMessageOnPort(port);

    return received?.message ?? null;
  }

  const scriptContext = vm.createContext({
    console: Console(),
    Logger: Logger(),
    HtmlService: HtmlService(requestSync),
    Session: Session(data.gasManifest, data.mockSeed["Session"]),
    CacheService: CacheService(requestSync),
  });
  script.runInContext(scriptContext);
  const result = await scriptContext[data.fn](...data.args);

  let payload = "";
  if (data.fn === "doGet") {
    const htmlOutput = result as GoogleAppsScript.HTML.HtmlOutput;
    const document = defaultTreeAdapter.createDocument();
    defaultTreeAdapter.setDocumentType(document, "html", "", "");
    const htmlTag = defaultTreeAdapter.createElement("html", html.NS.HTML, []);
    const headTag = defaultTreeAdapter.createElement("head", html.NS.HTML, []);

    const htmlOutputMetaTags = htmlOutput.getMetaTags();
    if (htmlOutputMetaTags.length > 0) {
      htmlOutputMetaTags.forEach((metaTag) => {
        const meta = defaultTreeAdapter.createElement("meta", html.NS.HTML, [
          { name: "name", value: metaTag.getName() },
          { name: "content", value: metaTag.getContent() },
        ]);
        defaultTreeAdapter.appendChild(headTag, meta);
      });
    }

    const htmlOutputTitle = htmlOutput.getTitle();
    if (htmlOutputTitle) {
      const title = defaultTreeAdapter.createElement("title", html.NS.HTML, []);
      defaultTreeAdapter.insertText(title, htmlOutputTitle);
      defaultTreeAdapter.appendChild(headTag, title);
    }

    const htmlOutputFaviconUrl = result.getFaviconUrl();
    if (htmlOutputFaviconUrl) {
      const title = defaultTreeAdapter.createElement("link", html.NS.HTML, [
        { name: "rel", value: "shortcut icon" },
        { name: "type", value: "image/png" },
        { name: "href", value: htmlOutputFaviconUrl },
      ]);
      defaultTreeAdapter.appendChild(headTag, title);
    }

    const styleTag = defaultTreeAdapter.createElement("style", html.NS.HTML, []);
    defaultTreeAdapter.insertText(
      styleTag,
      "html,body,iframe#sandboxFrame{margin:0;padding:0;height:100%;width:100%;}iframe#sandboxFrame{border:none;display:block;};",
    );
    defaultTreeAdapter.appendChild(headTag, styleTag);

    const bodyTag = defaultTreeAdapter.createElement("body", html.NS.HTML, []);
    const iframeTag = defaultTreeAdapter.createElement("iframe", html.NS.HTML, [
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
    defaultTreeAdapter.appendChild(bodyTag, iframeTag);

    const scriptEntryTag = defaultTreeAdapter.createElement("script", html.NS.HTML, [
      { name: "type", value: "module" },
    ]);
    const initRecord: Record<string, any> = {};
    initRecord["userHtml"] = result.getContent();
    defaultTreeAdapter.insertText(
      scriptEntryTag,
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
  event.currentTarget.contentWindow.postMessage({ type: "vegas:gasinit", payload: { host: window.location.origin,serverData: JSON.parse(decodeURIComponent("${encodeURIComponent(JSON.stringify(initRecord))}"))}}, "${data.contentBaseUrl}");
}`,
    );
    defaultTreeAdapter.appendChild(bodyTag, scriptEntryTag);

    defaultTreeAdapter.appendChild(htmlTag, headTag);
    defaultTreeAdapter.appendChild(htmlTag, bodyTag);
    defaultTreeAdapter.appendChild(document, htmlTag);

    payload = serialize(document);
  } else {
    payload = JSON.stringify(result);
  }

  parentPort!.postMessage({ message: "vegas:resolve", payload });

  setTimeout(() => process.exit(0), 10);
});
