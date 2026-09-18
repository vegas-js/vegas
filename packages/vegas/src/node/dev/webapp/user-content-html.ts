import { HtmlDocument } from "../../html";

const USER_CONTENT_IFRAME_ALLOW =
  "accelerometer *; ambient-light-sensor *; autoplay *; camera *; clipboard-read *; clipboard-write *; encrypted-media *; fullscreen *; geolocation *; gyroscope *; local-network-access *; magnetometer *; microphone *; midi *; payment *; picture-in-picture *; screen-wake-lock *; speaker *; sync-xhr *; usb *; vibrate *; vr *; web-share *";

export function createBlankUserContentHtml(): string {
  const html = new HtmlDocument();
  html.appendToHead("meta", {
    attributes: {
      "http-equiv": "X-UA-Compatible",
      content: "IE=edge",
    },
  });

  return html.toString();
}

export function createUserContentPanelHtml(hostOrigin: string, sessionId: string): string {
  const html = new HtmlDocument();
  html.appendToHead("style", {
    text: "html, body, iframe {border: 0; display: block; height: 100%; margin: 0; padding: 0; width: 100%;}iframe#userHtmlFrame {overflow-y: scroll; -webkit-overflow-scrolling: touch;}",
  });
  html.appendToHead("script", {
    text: `window.vegas = { id: "${sessionId}", hostOrigin: "${hostOrigin}", requestMap: new Map() }`,
  });
  html.appendToHead("script", {
    attributes: {
      type: "module",
      src: "/@vegas/client",
    },
  });
  html.appendToBody("iframe", {
    attributes: {
      id: "userHtmlFrame",
      allow: USER_CONTENT_IFRAME_ALLOW,
      src: "/blank",
    },
  });

  return html.toString();
}
