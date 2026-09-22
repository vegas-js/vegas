import type { RuntimeDataSnapshot } from "../../../shared/gas";
import { loadModule } from "../../module";
import {
  createRuntimeDataSnapshot,
  type RuntimeDataSnapshotInput,
} from "../../runtime-data-snapshot";
import { validateRuntimeDataModule } from "./runtime-data-validation";

export async function loadRuntimeDataSnapshot(
  projectRoot: string,
  runtimeDataSources: readonly string[],
  load: typeof loadModule = loadModule,
): Promise<RuntimeDataSnapshot> {
  const inputs: RuntimeDataSnapshotInput[] = [];

  for (const source of runtimeDataSources) {
    const data = validateRuntimeDataModule(
      await load({ root: projectRoot, filePath: source }),
      source,
    );

    inputs.push({ source, ...data });
  }

  return createRuntimeDataSnapshot(inputs);
}
