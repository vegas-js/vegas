import worker from "node:worker_threads";

import { describe, expect, test } from "vitest";

import { HtmlOutput } from "../runtime/html-output";
import type { InvocationEnvironment } from "../runtime/invocation";
import type { Program } from "../runtime/program";
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
function evaluateTemplateContract() {
  const template = HtmlService.createTemplate(
    "<main><?= greeting ?> <?!= trusted ?></main>",
  );
  template.greeting = "<Hello>";
  template.trusted = "<b>Trusted</b>";

  return template.evaluate();
}

function getTemplateCodeContract() {
  return HtmlService.createTemplate("<p><?= value ?></p>").getCode();
}

function evaluateTemplateCodeContract() {
  const value = "<Vegas>";
  const code = HtmlService.createTemplate("<p><?= value ?></p>").getCode();

  return eval(code);
}

function getTemplateCodeWithCommentsContract() {
  return HtmlService
    .createTemplate("<p>\\n<?= value ?>\\n</p>")
    .getCodeWithComments();
}

function evaluateTemplateCodeWithCommentsContract() {
  const value = "<Vegas>";
  const code = HtmlService
    .createTemplate("<p>\\n<?= value ?>\\n</p>")
    .getCodeWithComments();

  return eval(code);
}

function getRawTemplateContentContract() {
  return HtmlService.createTemplate("<p><?= value ?></p>").getRawContent();
}
`,
  htmlFiles: {},
} satisfies Program;

// Public contract:
// https://developers.google.com/apps-script/reference/html/html-template
describe("HtmlTemplate public contract", () => {
  test("evaluate templates and expose evaluable generated code and raw content", () => {
    const { port1, port2 } = new worker.MessageChannel();

    try {
      const context = createWorkerRuntimeContext({
        program,
        environment,
        port: port1,
        sharedArray: new Int32Array(new SharedArrayBuffer(4)),
      });

      evaluateWorkerProgram(context, program.source);

      const evaluated = context.evaluateTemplateContract();

      expect(evaluated).toBeInstanceOf(HtmlOutput);
      expect(evaluated.getContent()).toBe("<main>&lt;Hello&gt; <b>Trusted</b></main>");

      const code = context.getTemplateCodeContract();
      const codeOutput = context.evaluateTemplateCodeContract();

      expect(code).toEqual(expect.any(String));
      expect(codeOutput).toBeInstanceOf(HtmlOutput);
      expect(codeOutput.getContent()).toBe("<p>&lt;Vegas&gt;</p>");

      const commentedCode = context.getTemplateCodeWithCommentsContract();
      const commentedLines = commentedCode.split("\n");
      const commentedOutput = context.evaluateTemplateCodeWithCommentsContract();

      expect(commentedCode).toEqual(expect.any(String));
      expect(commentedLines).toHaveLength(4);
      expect(commentedLines[0]).toContain("// 1: <p>");
      expect(commentedLines[1]).toContain("// 2: <?= value ?>");
      expect(commentedLines[2]).toContain("// 3: </p>");
      expect(commentedLines[3]).toContain("// 3: </p>");
      expect(commentedOutput).toBeInstanceOf(HtmlOutput);
      expect(commentedOutput.getContent()).toBe("<p>\n&lt;Vegas&gt;\n</p>");

      expect(context.getRawTemplateContentContract()).toBe("<p><?= value ?></p>");
    } finally {
      port1.close();
      port2.close();
    }
  });
});
