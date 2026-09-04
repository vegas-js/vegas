import { expect, test, vi } from "vitest";

import type { RequestLegacySync } from "../legacy/transport";
import type { RuntimeLogSink } from "../logging";
import type { ServiceCaller } from "../protocol";
import { createScriptRuntime } from "./bootstrap";

function createDependencies(code: string) {
  const requestLegacySync = vi.fn(() => {
    throw new Error("Unexpected legacy runtime request");
  }) as RequestLegacySync;

  const logSink: RuntimeLogSink = {
    write: vi.fn(),
  };

  const callService = vi.fn(() => {
    throw new Error("Unexpected runtime service call");
  }) as unknown as ServiceCaller;

  return {
    code,
    environment: {
      properties: {
        documentProperties: "unavailable",
      },
    } as const,
    requestLegacySync,
    logSink,
    callService,
  };
}

test("evaluates the script and invokes script functions", async () => {
  const runtime = createScriptRuntime(
    createDependencies(`
      function add(left, right) {
        return left + right;
      }
    `),
  );

  await expect(runtime.invoke("add", [2, 3])).resolves.toBe(5);
});

test("evaluates HTML templates in the script context and restores template bindings", async () => {
  const runtime = createScriptRuntime(
    createDependencies(`
      const scriptScopedValue = "script-scope";
      var templateValue = "script-global";

      function renderTemplate() {
        const template = HtmlService.createTemplate(
          "<?= scriptScopedValue ?>|<?= templateValue ?>"
        );

        template.templateValue = "template-binding";

        const content = template.evaluate().getContent();

        return content + "|" + templateValue;
      }
    `),
  );

  await expect(runtime.invoke("renderTemplate", [])).resolves.toBe(
    "script-scope|template-binding|script-global",
  );
});

test("serializes HtmlOutput without exposing its internal X-Frame getter", async () => {
  const runtime = createScriptRuntime(
    createDependencies(`
        function inspectHtmlOutput() {
          const output = HtmlService.createHtmlOutput(
            "<p>content</p>"
          );

          return {
            hasOwnXFrameGetter:
              Object.prototype.hasOwnProperty.call(
                output,
                "getXFrameOptionsMode"
              ),
            xFrameGetterType:
              typeof output.getXFrameOptionsMode
          };
        }

        function doGet() {
          return HtmlService
            .createHtmlOutput("<p>content</p>")
            .setTitle("Vegas");
        }
      `),
  );

  await expect(runtime.invoke("inspectHtmlOutput", [])).resolves.toEqual({
    hasOwnXFrameGetter: false,
    xFrameGetterType: "undefined",
  });

  await expect(runtime.invoke("doGet", [])).resolves.toEqual({
    metaTags: [],
    title: "Vegas",
    faviconUrl: null,
    content: "<p>content</p>",
    xFrameOptionsMode: "SAMEORIGIN",
  });
});
