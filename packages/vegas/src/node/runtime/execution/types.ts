export type EvaluateHtmlTemplate = (
  code: string,
  bindings: Record<string, unknown>,
) => GoogleAppsScript.HTML.HtmlOutput;
