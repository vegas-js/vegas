import { expect, test } from "vitest";

import { ScriptFunctionNotFoundError } from "../../../src/node/runtime/execution/entryResolution";
import { projectVegasExecutionError } from "./executionErrorProjection";

test("projects missing script functions as FUNCTION_NOT_FOUND", () => {
  const error = projectVegasExecutionError(
    new ScriptFunctionNotFoundError("missingEntry"),
    "missingEntry",
  );

  expect(error.observation).toEqual({
    statusCode: 3,
    statusMessage: "Script function not found: missingEntry",
    errorMessage: "Script function not found: missingEntry",
    errorType: "FUNCTION_NOT_FOUND",
    scriptStackTraceFunctions: [],
  });
});

test("projects user errors as USER_ERROR", () => {
  const error = projectVegasExecutionError(
    new TypeError("sync-type-error"),
    "captureReferenceExecutionThrowTypeError",
  );

  expect(error.observation).toEqual({
    statusCode: 3,
    statusMessage: "TypeError: sync-type-error",
    errorMessage: "TypeError: sync-type-error",
    errorType: "USER_ERROR",
    scriptStackTraceFunctions: ["captureReferenceExecutionThrowTypeError"],
  });
});

test("projects null throws with the GAS uncaught-null message", () => {
  const error = projectVegasExecutionError(null, "captureReferenceExecutionThrowNull");

  expect(error.observation).toEqual({
    statusCode: 3,
    statusMessage: "Uncaught null",
    errorMessage: "Uncaught null",
    errorType: "USER_ERROR",
    scriptStackTraceFunctions: ["captureReferenceExecutionThrowNull"],
  });
});
