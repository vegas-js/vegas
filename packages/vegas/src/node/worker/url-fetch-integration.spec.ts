import vm from "node:vm";

import { describe, expect, test } from "vitest";

import {
  createUrlFetchApp,
  type HostBridge,
  type HostCall,
  type HostCallResult,
  type Program,
} from "../runtime";

class RecordingHostBridge implements HostBridge {
  readonly calls: HostCall[] = [];

  call<C extends HostCall>(call: C): HostCallResult<C> {
    this.calls.push(call);

    if (call.service !== "url-fetch" || call.operation !== "fetch") {
      throw new Error(`unexpected host call: ${call.service}#${call.operation}`);
    }

    return {
      statusCode: 200,
      headers: {
        "content-type": "text/plain",
      },
      content: [86, 101, 103, 97, 115],
    } as unknown as HostCallResult<C>;
  }
}

describe("worker UrlFetch integration", () => {
  test("expose typed UrlFetchApp to runtime programs", () => {
    const program: Program = {
      source: `
function run() {
  const response = UrlFetchApp.fetch("https://example.com/data");
  return response.getResponseCode() + ":" + response.getContentText("UTF-8");
}
`,
      htmlFiles: {},
    };
    const bridge = new RecordingHostBridge();
    const context = vm.createContext({
      UrlFetchApp: createUrlFetchApp(bridge),
    });

    new vm.Script(program.source).runInContext(context);

    expect(context.run()).toBe("200:Vegas");
    expect(bridge.calls).toStrictEqual([
      {
        service: "url-fetch",
        operation: "fetch",
        request: {
          url: "https://example.com/data",
        },
      },
    ]);
  });
});
