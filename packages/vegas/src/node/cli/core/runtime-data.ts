import type {
  RuntimeDataEntry,
  RuntimeDataProperties,
  RuntimeDataSnapshot,
} from "../../../shared/gas";
import { RuntimeDataTarget } from "../../../shared/gas";
import { loadModule } from "../../module";
import {
  resolvePropertiesNamespace,
  type InvocationScope,
  type PropertiesStore,
} from "../../runtime";
import { validateRuntimeDataModule } from "./runtime-data-validation";

export async function loadRuntimeDataSnapshot(
  projectRoot: string,
  runtimeDataSources: readonly string[],
  load: typeof loadModule = loadModule,
): Promise<RuntimeDataSnapshot> {
  let properties: RuntimeDataEntry<RuntimeDataProperties> | undefined;
  let session: RuntimeDataSnapshot["session"];
  const spreadsheets: RuntimeDataSnapshot["spreadsheets"][number][] = [];
  const spreadsheetSourcesById = new Map<string, string>();
  const spreadsheetSourcesByUrl = new Map<string, string>();

  for (const source of runtimeDataSources) {
    const data = validateRuntimeDataModule(
      await load({ root: projectRoot, filePath: source }),
      source,
    );

    switch (data.target) {
      case RuntimeDataTarget.Properties: {
        if (properties !== undefined) {
          throw new Error(`Duplicate Properties runtime data: ${properties.source}, ${source}`);
        }

        properties = { source, value: data };
        break;
      }
      case RuntimeDataTarget.Session: {
        if (session !== undefined) {
          throw new Error(`Duplicate Session runtime data: ${session.source}, ${source}`);
        }

        session = { source, value: data };
        break;
      }
      case RuntimeDataTarget.Spreadsheet: {
        const existingIdSource = spreadsheetSourcesById.get(data.id);

        if (existingIdSource !== undefined) {
          throw new Error(
            `Duplicate Spreadsheet runtime data id "${data.id}": ${existingIdSource}, ${source}`,
          );
        }

        spreadsheetSourcesById.set(data.id, source);

        if (data.url !== undefined) {
          const existingUrlSource = spreadsheetSourcesByUrl.get(data.url);

          if (existingUrlSource !== undefined) {
            throw new Error(
              `Duplicate Spreadsheet runtime data URL "${data.url}": ${existingUrlSource}, ${source}`,
            );
          }

          spreadsheetSourcesByUrl.set(data.url, source);
        }

        spreadsheets.push({ source, value: data });
        break;
      }
    }
  }

  return {
    ...(properties === undefined ? {} : { properties }),
    ...(session === undefined ? {} : { session }),
    spreadsheets,
  };
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
