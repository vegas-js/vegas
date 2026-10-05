import { serializeInlineScriptValue } from "./inline-script";

export function createHostBridgeScript(hostOrigin: string, userHtml: string): string {
  const serializedHostOrigin = serializeInlineScriptValue(hostOrigin);
  const serverData = serializeInlineScriptValue({ userHtml });

  return `let port = null;
if (import.meta.hot) {
  import.meta.hot.on("vegas:init", (data) => {
    if (port) {
      port.onmessage = (event) => {
        if (event.data.type === "vegas:server-function-call") {
          import.meta.hot.send(event.data.type, event.data.payload);
        }
      };
      port.postMessage({ type: "vegas:init", payload: { serverData: ${serverData} }});
    }
  });
  import.meta.hot.on("vegas:return", (data) => {
    if (port) {
      port.postMessage({ type: "vegas:return", payload: data });
    }
  });
  import.meta.hot.on("vite:ws:disconnect", () => {
    if (port) {
      port.postMessage({ type: "vegas:transport", payload: { connected: false } });
    }
  });
  import.meta.hot.on("vite:ws:connect", () => {
    if (port) {
      port.postMessage({ type: "vegas:transport", payload: { connected: true } });
    }
  });
}
window.addEventListener("message", (event) => {
  const sandboxFrame = document.getElementById("sandboxFrame");
  if (event.origin !== ${serializedHostOrigin} || event.source !== sandboxFrame?.contentWindow) {
    return;
  }
  if (event.data.type === "vegas:preinit") {
    sandboxFrame.contentWindow.postMessage({ type: "vegas:preinit" }, event.data.payload.contentOrigin);
  } else if (event.data.type === "vegas:init" && event.data.payload.id) {
    port = event.data.payload.port;
    import.meta.hot.send(event.data.type, { payload: { id: event.data.payload.id }});
  }
});`;
}
