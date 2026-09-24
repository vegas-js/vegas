import type { RuntimeDataSnapshot } from "../shared/gas";
import {
  InMemoryPropertiesStore,
  InMemorySpreadsheetStore,
  LocalRuntimeSession,
  type InvocationScope,
} from "./runtime";
import { applyPropertiesRuntimeData } from "./runtime-data-properties";

// Google does not define local fixture initialization or reset semantics. Vegas builds session-owned
// state from fresh stores and applies only the declared Properties and Spreadsheet fixtures.
export async function createSeededLocalRuntimeSession(
  scope: InvocationScope,
  snapshot: RuntimeDataSnapshot,
) {
  const propertiesStore = new InMemoryPropertiesStore();

  if (snapshot.properties !== undefined) {
    await applyPropertiesRuntimeData(propertiesStore, scope, snapshot.properties.value);
  }

  const spreadsheetStore = new InMemorySpreadsheetStore(
    snapshot.spreadsheets.map(({ value }) => value),
  );
  const session = new LocalRuntimeSession({
    stores: {
      propertiesStore,
      spreadsheetStore,
    },
  });

  return {
    session,
    propertiesStore,
    spreadsheetStore,
  };
}

export async function resetLocalRuntimeSession(
  scope: InvocationScope,
  snapshot: RuntimeDataSnapshot,
): Promise<LocalRuntimeSession> {
  return (await createSeededLocalRuntimeSession(scope, snapshot)).session;
}
