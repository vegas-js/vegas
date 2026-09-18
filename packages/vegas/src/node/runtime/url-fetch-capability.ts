import type { UrlFetchRequestValue, UrlFetchResponseValue } from "./url-fetch-value";

export interface UrlFetchCapability {
  fetch(request: UrlFetchRequestValue): Promise<UrlFetchResponseValue>;
  fetchAll(requests: readonly UrlFetchRequestValue[]): Promise<readonly UrlFetchResponseValue[]>;
}
