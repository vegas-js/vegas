import { expect, test, vi } from "vitest";

import { HtmlOutput } from "./HtmlOutput";
import { HtmlService } from "./HtmlService";

const unexpected = () => {
  throw new Error("Unexpected dependency call");
};

test("createHtmlOutput(string)", () => {
  const createHtmlOutput = vi.fn((content, mode) => new HtmlOutput(content, mode));
  const service = new HtmlService(createHtmlOutput, unexpected, unexpected);
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
  const service = new HtmlService(unexpected, createHtmlTemplate, unexpected);

  expect(service.createTemplate("<p><?= value ?></p>")).toBe(template);
  expect(createHtmlTemplate).toHaveBeenCalledWith("<p><?= value ?></p>");
});

test("createHtmlOutputFromFile success", () => {
  const createHtmlOutput = vi.fn((content, mode) => new HtmlOutput(content, mode));
  const requestSync = vi.fn(() => "<h1>from file</h1>");
  const service = new HtmlService(createHtmlOutput, unexpected, requestSync);
  const output = service.createHtmlOutputFromFile("index");

  expect(requestSync).toHaveBeenCalledWith({
    message: "HtmlService#createHtmlOutputFromFile",
    payload: "index",
  });
  expect(output.getContent()).toBe("<h1>from file</h1>");
});

test("createHtmlOutputFromFile missing", () => {
  const requestSync = vi.fn(() => null);
  const service = new HtmlService(unexpected, unexpected, requestSync);

  expect(() => service.createHtmlOutputFromFile("index")).toThrow(
    "No HTML file named index was found.",
  );
});

test("createTemplateFromFile success", () => {
  const template = {};
  const createHtmlTemplate = vi.fn(() => template as any);
  const requestSync = vi.fn(() => "<h1>from file</h1>");
  const service = new HtmlService(unexpected, createHtmlTemplate, requestSync);
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
  const service = new HtmlService(unexpected, unexpected, requestSync);

  expect(() => service.createTemplateFromFile("index")).toThrow(
    "No HTML file named index was found.",
  );
});
