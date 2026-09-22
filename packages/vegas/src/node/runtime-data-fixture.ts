import type {
  RuntimeDataProperties,
  RuntimeDataSession,
  RuntimeDataSnapshot,
  RuntimeDataSpreadsheet,
} from "../shared/gas";
import { RuntimeDataTarget } from "../shared/gas";
import { createRuntimeDataSnapshot, type RuntimeDataSnapshotInput } from "./runtime-data-snapshot";

export interface RuntimeDataFixture {
  readonly properties?: RuntimeDataProperties;
  readonly session?: RuntimeDataSession;
  readonly spreadsheets?: readonly RuntimeDataSpreadsheet[];
}

export function createRuntimeDataSnapshotFromFixture(
  fixture: RuntimeDataFixture = {},
): RuntimeDataSnapshot {
  const inputs: RuntimeDataSnapshotInput[] = [];

  if (fixture.properties !== undefined) {
    inputs.push({
      source: "inline:properties",
      target: RuntimeDataTarget.Properties,
      value: fixture.properties,
    });
  }

  if (fixture.session !== undefined) {
    inputs.push({
      source: "inline:session",
      target: RuntimeDataTarget.Session,
      value: fixture.session,
    });
  }

  fixture.spreadsheets?.forEach((value, index) => {
    inputs.push({
      source: `inline:spreadsheets[${index}]`,
      target: RuntimeDataTarget.Spreadsheet,
      value,
    });
  });

  return createRuntimeDataSnapshot(inputs);
}
