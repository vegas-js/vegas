const { port1, port2 } = new MessageChannel();

interface VegasInitEvent {
  type: "vegas:init";
  payload: {
    serverData: {
      userHtml: string;
    };
  };
}

interface VegasResult {
  type: "vegas:return";
  payload: {
    requestId: number;
  };
}

interface VegasResultOk {
  payload: {
    status: "ok";
    result: any;
  };
}

interface VegasResultError {
  payload: {
    status: "err";
    message: string;
  };
}

type VegasReturnEvent = VegasResult & (VegasResultOk | VegasResultError);

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
      const gasRun = window.vegas.requestMap.get(event.data.payload.requestId);
      if (gasRun) {
        if (event.data.payload.status === "ok") {
          gasRun.SuccessHandler(event.data.payload.result);
        } else if (event.data.payload.status === "err") {
          gasRun.FailureHandler(event.data.payload.message);
        }
        window.vegas.requestMap.delete(event.data.payload.requestId);
      }
      break;
    }
  }
};

const dummyGASRun = {
  // oxlint-disable-next-line no-unused-vars
  withSuccessHandler: (callback: Function) => {},
  // oxlint-disable-next-line no-unused-vars
  withFailureHandler: (callback: Function) => {},
};

const proxyHandler: ProxyHandler<object> = {
  get: (target, property, receiver) => {
    if (Reflect.get(target, property, receiver)) {
      return (callback: Function) => {
        const objRun: Record<string, Function> = {
          __proto__: receiver,
        };
        const handlerName = (property as string).slice(4);
        objRun[handlerName] = callback;
        return objRun;
      };
    } else {
      return (...args: any[]) => {
        let requestId = 0;
        do {
          requestId = Math.floor(Math.random() * 99999);
        } while (window.vegas.requestMap.has(requestId));
        window.vegas.requestMap.set(requestId, receiver);
        port1.postMessage({
          type: "vegas:gascall",
          payload: { requestId, func: property, args },
        });
      };
    }
  },
};

const proxiedGASRun = {
  __proto__: new Proxy(dummyGASRun, proxyHandler),
};

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
