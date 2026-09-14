import { MockTarget } from "../../../shared/gas";
import { loadModule } from "../../module";
import type { ServeContext } from "./context";

export async function loadMock(ctx: ServeContext, gasMockSources: readonly string[]) {
  for (const source of gasMockSources) {
    const mock = await loadModule({ root: ctx.project.root, filePath: source });

    switch (mock.target) {
      case MockTarget.Properties: {
        ctx.store.properties.document = mock?.documentProperties ?? {};
        ctx.store.properties.script = mock?.scriptProperties ?? {};
        ctx.store.properties.user = mock?.userProperties ?? {};
        break;
      }
      case MockTarget.Session: {
        ctx.mock[mock.target] = mock;
        break;
      }
      // TODO
    }
  }
}
