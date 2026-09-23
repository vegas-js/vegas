import { UnsupportedRuntimeOperationError } from "./unsupported-runtime-operation-error";

// Google Apps Script Utilities.formatDate/parseDate explicitly use Java SE 7 SimpleDateFormat patterns.
// Vegas implements the locale-independent numeric/time-zone subset from the public Java contract.
// Locale/calendar-dependent patterns remain explicit unsupported behavior until Runtime locale semantics exist.

type UtilitiesDateOperation = "Utilities.formatDate()" | "Utilities.parseDate()";

type PatternToken =
  | { readonly kind: "literal"; readonly value: string }
  | { readonly kind: "field"; readonly symbol: string; readonly count: number };

const SUPPORTED_PATTERN_LETTERS = new Set([
  "y",
  "M",
  "D",
  "d",
  "u",
  "H",
  "k",
  "K",
  "h",
  "m",
  "s",
  "S",
  "Z",
  "X",
]);
const LOCALE_OR_CALENDAR_DEPENDENT_PATTERN_LETTERS = new Set([
  "G",
  "Y",
  "w",
  "W",
  "F",
  "E",
  "a",
  "z",
]);

function isAsciiLetter(character: string): boolean {
  return /^[A-Za-z]$/.test(character);
}

function tokenizePattern(pattern: string, operation: UtilitiesDateOperation): PatternToken[] {
  const tokens: PatternToken[] = [];
  let literal = "";

  const pushLiteral = (): void => {
    if (literal.length > 0) {
      tokens.push({ kind: "literal", value: literal });
      literal = "";
    }
  };

  for (let index = 0; index < pattern.length;) {
    const character = pattern[index];

    if (character === "'") {
      if (pattern[index + 1] === "'") {
        literal += "'";
        index += 2;
        continue;
      }

      index += 1;
      let closed = false;
      while (index < pattern.length) {
        if (pattern[index] !== "'") {
          literal += pattern[index];
          index += 1;
          continue;
        }
        if (pattern[index + 1] === "'") {
          literal += "'";
          index += 2;
          continue;
        }
        index += 1;
        closed = true;
        break;
      }
      if (!closed) {
        throw new RangeError("Unterminated quote in SimpleDateFormat pattern.");
      }
      continue;
    }

    if (!isAsciiLetter(character)) {
      literal += character;
      index += 1;
      continue;
    }

    pushLiteral();
    let count = 1;
    while (pattern[index + count] === character) count += 1;

    if (LOCALE_OR_CALENDAR_DEPENDENT_PATTERN_LETTERS.has(character)) {
      throw new UnsupportedRuntimeOperationError(
        operation,
        `SimpleDateFormat pattern '${character}' requires locale or calendar semantics.`,
      );
    }
    if (!SUPPORTED_PATTERN_LETTERS.has(character)) {
      throw new RangeError(`Unsupported SimpleDateFormat pattern letter '${character}'.`);
    }
    if (character === "M" && count >= 3) {
      throw new UnsupportedRuntimeOperationError(
        operation,
        "SimpleDateFormat textual month patterns require locale semantics.",
      );
    }
    if (character === "X" && count > 3) {
      throw new RangeError("SimpleDateFormat pattern X supports at most three letters.");
    }

    tokens.push({ kind: "field", symbol: character, count });
    index += count;
  }

  pushLiteral();
  return tokens;
}

function padNumber(value: number, width: number): string {
  return Math.trunc(value).toString().padStart(width, "0");
}

function parseFixedTimeZone(timeZone: string): number | null {
  if (timeZone === "GMT" || timeZone === "UTC" || timeZone === "Etc/UTC") {
    return 0;
  }
  const match = /^GMT([+-])(\d{1,2}):(\d{2})$/.exec(timeZone);
  if (!match) {
    return null;
  }
  const hours = Number(match[2]);
  const minutes = Number(match[3]);
  if (hours > 23 || minutes > 59) {
    throw new RangeError(`Invalid time zone: ${timeZone}`);
  }
  const offset = (hours * 60 + minutes) * 60_000;
  return match[1] === "+" ? offset : -offset;
}

function utcMilliseconds(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0,
): number {
  const date = new Date(0);
  date.setUTCFullYear(year, month, day);
  date.setUTCHours(hour, minute, second, millisecond);
  return date.getTime();
}

function createZonedFormatter(timeZone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("en-US-u-ca-gregory-nu-latn", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
}

function timeZoneOffsetMilliseconds(date: Date, timeZone: string): number {
  const fixed = parseFixedTimeZone(timeZone);
  if (fixed !== null) {
    return fixed;
  }

  const values = new Map<string, number>();
  for (const part of createZonedFormatter(timeZone).formatToParts(date)) {
    if (part.type !== "literal") {
      values.set(part.type, Number(part.value));
    }
  }

  return (
    utcMilliseconds(
      values.get("year") ?? 0,
      (values.get("month") ?? 1) - 1,
      values.get("day") ?? 1,
      values.get("hour") ?? 0,
      values.get("minute") ?? 0,
      values.get("second") ?? 0,
      date.getUTCMilliseconds(),
    ) - date.getTime()
  );
}

interface ZonedFields {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly dayOfYear: number;
  readonly dayOfWeek: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  readonly millisecond: number;
  readonly offsetMilliseconds: number;
}

function getZonedFields(date: Date, timeZone: string): ZonedFields {
  if (!Number.isFinite(date.getTime())) {
    throw new RangeError("Invalid date.");
  }
  const offsetMilliseconds = timeZoneOffsetMilliseconds(date, timeZone);
  const local = new Date(date.getTime() + offsetMilliseconds);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth() + 1;
  const day = local.getUTCDate();
  const dayOfYear =
    Math.floor((utcMilliseconds(year, month - 1, day) - utcMilliseconds(year, 0, 1)) / 86_400_000) +
    1;
  const sundayBasedDay = local.getUTCDay();

  return {
    year,
    month,
    day,
    dayOfYear,
    dayOfWeek: sundayBasedDay === 0 ? 7 : sundayBasedDay,
    hour: local.getUTCHours(),
    minute: local.getUTCMinutes(),
    second: local.getUTCSeconds(),
    millisecond: local.getUTCMilliseconds(),
    offsetMilliseconds,
  };
}

function formatOffset(offsetMilliseconds: number, symbol: "Z" | "X", count: number): string {
  if (symbol === "X" && offsetMilliseconds === 0) {
    return "Z";
  }
  const sign = offsetMilliseconds < 0 ? "-" : "+";
  const totalMinutes = Math.floor(Math.abs(offsetMilliseconds) / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (symbol === "Z") {
    return `${sign}${padNumber(hours, 2)}${padNumber(minutes, 2)}`;
  }
  if (count === 1) {
    return `${sign}${padNumber(hours, 2)}`;
  }
  if (count === 2) {
    return `${sign}${padNumber(hours, 2)}${padNumber(minutes, 2)}`;
  }
  return `${sign}${padNumber(hours, 2)}:${padNumber(minutes, 2)}`;
}

function formatField(token: Extract<PatternToken, { kind: "field" }>, fields: ZonedFields): string {
  const { symbol, count } = token;
  switch (symbol) {
    case "y": {
      const year = fields.year > 0 ? fields.year : 1 - fields.year;
      return count === 2 ? padNumber(year % 100, 2) : padNumber(year, count);
    }
    case "M":
      return padNumber(fields.month, count);
    case "D":
      return padNumber(fields.dayOfYear, count);
    case "d":
      return padNumber(fields.day, count);
    case "u":
      return padNumber(fields.dayOfWeek, count);
    case "H":
      return padNumber(fields.hour, count);
    case "k":
      return padNumber(fields.hour === 0 ? 24 : fields.hour, count);
    case "K":
      return padNumber(fields.hour % 12, count);
    case "h":
      return padNumber(fields.hour % 12 || 12, count);
    case "m":
      return padNumber(fields.minute, count);
    case "s":
      return padNumber(fields.second, count);
    case "S":
      return padNumber(fields.millisecond, count);
    case "Z":
    case "X":
      return formatOffset(fields.offsetMilliseconds, symbol, count);
    default:
      throw new RangeError(`Unsupported SimpleDateFormat field '${symbol}'.`);
  }
}

export function formatSimpleDate(date: Date, timeZone: string, pattern: string): string {
  const tokens = tokenizePattern(pattern, "Utilities.formatDate()");
  const fields = getZonedFields(date, timeZone);
  return tokens
    .map((token) => (token.kind === "literal" ? token.value : formatField(token, fields)))
    .join("");
}

interface ParsedFields {
  year?: number;
  month?: number;
  day?: number;
  dayOfYear?: number;
  dayOfWeek?: number;
  hour?: number;
  minute?: number;
  second?: number;
  millisecond?: number;
  offsetMilliseconds?: number;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isNumericField(token: PatternToken | undefined): boolean {
  return (
    token?.kind === "field" &&
    ["y", "M", "D", "d", "u", "H", "k", "K", "h", "m", "s", "S"].includes(token.symbol)
  );
}

function numericPattern(count: number, adjacentNumericField: boolean): string {
  return adjacentNumericField ? `\\d{${count}}` : "\\d+";
}

function fieldRegex(
  token: Extract<PatternToken, { kind: "field" }>,
  adjacentNumericField: boolean,
): string {
  const { symbol, count } = token;
  switch (symbol) {
    case "y":
    case "M":
    case "d":
    case "H":
    case "k":
    case "K":
    case "h":
    case "m":
    case "s":
    case "D":
    case "S":
      return numericPattern(count, adjacentNumericField);
    case "u":
      throw new UnsupportedRuntimeOperationError(
        "Utilities.parseDate()",
        "SimpleDateFormat pattern 'u' parsing is not implemented.",
      );
    case "Z":
      return "(?:[+-]\\d{4}|GMT[+-]\\d{1,2}:\\d{2})";
    case "X":
      if (count === 1) {
        return "(?:Z|[+-]\\d{2})";
      }
      if (count === 2) {
        return "(?:Z|[+-]\\d{4})";
      }
      return "(?:Z|[+-]\\d{2}:\\d{2})";
    default:
      throw new RangeError(`Unsupported SimpleDateFormat field '${symbol}'.`);
  }
}

function parseOffset(value: string): number {
  if (value === "Z") {
    return 0;
  }
  const normalized = value.startsWith("GMT") ? value.slice(3) : value;
  const match = /^([+-])(\d{2}|\d{1,2})(?::?(\d{2}))?$/.exec(normalized);
  if (!match) {
    throw new RangeError(`Invalid time zone offset: ${value}`);
  }
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? 0);
  if (hours > 23 || minutes > 59) {
    throw new RangeError(`Invalid time zone offset: ${value}`);
  }
  const offset = (hours * 60 + minutes) * 60_000;
  return match[1] === "+" ? offset : -offset;
}

function resolveTwoDigitYear(value: number): number {
  const startYear = new Date().getUTCFullYear() - 80;
  const century = Math.floor(startYear / 100) * 100;
  let year = century + value;
  if (year < startYear) {
    year += 100;
  }
  return year;
}

function applyParsedField(
  fields: ParsedFields,
  token: Extract<PatternToken, { kind: "field" }>,
  value: string,
): void {
  const number = token.symbol === "Z" || token.symbol === "X" ? 0 : Number(value);
  switch (token.symbol) {
    case "y":
      fields.year = token.count <= 2 && value.length === 2 ? resolveTwoDigitYear(number) : number;
      break;
    case "M":
      fields.month = number;
      break;
    case "D":
      fields.dayOfYear = number;
      break;
    case "d":
      fields.day = number;
      break;
    case "u":
      fields.dayOfWeek = number;
      break;
    case "H":
      fields.hour = number;
      break;
    case "k":
      fields.hour = number === 24 ? 0 : number;
      break;
    case "K":
      fields.hour = number;
      break;
    case "h":
      fields.hour = number === 12 ? 0 : number;
      break;
    case "m":
      fields.minute = number;
      break;
    case "s":
      fields.second = number;
      break;
    case "S":
      fields.millisecond = number;
      break;
    case "Z":
    case "X":
      fields.offsetMilliseconds = parseOffset(value);
      break;
  }
}

function localEpochMilliseconds(fields: ParsedFields): number {
  const year = fields.year ?? 1970;
  if (fields.dayOfYear !== undefined) {
    return utcMilliseconds(
      year,
      0,
      fields.dayOfYear,
      fields.hour ?? 0,
      fields.minute ?? 0,
      fields.second ?? 0,
      fields.millisecond ?? 0,
    );
  }
  return utcMilliseconds(
    year,
    (fields.month ?? 1) - 1,
    fields.day ?? 1,
    fields.hour ?? 0,
    fields.minute ?? 0,
    fields.second ?? 0,
    fields.millisecond ?? 0,
  );
}

function resolveLocalTime(localEpoch: number, timeZone: string): number {
  let instant = localEpoch;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const offset = timeZoneOffsetMilliseconds(new Date(instant), timeZone);
    const next = localEpoch - offset;
    if (next === instant) {
      return instant;
    }
    instant = next;
  }
  return instant;
}

export function parseSimpleDate(value: string, timeZone: string, pattern: string): Date {
  const tokens = tokenizePattern(pattern, "Utilities.parseDate()");
  const fields: ParsedFields = {};
  const fieldsInOrder: Extract<PatternToken, { kind: "field" }>[] = [];
  let regex = "^";

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.kind === "literal") {
      regex += escapeRegex(token.value);
    } else {
      regex += `(${fieldRegex(token, isNumericField(tokens[index + 1]))})`;
      fieldsInOrder.push(token);
    }
  }
  regex += "$";

  const match = new RegExp(regex).exec(value);
  if (!match) {
    throw new RangeError("Date does not match the SimpleDateFormat pattern.");
  }
  for (let index = 0; index < fieldsInOrder.length; index += 1) {
    applyParsedField(fields, fieldsInOrder[index], match[index + 1]);
  }

  const localEpoch = localEpochMilliseconds(fields);
  const instant =
    fields.offsetMilliseconds === undefined
      ? resolveLocalTime(localEpoch, timeZone)
      : localEpoch - fields.offsetMilliseconds;
  const date = new Date(instant);
  if (!Number.isFinite(date.getTime())) {
    throw new RangeError("Parsed date is invalid.");
  }
  return date;
}
