export function captureReferenceHtmlOutputObjectIdentity() {
  const globals = globalThis as unknown as Record<string, any>;
  const htmlService = globals.HtmlService;

  const outputA = htmlService.createHtmlOutput("<p>vegas-reference</p>");
  const outputB = htmlService.createHtmlOutput("<p>vegas-reference</p>");

  const addMetaTagReturnsReceiver =
    outputA.addMetaTag("viewport", "width=device-width, initial-scale=1") === outputA;

  const metaTagsA = outputA.getMetaTags();
  const metaTagsB = outputA.getMetaTags();

  if (!metaTagsA[0] || !metaTagsB[0]) {
    throw new Error("Expected HtmlOutputMetaTag");
  }

  return {
    createHtmlOutputRepeatedSameObject: outputA === outputB,

    addMetaTagReturnsReceiver,

    appendReturnsReceiver: outputA.append("<span>trusted</span>") === outputA,

    appendUntrustedReturnsReceiver: outputA.appendUntrusted("<span>untrusted</span>") === outputA,

    clearReturnsReceiver: outputA.clear() === outputA,

    setContentReturnsReceiver: outputA.setContent("<p>updated</p>") === outputA,

    setFaviconUrlReturnsReceiver:
      outputA.setFaviconUrl("https://example.com/favicon.ico") === outputA,

    setHeightReturnsReceiver: outputA.setHeight(480) === outputA,

    setSandboxModeReturnsReceiver:
      outputA.setSandboxMode(htmlService.SandboxMode.IFRAME) === outputA,

    setTitleReturnsReceiver: outputA.setTitle("Vegas Reference") === outputA,

    setWidthReturnsReceiver: outputA.setWidth(640) === outputA,

    setXFrameOptionsModeReturnsReceiver:
      outputA.setXFrameOptionsMode(htmlService.XFrameOptionsMode.DEFAULT) === outputA,

    getMetaTagsRepeatedSameArray: metaTagsA === metaTagsB,

    getMetaTagsRepeatedSameMetaTag: metaTagsA[0] === metaTagsB[0],
  };
}
