import type { CacheHostCall, CacheHostCallResult } from "./cache-host-call";
import type { DriveHostCall, DriveHostCallResult } from "./drive-host-call";
import type { LockHostCall, LockHostCallResult } from "./lock-host-call";
import type { PropertiesHostCall, PropertiesHostCallResult } from "./properties-host-call";
import type { UrlFetchHostCall, UrlFetchHostCallResult } from "./url-fetch-host-call";

export type HostCall =
  | CacheHostCall
  | DriveHostCall
  | LockHostCall
  | PropertiesHostCall
  | UrlFetchHostCall;

export type HostCallResult<C extends HostCall> = C extends CacheHostCall
  ? CacheHostCallResult<C>
  : C extends DriveHostCall
    ? DriveHostCallResult<C>
    : C extends LockHostCall
      ? LockHostCallResult<C>
      : C extends PropertiesHostCall
        ? PropertiesHostCallResult<C>
        : C extends UrlFetchHostCall
          ? UrlFetchHostCallResult<C>
          : never;
