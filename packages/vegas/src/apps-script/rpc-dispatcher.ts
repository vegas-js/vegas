import { isPublicRpcHandlerName } from "./rpc-handler-name";
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
  const descriptor =
    isPublicRpcHandlerName(name) && handlers !== null && typeof handlers === "object"
      ? Object.getOwnPropertyDescriptor(handlers, name)
      : undefined;
  const candidate: unknown = descriptor?.value;

  if (
    !isPublicRpcHandlerName(name) ||
    !descriptor ||
    !("value" in descriptor) ||
    typeof candidate !== "function"
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
