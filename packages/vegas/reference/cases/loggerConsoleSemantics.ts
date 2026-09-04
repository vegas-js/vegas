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

function describeLoggerLog(logger: any) {
  const log = logger.getLog();

  if (log === "") {
    return {
      empty: true,
      lineCount: 0,
      lines: [],
    };
  }

  const lines = String(log).split("\n");

  return {
    empty: false,
    lineCount: lines.length,
    lines: lines.map((line) => {
      /*
       * Logger.getLog() contains a runtime timestamp prefix.
       * Characterize only the stable payload after "INFO: ".
       */
      const marker = "INFO: ";
      const markerIndex = line.indexOf(marker);

      return {
        prefixMatched: markerIndex >= 0,

        value: markerIndex >= 0 ? line.slice(markerIndex + marker.length) : null,
      };
    }),
  };
}

function captureLoggerEntry(logger: any, fn: () => unknown) {
  logger.clear();

  try {
    const result = fn();

    return {
      threw: false,
      returnsLogger: result === logger,
      type: typeof result,
      isNull: result === null,
      isUndefined: result === undefined,
      log: describeLoggerLog(logger),
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
      returnsLogger: null,
      type: null,
      isNull: null,
      isUndefined: null,
      log: describeLoggerLog(logger),
      errorName: typeof candidate?.name === "string" ? candidate.name : typeof error,
      errorMessage: typeof candidate?.message === "string" ? candidate.message : String(error),
    };
  }
}

function normalizeLoggerEntry(entry: any, normalize: (value: string) => string) {
  return {
    ...entry,

    log: {
      ...entry.log,

      lines: entry.log.lines.map((line: any) => ({
        ...line,

        value: typeof line.value === "string" ? normalize(line.value) : line.value,
      })),
    },
  };
}

function normalizeTopLevelObjectOrder(value: string): string {
  if (!value.startsWith("{") || !value.endsWith("}")) {
    return value;
  }

  const content = value.slice(1, -1);

  if (content === "") {
    return value;
  }

  const entries: string[] = [];

  let start = 0;
  let depth = 0;

  for (let index = 0; index < content.length; index++) {
    const character = content[index];

    if (character === "{" || character === "[") {
      depth++;
      continue;
    }

    if (character === "}" || character === "]") {
      depth--;
      continue;
    }

    if (character === "," && depth === 0 && content[index + 1] === " ") {
      entries.push(content.slice(start, index));

      start = index + 2;
      index++;
    }
  }

  entries.push(content.slice(start));

  return `{${entries.sort((left, right) => left.localeCompare(right)).join(", ")}}`;
}

export function captureReferenceLoggerSemantics() {
  const globals = globalThis as unknown as Record<string, any>;

  const logger = globals.Logger;

  logger.clear();

  const initial = describeLoggerLog(logger);

  const clearEmpty = captureCall(() => logger.clear());

  const stringValue = captureLoggerEntry(logger, () => logger.log("Vegas"));

  const integerValue = captureLoggerEntry(logger, () => logger.log(42));

  const fractionalValue = captureLoggerEntry(logger, () => logger.log(1.5));

  const booleanValue = captureLoggerEntry(logger, () => logger.log(true));

  const nullValue = captureLoggerEntry(logger, () => logger.log(null));

  const undefinedValue = captureLoggerEntry(logger, () => logger.log(undefined));

  const arrayValue = captureLoggerEntry(logger, () => logger.log([1, "two", true, null]));

  const objectValue = normalizeLoggerEntry(
    captureLoggerEntry(logger, () =>
      logger.log({
        alpha: 1,
        beta: "two",
        nested: {
          gamma: true,
        },
      }),
    ),
    normalizeTopLevelObjectOrder,
  );

  const messageObject = captureLoggerEntry(logger, () =>
    logger.log({
      message: "message-only",
      other: "ignored-or-not",
    }),
  );

  const activeUser = globals.Session.getActiveUser();

  const activeUserString = String(activeUser);

  const userValue = normalizeLoggerEntry(
    captureLoggerEntry(logger, () => logger.log(activeUser)),
    (value) => (value === activeUserString ? "<active-user>" : value),
  );

  const stringFormat = captureLoggerEntry(logger, () =>
    logger.log("value=%s", {
      alpha: 1,
    }),
  );

  const decimalFormat = captureLoggerEntry(logger, () => logger.log("value=%d", 42));

  const jsonFormat = captureLoggerEntry(logger, () =>
    logger.log("value=%j", {
      alpha: 1,
    }),
  );

  const escapedPercent = captureLoggerEntry(logger, () => logger.log("value=%%"));

  const unsupportedFormat = captureLoggerEntry(logger, () => logger.log("value=%q", "test"));

  const extraValues = captureLoggerEntry(logger, () => logger.log("plain", "second", 3));

  logger.clear();

  logger.log("first");
  logger.log("second");

  logger.clear();

  const firstReturn = logger.log("return-first");

  const secondReturn = logger.log("return-second");

  const firstReturnRecord =
    firstReturn !== null && typeof firstReturn === "object"
      ? (firstReturn as Record<string, unknown>)
      : null;

  const chainedReturn =
    firstReturnRecord !== null && typeof firstReturnRecord.log === "function"
      ? Reflect.apply(firstReturnRecord.log, firstReturn, ["return-chained"])
      : null;

  const logReturnIdentity = {
    first: {
      sameAsGlobal: firstReturn === logger,

      stringify: firstReturn === null || firstReturn === undefined ? null : String(firstReturn),

      ownPropertyNames:
        firstReturn !== null && typeof firstReturn === "object"
          ? Object.getOwnPropertyNames(firstReturn).sort()
          : null,

      prototypeIsObjectPrototype:
        firstReturn !== null && typeof firstReturn === "object"
          ? Object.getPrototypeOf(firstReturn) === Object.prototype
          : null,

      hasLog: firstReturnRecord !== null && typeof firstReturnRecord.log === "function",

      hasGetLog: firstReturnRecord !== null && typeof firstReturnRecord.getLog === "function",

      hasClear: firstReturnRecord !== null && typeof firstReturnRecord.clear === "function",

      logFunctionSameAsGlobal:
        firstReturnRecord !== null ? firstReturnRecord.log === logger.log : null,

      getLogFunctionSameAsGlobal:
        firstReturnRecord !== null ? firstReturnRecord.getLog === logger.getLog : null,
    },

    secondSameAsGlobal: secondReturn === logger,

    repeatedSameObject: firstReturn === secondReturn,

    chaining: {
      available: firstReturnRecord !== null && typeof firstReturnRecord.log === "function",

      returnsFirst: chainedReturn === firstReturn,

      returnsSecond: chainedReturn === secondReturn,

      returnsGlobal: chainedReturn === logger,

      stringify:
        chainedReturn === null || chainedReturn === undefined ? null : String(chainedReturn),
    },
  };

  const multipleEntries = describeLoggerLog(logger);

  const repeatedGetLog = {
    first: logger.getLog(),
    second: logger.getLog(),
    same: logger.getLog() === logger.getLog(),
  };

  const clearPopulated = captureCall(() => logger.clear());

  const afterClear = describeLoggerLog(logger);

  return {
    initial,
    clearEmpty,

    values: {
      stringValue,
      integerValue,
      fractionalValue,
      booleanValue,
      nullValue,
      undefinedValue,
      arrayValue,
      objectValue,
      messageObject,
      userValue,
    },

    formats: {
      stringFormat,
      decimalFormat,
      jsonFormat,
      escapedPercent,
      unsupportedFormat,
      extraValues,
    },

    logReturnIdentity,

    multipleEntries,

    repeatedGetLog: {
      same: repeatedGetLog.same,

      firstIsString: typeof repeatedGetLog.first === "string",

      secondIsString: typeof repeatedGetLog.second === "string",
    },

    clearPopulated,
    afterClear,
  };
}

export function captureReferenceConsoleSemantics() {
  const globals = globalThis as unknown as Record<string, any>;

  const consoleValue = globals.console;

  const logger = globals.Logger;

  logger.clear();

  const emptyCalls = {
    log: captureCall(() => consoleValue.log()),

    info: captureCall(() => consoleValue.info()),

    warn: captureCall(() => consoleValue.warn()),

    error: captureCall(() => consoleValue.error()),
  };

  const valueCalls = {
    log: captureCall(() => consoleValue.log("log-value")),

    info: captureCall(() => consoleValue.info("info-value")),

    warn: captureCall(() => consoleValue.warn("warn-value")),

    error: captureCall(() => consoleValue.error("error-value")),
  };

  const loggerAfterConsoleCalls = describeLoggerLog(logger);

  const timeResult = captureCall(() => consoleValue.time("vegas-timer"));

  const timeEndResult = captureCall(() => consoleValue.timeEnd("vegas-timer"));

  const missingTimeEnd = captureCall(() => consoleValue.timeEnd("missing-timer"));

  const noArgumentTime = captureCall(() => consoleValue.time());

  const noArgumentTimeEnd = captureCall(() => consoleValue.timeEnd());

  return {
    emptyCalls,
    valueCalls,
    loggerAfterConsoleCalls,

    timer: {
      timeResult,
      timeEndResult,
      missingTimeEnd,
      noArgumentTime,
      noArgumentTimeEnd,
    },
  };
}
