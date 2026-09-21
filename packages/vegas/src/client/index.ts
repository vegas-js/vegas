import type {
  ServerFunctionCallRequest,
  ServerFunctionCallResponse,
} from "../shared/webapp-protocol";
import { ServerFunctionRequestRegistry } from "./server-function-requests";
import { createServerFunctionRun } from "./server-function-run";

const RPC_DISCONNECTED_MESSAGE = "Vegas RPC transport is disconnected.";
const RPC_TIMEOUT_MESSAGE = "Vegas RPC transport timed out while waiting for a response.";
const RPC_TRANSPORT_TIMEOUT_MS = 7 * 60 * 1_000;

const { port1, port2 } = new MessageChannel();
const requests = new ServerFunctionRequestRegistry({
  timeoutMs: RPC_TRANSPORT_TIMEOUT_MS,
  timeoutMessage: RPC_TIMEOUT_MESSAGE,
});

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

interface VegasTransportEvent {
  type: "vegas:transport";
  payload: {
    connected: boolean;
  };
}

type VegasEvent = VegasInitEvent | VegasReturnEvent | VegasTransportEvent;

let retryPreInitTimer: number | null = null;
let rpcConnected = false;

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
      rpcConnected = true;
      delete window.vegas.id;
      delete window.vegas.hostOrigin;
      injectUserHtml(event.data.payload.serverData.userHtml);
      break;
    }
    case "vegas:return": {
      requests.complete(event.data.payload);
      break;
    }
    case "vegas:transport": {
      rpcConnected = event.data.payload.connected;

      if (!rpcConnected) {
        requests.failAll(RPC_DISCONNECTED_MESSAGE);
      }
      break;
    }
  }
};

const proxiedGASRun = createServerFunctionRun(({ functionName, args, handlers }) => {
  const requestId = requests.create(handlers);

  if (!rpcConnected) {
    requests.fail(requestId, RPC_DISCONNECTED_MESSAGE);
    return;
  }

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
