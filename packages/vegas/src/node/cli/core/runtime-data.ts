import { RuntimeDataTarget } from "../../../shared/gas";
import type { RuntimeDataProperties, RuntimeDataSession } from "../../../shared/gas";
import { loadModule } from "../../module";
import {
  resolvePropertiesNamespace,
  type InvocationScope,
  type PropertiesStore,
} from "../../runtime";

export interface LoadedRuntimeData {
  readonly session?: RuntimeDataSession;
}

export async function loadRuntimeData(
  projectRoot: string,
  runtimeDataSources: readonly string[],
  propertiesStore: PropertiesStore,
  scope: InvocationScope,
): Promise<LoadedRuntimeData> {
  let session: RuntimeDataSession | undefined;

  for (const source of runtimeDataSources) {
    const data = await loadModule({ root: projectRoot, filePath: source });

    switch (data.target) {
      case RuntimeDataTarget.Properties: {
        await applyPropertiesRuntimeData(propertiesStore, scope, data);
        break;
      }
      case RuntimeDataTarget.Session: {
        session = data;
        break;
      }
      // TODO
    }
  }

  return session === undefined ? {} : { session };
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
