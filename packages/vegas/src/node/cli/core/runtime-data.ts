import { RuntimeDataTarget } from "../../../shared/gas";
import type { RuntimeDataProperties } from "../../../shared/gas";
import { loadModule } from "../../module";
import {
  resolvePropertiesNamespace,
  type InvocationScope,
  type PropertiesStore,
} from "../../runtime";
import type { ServeContext } from "./context";

export async function loadRuntimeData(
  ctx: ServeContext,
  runtimeDataSources: readonly string[],
  propertiesStore: PropertiesStore,
  scope: InvocationScope,
) {
  for (const source of runtimeDataSources) {
    const data = await loadModule({ root: ctx.project.root, filePath: source });

    switch (data.target) {
      case RuntimeDataTarget.Properties: {
        await applyPropertiesRuntimeData(propertiesStore, scope, data);
        break;
      }
      case RuntimeDataTarget.Session: {
        ctx.mock[data.target] = data;
        break;
      }
      // TODO
    }
  }
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
