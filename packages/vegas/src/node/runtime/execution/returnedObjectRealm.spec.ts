import vm from "node:vm";

import { expect, test } from "vitest";

import type { CreateRange, CreateSheet, CreateSpreadsheet } from "../objects/types";
import type { RuntimeServicePort } from "../protocol";
import { HtmlOutput } from "../services/html/HtmlOutput";
import { HtmlTemplate } from "../services/html/HtmlTemplate";
import { Range } from "../services/spreadsheet/Range";
import { Sheet } from "../services/spreadsheet/Sheet";
import { Spreadsheet } from "../services/spreadsheet/Spreadsheet";
import { createScriptContext, type ScriptContextDependencies } from "./scriptContext";

function unexpected(): never {
  throw new Error("Unexpected dependency call while testing returned object realm fidelity");
}

const rangeService: RuntimeServicePort<"Range"> = {
  getValue: unexpected,
  getValues: unexpected,
  setValue: unexpected,
  setValues: unexpected,
};

const sheetService: RuntimeServicePort<"Sheet"> = {
  getLastRow: () => 0,
  getLastColumn: () => 0,
  getMaxRows: () => 10,
  getMaxColumns: () => 10,
  getSheetName: () => "Sheet1",
};

const createRange: CreateRange = (spreadsheetId, sheetId, row, column, numRows, numColumns) =>
  new Range(spreadsheetId, sheetId, row, column, numRows, numColumns, rangeService);

const createSheet: CreateSheet = (spreadsheetId, sheetId) =>
  new Sheet(spreadsheetId, sheetId, createRange, sheetService, unexpected);

const createSpreadsheet: CreateSpreadsheet = (spreadsheetId) =>
  new Spreadsheet(spreadsheetId, createSheet, unexpected);

function createDependencies(): ScriptContextDependencies {
  return {
    environment: {
      properties: {
        documentProperties: "unavailable",
      },
    },

    requestLegacySync: unexpected,

    createFile: unexpected,
    createFolder: unexpected,

    createHtmlOutput: (content, defaultXFrameOptionsMode) =>
      new HtmlOutput(content, defaultXFrameOptionsMode),

    createHtmlTemplate: (content) => new HtmlTemplate(content, unexpected),

    createSpreadsheet,

    logSink: {
      write: unexpected,
    },

    spreadsheetAppService: {
      create: () => "realm-spreadsheet-id",
    },

    urlFetchService: {
      fetch: () => ({
        headers: {
          "Content-Type": "text/plain",
          "X-Vegas-Realm-Test": "true",
        },
        content: [118, 101, 103, 97, 115],
        responseCode: 200,
      }),

      fetchAll: (requests) =>
        requests.map(() => ({
          headers: {
            "Content-Type": "text/plain",
          },
          content: [118, 101, 103, 97, 115],
          responseCode: 200,
        })),
    },

    htmlService: {
      getFileContent: unexpected,
    },

    sessionService: {
      getActiveUser: () => "active@example.invalid",

      getEffectiveUser: () => "effective@example.invalid",

      getActiveUserLocale: () => "en",

      getScriptTimeZone: () => "Etc/UTC",

      getTemporaryActiveUserKey: () => "reference-user",
    },

    cacheService: {
      get: unexpected,
      getAll: unexpected,
      put: unexpected,
      putAll: unexpected,
      remove: unexpected,
      removeAll: unexpected,
    },

    propertiesService: {
      deleteAllProperties: unexpected,
      deleteProperty: unexpected,
      getKeys: unexpected,
      getProperties: unexpected,
      getProperty: unexpected,
      setProperties: unexpected,
      setProperty: unexpected,
    },
  };
}

test("keeps all reachable returned objects in the script VM realm with characterized identity", () => {
  const context = createScriptContext(createDependencies());

  const serialized = vm.runInContext(
    `
        (() => {
          const user =
            Session.getActiveUser();

          const cache =
            CacheService.getScriptCache();

          const properties =
            PropertiesService.getScriptProperties();

          const lock =
            LockService.getScriptLock();

          const blob =
            Utilities.newBlob("vegas");

          const copiedBlob =
            blob.copyBlob();

          const response =
            UrlFetchApp.fetch(
              "https://example.invalid/"
            );

          const responseBlob =
            response.getBlob();

          const responseContent =
            response.getContent();

          const responseHeaders =
            response.getHeaders();

          const fetchAllResponses =
            UrlFetchApp.fetchAll([
              "https://example.invalid/a",
              "https://example.invalid/b"
            ]);

          const htmlOutput =
            HtmlService.createHtmlOutput(
              "content"
            );

          htmlOutput.addMetaTag(
            "viewport",
            "width=device-width"
          );

          const metaTagsA =
            htmlOutput.getMetaTags();

          const metaTagsB =
            htmlOutput.getMetaTags();

          const metaTag =
            metaTagsA[0];

          const htmlTemplate =
            HtmlService.createTemplate(
              "template"
            );

          const spreadsheet =
            SpreadsheetApp.create(
              "realm",
              10,
              10
            );

          const sheet =
            spreadsheet.getSheetById(0);

          const range =
            sheet.getRange("A1:B2");

          const cell =
            range.getCell(1, 1);

          const singleCellRange =
            sheet.getRange("A1");

          const isObjectRealmValue = (
            value
          ) =>
            Object.getPrototypeOf(value) ===
            Object.prototype &&
            value.constructor === Object;

          const isArrayRealmValue = (
            value
          ) =>
            Array.isArray(value) &&
            Object.getPrototypeOf(value) ===
            Array.prototype;

          return JSON.stringify({
            realm: {
              user:
                isObjectRealmValue(user),

              cache:
                isObjectRealmValue(cache),

              properties:
                isObjectRealmValue(
                  properties
                ),

              lock:
                isObjectRealmValue(lock),

              blob:
                isObjectRealmValue(blob),

              copiedBlob:
                isObjectRealmValue(
                  copiedBlob
                ),

              response:
                isObjectRealmValue(
                  response
                ),

              responseBlob:
                isObjectRealmValue(
                  responseBlob
                ),

              responseContent:
                isArrayRealmValue(
                  responseContent
                ),

              responseHeaders:
                isObjectRealmValue(
                  responseHeaders
                ),

              fetchAllResponses:
                isArrayRealmValue(
                  fetchAllResponses
                ),

              fetchAllResponse:
                isObjectRealmValue(
                  fetchAllResponses[0]
                ),

              htmlOutput:
                isObjectRealmValue(
                  htmlOutput
                ),

              htmlMetaTags:
                isArrayRealmValue(
                  metaTagsA
                ),

              htmlMetaTag:
                isObjectRealmValue(
                  metaTag
                ),

              htmlTemplate:
                isObjectRealmValue(
                  htmlTemplate
                ),

              spreadsheet:
                isObjectRealmValue(
                  spreadsheet
                ),

              sheet:
                isObjectRealmValue(sheet),

              range:
                isObjectRealmValue(range),

              cell:
                isObjectRealmValue(cell)
            },

            identity: {
              userFresh:
                user !==
                Session.getActiveUser(),

              cacheFresh:
                cache !==
                CacheService.getScriptCache(),

              propertiesFresh:
                properties !==
                PropertiesService.getScriptProperties(),

              lockFresh:
                lock !==
                LockService.getScriptLock(),

              blobFresh:
                blob !==
                Utilities.newBlob("vegas"),

              copiedBlobFresh:
                copiedBlob !== blob,

              responseFresh:
                response !==
                UrlFetchApp.fetch(
                  "https://example.invalid/"
                ),

              responseBlobFresh:
                responseBlob !==
                response.getBlob(),

              responseContentFresh:
                responseContent !==
                response.getContent(),

              responseHeadersFresh:
                responseHeaders !==
                response.getHeaders(),

              fetchAllResponsesDistinct:
                fetchAllResponses[0] !==
                fetchAllResponses[1],

              htmlOutputFresh:
                htmlOutput !==
                HtmlService.createHtmlOutput(
                  "content"
                ),

              htmlTemplateFresh:
                htmlTemplate !==
                HtmlService.createTemplate(
                  "template"
                ),

              metaTagArraysFresh:
                metaTagsA !== metaTagsB,

              metaTagStable:
                metaTagsA[0] ===
                metaTagsB[0],

              spreadsheetFresh:
                spreadsheet !==
                SpreadsheetApp.openById(
                  spreadsheet.getId()
                ),

              sheetFresh:
                sheet !==
                spreadsheet.getSheetById(0),

              rangeFresh:
                range !==
                sheet.getRange("A1:B2"),

              equivalentRangeFresh:
                range !==
                sheet.getRange(
                  1,
                  1,
                  2,
                  2
                ),

              cellFresh:
                cell !==
                range.getCell(1, 1),

              cellDistinctFromDirectRange:
                cell !==
                sheet.getRange("A1"),

              singleCellGetCellFresh:
                singleCellRange !==
                singleCellRange.getCell(
                  1,
                  1
                )
            }
          });
        })()
        `,
    context,
  ) as string;

  expect(JSON.parse(serialized)).toStrictEqual({
    realm: {
      user: true,
      cache: true,
      properties: true,
      lock: true,
      blob: true,
      copiedBlob: true,
      response: true,
      responseBlob: true,
      responseContent: true,
      responseHeaders: true,
      fetchAllResponses: true,
      fetchAllResponse: true,
      htmlOutput: true,
      htmlMetaTags: true,
      htmlMetaTag: true,
      htmlTemplate: true,
      spreadsheet: true,
      sheet: true,
      range: true,
      cell: true,
    },

    identity: {
      userFresh: true,
      cacheFresh: true,
      propertiesFresh: true,
      lockFresh: true,
      blobFresh: true,
      copiedBlobFresh: true,
      responseFresh: true,
      responseBlobFresh: true,
      responseContentFresh: true,
      responseHeadersFresh: true,
      fetchAllResponsesDistinct: true,
      htmlOutputFresh: true,
      htmlTemplateFresh: true,
      metaTagArraysFresh: true,
      metaTagStable: true,
      spreadsheetFresh: true,
      sheetFresh: true,
      rangeFresh: true,
      equivalentRangeFresh: true,
      cellFresh: true,
      cellDistinctFromDirectRange: true,
      singleCellGetCellFresh: true,
    },
  });
});
