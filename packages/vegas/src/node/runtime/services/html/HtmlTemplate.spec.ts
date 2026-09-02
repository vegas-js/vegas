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
