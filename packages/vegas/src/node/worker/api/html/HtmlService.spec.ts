import { expect, test, vi } from "vitest";

import { HtmlOutput } from "./HtmlOutput";
import { HtmlService } from "./HtmlService";

const unexpected = () => {
  throw new Error("Unexpected dependency call");
};

test("createHtmlOutput(string)", () => {
  const createHtmlOutput = vi.fn((content, mode) => new HtmlOutput(content, mode));
  const service = new HtmlService(
    createHtmlOutput,
    unexpected,
    { getFileContent: () => "" },
    unexpected,
  );
  const output = service.createHtmlOutput("<h1>Hello</h1>");

  expect(createHtmlOutput).toHaveBeenCalledWith(
    "<h1>Hello</h1>",
    service.XFrameOptionsMode.DEFAULT,
  );

  expect(output.getContent()).toBe("<h1>Hello</h1>");
});

test("createTemplate(string)", () => {
  const template = {};
  const createHtmlTemplate = vi.fn(() => template as any);
  const service = new HtmlService(
    unexpected,
    createHtmlTemplate,
    { getFileContent: () => "" },
    unexpected,
  );

  expect(service.createTemplate("<p><?= value ?></p>")).toBe(template);
  expect(createHtmlTemplate).toHaveBeenCalledWith("<p><?= value ?></p>");
});

test("createHtmlOutputFromFile success", () => {
  const createHtmlOutput = vi.fn((content, mode) => new HtmlOutput(content, mode));
  const getFileContent = vi.fn(() => "<h1>from file</h1>");
  const service = new HtmlService(createHtmlOutput, unexpected, { getFileContent }, unexpected);
  const output = service.createHtmlOutputFromFile("index");

  expect(getFileContent).toHaveBeenCalledWith("index");
  expect(output.getContent()).toBe("<h1>from file</h1>");
});

test("createHtmlOutputFromFile missing", () => {
  const requestSync = vi.fn(() => null);
  const service = new HtmlService(
    unexpected,
    unexpected,
    { getFileContent: () => "" },
    requestSync,
  );

  expect(() => service.createHtmlOutputFromFile("index")).toThrow(
    "No HTML file named index was found.",
  );
});

test("createTemplateFromFile success", () => {
  const template = {};
  const createHtmlTemplate = vi.fn(() => template as any);
  const requestSync = vi.fn(() => "<h1>from file</h1>");
  const service = new HtmlService(
    unexpected,
    createHtmlTemplate,
    { getFileContent: () => "" },
    requestSync,
  );
  const result = service.createTemplateFromFile("index");

  expect(createHtmlTemplate).toHaveBeenCalledWith("<h1>from file</h1>");
  expect(requestSync).toHaveBeenCalledWith({
    message: "HtmlService#createTemplateFromFile",
    payload: "index",
  });
  expect(result).toBe(template);
});

test("createTemplateFromFile missing", () => {
  const requestSync = vi.fn(() => null);
  const service = new HtmlService(
    unexpected,
    unexpected,
    { getFileContent: () => "" },
    requestSync,
  );

  expect(() => service.createTemplateFromFile("index")).toThrow(
    "No HTML file named index was found.",
  );
});
