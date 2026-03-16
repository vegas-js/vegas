import path from "node:path";

import { ServeContext } from "../context";

export class HtmlServiceHandler {
  createHtmlOutputFromFile(ctx: ServeContext, payload: any) {
    const filePath = `${path.parse(payload).name}.html`;
    const html = ctx.code.web.map.get(filePath);
    return html;
  }
}
