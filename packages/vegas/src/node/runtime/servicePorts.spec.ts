import { expect, test, vi } from "vitest";

import type { ServiceCaller } from "./protocol";
import { createRuntimeServicePorts } from "./servicePorts";

test("routes runtime service ports through the service caller", () => {
  const callService = vi.fn(() => "result") as unknown as ServiceCaller;
  const services = createRuntimeServicePorts(callService);

  const sheetPayload = {
    spreadsheetId: "spreadsheet-id",
    sheetId: 7,
  };

  services.sheetService.getSheetName(sheetPayload);

  expect(callService).toHaveBeenLastCalledWith("Sheet", "getSheetName", sheetPayload);

  const rangePayload = {
    spreadsheetId: "spreadsheet-id",
    sheetId: 7,
    range: {
      row: 2,
      column: 3,
    },
  };

  services.rangeService.getValue(rangePayload);

  expect(callService).toHaveBeenLastCalledWith("Range", "getValue", rangePayload);

  services.sessionService.getScriptTimeZone();

  expect(callService).toHaveBeenLastCalledWith("Session", "getScriptTimeZone");

  services.cacheService.put("script", "key", "value", 60);

  expect(callService).toHaveBeenLastCalledWith("Cache", "put", "script", "key", "value", 60);

  services.propertiesService.setProperty("user", "key", "value");

  expect(callService).toHaveBeenLastCalledWith("Properties", "setProperty", "user", "key", "value");
});

test("exposes all runtime service ports required by the GAS global composer", () => {
  const callService = vi.fn() as unknown as ServiceCaller;
  const services = createRuntimeServicePorts(callService);

  expect(Object.keys(services).sort()).toEqual(
    [
      "spreadsheetAppService",
      "sheetService",
      "rangeService",
      "urlFetchService",
      "htmlService",
      "sessionService",
      "cacheService",
      "propertiesService",
    ].sort(),
  );
});
