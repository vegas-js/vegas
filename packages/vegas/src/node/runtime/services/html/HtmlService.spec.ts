import { expect, test, vi } from "vitest";

import { HtmlOutput } from "./HtmlOutput";
import { HtmlService } from "./HtmlService";

const unexpected = () => {
  throw new Error("Unexpected dependency call");
};

test("createHtmlOutput(string)", () => {
  const createHtmlOutput = vi.fn((content, mode) => new HtmlOutput(content, mode));
  const service = new HtmlService(createHtmlOutput, unexpected, { getFileContent: () => "" });
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
  const service = new HtmlService(unexpected, createHtmlTemplate, { getFileContent: () => "" });

  expect(service.createTemplate("<p><?= value ?></p>")).toBe(template);
  expect(createHtmlTemplate).toHaveBeenCalledWith("<p><?= value ?></p>");
});

test("createHtmlOutputFromFile success", () => {
  const createHtmlOutput = vi.fn((content, mode) => new HtmlOutput(content, mode));
  const getFileContent = vi.fn(() => "<h1>from file</h1>");
  const service = new HtmlService(createHtmlOutput, unexpected, { getFileContent });
  const output = service.createHtmlOutputFromFile("index");

  expect(getFileContent).toHaveBeenCalledWith("index");
  expect(output.getContent()).toBe("<h1>from file</h1>");
});

test("createHtmlOutputFromFile missing", () => {
  const service = new HtmlService(unexpected, unexpected, { getFileContent: () => "" });

  expect(() => service.createHtmlOutputFromFile("index")).toThrow(
    "No HTML file named index was found.",
  );
});

test("createTemplateFromFile success", () => {
  const template = {};
  const createHtmlTemplate = vi.fn(() => template as any);
  const getFileContent = vi.fn(() => "<h1>from file</h1>");
  const service = new HtmlService(unexpected, createHtmlTemplate, { getFileContent });
  const result = service.createTemplateFromFile("index");

  expect(createHtmlTemplate).toHaveBeenCalledWith("<h1>from file</h1>");
  expect(getFileContent).toHaveBeenCalledWith("index");
  expect(result).toBe(template);
});

test("createTemplateFromFile missing", () => {
  const service = new HtmlService(unexpected, unexpected, { getFileContent: () => "" });

  expect(() => service.createTemplateFromFile("index")).toThrow(
    "No HTML file named index was found.",
  );
});

test("createHtmlOutput() creates an empty HtmlOutput", () => {
  const createHtmlOutput = vi.fn((content, mode) => new HtmlOutput(content, mode));

  const service = new HtmlService(createHtmlOutput, unexpected, {
    getFileContent: () => "",
  });

  const output = service.createHtmlOutput();

  expect(createHtmlOutput).toHaveBeenCalledWith("", service.XFrameOptionsMode.DEFAULT);

  expect(output.getContent()).toBe("");
});

test("initTemplateExp() applies GAS escaping to escaped prints", () => {
  const createHtmlOutput = (content: string, mode: GoogleAppsScript.HTML.XFrameOptionsMode) =>
    new HtmlOutput(content, mode);

  const service = new HtmlService(createHtmlOutput, unexpected, {
    getFileContent: () => "",
  });

  const output = service.initTemplateExp();

  output._$ = `<b class="x">& '"</b>`;

  output.flush();

  expect(output.$out.getContent()).toBe("&lt;b class=&#34;x&#34;&gt;&amp; &#39;&#34;&lt;/b&gt;");
});
