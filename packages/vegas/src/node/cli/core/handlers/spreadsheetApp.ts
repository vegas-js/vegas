import { ServeContext } from "../context";

export class SpreadsheetAppHandler {
  openById(ctx: ServeContext, payload: { id: string }) {
    return ctx.store.spreadsheet.get(payload.id)?.name ?? null;
  }
}
