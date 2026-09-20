import worker from "node:worker_threads";

import { describe, expect, test } from "vitest";

import type { InvocationEnvironment } from "../runtime/invocation";
import type { Program } from "../runtime/program";
import { SpreadsheetApp } from "../runtime/spreadsheet-app";
import { Utilities } from "../runtime/utilities";
import { createWorkerRuntimeContext } from "./runtime-context";

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
`,
  htmlFiles: {
    "index.html": "<main>Vegas</main>",
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
      expect(context.run()).toBe("ja:<main>Vegas</main>:Vegas Browser");
    } finally {
      port1.close();
      port2.close();
    }
  });
});
