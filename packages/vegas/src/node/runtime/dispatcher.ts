import type { RuntimeRequest, RuntimeServiceRegistry } from "./protocol";

type DynamicRuntimeOperation = (...args: unknown[]) => unknown;

type DynamicRuntimeService = Record<string, DynamicRuntimeOperation>;

type DynamicRuntimeRegistry = Record<string, DynamicRuntimeService>;

export async function dispatchRuntimeRequest(
  services: RuntimeServiceRegistry,
  request: RuntimeRequest,
) {
  const registry = services as unknown as DynamicRuntimeRegistry;

  const service = registry[request.service];
  if (!service) {
    throw new Error(`Unknown runtime service: ${request.service}`);
  }

  const operation = service[request.method];
  if (typeof operation !== "function") {
    throw new Error(`Unknown runtime method: ${request.service}.${request.method}`);
  }

  return await Reflect.apply(operation, service, request.args);
}
