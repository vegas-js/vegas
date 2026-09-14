import path from "node:path";

import type { ServeContext } from "../context";

export class HtmlServiceHandler {
  createHtmlOutputFromFile(ctx: ServeContext, payload: any) {
    const filePath = `${path.join(ctx.project.outputDir, path.parse(payload).name)}.html`;
    const html = ctx.vfs.readFileSync(filePath, "utf8");
    return html;
  }
}
