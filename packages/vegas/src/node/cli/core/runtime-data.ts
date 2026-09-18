import { RuntimeDataTarget } from "../../../shared/gas";
import type {
  RuntimeDataProperties,
  RuntimeDataSession,
  RuntimeDataSpreadsheet,
} from "../../../shared/gas";
import { loadModule } from "../../module";
import {
  resolvePropertiesNamespace,
  type InvocationScope,
  type PropertiesStore,
} from "../../runtime";

export interface LoadedRuntimeData {
  readonly session?: RuntimeDataSession;
  readonly spreadsheets: readonly RuntimeDataSpreadsheet[];
}

export async function loadRuntimeData(
  projectRoot: string,
  runtimeDataSources: readonly string[],
  propertiesStore: PropertiesStore,
  scope: InvocationScope,
  load: typeof loadModule = loadModule,
): Promise<LoadedRuntimeData> {
  let session: RuntimeDataSession | undefined;
  const spreadsheets: RuntimeDataSpreadsheet[] = [];

  for (const source of runtimeDataSources) {
    const data = await load({ root: projectRoot, filePath: source });

    switch (data.target) {
      case RuntimeDataTarget.Properties: {
        await applyPropertiesRuntimeData(propertiesStore, scope, data);
        break;
      }
      case RuntimeDataTarget.Session: {
        session = data;
        break;
      }
      case RuntimeDataTarget.Spreadsheet: {
        spreadsheets.push(data);
        break;
      }
      // TODO
    }
  }

  return session === undefined ? { spreadsheets } : { session, spreadsheets };
}

export async function applyPropertiesRuntimeData(
  store: PropertiesStore,
  scope: InvocationScope,
  data: RuntimeDataProperties,
) {
  const entries = [
    ["script", data.scriptProperties],
    ["user", data.userProperties],
    ["document", data.documentProperties],
  ] as const;

  for (const [kind, properties] of entries) {
    const namespace = resolvePropertiesNamespace(scope, kind);

    if (namespace) {
      await store.replaceAll(namespace, properties ?? {});
    }
  }
}
