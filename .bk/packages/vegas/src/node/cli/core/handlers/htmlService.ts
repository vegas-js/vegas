import path from "node:path";

import { ServeContext } from "../context";

export class HtmlServiceHandler {
  createHtmlOutputFromFile(ctx: ServeContext, payload: any) {
    const filePath = `${path.join(ctx.config.output.dir, path.parse(payload).name)}.html`;
    const html = ctx.vfs.readFileSync(filePath, "utf8");
    return html;
  }
}
