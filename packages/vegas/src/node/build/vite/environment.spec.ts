import { describe, expect, test } from "vitest";

import {
  CLIENT_ENVIRONMENT_PATTERN,
  DEFAULT_VITE_ENVIRONMENT_PATTERN,
  SERVER_ENVIRONMENT_NAME,
  SERVER_ENVIRONMENT_PATTERN,
  createClientEnvironmentName,
  getClientEnvironmentIndex,
} from "./environment";

describe("build environment identity", () => {
  test("create and parse client environment name", () => {
    expect(createClientEnvironmentName(0)).toBe("client0");
    expect(createClientEnvironmentName(12)).toBe("client12");
    expect(getClientEnvironmentIndex("client0")).toBe(0);
    expect(getClientEnvironmentIndex("client12")).toBe(12);
  });

  test("reject non-client environment names", () => {
    expect(getClientEnvironmentIndex("client")).toBeUndefined();
    expect(getClientEnvironmentIndex("client-entry")).toBeUndefined();
    expect(getClientEnvironmentIndex("server")).toBeUndefined();
  });

  test("match Vegas build environments", () => {
    expect(CLIENT_ENVIRONMENT_PATTERN.test("client0")).toBe(true);
    expect(CLIENT_ENVIRONMENT_PATTERN.test("client12")).toBe(true);
    expect(CLIENT_ENVIRONMENT_PATTERN.test("client")).toBe(false);

    expect(SERVER_ENVIRONMENT_NAME).toBe("server");
    expect(SERVER_ENVIRONMENT_PATTERN.test("server")).toBe(true);
    expect(SERVER_ENVIRONMENT_PATTERN.test("server0")).toBe(false);
  });

  test("match Vite default environments", () => {
    expect(DEFAULT_VITE_ENVIRONMENT_PATTERN.test("client")).toBe(true);
    expect(DEFAULT_VITE_ENVIRONMENT_PATTERN.test("ssr")).toBe(true);
    expect(DEFAULT_VITE_ENVIRONMENT_PATTERN.test("client0")).toBe(false);
    expect(DEFAULT_VITE_ENVIRONMENT_PATTERN.test("server")).toBe(false);
  });
});
