/**
 * Registered RPC methods must be own properties on a plain object (or a
 * null-prototype record). This keeps registration and dispatch aligned:
 * inherited class methods cannot be called through the RPC dispatcher.
 *
 * Recognize object literals from other realms, such as the Local Runtime VM.
 */
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
