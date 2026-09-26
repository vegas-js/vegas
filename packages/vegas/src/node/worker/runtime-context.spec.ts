import worker from "node:worker_threads";

import { describe, expect, test } from "vitest";

import type { InvocationEnvironment } from "../runtime/invocation";
import type { Program } from "../runtime/program";
import { SpreadsheetApp } from "../runtime/spreadsheet-app";
import { Utilities } from "../runtime/utilities";
import { createWorkerRuntimeContext, evaluateWorkerProgram } from "./runtime-context";

const environment = {
  activeUserEmail: "active@example.com",
  activeUserLocale: "ja",
  effectiveUserEmail: "effective@example.com",
  scriptTimeZone: "Asia/Tokyo",
  temporaryActiveUserKey: "temporary-user-key",
} satisfies InvocationEnvironment;

const program = {
  source: `
function run() {
  return [
    Session.getActiveUserLocale(),
    HtmlService.createHtmlOutputFromFile("index").getContent(),
    HtmlService.getUserAgent(),
  ].join(":");
}

function formatLocale() {
  return Session.getActiveUserLocale().toUpperCase();
}

function renderTemplate() {
  const template = HtmlService
    .createHtmlOutput(
      "<main><? const locale = formatLocale(); ?><?= greeting ?> <?= locale ?> <?!= trusted ?></main>",
    )
    .asTemplate();
  template.greeting = "<Hello>";
  template.trusted = "<b>Trusted</b>";

  return template.evaluate().getContent();
}

function evaluateTemplateCode() {
  const value = "<Vegas>";
  const template = HtmlService.createHtmlOutput("<p><?= value ?></p>").asTemplate();

  return eval(template.getCode()).getContent();
}

function evaluateTemplateCodeWithComments() {
  const value = "<Vegas>";
  const template = HtmlService.createHtmlOutput("<p>\\n<?= value ?>\\n</p>").asTemplate();

  return eval(template.getCodeWithComments()).getContent();
}

function renderTemplateFactories() {
  const inline = HtmlService.createTemplate("<p><?= formatLocale() ?></p>").evaluate();

  const file = HtmlService.createTemplateFromFile("template");
  file.greeting = "<Hello>";

  return [inline.getContent(), file.evaluate().getContent()].join(":");
}
`,
  htmlFiles: {
    "index.html": "<main>Vegas</main>",
    "template.html": "<main><?= greeting ?> <?= formatLocale() ?></main>",
  },
} satisfies Program;

describe("createWorkerRuntimeContext", () => {
  test("compose Node Runtime dependencies and execute the program in a vm context", () => {
    const { port1, port2 } = new worker.MessageChannel();

    try {
      const context = createWorkerRuntimeContext({
        program,
        context: {
          webApp: true,
          userAgent: "Vegas Browser",
        },
        environment,
        port: port1,
        sharedArray: new Int32Array(new SharedArrayBuffer(4)),
      });

      expect(context.SpreadsheetApp).toBeInstanceOf(SpreadsheetApp);
      expect(context.Utilities).toBeInstanceOf(Utilities);
      expect(context.run).toBeUndefined();

      evaluateWorkerProgram(context, program.source);

      expect(context.run()).toBe("ja:<main>Vegas</main>:Vegas Browser");
      expect(context.renderTemplate()).toBe("<main>&lt;Hello&gt; JA <b>Trusted</b></main>");
      expect(context.evaluateTemplateCode()).toBe("<p>&lt;Vegas&gt;</p>");
      expect(context.evaluateTemplateCodeWithComments()).toBe("<p>\n&lt;Vegas&gt;\n</p>");
      expect(context.renderTemplateFactories()).toBe("<p>JA</p>:<main>&lt;Hello&gt; JA</main>");
    } finally {
      port1.close();
      port2.close();
    }
  });

  test("isolate program globals between worker runtime contexts", () => {
    const firstChannel = new worker.MessageChannel();
    const secondChannel = new worker.MessageChannel();
    const statefulProgram = {
      source: `
globalThis.counter = 0;

function next() {
  globalThis.counter += 1;
  return globalThis.counter;
}
`,
      htmlFiles: {},
    } satisfies Program;

    try {
      const firstContext = createWorkerRuntimeContext({
        program: statefulProgram,
        environment,
        port: firstChannel.port1,
        sharedArray: new Int32Array(new SharedArrayBuffer(4)),
      });
      const secondContext = createWorkerRuntimeContext({
        program: statefulProgram,
        environment,
        port: secondChannel.port1,
        sharedArray: new Int32Array(new SharedArrayBuffer(4)),
      });

      evaluateWorkerProgram(firstContext, statefulProgram.source);
      evaluateWorkerProgram(secondContext, statefulProgram.source);

      expect(firstContext.next()).toBe(1);
      expect(firstContext.next()).toBe(2);
      expect(secondContext.next()).toBe(1);
    } finally {
      firstChannel.port1.close();
      firstChannel.port2.close();
      secondChannel.port1.close();
      secondChannel.port2.close();
    }
  });

  test("keep program evaluation separate from runtime context construction", () => {
    const { port1, port2 } = new worker.MessageChannel();

    try {
      const failingProgram = {
        source: 'throw new TypeError("program initialization failed");',
        htmlFiles: {},
      } satisfies Program;
      const context = createWorkerRuntimeContext({
        program: failingProgram,
        environment,
        port: port1,
        sharedArray: new Int32Array(new SharedArrayBuffer(4)),
      });

      expect(() => evaluateWorkerProgram(context, failingProgram.source)).toThrow(
        "program initialization failed",
      );
    } finally {
      port1.close();
      port2.close();
    }
  });
});
