import { expect, test } from "vitest";

import { resolveRuntimeGlobalNamespace, RuntimeGlobalConflictError } from "./globalNamespace";

test("resolves global bindings in layer order", () => {
  const result = resolveRuntimeGlobalNamespace([
    {
      source: "builtin",
      names: ["SpreadsheetApp", "PropertiesService"],
    },
    {
      source: "advanced-service",
      names: ["Drive"],
    },
    {
      source: "library",
      names: ["SharedLibrary"],
    },
  ]);

  expect(result).toEqual([
    {
      name: "SpreadsheetApp",
      source: "builtin",
    },
    {
      name: "PropertiesService",
      source: "builtin",
    },
    {
      name: "Drive",
      source: "advanced-service",
    },
    {
      name: "SharedLibrary",
      source: "library",
    },
  ]);
});

test("rejects a global name provided by different layers", () => {
  expect(() =>
    resolveRuntimeGlobalNamespace([
      {
        source: "builtin",
        names: ["SpreadsheetApp"],
      },
      {
        source: "library",
        names: ["SpreadsheetApp"],
      },
    ]),
  ).toThrow(new RuntimeGlobalConflictError("SpreadsheetApp", "builtin", "library"));
});

test("rejects duplicate global names within the same layer", () => {
  expect(() =>
    resolveRuntimeGlobalNamespace([
      {
        source: "library",
        names: ["SharedLibrary", "SharedLibrary"],
      },
    ]),
  ).toThrow(new RuntimeGlobalConflictError("SharedLibrary", "library", "library"));
});

test("exposes conflict details on RuntimeGlobalConflictError", () => {
  let caught: unknown;

  try {
    resolveRuntimeGlobalNamespace([
      {
        source: "advanced-service",
        names: ["Drive"],
      },
      {
        source: "library",
        names: ["Drive"],
      },
    ]);
  } catch (error) {
    caught = error;
  }

  expect(caught).toBeInstanceOf(RuntimeGlobalConflictError);

  const conflict = caught as RuntimeGlobalConflictError;

  expect(conflict.name).toBe("RuntimeGlobalConflictError");
  expect(conflict.globalName).toBe("Drive");
  expect(conflict.existingSource).toBe("advanced-service");
  expect(conflict.incomingSource).toBe("library");
  expect(conflict.message).toBe(
    'Global "Drive" is provided by both "advanced-service" and "library"',
  );
});
