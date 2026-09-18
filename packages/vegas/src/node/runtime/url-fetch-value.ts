import type { BlobValue } from "./blob-value";

export type UrlFetchMethod = "get" | "delete" | "patch" | "post" | "put";

export type UrlFetchFormFieldValue = string | BlobValue;

export type UrlFetchPayloadValue =
  | {
      readonly kind: "text";
      readonly value: string;
    }
  | {
      readonly kind: "bytes";
      readonly value: readonly number[];
    }
  | {
      readonly kind: "blob";
      readonly value: BlobValue;
    }
  | {
      readonly kind: "form";
      readonly fields: Readonly<Record<string, UrlFetchFormFieldValue>>;
    };

// https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app
export interface UrlFetchRequestValue {
  readonly url: string;
  readonly contentType?: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly method?: UrlFetchMethod;
  readonly payload?: UrlFetchPayloadValue;
  readonly useIntranet?: boolean;
  readonly validateHttpsCertificates?: boolean;
  readonly followRedirects?: boolean;
  readonly muteHttpExceptions?: boolean;
  readonly escaping?: boolean;
  // The current Apps Script reference documents this option, while
  // @types/google-apps-script@2.0.13 does not declare it yet.
  readonly timeoutSeconds?: number;
}

export type UrlFetchResponseHeaderValue = string | readonly string[];

export interface UrlFetchResponseValue {
  readonly statusCode: number;
  readonly headers: Readonly<Record<string, UrlFetchResponseHeaderValue>>;
  readonly content: readonly number[];
}
