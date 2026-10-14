/**
 * Registered RPC methods must be own properties on a plain object (or a
 * null-prototype record). This keeps registration and dispatch aligned:
 * inherited class methods cannot be called through the RPC dispatcher.
 *
 * Recognize object literals from other realms, such as the Local Runtime VM.
 */
// Weak keys preserve the registry's lifetime without changing the original
// object. Capture both names and functions so a post-registration mutation
// cannot publish an unreviewed handler through the RPC dispatcher.
const registeredHandlers = new WeakMap<object, ReadonlyMap<string, unknown>>();

export function rememberRpcHandlerRegistry(
  handlers: object,
  methods: ReadonlyMap<string, unknown>,
): void {
  registeredHandlers.set(handlers, new Map(methods));
}

/** Unregistered plain registries retain the dispatcher-only compatibility path. */
export function isRegisteredRpcHandler(
  handlers: object,
  name: string,
  candidate: unknown,
): boolean {
  const methods = registeredHandlers.get(handlers);
  return methods === undefined || (methods.has(name) && methods.get(name) === candidate);
}

export function isPlainRpcHandlerRegistry(value: unknown): value is object {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype === null) {
    return true;
  }

  if (typeof prototype !== "object" || Object.getPrototypeOf(prototype) !== null) {
    return false;
  }

  const constructor: unknown = Object.getOwnPropertyDescriptor(prototype, "constructor")?.value;
  return typeof constructor === "function" && constructor.prototype === prototype;
}
