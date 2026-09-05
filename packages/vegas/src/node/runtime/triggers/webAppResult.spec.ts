import { expect, test, vi } from "vitest";

import { createScriptRuntime, type ScriptRuntimeDependencies } from "../execution";
import type { RequestLegacySync } from "../legacy/transport";
import type { RuntimeLogSink } from "../logging";
import type { ServiceCaller } from "../protocol";
import { executeWebAppTrigger } from "./webAppExecution";
import { projectWebAppResult } from "./webAppResult";

function createDependencies(code: string): ScriptRuntimeDependencies {
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
    },

    requestLegacySync,
    logSink,
    callService,
  };
}

async function execute(code: string, method: "GET" | "POST") {
  const runtime = createScriptRuntime(createDependencies(code));

  const execution = await executeWebAppTrigger(runtime, {
    method,
  });

  return projectWebAppResult(execution);
}

test("projects HtmlOutput results from predefined web app handlers", async () => {
  const code = `
      function createResult() {
        return HtmlService
          .createHtmlOutput(
            "<p>vegas</p>"
          )
          .setTitle(
            "Vegas"
          )
          .setFaviconUrl(
            "https://example.com/favicon.ico"
          )
          .addMetaTag(
            "viewport",
            "width=device-width"
          )
          .setXFrameOptionsMode(
            HtmlService
              .XFrameOptionsMode
              .ALLOWALL
          );
      }

      function doGet() {
        return createResult();
      }

      function doPost() {
        return createResult();
      }
    `;

  for (const method of ["GET", "POST"] as const) {
    await expect(execute(code, method)).resolves.toEqual({
      kind: "html",

      content: "<p>vegas</p>",

      title: "Vegas",

      faviconUrl: "https://example.com/favicon.ico",

      metaTags: [
        {
          name: "viewport",

          content: "width=device-width",
        },
      ],

      xFrameOptionsMode: undefined,
    });
  }
});

test("projects TextOutput results from predefined web app handlers", async () => {
  const code = `
      function createResult() {
        return ContentService
          .createTextOutput(
            '{"ok":true}'
          )
          .setMimeType(
            ContentService
              .MimeType
              .JSON
          )
          .downloadAsFile(
            "result.json"
          );
      }

      function doGet() {
        return createResult();
      }

      function doPost() {
        return createResult();
      }
    `;

  for (const method of ["GET", "POST"] as const) {
    await expect(execute(code, method)).resolves.toEqual({
      kind: "text",

      content: '{"ok":true}',

      mimeType: "JSON",

      fileName: "result.json",
    });
  }
});

test("classifies unsupported web app return values", async () => {
  const code = `
      function doGet() {
        return {
          value:
            "unsupported"
        };
      }
    `;

  await expect(execute(code, "GET")).resolves.toEqual({
    kind: "unsupported",
  });
});

test("does not accept lookalike objects as GAS web app outputs", async () => {
  const code = `
      function doGet() {
        return {
          getContent() {
            return "fake";
          },

          getMimeType() {
            return "TEXT";
          },

          getFileName() {
            return null;
          }
        };
      }
    `;

  await expect(execute(code, "GET")).resolves.toEqual({
    kind: "unsupported",
  });
});
