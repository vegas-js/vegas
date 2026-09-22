import type { RuntimeDataSnapshot } from "../shared/gas";
import { RuntimeDataTarget } from "../shared/gas";
import { createRuntimeDataSnapshot, type RuntimeDataSnapshotInput } from "./runtime-data-snapshot";
import { validateRuntimeDataFixture, type RuntimeDataFixture } from "./runtime-data-validation";

export type { RuntimeDataFixture } from "./runtime-data-validation";

export function createRuntimeDataSnapshotFromFixture(
  fixture: RuntimeDataFixture = {},
): RuntimeDataSnapshot {
  const validated = validateRuntimeDataFixture(fixture);
  const inputs: RuntimeDataSnapshotInput[] = [];

  if (validated.properties !== undefined) {
    inputs.push({
      source: "inline:properties",
      target: RuntimeDataTarget.Properties,
      value: validated.properties,
    });
  }

  if (validated.session !== undefined) {
    inputs.push({
      source: "inline:session",
      target: RuntimeDataTarget.Session,
      value: validated.session,
    });
  }

  validated.spreadsheets?.forEach((value, index) => {
    inputs.push({
      source: `inline:spreadsheets[${index}]`,
      target: RuntimeDataTarget.Spreadsheet,
      value,
    });
  });

  return createRuntimeDataSnapshot(inputs);
}
