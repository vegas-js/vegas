window.addEventListener("message", (event) => {
  if (event.data.type === "vegas:gasinit") {
    vegas.host = event.data.payload.host;
    const iframe = document.getElementById("userHtmlFrame") as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
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
                  get: (_target, property, receiver) => {
                    if (property === "withSuccessHandler") {
                      return (callback: Function) => {
                        return {
                          successHandler: callback,
                          __proto__: receiver,
                        };
                      };
                    } else if (property === "withFailureHandler") {
                      return (callback: Function) => {
                        return {
                          failureHandler: callback,
                          __proto__: receiver,
                        };
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
      gasRun.successHandler(JSON.parse(event.data.payload.result));
    } else if (event.data.payload.status === "err") {
      gasRun.failureHandler(event.data.payload.message);
    }
    window.vegas.requestMap.delete(event.data.payload.id);
  }
});
