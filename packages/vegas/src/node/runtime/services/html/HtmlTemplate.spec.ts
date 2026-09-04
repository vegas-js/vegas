import { expect, test, vi } from "vitest";

import { HtmlTemplate } from "./HtmlTemplate";

test("evaluate", () => {
  const output = {};
  const evaluator = vi.fn(() => output as any);
  const template = new HtmlTemplate("<p><?= name ?></p>", evaluator);
  template.name = "Vegas";

  expect(template.evaluate()).toBe(output);
  expect(evaluator).toHaveBeenCalledWith(expect.any(String), {
    name: "Vegas",
  });
  expect((evaluator.mock.calls[0] as any)[0]).toContain("name");
});

test("parses statement blocks containing semicolons", () => {
  const evaluator = vi.fn(() => ({}) as any);

  const template = new HtmlTemplate(
    [
      "<? for (var i = 0; i < items.length; i++) { ?>",
      "<span><?= items[i] ?></span>",
      "<? } ?>",
    ].join(""),
    evaluator,
  );

  const generated = template.getCode();

  expect(() => {
    new Function("HtmlService", "items", `return ${generated};`);
  }).not.toThrow();

  expect(generated).toContain("for (var i = 0; i < items.length; i++) {");

  expect(generated).toContain("output._$ = ( items[i] );");
});
