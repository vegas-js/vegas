import { expect, test, vi } from "vitest";

import type { ReferenceWebAppExecutor } from "../core/types";
import { waitForReferenceDeploymentReadiness } from "./deploymentReadiness";

test("fails when the deployed web app never serves the expected revision", async () => {
  const webApp = {
    execute: vi.fn().mockResolvedValue("old-revision"),
  } satisfies ReferenceWebAppExecutor;

  await expect(
    waitForReferenceDeploymentReadiness(webApp, "expected-revision", {
      maxAttempts: 2,
      requiredConsecutiveMatches: 2,
      delayMs: 0,
      sleep: async () => {},
    }),
  ).rejects.toThrow(/expected-revision/u);
});

test("waits for consecutive matches before accepting the deployed revision", async () => {
  const execute = vi
    .fn()
    .mockResolvedValueOnce("old-revision")
    .mockResolvedValueOnce("expected-revision")
    .mockResolvedValueOnce("expected-revision")
    .mockResolvedValueOnce("old-revision")
    .mockResolvedValueOnce("expected-revision")
    .mockResolvedValueOnce("expected-revision")
    .mockResolvedValueOnce("expected-revision");

  const webApp = {
    execute,
  } satisfies ReferenceWebAppExecutor;

  const sleep = vi.fn(async () => {});

  await expect(
    waitForReferenceDeploymentReadiness(webApp, "expected-revision", {
      maxAttempts: 7,
      requiredConsecutiveMatches: 3,
      delayMs: 10,
      sleep,
    }),
  ).resolves.toBeUndefined();

  expect(execute).toHaveBeenCalledTimes(7);

  expect(sleep).toHaveBeenCalledTimes(6);
});

test("resets consecutive matches after transient readiness request failures", async () => {
  const execute = vi
    .fn()
    .mockResolvedValueOnce("expected-revision")
    .mockRejectedValueOnce(new Error("temporary failure"))
    .mockResolvedValueOnce("expected-revision")
    .mockResolvedValueOnce("expected-revision");

  const webApp = {
    execute,
  } satisfies ReferenceWebAppExecutor;

  await expect(
    waitForReferenceDeploymentReadiness(webApp, "expected-revision", {
      maxAttempts: 4,
      requiredConsecutiveMatches: 2,
      delayMs: 0,
      sleep: async () => {},
    }),
  ).resolves.toBeUndefined();

  expect(execute).toHaveBeenCalledTimes(4);
});

test("rejects impossible consecutive-match configuration", async () => {
  const webApp = {
    execute: vi.fn(),
  } satisfies ReferenceWebAppExecutor;

  await expect(
    waitForReferenceDeploymentReadiness(webApp, "expected-revision", {
      maxAttempts: 2,
      requiredConsecutiveMatches: 3,
    }),
  ).rejects.toThrow("requiredConsecutiveMatches must not exceed maxAttempts");

  expect(webApp.execute).not.toHaveBeenCalled();
});
