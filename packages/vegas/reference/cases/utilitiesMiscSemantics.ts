function captureCall(fn: () => unknown) {
  try {
    const value = fn();

    return {
      threw: false,
      type: typeof value,
      isNull: value === null,
      isUndefined: value === undefined,
      errorName: null,
      errorMessage: null,
    };
  } catch (error) {
    const candidate = error as {
      name?: unknown;
      message?: unknown;
    } | null;

    return {
      threw: true,
      type: null,
      isNull: null,
      isUndefined: null,
      errorName: typeof candidate?.name === "string" ? candidate.name : typeof error,
      errorMessage: typeof candidate?.message === "string" ? candidate.message : String(error),
    };
  }
}

function captureValueCall(fn: () => unknown) {
  try {
    return {
      threw: false,
      value: fn(),
      errorName: null,
      errorMessage: null,
    };
  } catch (error) {
    const candidate = error as {
      name?: unknown;
      message?: unknown;
    } | null;

    return {
      threw: true,
      value: null,
      errorName: typeof candidate?.name === "string" ? candidate.name : typeof error,
      errorMessage: typeof candidate?.message === "string" ? candidate.message : String(error),
    };
  }
}

export function captureReferenceUtilitiesParseCsvSemantics() {
  const globals = globalThis as unknown as Record<string, any>;

  const utilities = globals.Utilities;

  return {
    simple: utilities.parseCsv("a,b,c\nd,e,f"),

    empty: utilities.parseCsv(""),

    trailingEmptyFields: utilities.parseCsv("a,b,\nc,,"),

    quotedDelimiter: utilities.parseCsv('a,"b,c",d'),

    escapedQuote: utilities.parseCsv('a,"b""c",d'),

    quotedNewline: utilities.parseCsv('a,"b\nc",d'),

    crlf: utilities.parseCsv("a,b\r\nc,d\r\n"),

    customDelimiter: utilities.parseCsv('a;"b;c";d', ";"),

    invalidDelimiter: captureValueCall(() => utilities.parseCsv("a,b", "::")),
  };
}

export function captureReferenceUtilitiesFormatDateSemantics() {
  const globals = globalThis as unknown as Record<string, any>;

  const utilities = globals.Utilities;

  /*
   * Fixed leap-day instant. The UTC date rolls into March in Asia/Tokyo
   * and stays in February in America/Los_Angeles, making timezone
   * conversion and offset behavior observable.
   */
  const date = new Date(Date.UTC(2024, 1, 29, 23, 5, 6, 789));

  return {
    utcBasic: utilities.formatDate(date, "UTC", "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),

    tokyoBasic: utilities.formatDate(date, "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss"),

    losAngelesBasic: utilities.formatDate(date, "America/Los_Angeles", "yyyy-MM-dd HH:mm:ss"),

    tokyoOffsets: utilities.formatDate(date, "Asia/Tokyo", "Z X XX XXX"),

    losAngelesOffsets: utilities.formatDate(date, "America/Los_Angeles", "Z X XX XXX"),

    textual: utilities.formatDate(date, "UTC", "EEE MMMM d yyyy h:mm:ss a"),

    calendarFields: utilities.formatDate(date, "UTC", "D E u"),

    quotedLiteral: utilities.formatDate(date, "UTC", "'year='yyyy '; month='MM"),

    extendedFields: utilities.formatDate(date, "UTC", "G Y w W F k K z"),

    invalidTimeZone: captureValueCall(() =>
      utilities.formatDate(date, "Vegas/Invalid", "yyyy-MM-dd"),
    ),

    invalidTimeZoneDetailed: captureValueCall(() =>
      utilities.formatDate(date, "Vegas/Invalid", "yyyy-MM-dd HH:mm:ss Z"),
    ),

    invalidXPattern: captureValueCall(() => utilities.formatDate(date, "UTC", "XXXX")),
  };
}

function describeUuid(value: string) {
  const variantCharacter = value.length > 19 ? value.charAt(19) : null;

  return {
    type: typeof value,
    length: value.length,

    matchesCanonicalShape: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      value,
    ),

    isLowerCase: value === value.toLowerCase(),

    versionCharacter: value.length > 14 ? value.charAt(14) : null,

    hasRfc4122Variant: variantCharacter !== null && /^[89ab]$/.test(variantCharacter),
  };
}

export function captureReferenceUtilitiesRuntimeSemantics() {
  const globals = globalThis as unknown as Record<string, any>;

  const utilities = globals.Utilities;

  const uuidA = utilities.getUuid();
  const uuidB = utilities.getUuid();

  const sleepZero = captureCall(() => utilities.sleep(0));

  const start = Date.now();

  const sleepSmall = captureCall(() => utilities.sleep(20));

  const elapsed = Date.now() - start;

  const sleepNegative = captureCall(() => utilities.sleep(-1));

  return {
    uuid: {
      first: describeUuid(uuidA),
      second: describeUuid(uuidB),
      repeatedDifferent: uuidA !== uuidB,
    },

    sleepZero,

    sleepSmall: {
      call: sleepSmall,

      /*
       * Do not fixture the raw elapsed duration because Apps Script
       * execution scheduling is environment-dependent.
       */
      elapsedAtLeastRequested: elapsed >= 20,
    },

    sleepNegative,
  };
}
