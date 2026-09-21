export function doGet() {
  const template = HtmlService.createTemplateFromFile("index")
  template.message = "Rendered on the server with Apps Script scriptlets."
  template.initialCount = 0

  const htmlOutput = template.evaluate()

  htmlOutput.setFaviconUrl("https://vegasjs.dev/favicon.ico")
  htmlOutput.addMetaTag("viewport", "width=device-width, initial-scale=1.0")
  htmlOutput.setTitle("Vegas + Apps Script Scriptlets")

  return htmlOutput
}
