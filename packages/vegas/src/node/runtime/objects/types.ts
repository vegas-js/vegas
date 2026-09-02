export type CreateHtmlOutput = (
  content: string,
  defaultXFrameOptionsMode: GoogleAppsScript.HTML.XFrameOptionsMode,
) => GoogleAppsScript.HTML.HtmlOutput;

export type CreateHtmlTemplate = (content: string) => GoogleAppsScript.HTML.HtmlTemplate;
