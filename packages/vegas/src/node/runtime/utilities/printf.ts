// Google Apps Script Utilities.formatString is documented as sprintf-like.
// Vegas uses the locale-independent POSIX printf subset below as its explicit local contract.

interface FormatSpec {
  readonly left: boolean;
  readonly forceSign: boolean;
  readonly leadingSpace: boolean;
  readonly zeroPad: boolean;
  readonly alternate: boolean;
  readonly width: number | undefined;
  readonly precision: number | undefined;
  readonly conversion: string;
}

const FLAG_CHARACTERS = new Set(["-", "+", " ", "0", "#"]);
const SUPPORTED_CONVERSIONS = new Set(["s", "c", "d", "i", "o", "x", "X", "f", "e", "E"]);

function parseDecimal(value: string): number | undefined {
  return value.length === 0 ? undefined : Number(value);
}

function assertSupportedFlags(spec: FormatSpec, allowed: string): void {
  const flags = [
    [spec.left, "-"],
    [spec.forceSign, "+"],
    [spec.leadingSpace, " "],
    [spec.zeroPad, "0"],
    [spec.alternate, "#"],
  ] as const;

  for (const [enabled, flag] of flags) {
    if (enabled && !allowed.includes(flag)) {
      throw new RangeError(`printf flag '${flag}' is not supported for %${spec.conversion}.`);
    }
  }
}

function applyTextWidth(value: string, spec: FormatSpec): string {
  const width = spec.width ?? 0;
  if (value.length >= width) return value;

  const padding = " ".repeat(width - value.length);
  return spec.left ? value + padding : padding + value;
}

function applyNumericWidth(
  prefix: string,
  digits: string,
  spec: FormatSpec,
  allowZeroPadding: boolean,
): string {
  const width = spec.width ?? 0;
  const length = prefix.length + digits.length;
  if (length >= width) return prefix + digits;

  const count = width - length;
  if (spec.left) return prefix + digits + " ".repeat(count);
  if (spec.zeroPad && allowZeroPadding) return prefix + "0".repeat(count) + digits;
  return " ".repeat(count) + prefix + digits;
}

function numberArgument(value: unknown, conversion: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`%${conversion} requires a finite number.`);
  }
  return value;
}

function safeIntegerArgument(value: unknown, conversion: string): number {
  const number = numberArgument(value, conversion);
  if (!Number.isSafeInteger(number)) {
    throw new TypeError(`%${conversion} requires a safe integer.`);
  }
  return number;
}

function signedPrefix(value: number, spec: FormatSpec): string {
  if (value < 0 || Object.is(value, -0)) return "-";
  if (spec.forceSign) return "+";
  return spec.leadingSpace ? " " : "";
}

function formatSignedInteger(value: unknown, spec: FormatSpec): string {
  assertSupportedFlags(spec, "-+ 0");
  const number = safeIntegerArgument(value, spec.conversion);
  let digits = Math.abs(number).toString(10);

  if (spec.precision === 0 && number === 0) digits = "";
  else if (spec.precision !== undefined) digits = digits.padStart(spec.precision, "0");

  return applyNumericWidth(signedPrefix(number, spec), digits, spec, spec.precision === undefined);
}

function formatUnsignedInteger(value: unknown, spec: FormatSpec, radix: 8 | 16): string {
  assertSupportedFlags(spec, "-0#");
  const number = safeIntegerArgument(value, spec.conversion);
  if (number < 0) {
    throw new RangeError(
      `%${spec.conversion} does not accept negative values because Vegas does not assume a C integer width.`,
    );
  }

  let digits = number.toString(radix);
  if (spec.conversion === "X") digits = digits.toUpperCase();
  if (spec.precision === 0 && number === 0) digits = "";
  else if (spec.precision !== undefined) digits = digits.padStart(spec.precision, "0");

  let prefix = "";
  if (spec.alternate) {
    if (radix === 8) {
      if (!digits.startsWith("0")) prefix = "0";
      if (digits.length === 0) digits = "0";
    } else if (number !== 0) {
      prefix = spec.conversion === "X" ? "0X" : "0x";
    }
  }

  return applyNumericWidth(prefix, digits, spec, spec.precision === undefined);
}

function normalizeExponent(value: string): string {
  return value.replace(/e([+-])(\d+)$/i, (_match, sign: string, digits: string) => {
    return `e${sign}${digits.padStart(2, "0")}`;
  });
}

function formatFloating(value: unknown, spec: FormatSpec): string {
  assertSupportedFlags(spec, "-+ 0#");
  const number = numberArgument(value, spec.conversion);
  const precision = spec.precision ?? 6;
  if (precision > 100) {
    throw new RangeError("printf floating-point precision above 100 is not supported by Vegas.");
  }

  const magnitude = Math.abs(number);
  let digits: string;
  if (spec.conversion === "f") {
    digits = magnitude.toFixed(precision);
    if (spec.alternate && precision === 0) digits += ".";
  } else {
    digits = normalizeExponent(magnitude.toExponential(precision));
    if (spec.alternate && precision === 0) digits = digits.replace(/e/i, ".e");
    if (spec.conversion === "E") digits = digits.toUpperCase();
  }

  return applyNumericWidth(signedPrefix(number, spec), digits, spec, true);
}

function formatStringValue(value: unknown, spec: FormatSpec): string {
  assertSupportedFlags(spec, "-");
  const string = String(value);
  const formatted =
    spec.precision === undefined ? string : Array.from(string).slice(0, spec.precision).join("");
  return applyTextWidth(formatted, spec);
}

function formatCharacter(value: unknown, spec: FormatSpec): string {
  assertSupportedFlags(spec, "-");
  if (spec.precision !== undefined) {
    throw new RangeError("printf precision is not supported for %c.");
  }

  let character: string;
  if (typeof value === "number") {
    if (!Number.isInteger(value) || value < 0 || value > 0x10ffff) {
      throw new RangeError("%c numeric values must be valid Unicode code points.");
    }
    character = String.fromCodePoint(value);
  } else if (typeof value === "string") {
    character = Array.from(value)[0] ?? "";
  } else {
    throw new TypeError("%c requires a string or Unicode code point.");
  }

  return applyTextWidth(character, spec);
}

function formatArgument(value: unknown, spec: FormatSpec): string {
  switch (spec.conversion) {
    case "s":
      return formatStringValue(value, spec);
    case "c":
      return formatCharacter(value, spec);
    case "d":
    case "i":
      return formatSignedInteger(value, spec);
    case "o":
      return formatUnsignedInteger(value, spec, 8);
    case "x":
    case "X":
      return formatUnsignedInteger(value, spec, 16);
    case "f":
    case "e":
    case "E":
      return formatFloating(value, spec);
    default:
      throw new RangeError(`Unsupported printf conversion '%${spec.conversion}'.`);
  }
}

function parseSpec(
  template: string,
  start: number,
): { readonly spec: FormatSpec; readonly end: number } {
  let index = start;
  const flags = new Set<string>();
  while (FLAG_CHARACTERS.has(template[index])) {
    flags.add(template[index]);
    index += 1;
  }

  if (template[index] === "*") {
    throw new RangeError("Dynamic printf width is not supported by Vegas.");
  }

  let widthDigits = "";
  while (/\d/.test(template[index] ?? "")) {
    widthDigits += template[index];
    index += 1;
  }
  if (template[index] === "$") {
    throw new RangeError("Positional printf arguments are not supported by Vegas.");
  }

  let precision: number | undefined;
  if (template[index] === ".") {
    index += 1;
    if (template[index] === "*") {
      throw new RangeError("Dynamic printf precision is not supported by Vegas.");
    }
    let precisionDigits = "";
    while (/\d/.test(template[index] ?? "")) {
      precisionDigits += template[index];
      index += 1;
    }
    precision = precisionDigits.length === 0 ? 0 : Number(precisionDigits);
  }

  const conversion = template[index];
  if (!conversion) throw new RangeError("Incomplete printf conversion.");
  if (!SUPPORTED_CONVERSIONS.has(conversion)) {
    throw new RangeError(`Unsupported printf conversion '%${conversion}'.`);
  }

  return {
    spec: {
      left: flags.has("-"),
      forceSign: flags.has("+"),
      leadingSpace: flags.has(" "),
      zeroPad: flags.has("0"),
      alternate: flags.has("#"),
      width: parseDecimal(widthDigits),
      precision,
      conversion,
    },
    end: index + 1,
  };
}

export function formatPrintf(template: string, args: readonly unknown[]): string {
  let output = "";
  let argumentIndex = 0;

  for (let index = 0; index < template.length;) {
    if (template[index] !== "%") {
      output += template[index];
      index += 1;
      continue;
    }
    if (template[index + 1] === "%") {
      output += "%";
      index += 2;
      continue;
    }

    const { spec, end } = parseSpec(template, index + 1);
    if (argumentIndex >= args.length) {
      throw new RangeError("Not enough arguments for printf template.");
    }
    output += formatArgument(args[argumentIndex], spec);
    argumentIndex += 1;
    index = end;
  }

  return output;
}
