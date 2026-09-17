import type { CacheHostCall, CacheHostCallResult } from "./cache-host-call";
import type { DriveHostCall, DriveHostCallResult } from "./drive-host-call";
import type { PropertiesHostCall, PropertiesHostCallResult } from "./properties-host-call";

export type HostCall = CacheHostCall | DriveHostCall | PropertiesHostCall;

export type HostCallResult<C extends HostCall> = C extends CacheHostCall
  ? CacheHostCallResult<C>
  : C extends DriveHostCall
    ? DriveHostCallResult<C>
    : C extends PropertiesHostCall
      ? PropertiesHostCallResult<C>
      : never;
