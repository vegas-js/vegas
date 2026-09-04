function describeError(error: unknown) {
  const candidate = error as { name?: unknown } | null;

  return {
    errorName: typeof candidate?.name === "string" ? candidate.name : null,
    errorType: typeof error,
  };
}

function captureRead(fn: () => unknown) {
  try {
    const value = fn();

    return {
      threw: false,
      value: value === undefined ? null : value,
      isNull: value === null,
      isUndefined: value === undefined,
      type: typeof value,
      errorName: null,
      errorType: null,
    };
  } catch (error) {
    return {
      threw: true,
      value: null,
      isNull: null,
      isUndefined: null,
      type: null,
      ...describeError(error),
    };
  }
}

function captureMutation(receiver: unknown, fn: () => unknown) {
  try {
    const value = fn();

    return {
      threw: false,
      returnsReceiver: value === receiver,
      isNull: value === null,
      isUndefined: value === undefined,
      type: typeof value,
      stringify: value === null || value === undefined ? null : String(value as any),
      errorName: null,
      errorType: null,
    };
  } catch (error) {
    return {
      threw: true,
      returnsReceiver: null,
      isNull: null,
      isUndefined: null,
      type: null,
      stringify: null,
      ...describeError(error),
    };
  }
}

interface RequestedCacheEntry {
  label: string;
  key: string;
}

function captureGetAll(cache: any, requestedEntries: readonly RequestedCacheEntry[]) {
  try {
    const result = cache.getAll(requestedEntries.map(({ key }) => key));

    const isRecord = result !== null && typeof result === "object";

    if (!isRecord) {
      return {
        threw: false,
        isNull: result === null,
        type: typeof result,
        entryCount: null,
        onlyRequestedKeys: null,
        entries: null,
        errorName: null,
        errorType: null,
      };
    }

    const record = result as Record<string, unknown>;
    const returnedKeys = Object.keys(record);
    const requestedKeys = new Set(requestedEntries.map(({ key }) => key));

    const entries = Object.fromEntries(
      requestedEntries.map(({ label, key }) => {
        const present = Object.prototype.hasOwnProperty.call(record, key);
        const value = present ? record[key] : undefined;

        return [
          label,
          {
            present,
            value: value === undefined ? null : value,
            isUndefined: present ? value === undefined : null,
            type: present ? typeof value : null,
          },
        ];
      }),
    );

    return {
      threw: false,
      isNull: false,
      type: typeof result,
      entryCount: returnedKeys.length,
      onlyRequestedKeys: returnedKeys.every((key) => requestedKeys.has(key)),
      entries,
      errorName: null,
      errorType: null,
    };
  } catch (error) {
    return {
      threw: true,
      isNull: null,
      type: null,
      entryCount: null,
      onlyRequestedKeys: null,
      entries: null,
      ...describeError(error),
    };
  }
}

export function captureReferenceCacheObjectSemantics() {
  const globals = globalThis as unknown as Record<string, any>;
  const cache = globals.CacheService.getScriptCache();

  const prefix = `__vegas_reference_cache_${Date.now()}_${Math.random().toString(36).slice(2)}_`;

  const singleKey = `${prefix}single`;
  const missingKey = `${prefix}missing`;
  const bulkAKey = `${prefix}bulk_a`;
  const bulkBKey = `${prefix}bulk_b`;

  const allKeys = [singleKey, missingKey, bulkAKey, bulkBKey];

  try {
    const missingGet = captureRead(() => cache.get(missingKey));

    const put = captureMutation(cache, () => cache.put(singleKey, "value-1"));
    const afterPut = captureRead(() => cache.get(singleKey));

    const overwrite = captureMutation(cache, () => cache.put(singleKey, "value-2"));
    const afterOverwrite = captureRead(() => cache.get(singleKey));

    const mixedGetAll = captureGetAll(cache, [
      { label: "existing", key: singleKey },
      { label: "missing", key: missingKey },
    ]);

    const putAll = captureMutation(cache, () =>
      cache.putAll({
        [bulkAKey]: "bulk-a",
        [bulkBKey]: "bulk-b",
      }),
    );

    const afterPutAll = captureGetAll(cache, [
      { label: "bulkA", key: bulkAKey },
      { label: "bulkB", key: bulkBKey },
      { label: "missing", key: missingKey },
    ]);

    const removeExisting = captureMutation(cache, () => cache.remove(singleKey));
    const afterRemoveExisting = captureRead(() => cache.get(singleKey));

    const removeMissing = captureMutation(cache, () => cache.remove(missingKey));

    const removeAll = captureMutation(cache, () =>
      cache.removeAll([bulkAKey, bulkBKey, missingKey]),
    );

    const afterRemoveAll = captureGetAll(cache, [
      { label: "bulkA", key: bulkAKey },
      { label: "bulkB", key: bulkBKey },
      { label: "missing", key: missingKey },
    ]);

    return {
      missingGet,
      put,
      afterPut,
      overwrite,
      afterOverwrite,
      mixedGetAll,
      putAll,
      afterPutAll,
      removeExisting,
      afterRemoveExisting,
      removeMissing,
      removeAll,
      afterRemoveAll,
    };
  } finally {
    try {
      cache.removeAll(allKeys);
    } catch {
      // Best-effort cleanup. Reference capture results must not be masked
      // by a cleanup failure.
    }
  }
}
