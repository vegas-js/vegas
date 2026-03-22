export function doGet() {
  const htmlOutput = HtmlService.createHtmlOutputFromFile("index")
  htmlOutput.setFaviconUrl("https://vegasjs.dev/favicon.ico")
  htmlOutput.addMetaTag("viewport", "width=device-width, initial-scale=1.0")
  htmlOutput.setTitle("Vegas + Preact + TS")
  return htmlOutput
}
