import type { RuntimeDataSnapshot } from "../shared/gas";
import {
  InMemoryPropertiesStore,
  InMemorySpreadsheetStore,
  LocalRuntimeSession,
  type InvocationScope,
} from "./runtime";
import { applyPropertiesRuntimeData } from "./runtime-data-properties";

// Google does not define local fixture reset semantics. Vegas rebuilds session-owned state from
// fresh stores and reapplies only the declared Properties and Spreadsheet fixtures.
export async function resetLocalRuntimeSession(
  scope: InvocationScope,
  snapshot: RuntimeDataSnapshot,
): Promise<LocalRuntimeSession> {
  const propertiesStore = new InMemoryPropertiesStore();

  if (snapshot.properties !== undefined) {
    await applyPropertiesRuntimeData(propertiesStore, scope, snapshot.properties.value);
  }

  return new LocalRuntimeSession({
    stores: {
      propertiesStore,
      spreadsheetStore: new InMemorySpreadsheetStore(
        snapshot.spreadsheets.map(({ value }) => value),
      ),
    },
  });
}
