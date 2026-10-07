import type { HostCall, HostCallResult } from "./host-call";

export interface HostBridge {
  call<C extends HostCall>(call: C): HostCallResult<C>;
}
