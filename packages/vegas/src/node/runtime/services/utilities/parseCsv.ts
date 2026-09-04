import { createGasException } from "./gasException";

export function parseCsv(csv: string, delimiter = ","): string[][] {
  if (delimiter.length !== 1) {
    throw createGasException(`Cannot convert '${delimiter}' to char.`);
  }

  if (csv === "") {
    return [];
  }

  const rows: string[][] = [];

  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let endedWithRecordSeparator = false;

  for (let index = 0; index < csv.length; index++) {
    const character = csv[index];

    if (inQuotes) {
      if (character === '"') {
        if (csv[index + 1] === '"') {
          field += '"';
          index++;
        } else {
          inQuotes = false;
        }
      } else {
        field += character;
      }

      endedWithRecordSeparator = false;
      continue;
    }

    if (character === '"' && field === "") {
      inQuotes = true;
      endedWithRecordSeparator = false;
      continue;
    }

    if (character === delimiter) {
      row.push(field);
      field = "";
      endedWithRecordSeparator = false;
      continue;
    }

    if (character === "\r" || character === "\n") {
      if (character === "\r" && csv[index + 1] === "\n") {
        index++;
      }

      row.push(field);
      rows.push(row);

      row = [];
      field = "";
      endedWithRecordSeparator = true;
      continue;
    }

    field += character;
    endedWithRecordSeparator = false;
  }

  if (!endedWithRecordSeparator) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}
