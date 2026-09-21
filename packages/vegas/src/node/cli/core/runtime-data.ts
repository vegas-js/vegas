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

type RuntimeDataModule =
  | (RuntimeDataProperties & { readonly target: RuntimeDataTarget.Properties })
  | (RuntimeDataSession & { readonly target: RuntimeDataTarget.Session })
  | (RuntimeDataSpreadsheet & { readonly target: RuntimeDataTarget.Spreadsheet })
  | { readonly target: RuntimeDataTarget.Cache };

export interface LoadedRuntimeData {
  readonly session?: RuntimeDataSession;
  readonly spreadsheets: readonly RuntimeDataSpreadsheet[];
}

function requireRuntimeDataModule(value: unknown, source: string): RuntimeDataModule {
  if (typeof value !== "object" || value === null || !("target" in value)) {
    throw new Error(`Runtime data module must export a target: ${source}`);
  }

  switch (value.target) {
    case RuntimeDataTarget.Properties:
    case RuntimeDataTarget.Session:
    case RuntimeDataTarget.Spreadsheet:
    case RuntimeDataTarget.Cache:
      return value as RuntimeDataModule;

    default:
      throw new Error(`Unsupported runtime data target in ${source}: ${String(value.target)}`);
  }
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
    const data = requireRuntimeDataModule(
      await load({ root: projectRoot, filePath: source }),
      source,
    );

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
      case RuntimeDataTarget.Cache: {
        break;
      }
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
