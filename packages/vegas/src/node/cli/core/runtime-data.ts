import { RuntimeDataTarget } from "../../../shared/gas";
import { loadModule } from "../../module";
import type { ServeContext } from "./context";

export async function loadRuntimeData(ctx: ServeContext, runtimeDataSources: readonly string[]) {
  for (const source of runtimeDataSources) {
    const data = await loadModule({ root: ctx.project.root, filePath: source });

    switch (data.target) {
      case RuntimeDataTarget.Properties: {
        ctx.store.properties.document = data?.documentProperties ?? {};
        ctx.store.properties.script = data?.scriptProperties ?? {};
        ctx.store.properties.user = data?.userProperties ?? {};
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
