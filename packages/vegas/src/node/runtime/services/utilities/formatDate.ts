import { createGasException } from "./gasException";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const PATTERN_CHARACTERS = new Set("GyYMwWDdFEuaHkKhmsSzZX".split(""));

interface ZonedDateParts {
  era: string;
  year: number;
  month: number;
  day: number;
  weekday: string;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
  dayOfYear: number;
  isoDayOfWeek: number;
  weekOfYear: number;
  weekOfMonth: number;
  dayOfWeekInMonth: number;
  offsetMinutes: number;
  timeZoneName: string;
}

function resolveTimeZone(timeZone: string): string {
  try {
    new Intl.DateTimeFormat("en-US", {
      timeZone,
    }).format(0);

    return timeZone;
  } catch {
    /*
     * Characterized GAS behavior falls
     * back to UTC for invalid zones.
     */
    return "UTC";
  }
}

function toUtcTimestamp(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0,
): number {
  const date = new Date(0);

  date.setUTCFullYear(year, month - 1, day);

  date.setUTCHours(hour, minute, second, millisecond);

  return date.getTime();
}

function getZonedDateParts(date: GoogleAppsScript.Base.Date, timeZone: string): ZonedDateParts {
  const formatter = new Intl.DateTimeFormat("en-US-u-ca-gregory", {
    timeZone,
    weekday: "long",
    era: "short",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    fractionalSecondDigits: 3,
    hourCycle: "h23",
  });

  const partValues = new Map<string, string>();

  for (const part of formatter.formatToParts(date.valueOf())) {
    if (part.type !== "literal") {
      partValues.set(part.type, part.value);
    }
  }

  const getPart = (name: string): string => {
    const value = partValues.get(name);

    if (value === undefined) {
      throw new Error(`Missing date part: ${name}`);
    }

    return value;
  };

  const year = Number(getPart("year"));

  const month = Number(getPart("month"));

  const day = Number(getPart("day"));

  const hour = Number(getPart("hour"));

  const minute = Number(getPart("minute"));

  const second = Number(getPart("second"));

  const millisecond = Number(getPart("fractionalSecond"));

  const wallClockTimestamp = toUtcTimestamp(year, month, day, hour, minute, second, millisecond);

  const offsetMinutes = Math.round((wallClockTimestamp - date.valueOf()) / 60_000);

  const calendarTimestamp = toUtcTimestamp(year, month, day);

  const firstDayOfYearTimestamp = toUtcTimestamp(year, 1, 1);

  const dayOfYear = Math.floor((calendarTimestamp - firstDayOfYearTimestamp) / 86_400_000) + 1;

  const dayOfWeek = new Date(calendarTimestamp).getUTCDay();

  const isoDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;

  const firstDayOfYearWeekday = new Date(firstDayOfYearTimestamp).getUTCDay();

  const weekOfYear = Math.floor((dayOfYear - 1 + firstDayOfYearWeekday) / 7) + 1;

  const firstDayOfMonthWeekday = new Date(toUtcTimestamp(year, month, 1)).getUTCDay();

  const weekOfMonth = Math.floor((day - 1 + firstDayOfMonthWeekday) / 7) + 1;

  const dayOfWeekInMonth = Math.floor((day - 1) / 7) + 1;

  const timeZoneName =
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "short",
    })
      .formatToParts(date.valueOf())
      .find((part) => part.type === "timeZoneName")?.value ?? timeZone;

  return {
    era: getPart("era"),
    year,
    month,
    day,
    weekday: getPart("weekday"),
    hour,
    minute,
    second,
    millisecond,
    dayOfYear,
    isoDayOfWeek,
    weekOfYear,
    weekOfMonth,
    dayOfWeekInMonth,
    offsetMinutes,
    timeZoneName,
  };
}

function padNumber(value: number, length: number): string {
  return String(value).padStart(length, "0");
}

function formatOffset(offsetMinutes: number, colon: boolean): string {
  const sign = offsetMinutes >= 0 ? "+" : "-";

  const absoluteMinutes = Math.abs(offsetMinutes);

  const hours = padNumber(Math.floor(absoluteMinutes / 60), 2);

  const minutes = padNumber(absoluteMinutes % 60, 2);

  return colon ? `${sign}${hours}:${minutes}` : `${sign}${hours}${minutes}`;
}

function formatIsoOffset(offsetMinutes: number, length: number): string {
  if (length > 3) {
    throw createGasException(`Invalid argument: ${"X".repeat(length)}`);
  }

  if (offsetMinutes === 0) {
    return "Z";
  }

  if (length === 1) {
    const sign = offsetMinutes >= 0 ? "+" : "-";

    const absoluteMinutes = Math.abs(offsetMinutes);

    const hours = padNumber(Math.floor(absoluteMinutes / 60), 2);

    const minutes = absoluteMinutes % 60;

    return minutes === 0 ? `${sign}${hours}` : `${sign}${hours}${padNumber(minutes, 2)}`;
  }

  if (length === 2) {
    return formatOffset(offsetMinutes, false);
  }

  return formatOffset(offsetMinutes, true);
}

function formatPatternToken(character: string, length: number, parts: ZonedDateParts): string {
  switch (character) {
    case "G":
      return parts.era;

    case "y":
    case "Y":
      return length === 2 ? String(parts.year).slice(-2) : padNumber(parts.year, length);

    case "M": {
      if (length <= 2) {
        return padNumber(parts.month, length);
      }

      const monthName = MONTH_NAMES[parts.month - 1];

      return length === 3 ? monthName.slice(0, 3) : monthName;
    }

    case "w":
      return padNumber(parts.weekOfYear, length);

    case "W":
      return padNumber(parts.weekOfMonth, length);

    case "D":
      return padNumber(parts.dayOfYear, length);

    case "d":
      return padNumber(parts.day, length);

    case "F":
      return padNumber(parts.dayOfWeekInMonth, length);

    case "E":
      return length <= 3 ? parts.weekday.slice(0, 3) : parts.weekday;

    case "u":
      return padNumber(parts.isoDayOfWeek, length);

    case "a":
      return parts.hour < 12 ? "AM" : "PM";

    case "H":
      return padNumber(parts.hour, length);

    case "k":
      return padNumber(parts.hour === 0 ? 24 : parts.hour, length);

    case "K":
      return padNumber(parts.hour % 12, length);

    case "h":
      return padNumber(parts.hour % 12 || 12, length);

    case "m":
      return padNumber(parts.minute, length);

    case "s":
      return padNumber(parts.second, length);

    case "S":
      return padNumber(parts.millisecond, length);

    case "z":
      return parts.timeZoneName;

    case "Z":
      return formatOffset(parts.offsetMinutes, false);

    case "X":
      return formatIsoOffset(parts.offsetMinutes, length);

    default:
      return character.repeat(length);
  }
}

export function formatDate(
  date: GoogleAppsScript.Base.Date,
  timeZone: string,
  format: string,
): string {
  const resolvedTimeZone = resolveTimeZone(timeZone);

  const parts = getZonedDateParts(date, resolvedTimeZone);

  let result = "";
  let quoted = false;

  for (let index = 0; index < format.length;) {
    const character = format[index];

    if (character === "'") {
      if (format[index + 1] === "'") {
        result += "'";
        index += 2;
        continue;
      }

      quoted = !quoted;
      index++;
      continue;
    }

    if (quoted || !PATTERN_CHARACTERS.has(character)) {
      result += character;
      index++;
      continue;
    }

    let end = index + 1;

    while (end < format.length && format[end] === character) {
      end++;
    }

    result += formatPatternToken(character, end - index, parts);

    index = end;
  }

  return result;
}
