import type { SpreadsheetTable } from "./spreadsheet-table";

export class SpreadsheetRepositoryKeyConflictError extends Error {
  constructor() {
    super("Spreadsheet repository key must be unique.");
    this.name = "SpreadsheetRepositoryKeyConflictError";
  }
}

export interface SpreadsheetRepository<Row, Key> {
  findByKey(key: Key): Row | undefined;
  insert(row: Row): void;
  updateByKey(key: Key, row: Row): boolean;
  deleteByKey(key: Key): boolean;
}

function findUniqueRowIndex<Row, Key>(
  rows: readonly Row[],
  key: Key,
  getKey: (row: Row) => Key,
): number {
  let index = -1;

  for (let candidateIndex = 0; candidateIndex < rows.length; candidateIndex += 1) {
    const candidate = rows[candidateIndex];

    if (candidate === undefined || !Object.is(getKey(candidate), key)) {
      continue;
    }

    if (index !== -1) {
      throw new SpreadsheetRepositoryKeyConflictError();
    }

    index = candidateIndex;
  }

  return index;
}

function requireAvailableKey<Row, Key>(
  rows: readonly Row[],
  key: Key,
  getKey: (row: Row) => Key,
  excludedIndex = -1,
): void {
  for (let index = 0; index < rows.length; index += 1) {
    if (index === excludedIndex) {
      continue;
    }

    const candidate = rows[index];

    if (candidate !== undefined && Object.is(getKey(candidate), key)) {
      throw new SpreadsheetRepositoryKeyConflictError();
    }
  }
}

export function createSpreadsheetRepository<Row, Key>(
  table: SpreadsheetTable<Row>,
  getKey: (row: Row) => Key,
): SpreadsheetRepository<Row, Key> {
  return {
    findByKey(key): Row | undefined {
      const rows = table.readAll();
      const index = findUniqueRowIndex(rows, key, getKey);

      return index === -1 ? undefined : rows[index];
    },

    insert(row): void {
      const rows = table.readAll();

      requireAvailableKey(rows, getKey(row), getKey);
      table.append(row);
    },

    updateByKey(key, row): boolean {
      const rows = table.readAll();
      const index = findUniqueRowIndex(rows, key, getKey);

      if (index === -1) {
        return false;
      }

      requireAvailableKey(rows, getKey(row), getKey, index);
      table.updateAt(index, row);
      return true;
    },

    deleteByKey(key): boolean {
      const rows = table.readAll();
      const index = findUniqueRowIndex(rows, key, getKey);

      if (index === -1) {
        return false;
      }

      table.deleteAt(index);
      return true;
    },
  };
}
