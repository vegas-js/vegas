/// <reference types="google-apps-script" />
interface ImportMetaEnv {
  DEV: boolean;
  PROD: boolean;
  MODE: "development" | "production";
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Console {
  log(formatOrObject: unknown, ...values: unknown[]): void;
  info(formatOrObject: unknown, ...values: unknown[]): void;
  warn(formatOrObject: unknown, ...values: unknown[]): void;
  error(formatOrObject: unknown, ...values: unknown[]): void;
}
