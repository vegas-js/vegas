import type { UrlFetchRequestValue, UrlFetchResponseValue } from "./url-fetch-value";

export interface UrlFetchCapability {
  fetch(request: UrlFetchRequestValue, signal?: AbortSignal): Promise<UrlFetchResponseValue>;
  fetchAll(
    requests: readonly UrlFetchRequestValue[],
    signal?: AbortSignal,
  ): Promise<readonly UrlFetchResponseValue[]>;
}
