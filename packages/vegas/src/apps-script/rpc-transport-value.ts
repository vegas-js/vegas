/**
 * Validate the conservative transport subset shared by registered RPC clients
 * and the generated GAS dispatcher. This does not serialize or clone values.
 *
 * Vite bundles this module into the GAS server IIFE through the internal RPC
 * dispatcher. No module loader or function source serialization is required
 * at runtime.
 *
 * Only the root of a void return is allowed to be undefined. Nested values
 * and RPC arguments must never contain undefined.
 */
export function assertRpcTransportValue(
  value: unknown,
  path: string,
  allowVoidResult = false,
): void {
  if (value === undefined && allowVoidResult) {
    return;
  }

  const active = new WeakSet<object>();

  function visit(current: unknown, location: string): void {
    if (
      current === null ||
      typeof current === "string" ||
      typeof current === "boolean" ||
      typeof current === "number"
    ) {
      return;
    }

    if (typeof current !== "object") {
      throw new TypeError(`Unsupported RPC transport value at ${location}`);
    }

    // Object.prototype.toString() can execute a Symbol.toStringTag getter.
    // Checking prototype depth instead accepts cross-realm plain records and
    // null-prototype records, without treating class instances as data records.
    if (!Array.isArray(current)) {
      const prototype = Object.getPrototypeOf(current) as object | null;
      if (prototype !== null && Object.getPrototypeOf(prototype) !== null) {
        throw new TypeError(`Unsupported RPC transport value at ${location}`);
      }
    }

    if (active.has(current)) {
      throw new TypeError(`Cyclic RPC transport value at ${location}`);
    }

    active.add(current);
    try {
      for (const key of Reflect.ownKeys(current)) {
        if (typeof key !== "string") {
          throw new TypeError(`Unsupported RPC transport value at ${location}`);
        }

        const descriptor = Object.getOwnPropertyDescriptor(current, key);
        if (!descriptor || !("value" in descriptor)) {
          throw new TypeError(`Unsupported RPC transport value at ${location}`);
        }

        visit(descriptor.value, `${location}[${JSON.stringify(key)}]`);
      }
    } finally {
      active.delete(current);
    }
  }

  visit(value, path);
}
