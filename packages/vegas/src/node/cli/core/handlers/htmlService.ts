import path from "node:path";

import type { ServeContext } from "../context";

export class HtmlServiceHandler {
  createHtmlOutputFromFile(ctx: ServeContext, payload: any) {
    const filePath = `${path.parse(payload).name}.html`;

    return ctx.artifacts.readText(filePath);
  }
}
