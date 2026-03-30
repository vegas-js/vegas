import { ServeContext } from "../context";

export class SpreadsheetAppHandler {
  create(ctx: ServeContext, payload: { name: string; rows: number; columns: number }) {
    let id = "";
    do {
      id = String.fromCharCode(
        ...Array.from({ length: 44 }).map(() => {
          let tempId = Math.floor(Math.random() * 61) + 0x2d;
          if (tempId > 0x2d) {
            tempId += 3;
          }
          if (tempId > 0x39) {
            tempId += 7;
          }
          if (tempId > 0x5a) {
            tempId += 6;
          }

          return tempId;
        }),
      );
    } while (ctx.store.spreadsheet.has(id));

    const cells: any[][] = Array.from({ length: payload.rows }).map(() =>
      Array.from({ length: payload.columns }).map(() => ""),
    );
    const sheets = new Map<number, { name: string; cells: any[][] }>();
    sheets.set(0, { name: "sheet1", cells });
    ctx.store.spreadsheet.set(id, { name: payload.name, sheets });

    return id;
  }
  openById(ctx: ServeContext, payload: { id: string }) {
    return ctx.store.spreadsheet.get(payload.id)?.name ?? null;
  }
}
