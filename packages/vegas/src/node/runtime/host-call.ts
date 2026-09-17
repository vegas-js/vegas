import type { DriveHostCall, DriveHostCallResult } from "./drive-host-call";
import type { PropertiesHostCall, PropertiesHostCallResult } from "./properties-host-call";

export type HostCall = DriveHostCall | PropertiesHostCall;

export type HostCallResult<C extends HostCall> = C extends DriveHostCall
  ? DriveHostCallResult<C>
  : C extends PropertiesHostCall
    ? PropertiesHostCallResult<C>
    : never;
