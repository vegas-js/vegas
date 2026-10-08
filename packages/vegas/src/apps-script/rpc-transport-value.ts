/**
 * Validate the conservative transport subset shared by registered RPC clients
 * and the generated GAS dispatcher. This does not serialize or clone values.
 *
 * Vite bundles this module into the GAS server IIFE through the internal RPC
 * dispatcher. No module loader or function source serialization is required
 * at runtime.
 *
 * Only the root of a void return is allowed to be undefined. Nested values
 * and RPC arguments must never contain undefined. Reject lossy values such as
 * non-finite numbers, sparse arrays and properties omitted during transfer.
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
      (typeof current === "number" && Number.isFinite(current))
    ) {
      return;
    }

    if (typeof current !== "object") {
      throw new TypeError(`Unsupported RPC transport value at ${location}`);
    }

    // Do not inspect Symbol.toStringTag: it can invoke user-defined getters.
    // Accept native array/object prototypes across realms, plus null-prototype
    // records. Custom prototypes can contain inherited data lost in transit.
    const isArray = Array.isArray(current);
    const prototype = Object.getPrototypeOf(current) as object | null;
    if (prototype === null) {
      if (isArray) {
        throw new TypeError(`Unsupported RPC transport value at ${location}`);
      }
    } else {
      const constructor: unknown = Object.getOwnPropertyDescriptor(prototype, "constructor")?.value;
      if (
        (isArray ? !Array.isArray(prototype) : Object.getPrototypeOf(prototype) !== null) ||
        typeof constructor !== "function" ||
        constructor.prototype !== prototype
      ) {
        throw new TypeError(`Unsupported RPC transport value at ${location}`);
      }
    }

    if (active.has(current)) {
      throw new TypeError(`Cyclic RPC transport value at ${location}`);
    }

    active.add(current);
    try {
      const arrayLength = Array.isArray(current) ? current.length : undefined;
      let elementCount = 0;
      for (const key of Reflect.ownKeys(current)) {
        if (typeof key !== "string") {
          throw new TypeError(`Unsupported RPC transport value at ${location}`);
        }

        // Array length is the sole non-enumerable transport property allowed.
        if (arrayLength !== undefined && key === "length") {
          continue;
        }

        const descriptor = Object.getOwnPropertyDescriptor(current, key);
        if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
          throw new TypeError(`Unsupported RPC transport value at ${location}`);
        }

        if (arrayLength !== undefined) {
          const index = Number(key);
          if (
            !Number.isInteger(index) ||
            index < 0 ||
            index >= arrayLength ||
            String(index) !== key
          ) {
            throw new TypeError(`Unsupported RPC transport value at ${location}`);
          }
          elementCount++;
        }

        visit(descriptor.value, `${location}[${JSON.stringify(key)}]`);
      }
      // A sparse array cannot be represented without filling its holes.
      if (arrayLength !== undefined && elementCount !== arrayLength) {
        throw new TypeError(`Unsupported RPC transport value at ${location}`);
      }
    } finally {
      active.delete(current);
    }
  }

  visit(value, path);
}
