import { expect, test, vi } from "vitest";

import type { RuntimeServicePort } from "../../protocol";
import { createHtmlService } from "./facade";

const service: RuntimeServicePort<"Html"> = {
  getFileContent: () => "",
};

const createHtmlTemplate = () => ({}) as GoogleAppsScript.HTML.HtmlTemplate;

test("creates GAS-compatible HtmlService facade", () => {
  const createHtmlOutput = vi.fn(() => ({}) as GoogleAppsScript.HTML.HtmlOutput);

  const htmlService = createHtmlService(createHtmlOutput, createHtmlTemplate, service) as any;

  expect(Object.getPrototypeOf(htmlService)).toBe(Object.prototype);
  expect(String(htmlService)).toBe("HtmlService");

  expect(Object.getOwnPropertyNames(htmlService).sort()).toEqual(
    [
      "SandboxMode",
      "XFrameOptionsMode",
      "createHtmlOutput",
      "createHtmlOutputFromFile",
      "createTemplate",
      "createTemplateFromFile",
      "getUserAgent",
      "initTemplate",
      "initTemplateExp",
      "toString",
    ].sort(),
  );

  expect(Object.getOwnPropertyDescriptor(htmlService, "initTemplate")?.writable).toBe(false);
  expect(Object.getOwnPropertyDescriptor(htmlService, "initTemplateExp")?.writable).toBe(false);
  expect(Object.getOwnPropertyDescriptor(htmlService, "SandboxMode")?.writable).toBe(false);
  expect(Object.getOwnPropertyDescriptor(htmlService, "XFrameOptionsMode")?.writable).toBe(false);

  expect(htmlService.SandboxMode).toBe(htmlService.SandboxMode.EMULATED);
  expect(htmlService.SandboxMode.EMULATED.ordinal()).toBe(0);
  expect(htmlService.SandboxMode.IFRAME.ordinal()).toBe(1);
  expect(htmlService.SandboxMode.NATIVE.ordinal()).toBe(2);

  expect(htmlService.XFrameOptionsMode).toBe(htmlService.XFrameOptionsMode.DEFAULT);
  expect(htmlService.XFrameOptionsMode.ALLOWALL.ordinal()).toBe(0);
  expect(htmlService.XFrameOptionsMode.DEFAULT.ordinal()).toBe(1);

  htmlService.createHtmlOutput("<h1>Hello</h1>");

  expect(createHtmlOutput).toHaveBeenCalledWith(
    "<h1>Hello</h1>",
    htmlService.XFrameOptionsMode.DEFAULT,
  );
});
