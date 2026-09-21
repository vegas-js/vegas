import type {
  ServerFunctionCallRequest,
  ServerFunctionCallResponse,
} from "../shared/webapp-protocol";
import { createServerFunctionRun } from "./server-function-run";

const { port1, port2 } = new MessageChannel();

interface VegasInitEvent {
  type: "vegas:init";
  payload: {
    serverData: {
      userHtml: string;
    };
  };
}

interface VegasReturnEvent {
  type: "vegas:return";
  payload: ServerFunctionCallResponse;
}

type VegasEvent = VegasInitEvent | VegasReturnEvent;

let retryPreInitTimer: number | null = null;

function vegasLoadListener() {
  retryPreInitTimer = setInterval(
    () =>
      window.parent.postMessage(
        { type: "vegas:preinit", payload: { contentOrigin: window.origin } },
        window.vegas.hostOrigin!,
      ),
    10,
  );
  window.removeEventListener("load", vegasLoadListener);
}

window.addEventListener("message", (event) => {
  if (event.data.type === "vegas:preinit" && retryPreInitTimer) {
    clearInterval(retryPreInitTimer);
    retryPreInitTimer = null;
    window.parent.postMessage(
      { type: "vegas:init", payload: { id: window.vegas.id, port: port2 } },
      window.vegas.hostOrigin!,
      [port2],
    );
  }
});

port1.onmessage = (event: MessageEvent<VegasEvent>) => {
  switch (event.data.type) {
    case "vegas:init": {
      delete window.vegas.id;
      delete window.vegas.hostOrigin;
      injectUserHtml(event.data.payload.serverData.userHtml);
      break;
    }
    case "vegas:return": {
      const handlers = window.vegas.requestMap.get(event.data.payload.requestId);
      if (handlers) {
        window.vegas.requestMap.delete(event.data.payload.requestId);

        if (event.data.payload.status === "ok") {
          handlers.success?.(event.data.payload.result);
        } else if (handlers.failure) {
          handlers.failure(event.data.payload.message);
        } else {
          console.error(event.data.payload.message);
        }
      }
      break;
    }
  }
};

const proxiedGASRun = createServerFunctionRun(({ functionName, args, handlers }) => {
  let requestId = 0;
  do {
    requestId = Math.floor(Math.random() * 99999);
  } while (window.vegas.requestMap.has(requestId));

  window.vegas.requestMap.set(requestId, handlers);

  const request: ServerFunctionCallRequest = {
    requestId,
    functionName,
    args,
  };

  port1.postMessage({
    type: "vegas:server-function-call",
    payload: request,
  });
});

function injectUserHtml(userHtml: string) {
  const iframe = document.getElementById("userHtmlFrame") as HTMLIFrameElement | null;
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(userHtml);

    if (!iframe.contentWindow.google) {
      iframe.contentWindow.google = {
        script: {
          run: proxiedGASRun,
        },
      };
    }
    iframe.contentWindow.document.close();
  }
}

window.addEventListener("load", vegasLoadListener);
