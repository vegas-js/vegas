import type { SpreadsheetTable } from "./spreadsheet-table";

export interface SpreadsheetRepository<Row, Key> {
  findByKey(key: Key): Row | undefined;
  insert(row: Row): void;
  updateByKey(key: Key, row: Row): boolean;
  deleteByKey(key: Key): boolean;
}

export function createSpreadsheetRepository<Row, Key>(
  table: SpreadsheetTable<Row>,
  getKey: (row: Row) => Key,
): SpreadsheetRepository<Row, Key> {
  return {
    findByKey(key): Row | undefined {
      return table.readAll().find((row) => Object.is(getKey(row), key));
    },

    insert(row): void {
      table.append(row);
    },

    updateByKey(key, row): boolean {
      const index = table.readAll().findIndex((candidate) => Object.is(getKey(candidate), key));

      if (index === -1) {
        return false;
      }

      table.updateAt(index, row);
      return true;
    },

    deleteByKey(key): boolean {
      const index = table.readAll().findIndex((candidate) => Object.is(getKey(candidate), key));

      if (index === -1) {
        return false;
      }

      table.deleteAt(index);
      return true;
    },
  };
}
