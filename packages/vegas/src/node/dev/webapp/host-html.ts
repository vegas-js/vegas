import { HtmlDocument } from "../../html-document";
import type { HtmlOutputSnapshot } from "../../runtime";
import { createHostBridgeScript } from "./host-bridge-script";

export type AppsScriptDoGetResult = HtmlOutputSnapshot;

export function createHostHtml(url: URL, result: AppsScriptDoGetResult, sessionId: string) {
  const html = new HtmlDocument();

  if (result.metaTags.length > 0) {
    result.metaTags.forEach((metaTag) => {
      html.appendToHead("meta", {
        attributes: {
          name: metaTag.name,
          content: metaTag.content,
        },
      });
    });
  }

  if (result.title) {
    html.appendToHead("title", { text: result.title });
  }

  if (result.faviconUrl) {
    html.appendToHead("link", {
      attributes: {
        rel: "shortcut icon",
        type: "image/png",
        href: result.faviconUrl,
      },
    });
  }

  html.appendToHead("style", {
    text: "html,body,iframe#sandboxFrame{margin:0;padding:0;height:100%;width:100%;}iframe#sandboxFrame{border:none;display:block;};",
  });

  const userContentUrl = new URL("/userCodeAppPanel", url.origin);
  userContentUrl.searchParams.set("sessionId", sessionId);

  html.appendToBody("iframe", {
    attributes: {
      id: "sandboxFrame",
      allow:
        "accelerometer *; ambient-light-sensor *; autoplay *; camera *; clipboard-read *; clipboard-write *; encrypted-media *; fullscreen *; geolocation *; gyroscope *; local-network-access *; magnetometer *; microphone *; midi *; payment *; picture-in-picture *; screen-wake-lock *; speaker *; sync-xhr *; usb *; vibrate *; vr *; web-share *",
      sandbox:
        "allow-downloads allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-top-navigation-by-user-activation allow-storage-access-by-user-activation",
      src: userContentUrl.href,
    },
  });

  html.appendToBody("script", {
    text: createHostBridgeScript(url.origin, result.content),
    attributes: { type: "module" },
  });

  return html.toString();
}
