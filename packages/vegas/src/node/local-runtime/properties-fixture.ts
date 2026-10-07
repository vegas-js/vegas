import { resolvePropertiesNamespace, type InvocationScope, type PropertiesStore } from "../runtime";
import type { RuntimeDataProperties } from "../runtime-data/model";

export async function applyPropertiesRuntimeData(
  store: PropertiesStore,
  scope: InvocationScope,
  data: RuntimeDataProperties,
): Promise<void> {
  const entries = [
    ["script", data.scriptProperties],
    ["user", data.userProperties],
    ["document", data.documentProperties],
  ] as const;

  for (const [kind, properties] of entries) {
    const namespace = resolvePropertiesNamespace(scope, kind);

    if (namespace !== undefined) {
      await store.replaceAll(namespace, properties ?? {});
    }
  }
}
