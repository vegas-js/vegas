// https://developers.google.com/apps-script/reference/html/html-output-meta-tag
export function HtmlOutputMetaTag(
  name: string,
  content: string,
): GoogleAppsScript.HTML.HtmlOutputMetaTag {
  return {
    getContent: function () {
      return content;
    },
    getName: function () {
      return name;
    },
  };
}
