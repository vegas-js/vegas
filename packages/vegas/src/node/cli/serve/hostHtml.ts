import { HTML } from "../core";

export function createHostHtml(url: URL, result: any) {
  const html = new HTML();

  if (result.metaTags > 0) {
    (result.metaTags as { name: string; content: string }[]).forEach((metaTag) => {
      html.appendToHead("meta", [
        { name: "name", value: metaTag.name },
        { name: "content", value: metaTag.content },
      ]);
    });
  }

  if (result.title) {
    html.appendToHead("title", result.title);
  }

  if (result.faviconUrl) {
    html.appendToHead("link", [
      { name: "rel", value: "shortcut icon" },
      { name: "type", value: "image/png" },
      { name: "href", value: result.faviconUrl },
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
    { name: "src", value: `${url.origin}/userCodeAppPanel` },
  ]);
  const initRecord: Record<string, any> = {};
  initRecord["userHtml"] = result.content;
  html.appendToBody(
    "script",
    `if (import.meta.hot) {
  import.meta.hot.on("vegas:gasreturn", (data) => {
    document.getElementById("sandboxFrame").contentWindow.postMessage({ type: "vegas:gasreturn", payload: data }, "${url.origin}");
  });
  window.addEventListener("message", (event) => {
    if (event.origin !== "${url.origin}") return;
    if (event.data.type === "vegas:gascall") import.meta.hot.send(event.data.type, event.data.payload);
  });
}
document.getElementById("sandboxFrame").onload = (event) => {
  event.currentTarget.contentWindow.postMessage({ type: "vegas:gasinit", payload: { host: window.location.origin, serverData: JSON.parse(decodeURIComponent("${encodeURIComponent(JSON.stringify(initRecord))}"))}}, "${url.origin}");
}`,
    [{ name: "type", value: "module" }],
  );

  return html.toString();
}
