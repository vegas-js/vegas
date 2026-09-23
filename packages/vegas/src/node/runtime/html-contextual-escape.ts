// Apps Script documents contextual escaping for HtmlOutput.appendUntrusted() and printing
// scriptlets, but does not define the escaping implementation. Vegas models HTML text, ordinary
// attribute values, and URL attributes here. Nested executable contexts remain unsupported until
// they can be represented faithfully instead of guessing at Google-internal escaping behavior.
import { UnsupportedRuntimeOperationError } from "./unsupported-runtime-operation-error";

type HtmlEscapeContext =
  | {
      readonly type: "text";
    }
  | {
      readonly type: "attribute";
      readonly name: string;
      readonly quote: '"' | "'" | null;
      readonly valuePrefix: string;
    }
  | {
      readonly type: "nested-executable";
      readonly description: string;
    }
  | {
      readonly type: "unsupported";
      readonly description: string;
    };

const URL_ATTRIBUTES = new Set([
  "action",
  "background",
  "cite",
  "data",
  "formaction",
  "href",
  "poster",
  "src",
  "xlink:href",
]);

const SAFE_URL_SCHEMES = new Set(["http", "https", "mailto", "tel"]);

export function escapeHtmlContextually(currentContent: string, addedContent: string): string {
  const context = resolveHtmlEscapeContext(currentContent);

  switch (context.type) {
    case "text":
      return escapeHtmlText(addedContent);
    case "attribute":
      assertSafeAttributeContext(context, addedContent);
      return escapeHtmlAttribute(addedContent, context.quote);
    case "nested-executable":
      throw new UnsupportedRuntimeOperationError(
        "HtmlOutput.appendUntrusted()",
        `contextual escaping inside ${context.description} is not implemented.`,
      );
    case "unsupported":
      throw new Error(`Cannot append untrusted content inside ${context.description}.`);
  }
}

function resolveHtmlEscapeContext(source: string): HtmlEscapeContext {
  let offset = 0;

  while (offset < source.length) {
    const opening = source.indexOf("<", offset);

    if (opening < 0) {
      return { type: "text" };
    }

    if (source.startsWith("<!--", opening)) {
      const closing = source.indexOf("-->", opening + 4);

      if (closing < 0) {
        return { type: "unsupported", description: "an HTML comment" };
      }

      offset = closing + 3;
      continue;
    }

    const next = source[opening + 1];

    if (next === "!") {
      const closing = source.indexOf(">", opening + 2);

      if (closing < 0) {
        return { type: "unsupported", description: "HTML declaration syntax" };
      }

      offset = closing + 1;
      continue;
    }

    if (next === "/") {
      const closing = source.indexOf(">", opening + 2);

      if (closing < 0) {
        return { type: "unsupported", description: "an HTML closing tag" };
      }

      offset = closing + 1;
      continue;
    }

    if (next === undefined || !isTagNameStart(next)) {
      offset = opening + 1;
      continue;
    }

    const parsed = parseStartTag(source, opening);

    if (parsed.context !== undefined) {
      return parsed.context;
    }

    offset = parsed.end;

    if (!parsed.selfClosing && (parsed.tagName === "script" || parsed.tagName === "style")) {
      const closing = findRawTextClosingTag(source, offset, parsed.tagName);

      if (closing < 0) {
        return {
          type: "nested-executable",
          description: `<${parsed.tagName}> content`,
        };
      }

      const closingEnd = source.indexOf(">", closing + parsed.tagName.length + 2);

      if (closingEnd < 0) {
        return {
          type: "unsupported",
          description: "an HTML closing tag",
        };
      }

      offset = closingEnd + 1;
    }
  }

  return { type: "text" };
}

function parseStartTag(
  source: string,
  opening: number,
):
  | {
      readonly context: HtmlEscapeContext;
      readonly end?: never;
      readonly selfClosing?: never;
      readonly tagName?: never;
    }
  | {
      readonly context?: never;
      readonly end: number;
      readonly selfClosing: boolean;
      readonly tagName: string;
    } {
  let offset = opening + 1;
  const tagNameStart = offset;

  while (offset < source.length && isTagNameCharacter(source[offset])) {
    offset += 1;
  }

  const tagName = source.slice(tagNameStart, offset).toLowerCase();

  while (offset < source.length) {
    while (offset < source.length && isHtmlWhitespace(source[offset])) {
      offset += 1;
    }

    if (offset >= source.length) {
      return {
        context: {
          type: "unsupported",
          description: "HTML tag syntax",
        },
      };
    }

    if (source[offset] === ">") {
      return {
        end: offset + 1,
        selfClosing: false,
        tagName,
      };
    }

    if (source[offset] === "/" && source[offset + 1] === ">") {
      return {
        end: offset + 2,
        selfClosing: true,
        tagName,
      };
    }

    const attributeNameStart = offset;

    while (
      offset < source.length &&
      !isHtmlWhitespace(source[offset]) &&
      source[offset] !== "=" &&
      source[offset] !== ">" &&
      source[offset] !== "/"
    ) {
      offset += 1;
    }

    if (offset === attributeNameStart) {
      return {
        context: {
          type: "unsupported",
          description: "HTML tag syntax",
        },
      };
    }

    const attributeName = source.slice(attributeNameStart, offset).toLowerCase();

    while (offset < source.length && isHtmlWhitespace(source[offset])) {
      offset += 1;
    }

    if (offset >= source.length) {
      return {
        context: {
          type: "unsupported",
          description: "an HTML attribute name",
        },
      };
    }

    if (source[offset] !== "=") {
      continue;
    }

    offset += 1;

    while (offset < source.length && isHtmlWhitespace(source[offset])) {
      offset += 1;
    }

    if (offset >= source.length) {
      return {
        context: {
          type: "attribute",
          name: attributeName,
          quote: null,
          valuePrefix: "",
        },
      };
    }

    const quote = source[offset];

    if (quote === '"' || quote === "'") {
      offset += 1;
      const valueStart = offset;
      const closingQuote = source.indexOf(quote, offset);

      if (closingQuote < 0) {
        return {
          context: {
            type: "attribute",
            name: attributeName,
            quote,
            valuePrefix: source.slice(valueStart),
          },
        };
      }

      offset = closingQuote + 1;
      continue;
    }

    const valueStart = offset;

    while (offset < source.length && !isHtmlWhitespace(source[offset]) && source[offset] !== ">") {
      offset += 1;
    }

    if (offset >= source.length) {
      return {
        context: {
          type: "attribute",
          name: attributeName,
          quote: null,
          valuePrefix: source.slice(valueStart),
        },
      };
    }
  }

  return {
    context: {
      type: "unsupported",
      description: "HTML tag syntax",
    },
  };
}

function assertSafeAttributeContext(
  context: Extract<HtmlEscapeContext, { readonly type: "attribute" }>,
  addedContent: string,
): void {
  if (
    context.name.startsWith("on") ||
    context.name === "style" ||
    context.name === "srcdoc" ||
    context.name === "srcset"
  ) {
    throw new UnsupportedRuntimeOperationError(
      "HtmlOutput.appendUntrusted()",
      `contextual escaping inside the ${context.name} attribute is not implemented.`,
    );
  }

  if (!URL_ATTRIBUTES.has(context.name)) {
    return;
  }

  const candidate = `${context.valuePrefix}${addedContent}`;
  const normalized = removeAsciiControlAndSpace(candidate);
  const scheme = /^([A-Za-z][A-Za-z0-9+.-]*):/.exec(normalized)?.[1].toLowerCase();

  if (scheme !== undefined && !SAFE_URL_SCHEMES.has(scheme)) {
    throw new Error(`Cannot append an unsafe URL scheme inside the ${context.name} attribute.`);
  }
}

function removeAsciiControlAndSpace(value: string): string {
  let normalized = "";

  for (const character of value) {
    const code = character.charCodeAt(0);

    if (code > 0x20 && code !== 0x7f) {
      normalized += character;
    }
  }

  return normalized;
}

function escapeHtmlText(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeHtmlAttribute(value: string, quote: '"' | "'" | null): string {
  let escaped = value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("`", "&#96;");

  if (quote === null) {
    escaped = escaped
      .replaceAll("=", "&#61;")
      .replace(/[\t\n\f\r ]/g, (character) => `&#${character.charCodeAt(0)};`);
  }

  return escaped;
}

function findRawTextClosingTag(
  source: string,
  offset: number,
  tagName: "script" | "style",
): number {
  const lowerSource = source.toLowerCase();
  const needle = `</${tagName}`;
  let closing = lowerSource.indexOf(needle, offset);

  while (closing >= 0) {
    const following = source[closing + needle.length];

    if (
      following === undefined ||
      following === ">" ||
      following === "/" ||
      isHtmlWhitespace(following)
    ) {
      return closing;
    }

    closing = lowerSource.indexOf(needle, closing + needle.length);
  }

  return -1;
}

function isHtmlWhitespace(value: string): boolean {
  return value === "\t" || value === "\n" || value === "\f" || value === "\r" || value === " ";
}

function isTagNameStart(value: string): boolean {
  return /[A-Za-z]/.test(value);
}

function isTagNameCharacter(value: string): boolean {
  return /[A-Za-z0-9:-]/.test(value);
}
