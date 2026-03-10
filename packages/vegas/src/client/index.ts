window.addEventListener("message", (event) => {
  if (event.data.type === "vegas:gasinit") {
    vegas.host = event.data.payload.host;
    const iframe = document.getElementById("userHtmlFrame") as HTMLIFrameElement;
    if (iframe.contentWindow) {
      const contentWindow: any = iframe.contentWindow;
      contentWindow.document.open();
      contentWindow.document.write(event.data.payload.serverData.userHtml);
      if (!contentWindow.google) {
        contentWindow.google = {
          script: {
            run: {
              __proto__: new Proxy(
                {
                  // oxlint-disable-next-line no-unused-vars
                  withSuccessHandler: (callback: Function) => {},
                  // oxlint-disable-next-line no-unused-vars
                  withFailureHandler: (callback: Function) => {},
                },
                {
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
                        } while (vegas.requestMap.has(requestId));
                        vegas.requestMap.set(requestId, receiver);
                        window.parent.postMessage(
                          {
                            type: "vegas:gascall",
                            payload: { id: requestId, func: property, args: JSON.stringify(args) },
                          },
                          vegas.host,
                        );
                      };
                    }
                  },
                },
              ),
            },
          },
        };
      }
      contentWindow.document.close();
    }
  } else if (event.data.type === "vegas:gasreturn") {
    const gasRun = vegas.requestMap.get(event.data.payload.id);
    if (event.data.payload.status === "ok") {
      gasRun.SuccessHandler(JSON.parse(event.data.payload.result));
    } else if (event.data.payload.status === "err") {
      gasRun.FailureHandler(event.data.payload.message);
    }
    window.vegas.requestMap.delete(event.data.payload.id);
  }
});
