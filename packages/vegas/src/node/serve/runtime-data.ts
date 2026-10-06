import { loadModule } from "../infrastructure/module";
import {
  createRuntimeDataSnapshot,
  type RuntimeDataSnapshot,
  type RuntimeDataSnapshotInput,
  validateRuntimeDataModule,
} from "../runtime-data";

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
