import { isPublicRpcHandlerName } from "./rpc-handler-name";
import { isPlainRpcHandlerRegistry, isRegisteredRpcHandler } from "./rpc-handler-registry";
import { assertRpcTransportValue } from "./rpc-transport-value";

/**
 * Vegas-specific registered RPC boundary, bundled inside the GAS server IIFE.
 * The build generates only the global `vegasRpcCall` forwarding function.
 */
export function __vegasInternalRpcDispatch(
  handlers: unknown,
  name: unknown,
  ...args: unknown[]
): unknown {
  const registry = isPlainRpcHandlerRegistry(handlers) ? handlers : undefined;
  const descriptor =
    isPublicRpcHandlerName(name) && registry
      ? Object.getOwnPropertyDescriptor(registry, name)
      : undefined;
  const candidate: unknown = descriptor?.value;

  if (
    !isPublicRpcHandlerName(name) ||
    !descriptor ||
    !("value" in descriptor) ||
    typeof candidate !== "function" ||
    registry === undefined ||
    !isRegisteredRpcHandler(registry, name, candidate)
  ) {
    throw new Error(`Unknown or private RPC handler: ${String(name)}`);
  }

  for (let index = 0; index < args.length; index++) {
    assertRpcTransportValue(args[index], `arguments[${index}]`);
  }

  // Use the registered object as the receiver for handler methods.
  const result: unknown = Reflect.apply(candidate, handlers, args);
  assertRpcTransportValue(result, "return", true);
  return result;
}
