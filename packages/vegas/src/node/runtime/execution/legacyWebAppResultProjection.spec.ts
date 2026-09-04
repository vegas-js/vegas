import { expect, test, vi } from "vitest";

import { projectLegacyWebAppResult } from "./legacyWebAppResultProjection";

test("projects doGet results for the legacy web app consumer", () => {
  const output = {
    getMetaTags() {
      return [
        {
          getName() {
            return "charset";
          },
          getContent() {
            return "utf-8";
          },
        },
      ];
    },
    getTitle() {
      return "html document";
    },
    getFaviconUrl() {
      return null;
    },
    getContent() {
      return "content";
    },
  };

  const getHtmlOutputXFrameOptionsMode = vi.fn(() => "SAMEORIGIN");

  expect(
    projectLegacyWebAppResult("doGet", output, {
      getHtmlOutputXFrameOptionsMode,
    }),
  ).toEqual({
    metaTags: [
      {
        name: "charset",
        content: "utf-8",
      },
    ],
    title: "html document",
    faviconUrl: null,
    content: "content",
    xFrameOptionsMode: "SAMEORIGIN",
  });

  expect(getHtmlOutputXFrameOptionsMode).toHaveBeenCalledOnce();

  expect(getHtmlOutputXFrameOptionsMode).toHaveBeenCalledWith(output);
});

test("projects doPost results with their MIME type", () => {
  const output = {
    getContent() {
      return "content";
    },
    getMimeType() {
      return "text/javascript";
    },
  };

  expect(projectLegacyWebAppResult("doPost", output)).toEqual({
    mimeType: "text/javascript",
    content: "content",
  });
});

test("defaults doPost MIME type to text/html", () => {
  const output = {
    getContent() {
      return "content";
    },
  };

  expect(projectLegacyWebAppResult("doPost", output)).toEqual({
    mimeType: "text/html",
    content: "content",
  });
});

test("leaves non-web-app results unchanged", () => {
  const result = {
    value: "result",
  };

  expect(projectLegacyWebAppResult("someFunction", result)).toBe(result);
});
