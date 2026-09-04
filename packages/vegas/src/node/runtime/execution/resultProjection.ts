export function projectScriptResult(value: unknown): unknown {
  return projectValue(value, new WeakMap<object, unknown>());
}

function projectValue(value: unknown, projectedObjects: WeakMap<object, unknown>): unknown {
  if (typeof value === "function") {
    return Function.prototype.toString.call(value);
  }

  if (value === null || (typeof value !== "object" && typeof value !== "function")) {
    return value;
  }

  const existingProjection = projectedObjects.get(value);
  if (existingProjection !== undefined) {
    return existingProjection;
  }

  if (Array.isArray(value)) {
    const projected: unknown[] = Array.from({ length: value.length });
    projectedObjects.set(value, projected);

    for (let index = 0; index < value.length; index += 1) {
      if (Object.prototype.hasOwnProperty.call(value, index)) {
        projected[index] = projectValue(value[index], projectedObjects);
      }
    }

    return projected;
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const projected: Record<string, unknown> = {};
  projectedObjects.set(value, projected);

  for (const key of Object.keys(value)) {
    projected[key] = projectValue((value as Record<string, unknown>)[key], projectedObjects);
  }

  return projected;
}

function isPlainObject(value: object): boolean {
  const prototype = Object.getPrototypeOf(value);

  if (prototype === null) {
    return true;
  }

  return Object.getPrototypeOf(prototype) === null;
}
