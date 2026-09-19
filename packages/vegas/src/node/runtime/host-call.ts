import type { CacheHostCall, CacheHostCallResult } from "./cache-host-call";
import type { DriveHostCall, DriveHostCallResult } from "./drive-host-call";
import type { LockHostCall, LockHostCallResult } from "./lock-host-call";
import type { PropertiesHostCall, PropertiesHostCallResult } from "./properties-host-call";
import type { SpreadsheetHostCall, SpreadsheetHostCallResult } from "./spreadsheet-host-call";
import type { UrlFetchHostCall, UrlFetchHostCallResult } from "./url-fetch-host-call";

export type HostCall =
  | CacheHostCall
  | DriveHostCall
  | LockHostCall
  | PropertiesHostCall
  | SpreadsheetHostCall
  | UrlFetchHostCall;

export type HostService = HostCall["service"];

const HOST_SERVICES = {
  cache: true,
  drive: true,
  lock: true,
  properties: true,
  spreadsheet: true,
  "url-fetch": true,
} as const satisfies Record<HostService, true>;

export function isHostService(value: unknown): value is HostService {
  return typeof value === "string" && Object.hasOwn(HOST_SERVICES, value);
}

export type HostCallResult<C extends HostCall> = C extends CacheHostCall
  ? CacheHostCallResult<C>
  : C extends DriveHostCall
    ? DriveHostCallResult<C>
    : C extends LockHostCall
      ? LockHostCallResult<C>
      : C extends PropertiesHostCall
        ? PropertiesHostCallResult<C>
        : C extends SpreadsheetHostCall
          ? SpreadsheetHostCallResult<C>
          : C extends UrlFetchHostCall
            ? UrlFetchHostCallResult<C>
            : never;
