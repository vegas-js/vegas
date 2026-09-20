export type HtmlTemplateSegment =
  | {
      readonly type: "text";
      readonly value: string;
    }
  | {
      readonly type: "scriptlet";
      readonly code: string;
    }
  | {
      readonly type: "print";
      readonly code: string;
      readonly escaping: "contextual" | "none";
    };

// Apps Script documents the scriptlet forms and the behavior of HtmlTemplate.getCode(), but does
// not define the generated JavaScript representation. Vegas compiles templates to this private
// output-sink protocol instead of reproducing Google-internal generated identifiers or helpers.
// Runtime behavior that Apps Script does not document remains intentionally unspecified.
const TEMPLATE_OUTPUT_FACTORY = "__vegasCreateHtmlTemplateOutput";
const TEMPLATE_OUTPUT = "__vegasHtmlTemplateOutput";

export function parseHtmlTemplate(source: string): HtmlTemplateSegment[] {
  const segments: HtmlTemplateSegment[] = [];
  let offset = 0;

  while (offset < source.length) {
    const opening = source.indexOf("<?", offset);

    if (opening < 0) {
      pushTextSegment(segments, source.slice(offset));
      break;
    }

    pushTextSegment(segments, source.slice(offset, opening));

    let codeStart = opening + 2;
    let type: "scriptlet" | "print" = "scriptlet";
    let escaping: "contextual" | "none" = "contextual";

    if (source.startsWith("!=", codeStart)) {
      type = "print";
      escaping = "none";
      codeStart += 2;
    } else if (source.startsWith("=", codeStart)) {
      type = "print";
      codeStart += 1;
    }

    const closing = source.indexOf("?>", codeStart);

    if (closing < 0) {
      throw new Error(`Unclosed HTML template scriptlet at offset ${opening}.`);
    }

    const code = source.slice(codeStart, closing);

    if (type === "print") {
      segments.push({
        type,
        code,
        escaping,
      });
    } else {
      segments.push({
        type,
        code,
      });
    }

    offset = closing + 2;
  }

  return segments;
}

export function compileHtmlTemplate(source: string): string {
  const body = parseHtmlTemplate(source).map(compileSegment).join("");

  return `(function() { const ${TEMPLATE_OUTPUT} = ${TEMPLATE_OUTPUT_FACTORY}(); ${body}\nreturn ${TEMPLATE_OUTPUT}.finish(); })()`;
}

export function compileHtmlTemplateWithComments(source: string): string {
  const comments = source
    .split(/\r?\n/)
    .map((line, index) => `// ${index + 1}: ${line}`)
    .join("\n");

  return `${compileHtmlTemplate(source)}\n// Template source\n${comments}`;
}

function pushTextSegment(segments: HtmlTemplateSegment[], value: string): void {
  if (value.length > 0) {
    segments.push({ type: "text", value });
  }
}

function compileSegment(segment: HtmlTemplateSegment): string {
  switch (segment.type) {
    case "text":
      return compileText(segment.value);
    case "scriptlet":
      return `${segment.code};`;
    case "print":
      return `${TEMPLATE_OUTPUT}.${segment.escaping === "contextual" ? "escaped" : "raw"} = ${segment.code};`;
  }
}

function compileText(value: string): string {
  let compiled = "";
  let offset = 0;

  while (offset < value.length) {
    const newline = value.indexOf("\n", offset);

    if (newline < 0) {
      compiled += `${TEMPLATE_OUTPUT}.raw = ${quoteJavaScriptString(value.slice(offset))};`;
      break;
    }

    compiled += `${TEMPLATE_OUTPUT}.raw = ${quoteJavaScriptString(value.slice(offset, newline + 1))};\n`;
    offset = newline + 1;
  }

  return compiled;
}

function quoteJavaScriptString(value: string): string {
  return JSON.stringify(value).replaceAll("\u2028", "\\u2028").replaceAll("\u2029", "\\u2029");
}
