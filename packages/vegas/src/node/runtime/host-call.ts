import type { PropertiesHostCall, PropertiesHostCallResult } from "./properties-host-call";

export type HostCall = PropertiesHostCall;

export type HostCallResult<C extends HostCall> = C extends PropertiesHostCall
  ? PropertiesHostCallResult<C>
  : never;
