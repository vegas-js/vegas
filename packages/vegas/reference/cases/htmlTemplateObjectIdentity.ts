export function captureReferenceHtmlTemplateObjectIdentity() {
  const globals = globalThis as unknown as Record<string, any>;

  const htmlService = globals.HtmlService;

  const templateA = htmlService.createTemplate("<p>vegas-reference</p>");

  const templateB = htmlService.createTemplate("<p>vegas-reference</p>");

  const outputA = templateA.evaluate();

  const outputB = templateA.evaluate();

  return {
    createTemplateRepeatedSameObject: templateA === templateB,

    evaluateRepeatedSameObject: outputA === outputB,

    evaluateReturnsHtmlOutput: String(outputA) === "HtmlOutput",

    evaluatedOutputPrototypeIsObjectPrototype: Object.getPrototypeOf(outputA) === Object.prototype,

    evaluatedOutputHasInternalXFrameGetter: "getXFrameOptionsMode" in outputA,
  };
}
