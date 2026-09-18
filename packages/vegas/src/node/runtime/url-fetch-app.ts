import type { HostBridge } from "./host-bridge";
import { hydrateHttpResponse, type HTTPResponse } from "./url-fetch-http-response";
import {
  normalizeUrlFetchRequest,
  type UrlFetchRequestInput,
  type UrlFetchRequestOptionsInput,
} from "./url-fetch-request";

// https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app
export class UrlFetchApp {
  readonly #bridge: HostBridge;

  constructor(bridge: HostBridge) {
    this.#bridge = bridge;
  }

  fetch(url: string): HTTPResponse;
  fetch(url: string, params: UrlFetchRequestOptionsInput): HTTPResponse;
  fetch(url: string, params?: UrlFetchRequestOptionsInput): HTTPResponse {
    return hydrateHttpResponse(
      this.#bridge.call({
        service: "url-fetch",
        operation: "fetch",
        request: normalizeUrlFetchRequest(url, params),
      }),
    );
  }

  fetchAll(requests: readonly UrlFetchRequestInput[]): HTTPResponse[] {
    const responses = this.#bridge.call({
      service: "url-fetch",
      operation: "fetch-all",
      requests: requests.map((request) => normalizeUrlFetchRequest(request)),
    });

    return responses.map(hydrateHttpResponse);
  }
}

export function createUrlFetchApp(bridge: HostBridge): UrlFetchApp {
  return new UrlFetchApp(bridge);
}
