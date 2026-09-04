import { expect, test, vi } from "vitest";

import { ReferenceExecutionError } from "./executionError";
import {
  acquireReferenceCase,
  acquireReferenceResult,
  acquireReferenceResults,
  createReferenceMetadata,
} from "./fixture";
import type { JsonValue, ReferenceExecutor } from "./types";

test("builds a reference fixture", async () => {
  const executor: ReferenceExecutor = {
    async execute() {
      return "result";
    },
  };

  await expect(acquireReferenceResult(executor, "captureReferenceSmoke")).resolves.toEqual(
    "result",
  );
});

test("acquires repeated reference executions sequentially", async () => {
  let active = 0;
  let maxActive = 0;
  let sequence = 0;

  const executor: ReferenceExecutor = {
    async execute(functionName) {
      expect(functionName).toBe("captureRepeatedExecution");

      active += 1;
      maxActive = Math.max(maxActive, active);
      sequence += 1;

      const result = sequence;

      await new Promise((resolve) => setTimeout(resolve, 5));

      active -= 1;

      return result;
    },
  };

  await expect(acquireReferenceResult(executor, "captureRepeatedExecution", 2)).resolves.toEqual([
    1, 2,
  ]);

  expect(maxActive).toBe(1);
});

test("rejects invalid reference execution counts", async () => {
  const executor: ReferenceExecutor = {
    async execute() {
      throw new Error("executor must not be called");
    },
  };

  await expect(acquireReferenceResult(executor, "captureReference", 0)).rejects.toThrow(
    "executionCount must be a positive integer",
  );
});

test("builds reference metadata", () => {
  expect(createReferenceMetadata("revision")).toEqual({
    runtime: "V8",
    caseRevision: "revision",
  });
});

test("acquires reference results concurrently while preserving case order", async () => {
  let active = 0;
  let maxActive = 0;

  const executor: ReferenceExecutor = {
    async execute(functionName) {
      active += 1;
      maxActive = Math.max(maxActive, active);

      await new Promise((resolve) => setTimeout(resolve, functionName === "first" ? 30 : 5));

      active -= 1;
      return functionName;
    },
  };

  const cases = [
    {
      name: "first",
      functionName: "first",
      fixtureFile: "first.json",
      runtimeTest: "required" as const,
    },
    {
      name: "second",
      functionName: "second",
      fixtureFile: "second.json",
      runtimeTest: "required" as const,
    },
    {
      name: "third",
      functionName: "third",
      fixtureFile: "third.json",
      runtimeTest: "required" as const,
    },
  ];

  const results = await acquireReferenceResults({ executionApi: executor }, cases, 2);

  expect(maxActive).toBe(2);
  expect(results.map(({ referenceCase }) => referenceCase.name)).toEqual([
    "first",
    "second",
    "third",
  ]);
  expect(results.map(({ result }) => result)).toEqual(["first", "second", "third"]);
});

test("captures reference execution errors as outcomes", async () => {
  const executor: ReferenceExecutor = {
    async execute() {
      throw new ReferenceExecutionError({
        statusCode: 3,
        statusMessage: "ScriptError",
        errorMessage: "Function not found",
        errorType: null,
        scriptStackTraceFunctions: [],
      });
    },
  };

  await expect(
    acquireReferenceResult(executor, "missingReferenceFunction", 1, "outcome"),
  ).resolves.toEqual({
    outcome: "execution-error",
    error: {
      errorMessage: "Function not found",
      errorType: null,
      scriptStackTraceFunctions: [],
      statusCode: 3,
      statusMessage: "ScriptError",
    },
  });
});

test("captures successful reference results as outcomes", async () => {
  const executor: ReferenceExecutor = {
    async execute() {
      return {
        value: "result",
      };
    },
  };

  await expect(
    acquireReferenceResult(executor, "captureReferenceSuccess", 1, "outcome"),
  ).resolves.toEqual({
    outcome: "return",
    value: {
      value: "result",
    },
  });
});

test("passes reference parameters to the executor", async () => {
  const execute = vi.fn(async () => "result");

  const executor: ReferenceExecutor = {
    execute,
  };

  const parameters: JsonValue[] = [
    "value",
    null,
    {
      nested: [1, 2],
    },
  ];

  await acquireReferenceResult(executor, "captureReferenceArguments", 1, "result", parameters);

  expect(execute).toHaveBeenCalledOnce();
  expect(execute).toHaveBeenCalledWith("captureReferenceArguments", parameters);
});

test("acquires a reference case from its definition", async () => {
  const execute = vi.fn(async () => "result");

  const executor: ReferenceExecutor = {
    execute,
  };

  const referenceCase = {
    name: "case-definition",
    functionName: "captureReferenceCaseDefinition",
    fixtureFile: "case-definition.json",
    runtimeTest: "required" as const,
    parameters: [
      "value",
      {
        nested: [1, 2],
      },
    ] satisfies JsonValue[],
  };

  await expect(acquireReferenceCase({ executionApi: executor }, referenceCase)).resolves.toBe(
    "result",
  );

  expect(execute).toHaveBeenCalledOnce();
  expect(execute).toHaveBeenCalledWith("captureReferenceCaseDefinition", referenceCase.parameters);
});

test("routes a web app reference case to the web app executor", async () => {
  const executionApiExecute = vi.fn(async () => {
    throw new Error("Execution API executor must not be called");
  });

  const webAppExecute = vi.fn(async () => ({
    value: "web-app-result",
  }));

  const request = {
    method: "GET" as const,
    queryString: "a=1&a=2",
  };

  const referenceCase = {
    name: "web-app-case",
    functionName: "doGet",
    fixtureFile: "web-app-case.json",
    runtimeTest: "pending" as const,
    acquisition: {
      kind: "web-app" as const,
      request,
    },
  };

  await expect(
    acquireReferenceCase(
      {
        executionApi: {
          execute: executionApiExecute,
        },
        webApp: {
          execute: webAppExecute,
        },
      },
      referenceCase,
    ),
  ).resolves.toEqual({
    value: "web-app-result",
  });

  expect(executionApiExecute).not.toHaveBeenCalled();
  expect(webAppExecute).toHaveBeenCalledOnce();
  expect(webAppExecute).toHaveBeenCalledWith(request);
});
