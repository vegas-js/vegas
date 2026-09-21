import { describe, expect, test, vi } from "vitest";

import { InMemorySpreadsheetStore, type LocalRuntime } from "../runtime";
import { ReloadableLocalRuntime } from "./reloadable-local-runtime";

function createRuntime(label: string): {
  readonly runtime: LocalRuntime;
  readonly execute: ReturnType<typeof vi.fn>;
} {
  const execute = vi.fn(async () => label);

  return {
    execute,
    runtime: {
      backend: { execute },
      resources: {
        spreadsheets: new InMemorySpreadsheetStore([
          {
            id: label,
            name: label,
            sheets: [],
          },
        ]),
      },
    },
  };
}

describe("ReloadableLocalRuntime", () => {
  test("replace backend and resources together", async () => {
    const first = createRuntime("first");
    const second = createRuntime("second");
    const runtime = new ReloadableLocalRuntime(first.runtime);
    const request = {
      functionName: "main",
      args: [],
    };

    await expect(runtime.execute(request)).resolves.toBe("first");
    await expect(runtime.resources.spreadsheets.getSpreadsheet("first")).resolves.toMatchObject({
      id: "first",
    });

    runtime.replace(second.runtime);

    await expect(runtime.execute(request)).resolves.toBe("second");
    await expect(runtime.resources.spreadsheets.getSpreadsheet("second")).resolves.toMatchObject({
      id: "second",
    });
    await expect(runtime.resources.spreadsheets.getSpreadsheet("first")).rejects.toThrow(
      "Unknown local Spreadsheet: first",
    );

    expect(first.execute).toHaveBeenCalledTimes(1);
    expect(second.execute).toHaveBeenCalledTimes(1);
  });
});
