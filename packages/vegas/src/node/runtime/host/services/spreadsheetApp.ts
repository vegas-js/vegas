import type { RuntimeServiceImplementation } from "../../protocol";
import type { SpreadsheetStore } from "./range";

export class SpreadsheetAppHandler implements RuntimeServiceImplementation<"SpreadsheetApp"> {
  readonly #store: SpreadsheetStore;

  constructor(store: SpreadsheetStore) {
    this.#store = store;
  }

  create(payload: { name: string; rows: number; columns: number }) {
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
    } while (this.#store.has(id));

    const cells: any[][] = Array.from({ length: payload.rows }).map(() =>
      Array.from({ length: payload.columns }).map(() => ""),
    );
    const sheets = new Map<number, { name: string; cells: any[][] }>();
    sheets.set(0, { name: "Sheet1", cells });
    this.#store.set(id, { name: payload.name, sheets });

    return id;
  }
}
