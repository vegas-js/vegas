import type { UrlFetchRequestValue, UrlFetchResponseValue } from "./url-fetch-value";

export type UrlFetchHostCall =
  | {
      readonly service: "url-fetch";
      readonly operation: "fetch";
      readonly request: UrlFetchRequestValue;
    }
  | {
      readonly service: "url-fetch";
      readonly operation: "fetch-all";
      readonly requests: readonly UrlFetchRequestValue[];
    };

export type UrlFetchHostCallResult<C extends UrlFetchHostCall> = C extends {
  readonly operation: "fetch";
}
  ? UrlFetchResponseValue
  : C extends {
        readonly operation: "fetch-all";
      }
    ? readonly UrlFetchResponseValue[]
    : never;
