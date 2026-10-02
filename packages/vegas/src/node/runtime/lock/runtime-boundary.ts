// Runtime feature modules cannot import parent directories directly. This boundary is the single
// declared dependency edge from the Lock feature to shared Runtime core infrastructure.
export type { HostBridge } from "../host-bridge";
export type { InvocationScope } from "../scope";
export { unsupportedHostCall } from "../unsupported-host-call";
