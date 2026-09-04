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

function captureMutation(receiver: any, fn: () => any) {
  try {
    const result = fn();

    return {
      threw: false,
      returnsReceiver: result === receiver,
      isNull: result === null,
      isUndefined: result === undefined,
      type: typeof result,
      stringify: result === null || result === undefined ? null : String(result),
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
      returnsReceiver: null,
      isNull: null,
      isUndefined: null,
      type: null,
      stringify: null,
      errorName: typeof candidate?.name === "string" ? candidate.name : typeof error,
      errorMessage: typeof candidate?.message === "string" ? candidate.message : String(error),
    };
  }
}

function describeMetaTags(output: any) {
  return output.getMetaTags().map((tag: any) => ({
    stringify: String(tag),
    name: tag.getName(),
    content: tag.getContent(),
  }));
}

export function captureReferenceHtmlOutputSemantics() {
  const globals = globalThis as unknown as Record<string, any>;

  const htmlService = globals.HtmlService;

  const noArgumentCreation = captureCall(() => htmlService.createHtmlOutput());

  const output = htmlService.createHtmlOutput("<p>initial</p>");

  const initial = {
    stringify: String(output),
    content: output.getContent(),
    title: output.getTitle(),
    faviconUrl: output.getFaviconUrl(),
    height: output.getHeight(),
    width: output.getWidth(),
    metaTags: describeMetaTags(output),
  };

  const appendResult = captureMutation(output, () => output.append("<span>trusted</span>"));

  const afterAppend = output.getContent();

  const appendUntrustedResult = captureMutation(output, () =>
    output.appendUntrusted(`<b class="x">& '"</b>`),
  );

  const afterAppendUntrusted = output.getContent();

  const setTitleResult = captureMutation(output, () => output.setTitle("Vegas title"));

  const setFaviconResult = captureMutation(output, () =>
    output.setFaviconUrl("https://example.com/favicon.ico"),
  );

  const setHeightResult = captureMutation(output, () => output.setHeight(321));

  const setWidthResult = captureMutation(output, () => output.setWidth(654));

  const afterScalarSetters = {
    title: output.getTitle(),
    faviconUrl: output.getFaviconUrl(),
    height: output.getHeight(),
    width: output.getWidth(),
  };

  const addAllowedMetaTagResult = captureMutation(output, () =>
    output.addMetaTag("viewport", "width=device-width"),
  );

  const addUnsupportedMetaTagResult = captureMutation(output, () =>
    output.addMetaTag("vegas-test", "should-not-be-special"),
  );

  const afterMetaTags = describeMetaTags(output);

  const setSandboxModeResult = captureMutation(output, () =>
    output.setSandboxMode(htmlService.SandboxMode.IFRAME),
  );

  const setDefaultXFrameResult = captureMutation(output, () =>
    output.setXFrameOptionsMode(htmlService.XFrameOptionsMode.DEFAULT),
  );

  const setAllowAllXFrameResult = captureMutation(output, () =>
    output.setXFrameOptionsMode(htmlService.XFrameOptionsMode.ALLOWALL),
  );

  const clearResult = captureMutation(output, () => output.clear());

  return {
    noArgumentCreation,

    initial,

    appendResult,
    afterAppend,

    appendUntrustedResult,
    afterAppendUntrusted,

    setTitleResult,
    setFaviconResult,
    setHeightResult,
    setWidthResult,
    afterScalarSetters,

    addAllowedMetaTagResult,
    addUnsupportedMetaTagResult,
    afterMetaTags,

    setSandboxModeResult,
    setDefaultXFrameResult,
    setAllowAllXFrameResult,

    clearResult,
    afterClear: {
      content: output.getContent(),
      title: output.getTitle(),
      faviconUrl: output.getFaviconUrl(),
      height: output.getHeight(),
      width: output.getWidth(),
      metaTags: describeMetaTags(output),
    },
  };
}

function captureTemplateEvaluation(templateSource: string, bindings: Record<string, unknown>) {
  const globals = globalThis as unknown as Record<string, any>;

  const template = globals.HtmlService.createTemplate(templateSource);

  for (const [name, value] of Object.entries(bindings)) {
    template[name] = value;
  }

  try {
    const output = template.evaluate();

    return {
      threw: false,
      templateStringify: String(template),
      outputStringify: String(output),
      content: output.getContent(),
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
      templateStringify: String(template),
      outputStringify: null,
      content: null,
      errorName: typeof candidate?.name === "string" ? candidate.name : typeof error,
      errorMessage: typeof candidate?.message === "string" ? candidate.message : String(error),
    };
  }
}

export function captureReferenceHtmlTemplateEvaluationSemantics() {
  return {
    escapedPrint: captureTemplateEvaluation("<div><?= value ?></div>", {
      value: `<b class="x">& '"</b>`,
    }),

    forcePrint: captureTemplateEvaluation("<div><?!= value ?></div>", {
      value: `<b class="x">& '"</b>`,
    }),

    repeatedBinding: captureTemplateEvaluation("<p><?= value ?></p><p><?= value ?></p>", {
      value: "Vegas",
    }),

    statementBlock: captureTemplateEvaluation(
      [
        "<? for (var i = 0; i < items.length; i++) { ?>",
        "<span><?= items[i] ?></span>",
        "<? } ?>",
      ].join(""),
      {
        items: ["<one>", "&two", '"three"'],
      },
    ),

    mixedPrinting: captureTemplateEvaluation(
      ["A", "<?= escaped ?>", "B", "<?!= raw ?>", "C"].join(""),
      {
        escaped: "<escaped>",
        raw: "<raw>",
      },
    ),
  };
}
