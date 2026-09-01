export function normalizeReferenceResult(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeReferenceResult);
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => {
          if (a < b) return -1;
          if (a > b) return 1;
          return 0;
        })
        .map(([key, nested]) => [key, normalizeReferenceResult(nested)]),
    );
  }

  return value;
}
