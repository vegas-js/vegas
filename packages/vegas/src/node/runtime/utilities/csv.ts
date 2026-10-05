// https://developers.google.com/apps-script/reference/utilities/utilities#parsecsvcsv
// https://www.rfc-editor.org/rfc/rfc4180
function assertDelimiter(delimiter: string): void {
  if (delimiter.length !== 1 || delimiter === '"' || delimiter === "\r" || delimiter === "\n") {
    throw new TypeError(
      "CSV delimiter must be a single non-line-break character other than a double quote.",
    );
  }
}

export function parseCsv(csv: string, delimiter: string): string[][] {
  assertDelimiter(delimiter);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let state: "field-start" | "unquoted" | "quoted" | "after-quote" = "field-start";
  let endedWithLineBreak = false;

  const pushField = (): void => {
    row.push(field);
    field = "";
    state = "field-start";
  };

  const pushRow = (): void => {
    pushField();
    rows.push(row);
    row = [];
    endedWithLineBreak = true;
  };

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];

    if (state === "quoted") {
      if (character === '"') {
        if (csv[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          state = "after-quote";
        }
      } else {
        field += character;
      }
      endedWithLineBreak = false;
      continue;
    }

    if (state === "after-quote") {
      if (character === delimiter) {
        pushField();
        endedWithLineBreak = false;
        continue;
      }
      if (character === "\r" || character === "\n") {
        if (character === "\r" && csv[index + 1] === "\n") index += 1;
        pushRow();
        continue;
      }
      throw new SyntaxError("Unexpected character after a quoted CSV field.");
    }

    if (character === delimiter) {
      pushField();
      endedWithLineBreak = false;
      continue;
    }

    if (character === "\r" || character === "\n") {
      if (character === "\r" && csv[index + 1] === "\n") index += 1;
      pushRow();
      continue;
    }

    if (character === '"') {
      if (state !== "field-start") {
        throw new SyntaxError("Unexpected quote in an unquoted CSV field.");
      }
      state = "quoted";
      endedWithLineBreak = false;
      continue;
    }

    field += character;
    state = "unquoted";
    endedWithLineBreak = false;
  }

  if (state === "quoted") {
    throw new SyntaxError("Unterminated quoted CSV field.");
  }

  if (!endedWithLineBreak) {
    pushField();
    rows.push(row);
  }

  return rows;
}
