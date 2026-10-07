import { RuntimeInfrastructureError } from "./runtime-infrastructure-error";

export function unsupportedHostCall(call: never): never {
  const value = call as unknown as {
    readonly service?: unknown;
    readonly operation?: unknown;
  };

  // WorkerHostBridge is the typed producer, so reaching this branch means the host protocol
  // contract drifted rather than an Apps Script operation being unsupported by the Local Runtime.
  throw new RuntimeInfrastructureError(
    "protocol",
    `Unsupported host call: ${String(value.service)}#${String(value.operation)}`,
  );
}
