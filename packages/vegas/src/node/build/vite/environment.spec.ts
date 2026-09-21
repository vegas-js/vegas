import { describe, expect, test } from "vitest";

import {
  CLIENT_ENVIRONMENT_PATTERN,
  CLIENT_HTML_ENVIRONMENT_PATTERN,
  CLIENT_MODULE_ENVIRONMENT_PATTERN,
  DEFAULT_VITE_ENVIRONMENT_PATTERN,
  SERVER_ENVIRONMENT_NAME,
  SERVER_ENVIRONMENT_PATTERN,
  createClientHtmlEnvironmentName,
  createClientModuleEnvironmentName,
  getClientHtmlEnvironmentIndex,
  getClientModuleEnvironmentIndex,
} from "./environment";

describe("build environment identity", () => {
  test("create and parse client module environment name", () => {
    expect(createClientModuleEnvironmentName(0)).toBe("client0");
    expect(createClientModuleEnvironmentName(12)).toBe("client12");
    expect(getClientModuleEnvironmentIndex("client0")).toBe(0);
    expect(getClientModuleEnvironmentIndex("client12")).toBe(12);
  });

  test("create and parse client HTML environment name", () => {
    expect(createClientHtmlEnvironmentName(0)).toBe("clientHtml0");
    expect(createClientHtmlEnvironmentName(12)).toBe("clientHtml12");
    expect(getClientHtmlEnvironmentIndex("clientHtml0")).toBe(0);
    expect(getClientHtmlEnvironmentIndex("clientHtml12")).toBe(12);
  });

  test("reject non-client environment names", () => {
    expect(getClientModuleEnvironmentIndex("client")).toBeUndefined();
    expect(getClientModuleEnvironmentIndex("clientHtml0")).toBeUndefined();
    expect(getClientHtmlEnvironmentIndex("client0")).toBeUndefined();
    expect(getClientHtmlEnvironmentIndex("client-html")).toBeUndefined();
    expect(getClientHtmlEnvironmentIndex("server")).toBeUndefined();
  });

  test("match Vegas build environments", () => {
    expect(CLIENT_MODULE_ENVIRONMENT_PATTERN.test("client0")).toBe(true);
    expect(CLIENT_MODULE_ENVIRONMENT_PATTERN.test("clientHtml0")).toBe(false);
    expect(CLIENT_HTML_ENVIRONMENT_PATTERN.test("clientHtml0")).toBe(true);
    expect(CLIENT_HTML_ENVIRONMENT_PATTERN.test("client0")).toBe(false);

    expect(CLIENT_ENVIRONMENT_PATTERN.test("client0")).toBe(true);
    expect(CLIENT_ENVIRONMENT_PATTERN.test("client12")).toBe(true);
    expect(CLIENT_ENVIRONMENT_PATTERN.test("clientHtml0")).toBe(true);
    expect(CLIENT_ENVIRONMENT_PATTERN.test("clientHtml12")).toBe(true);
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
