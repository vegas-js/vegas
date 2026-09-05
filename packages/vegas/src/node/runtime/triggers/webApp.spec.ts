import { expect, test, vi } from "vitest";

import { createScriptRuntime, type ScriptRuntimeDependencies } from "../execution";
import { projectScriptResult } from "../execution/resultProjection";
import type { RequestLegacySync } from "../legacy/transport";
import type { RuntimeLogSink } from "../logging";
import type { ServiceCaller } from "../protocol";
import type { WebAppTriggerRequest } from "./webApp";
import { executeWebAppTrigger } from "./webAppExecution";

function createDependencies(code: string): ScriptRuntimeDependencies {
  const requestLegacySync = vi.fn(() => {
    throw new Error("Unexpected legacy runtime request");
  }) as RequestLegacySync;

  const logSink: RuntimeLogSink = {
    write: vi.fn(),
  };

  const callService = vi.fn(() => {
    throw new Error("Unexpected runtime service call");
  }) as unknown as ServiceCaller;

  return {
    code,

    environment: {
      properties: {
        documentProperties: "unavailable",
      },
    },

    requestLegacySync,
    logSink,
    callService,
  };
}

async function executeWebAppRequest(code: string, request: WebAppTriggerRequest) {
  const runtime = createScriptRuntime(createDependencies(code));

  const execution = await executeWebAppTrigger(runtime, request);

  return projectScriptResult(execution.value);
}

test("materializes a GET web app event in the target realm", async () => {
  const result = await executeWebAppRequest(
    `
          function doGet(e) {
            return {
              queryString:
                e.queryString,

              pathInfo:
                e.pathInfo,

              contextPath:
                e.contextPath,

              contentLength:
                e.contentLength,

              parameter:
                e.parameter,

              parameters:
                e.parameters,

              hasPostData:
                Object.prototype.hasOwnProperty.call(
                  e,
                  "postData"
                ),

              eventPrototypeIsObjectPrototype:
                Object.getPrototypeOf(e) ===
                Object.prototype,

              parameterPrototypeIsObjectPrototype:
                Object.getPrototypeOf(
                  e.parameter
                ) ===
                Object.prototype,

              parametersPrototypeIsObjectPrototype:
                Object.getPrototypeOf(
                  e.parameters
                ) ===
                Object.prototype,

              valuesAreArray:
                Array.isArray(
                  e.parameters.a
                ),

              valuesPrototypeIsArrayPrototype:
                Object.getPrototypeOf(
                  e.parameters.a
                ) ===
                Array.prototype
            };
          }
        `,
    {
      method: "GET",

      pathInfo: "path/to/resource",

      queryString: "a=&a=2&encoded=%E3%81%82&space=hello+world&equals=left=right",
    },
  );

  expect(result).toEqual({
    queryString: "a&a=2&encoded=%E3%81%82&space=hello+world&equals=left%3Dright",

    pathInfo: "path/to/resource",

    contextPath: "",

    contentLength: -1,

    parameter: {
      a: "",
      encoded: "あ",
      space: "hello world",
      equals: "left=right",
    },

    parameters: {
      a: ["", "2"],
      encoded: ["あ"],
      space: ["hello world"],
      equals: ["left=right"],
    },

    hasPostData: false,

    eventPrototypeIsObjectPrototype: true,

    parameterPrototypeIsObjectPrototype: true,

    parametersPrototypeIsObjectPrototype: true,

    valuesAreArray: true,

    valuesPrototypeIsArrayPrototype: true,
  });
});

test("materializes a POST web app event with query and form parameters", async () => {
  const result = await executeWebAppRequest(
    `
          function doPost(e) {
            return {
              queryString:
                e.queryString,

              contentLength:
                e.contentLength,

              parameter:
                e.parameter,

              parameters:
                e.parameters,

              postData: {
                contents:
                  e.postData.contents,

                length:
                  e.postData.length,

                name:
                  e.postData.name,

                type:
                  e.postData.type,

                getName:
                  e.postData.getName(),

                getContentType:
                  e.postData.getContentType(),

                getDataAsString:
                  e.postData.getDataAsString(),

                getBytes:
                  e.postData.getBytes(),

                isGoogleType:
                  e.postData.isGoogleType(),

                stringify:
                  String(e.postData),

                prototypeIsObjectPrototype:
                  Object.getPrototypeOf(
                    e.postData
                  ) ===
                  Object.prototype
              }
            };
          }
        `,
    {
      method: "POST",

      queryString: "a=query",

      contentType: "application/x-www-form-urlencoded",

      body: "a=body1&a=body2",
    },
  );

  expect(result).toEqual({
    queryString: "a=query",

    contentLength: 15,

    parameter: {
      a: "query",
    },

    parameters: {
      a: ["query", "body1", "body2"],
    },

    postData: {
      contents: "a=body1&a=body2",

      length: 15,

      name: "postData",

      type: "application/x-www-form-urlencoded",

      getName: "postData",

      getContentType: "application/x-www-form-urlencoded",

      getDataAsString: "a=body1&a=body2",

      getBytes: [97, 61, 98, 111, 100, 121, 49, 38, 97, 61, 98, 111, 100, 121, 50],

      isGoogleType: false,

      stringify: "FileUpload",

      prototypeIsObjectPrototype: true,
    },
  });
});

test("uses UTF-8 byte length for web app POST data", async () => {
  const result = await executeWebAppRequest(
    `
          function doPost(e) {
            return {
              contentLength:
                e.contentLength,

              length:
                e.postData.length,

              contents:
                e.postData.contents,

              type:
                e.postData.type,

              bytes:
                e.postData.getBytes()
            };
          }
        `,
    {
      method: "POST",

      contentType: "text/plain; charset=utf-8",

      body: "こんにちは",
    },
  );

  expect(result).toEqual({
    contentLength: 15,
    length: 15,
    contents: "こんにちは",

    type: "text/plain; charset=utf-8",

    bytes: [-29, -127, -109, -29, -126, -109, -29, -127, -85, -29, -127, -95, -29, -127, -81],
  });
});

test("omits postData from an empty POST web app event", async () => {
  const result = await executeWebAppRequest(
    `
          function doPost(e) {
            return {
              contentLength:
                e.contentLength,

              hasPostData:
                Object.prototype.hasOwnProperty.call(
                  e,
                  "postData"
                ),

              postDataType:
                typeof e.postData,

              parameter:
                e.parameter,

              parameters:
                e.parameters
            };
          }
        `,
    {
      method: "POST",
    },
  );

  expect(result).toEqual({
    contentLength: 0,
    hasPostData: false,
    postDataType: "undefined",
    parameter: {},
    parameters: {},
  });
});

test("selects the predefined web app entry from the request method", async () => {
  const code = `
      function doGet(e) {
        return {
          entry: "doGet",
          methodShape:
            e.contentLength === -1
              ? "get"
              : "unexpected"
        };
      }

      function doPost(e) {
        return {
          entry: "doPost",
          methodShape:
            e.contentLength === 0
              ? "post"
              : "unexpected"
        };
      }
    `;

  await expect(
    executeWebAppRequest(code, {
      method: "GET",
    }),
  ).resolves.toEqual({
    entry: "doGet",
    methodShape: "get",
  });

  await expect(
    executeWebAppRequest(code, {
      method: "POST",
    }),
  ).resolves.toEqual({
    entry: "doPost",
    methodShape: "post",
  });
});

test("materializes non-writable web app postData fields", async () => {
  const result = await executeWebAppRequest(
    `
          function describe(value, name) {
            const descriptor =
              Object.getOwnPropertyDescriptor(
                value,
                name
              );

            return {
              writable:
                descriptor.writable,
              enumerable:
                descriptor.enumerable,
              configurable:
                descriptor.configurable
            };
          }

          function doPost(e) {
            return {
              contents:
                describe(
                  e.postData,
                  "contents"
                ),

              length:
                describe(
                  e.postData,
                  "length"
                ),

              name:
                describe(
                  e.postData,
                  "name"
                ),

              type:
                describe(
                  e.postData,
                  "type"
                )
            };
          }
        `,
    {
      method: "POST",
      contentType: "text/plain",
      body: "hello",
    },
  );

  const expectedDescriptor = {
    writable: false,
    enumerable: true,
    configurable: true,
  };

  expect(result).toEqual({
    contents: expectedDescriptor,
    length: expectedDescriptor,
    name: expectedDescriptor,
    type: expectedDescriptor,
  });
});
