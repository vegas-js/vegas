import { describe, expect, test } from "vitest";

import type { HostBridge } from "./host-bridge";
import type { HostCall, HostCallResult } from "./host-call";
import { InMemorySpreadsheetStore } from "./in-memory-spreadsheet-store";
import { SpreadsheetHostHandler } from "./spreadsheet-host-handler";
import type { SpreadsheetObjectHydrator } from "./spreadsheet-hydrator";
import type { SpreadsheetReference } from "./spreadsheet-reference";
import { Spreadsheet } from "./spreadsheet-spreadsheet";

const spreadsheetReference = {
  service: "spreadsheet",
  kind: "spreadsheet",
  id: "spreadsheet-a",
} satisfies SpreadsheetReference;

class RecordingHostBridge implements HostBridge {
  readonly calls: HostCall[] = [];
  readonly #respond: (call: HostCall) => unknown;

  constructor(respond: (call: HostCall) => unknown) {
    this.#respond = respond;
  }

  call<C extends HostCall>(call: C): HostCallResult<C> {
    this.calls.push(call);
    return this.#respond(call) as HostCallResult<C>;
  }
}

describe("Spreadsheet locale and time zone", () => {
  test("route locale and time zone operations through the HostBridge", () => {
    let locale = "en_US";
    let timeZone = "Etc/UTC";
    const bridge = new RecordingHostBridge((call) => {
      if (call.service !== "spreadsheet") {
        throw new Error(`unexpected service: ${call.service}`);
      }

      switch (call.operation) {
        case "get-spreadsheet-locale":
          return locale;
        case "get-spreadsheet-time-zone":
          return timeZone;
        case "set-spreadsheet-locale":
          locale = call.locale;
          return undefined;
        case "set-spreadsheet-time-zone":
          timeZone = call.timeZone;
          return undefined;
        default:
          throw new Error(`unexpected host call: ${call.service}#${call.operation}`);
      }
    });
    const hydrator = {
      hydrate: () => {
        throw new Error("unexpected hydration");
      },
    } as SpreadsheetObjectHydrator;
    const spreadsheet = new Spreadsheet(bridge, spreadsheetReference, hydrator);

    expect(spreadsheet.getSpreadsheetLocale()).toBe("en_US");
    expect(spreadsheet.getSpreadsheetTimeZone()).toBe("Etc/UTC");
    expect(spreadsheet.setSpreadsheetLocale("fr")).toBeUndefined();
    expect(spreadsheet.setSpreadsheetTimeZone("Europe/Paris")).toBeUndefined();
    expect(spreadsheet.getSpreadsheetLocale()).toBe("fr");
    expect(spreadsheet.getSpreadsheetTimeZone()).toBe("Europe/Paris");
    expect(bridge.calls.map(({ operation }) => operation)).toStrictEqual([
      "get-spreadsheet-locale",
      "get-spreadsheet-time-zone",
      "set-spreadsheet-locale",
      "set-spreadsheet-time-zone",
      "get-spreadsheet-locale",
      "get-spreadsheet-time-zone",
    ]);
  });

  test("persist deterministic local defaults and reset fixture state on replacement", async () => {
    const seed = {
      id: "spreadsheet-a",
      name: "Budget",
      sheets: [
        {
          id: 7,
          name: "Summary",
          maxRows: 10,
          maxColumns: 8,
        },
      ],
    } as const;
    const store = new InMemorySpreadsheetStore([seed]);
    const handler = new SpreadsheetHostHandler(store);

    await expect(
      handler.handle({
        service: "spreadsheet",
        operation: "get-spreadsheet-locale",
        spreadsheet: spreadsheetReference,
      }),
    ).resolves.toBe("en_US");
    await expect(
      handler.handle({
        service: "spreadsheet",
        operation: "get-spreadsheet-time-zone",
        spreadsheet: spreadsheetReference,
      }),
    ).resolves.toBe("Etc/UTC");

    await handler.handle({
      service: "spreadsheet",
      operation: "set-spreadsheet-locale",
      spreadsheet: spreadsheetReference,
      locale: "fr",
    });
    await handler.handle({
      service: "spreadsheet",
      operation: "set-spreadsheet-time-zone",
      spreadsheet: spreadsheetReference,
      timeZone: "Europe/Paris",
    });

    const clone = store.clone();
    await expect(clone.getSpreadsheetLocale(spreadsheetReference)).resolves.toBe("fr");
    await expect(clone.getSpreadsheetTimeZone(spreadsheetReference)).resolves.toBe("Europe/Paris");

    store.replaceFixtureSpreadsheet(seed);
    await expect(store.getSpreadsheetLocale(spreadsheetReference)).resolves.toBe("en_US");
    await expect(store.getSpreadsheetTimeZone(spreadsheetReference)).resolves.toBe("Etc/UTC");

    const runtimeCreated = await store.createSpreadsheet("Runtime created", 3, 4);
    await expect(store.getSpreadsheetLocale(runtimeCreated)).resolves.toBe("en_US");
    await expect(store.getSpreadsheetTimeZone(runtimeCreated)).resolves.toBe("Etc/UTC");
  });
});
