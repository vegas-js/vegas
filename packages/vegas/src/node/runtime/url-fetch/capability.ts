import type { UrlFetchRequestValue, UrlFetchResponseValue } from "./value";

export interface UrlFetchCapability {
  fetch(request: UrlFetchRequestValue, signal?: AbortSignal): Promise<UrlFetchResponseValue>;
  fetchAll(
    requests: readonly UrlFetchRequestValue[],
    signal?: AbortSignal,
  ): Promise<readonly UrlFetchResponseValue[]>;
}
