import type { JsonValue, ReferenceWebAppRequest } from "./types";

export type ReferenceAcquisition =
  | {
      kind: "execution-api";
    }
  | {
      kind: "web-app";
      request: ReferenceWebAppRequest;
    };

export interface ReferenceCaseDefinition {
  name: string;
  functionName: string;
  fixtureFile: string;
  runtimeTest: "required" | "pending";
  executionCount?: number;
  observationMode?: "result" | "outcome";
  parameters?: readonly JsonValue[];
  acquisition?: ReferenceAcquisition;
}

export const referenceCases: readonly ReferenceCaseDefinition[] = [
  {
    name: "smoke",
    functionName: "captureReferenceSmoke",
    fixtureFile: "smoke.json",
    runtimeTest: "required",
  },
  {
    name: "execution-top-level-lifecycle",
    functionName: "captureReferenceExecutionTopLevelLifecycle",
    fixtureFile: "execution-top-level-lifecycle.json",
    runtimeTest: "required",
    executionCount: 2,
  },
  {
    name: "execution-global-lifecycle",
    functionName: "captureReferenceExecutionGlobalLifecycle",
    fixtureFile: "execution-global-lifecycle.json",
    runtimeTest: "required",
    executionCount: 2,
  },
  {
    name: "execution-non-strict-this",
    functionName: "captureReferenceExecutionNonStrictThis",
    fixtureFile: "execution-non-strict-this.json",
    runtimeTest: "required",
  },
  {
    name: "execution-strict-this",
    functionName: "captureReferenceExecutionStrictThis",
    fixtureFile: "execution-strict-this.json",
    runtimeTest: "required",
  },
  {
    name: "execution-entry-function-declaration",
    functionName: "captureReferenceEntryFunctionDeclaration",
    fixtureFile: "execution-entry-function-declaration.json",
    runtimeTest: "required",
    observationMode: "outcome",
  },
  {
    name: "execution-entry-var-function",
    functionName: "captureReferenceEntryVarFunction",
    fixtureFile: "execution-entry-var-function.json",
    runtimeTest: "required",
    observationMode: "outcome",
  },
  {
    name: "execution-entry-var-arrow",
    functionName: "captureReferenceEntryVarArrow",
    fixtureFile: "execution-entry-var-arrow.json",
    runtimeTest: "required",
    observationMode: "outcome",
  },
  {
    name: "execution-entry-let-function",
    functionName: "captureReferenceEntryLetFunction",
    fixtureFile: "execution-entry-let-function.json",
    runtimeTest: "required",
    observationMode: "outcome",
  },
  {
    name: "execution-entry-const-arrow",
    functionName: "captureReferenceEntryConstArrow",
    fixtureFile: "execution-entry-const-arrow.json",
    runtimeTest: "required",
    observationMode: "outcome",
  },
  {
    name: "execution-entry-non-callable",
    functionName: "captureReferenceEntryNonCallable",
    fixtureFile: "execution-entry-non-callable.json",
    runtimeTest: "required",
    observationMode: "outcome",
  },
  {
    name: "execution-entry-missing",
    functionName: "captureReferenceEntryMissing",
    fixtureFile: "execution-entry-missing.json",
    runtimeTest: "required",
    observationMode: "outcome",
  },
  {
    name: "execution-entry-inherited-property",
    functionName: "toString",
    fixtureFile: "execution-entry-inherited-property.json",
    runtimeTest: "required",
    observationMode: "outcome",
  },
  {
    name: "execution-argument-values",
    functionName: "captureReferenceExecutionArgumentValues",
    fixtureFile: "execution-argument-values.json",
    runtimeTest: "required",
    observationMode: "outcome",
    parameters: ["value", 42, true, null],
  },
  {
    name: "execution-argument-realm",
    functionName: "captureReferenceExecutionArgumentRealm",
    fixtureFile: "execution-argument-realm.json",
    runtimeTest: "required",
    observationMode: "outcome",
    parameters: [
      {
        nestedObject: {
          value: 1,
        },
        nestedArray: [
          1,
          {
            value: 2,
          },
        ],
      },
      [
        1,
        {
          value: 2,
        },
        [3, 4],
      ],
    ],
  },
  {
    name: "execution-promise-resolve",
    functionName: "captureReferenceExecutionPromiseResolve",
    fixtureFile: "execution-promise-resolve.json",
    runtimeTest: "required",
    observationMode: "outcome",
  },
  {
    name: "execution-async-return",
    functionName: "captureReferenceExecutionAsyncReturn",
    fixtureFile: "execution-async-return.json",
    runtimeTest: "required",
    observationMode: "outcome",
  },
  {
    name: "execution-thenable",
    functionName: "captureReferenceExecutionThenable",
    fixtureFile: "execution-thenable.json",
    runtimeTest: "required",
    observationMode: "outcome",
  },
  {
    name: "execution-promise-reject",
    functionName: "captureReferenceExecutionPromiseReject",
    fixtureFile: "execution-promise-reject.json",
    runtimeTest: "required",
    observationMode: "outcome",
  },
  {
    name: "execution-async-throw",
    functionName: "captureReferenceExecutionAsyncThrow",
    fixtureFile: "execution-async-throw.json",
    runtimeTest: "required",
    observationMode: "outcome",
  },
  {
    name: "execution-throw-error",
    functionName: "captureReferenceExecutionThrowError",
    fixtureFile: "execution-throw-error.json",
    runtimeTest: "required",
    observationMode: "outcome",
  },
  {
    name: "execution-throw-type-error",
    functionName: "captureReferenceExecutionThrowTypeError",
    fixtureFile: "execution-throw-type-error.json",
    runtimeTest: "required",
    observationMode: "outcome",
  },
  {
    name: "execution-throw-string",
    functionName: "captureReferenceExecutionThrowString",
    fixtureFile: "execution-throw-string.json",
    runtimeTest: "required",
    observationMode: "outcome",
  },
  {
    name: "execution-throw-number",
    functionName: "captureReferenceExecutionThrowNumber",
    fixtureFile: "execution-throw-number.json",
    runtimeTest: "required",
    observationMode: "outcome",
  },
  {
    name: "execution-throw-object",
    functionName: "captureReferenceExecutionThrowObject",
    fixtureFile: "execution-throw-object.json",
    runtimeTest: "required",
    observationMode: "outcome",
  },
  {
    name: "execution-throw-null",
    functionName: "captureReferenceExecutionThrowNull",
    fixtureFile: "execution-throw-null.json",
    runtimeTest: "required",
    observationMode: "outcome",
  },
  {
    name: "global-surface",
    functionName: "captureReferenceGlobalSurface",
    fixtureFile: "global-surface.json",
    runtimeTest: "required",
  },
  {
    name: "mime-type-surface",
    functionName: "captureReferenceMimeTypeSurface",
    fixtureFile: "mime-type-surface.json",
    runtimeTest: "required",
  },
  {
    name: "builtin-global-surface",
    functionName: "captureReferenceBuiltinGlobalSurface",
    fixtureFile: "builtin-global-surface.json",
    runtimeTest: "pending",
  },
  {
    name: "global-object-surface",
    functionName: "captureReferenceGlobalObjectSurface",
    fixtureFile: "global-object-surface.json",
    runtimeTest: "pending",
  },
  {
    name: "enum-like-surface",
    functionName: "captureReferenceEnumLikeSurface",
    fixtureFile: "enum-like-surface.json",
    runtimeTest: "pending",
  },
  {
    name: "enum-member-surface",
    functionName: "captureReferenceEnumMemberSurface",
    fixtureFile: "enum-member-surface.json",
    runtimeTest: "pending",
  },
  {
    name: "cache-service-surface",
    functionName: "captureReferenceCacheServiceSurface",
    fixtureFile: "cache-service-surface.json",
    runtimeTest: "required",
  },
  {
    name: "cache-object-surface",
    functionName: "captureReferenceCacheObjectSurface",
    fixtureFile: "cache-object-surface.json",
    runtimeTest: "required",
  },
  {
    name: "cache-object-identity",
    functionName: "captureReferenceCacheObjectIdentity",
    fixtureFile: "cache-object-identity.json",
    runtimeTest: "required",
  },
  {
    name: "cache-object-semantics",
    functionName: "captureReferenceCacheObjectSemantics",
    fixtureFile: "cache-object-semantics.json",
    runtimeTest: "required",
  },
  {
    name: "lock-service-surface",
    functionName: "captureReferenceLockServiceSurface",
    fixtureFile: "lock-service-surface.json",
    runtimeTest: "required",
  },
  {
    name: "lock-object-surface",
    functionName: "captureReferenceLockObjectSurface",
    fixtureFile: "lock-object-surface.json",
    runtimeTest: "required",
  },
  {
    name: "lock-object-identity",
    functionName: "captureReferenceLockObjectIdentity",
    fixtureFile: "lock-object-identity.json",
    runtimeTest: "required",
  },
  {
    name: "lock-semantics",
    functionName: "captureReferenceLockSemantics",
    fixtureFile: "lock-semantics.json",
    runtimeTest: "required",
  },
  {
    name: "html-service-surface",
    functionName: "captureReferenceHtmlServiceSurface",
    fixtureFile: "html-service-surface.json",
    runtimeTest: "required",
  },
  {
    name: "html-output-object-surface",
    functionName: "captureReferenceHtmlOutputObjectSurface",
    fixtureFile: "html-output-object-surface.json",
    runtimeTest: "required",
  },
  {
    name: "html-output-meta-tag-object-surface",
    functionName: "captureReferenceHtmlOutputMetaTagObjectSurface",
    fixtureFile: "html-output-meta-tag-object-surface.json",
    runtimeTest: "required",
  },
  {
    name: "html-output-object-identity",
    functionName: "captureReferenceHtmlOutputObjectIdentity",
    fixtureFile: "html-output-object-identity.json",
    runtimeTest: "required",
  },
  {
    name: "html-template-object-surface",
    functionName: "captureReferenceHtmlTemplateObjectSurface",
    fixtureFile: "html-template-object-surface.json",
    runtimeTest: "required",
  },
  {
    name: "html-template-object-binding",
    functionName: "captureReferenceHtmlTemplateObjectBinding",
    fixtureFile: "html-template-object-binding.json",
    runtimeTest: "required",
  },
  {
    name: "html-template-object-identity",
    functionName: "captureReferenceHtmlTemplateObjectIdentity",
    fixtureFile: "html-template-object-identity.json",
    runtimeTest: "required",
  },
  {
    name: "html-output-semantics",
    functionName: "captureReferenceHtmlOutputSemantics",
    fixtureFile: "html-output-semantics.json",
    runtimeTest: "required",
  },
  {
    name: "html-template-evaluation-semantics",
    functionName: "captureReferenceHtmlTemplateEvaluationSemantics",
    fixtureFile: "html-template-evaluation-semantics.json",
    runtimeTest: "required",
  },
  {
    name: "http-response-object-surface",
    functionName: "captureReferenceHttpResponseObjectSurface",
    fixtureFile: "http-response-object-surface.json",
    runtimeTest: "required",
  },
  {
    name: "http-response-object-identity",
    functionName: "captureReferenceHttpResponseObjectIdentity",
    fixtureFile: "http-response-object-identity.json",
    runtimeTest: "required",
  },
  {
    name: "url-fetch-app-surface",
    functionName: "captureReferenceUrlFetchAppSurface",
    fixtureFile: "url-fetch-app-surface.json",
    runtimeTest: "required",
  },
  {
    name: "url-fetch-get-request-semantics",
    functionName: "captureReferenceUrlFetchGetRequestSemantics",
    fixtureFile: "url-fetch-get-request-semantics.json",
    runtimeTest: "required",
  },
  {
    name: "url-fetch-transport-semantics",
    functionName: "captureReferenceUrlFetchTransportSemantics",
    fixtureFile: "url-fetch-transport-semantics.json",
    runtimeTest: "required",
  },
  {
    name: "http-response-semantics",
    functionName: "captureReferenceHttpResponseSemantics",
    fixtureFile: "http-response-semantics.json",
    runtimeTest: "required",
  },
  {
    name: "utilities-surface",
    functionName: "captureReferenceUtilitiesSurface",
    fixtureFile: "utilities-surface.json",
    runtimeTest: "required",
  },
  {
    name: "blob-semantics",
    functionName: "captureReferenceBlobSemantics",
    fixtureFile: "blob-semantics.json",
    runtimeTest: "required",
  },
  {
    name: "utilities-byte-semantics",
    functionName: "captureReferenceUtilitiesByteSemantics",
    fixtureFile: "utilities-byte-semantics.json",
    runtimeTest: "required",
  },
  {
    name: "utilities-compression-semantics",
    functionName: "captureReferenceUtilitiesCompressionSemantics",
    fixtureFile: "utilities-compression-semantics.json",
    runtimeTest: "required",
  },
  {
    name: "utilities-parse-csv-semantics",
    functionName: "captureReferenceUtilitiesParseCsvSemantics",
    fixtureFile: "utilities-parse-csv-semantics.json",
    runtimeTest: "required",
  },
  {
    name: "utilities-format-date-semantics",
    functionName: "captureReferenceUtilitiesFormatDateSemantics",
    fixtureFile: "utilities-format-date-semantics.json",
    runtimeTest: "required",
  },
  {
    name: "utilities-runtime-semantics",
    functionName: "captureReferenceUtilitiesRuntimeSemantics",
    fixtureFile: "utilities-runtime-semantics.json",
    runtimeTest: "required",
  },
  {
    name: "utilities-crypto-semantics",
    functionName: "captureReferenceUtilitiesCryptoSemantics",
    fixtureFile: "utilities-crypto-semantics.json",
    runtimeTest: "required",
  },
  {
    name: "blob-object-surface",
    functionName: "captureReferenceBlobObjectSurface",
    fixtureFile: "blob-object-surface.json",
    runtimeTest: "required",
  },
  {
    name: "blob-object-identity",
    functionName: "captureReferenceBlobObjectIdentity",
    fixtureFile: "blob-object-identity.json",
    runtimeTest: "required",
  },
  {
    name: "spreadsheet-app-surface",
    functionName: "captureReferenceSpreadsheetAppSurface",
    fixtureFile: "spreadsheet-app-surface.json",
    runtimeTest: "required",
  },
  {
    name: "spreadsheet-object-graph",
    functionName: "captureReferenceSpreadsheetObjectGraph",
    fixtureFile: "spreadsheet-object-graph.json",
    runtimeTest: "required",
  },
  {
    name: "spreadsheet-create-semantics",
    functionName: "captureReferenceSpreadsheetCreateSemantics",
    fixtureFile: "spreadsheet-create-semantics.json",
    runtimeTest: "required",
  },
  {
    name: "spreadsheet-get-sheet-by-id-semantics",
    functionName: "captureReferenceSpreadsheetGetSheetByIdSemantics",
    fixtureFile: "spreadsheet-get-sheet-by-id-semantics.json",
    runtimeTest: "required",
  },
  {
    name: "sheet-get-range-semantics",
    functionName: "captureReferenceSheetGetRangeSemantics",
    fixtureFile: "sheet-get-range-semantics.json",
    runtimeTest: "required",
  },
  {
    name: "sheet-named-range-semantics",
    functionName: "captureReferenceSheetNamedRangeSemantics",
    fixtureFile: "sheet-named-range-semantics.json",
    runtimeTest: "required",
  },
  {
    name: "spreadsheet-open-semantics",
    functionName: "captureReferenceSpreadsheetOpenSemantics",
    fixtureFile: "spreadsheet-open-semantics.json",
    runtimeTest: "required",
  },
  {
    name: "range-value-semantics",
    functionName: "captureReferenceRangeValueSemantics",
    fixtureFile: "range-value-semantics.json",
    runtimeTest: "required",
  },
  {
    name: "range-set-values-validation-semantics",
    functionName: "captureReferenceRangeSetValuesValidationSemantics",
    fixtureFile: "range-set-values-validation-semantics.json",
    runtimeTest: "required",
  },
  {
    name: "range-get-cell-semantics",
    functionName: "captureReferenceRangeGetCellSemantics",
    fixtureFile: "range-get-cell-semantics.json",
    runtimeTest: "required",
  },
  {
    name: "sheet-query-semantics",
    functionName: "captureReferenceSheetQuerySemantics",
    fixtureFile: "sheet-query-semantics.json",
    runtimeTest: "required",
  },
  {
    name: "sheet-clear-contents-semantics",
    functionName: "captureReferenceSheetClearContentsSemantics",
    fixtureFile: "sheet-clear-contents-semantics.json",
    runtimeTest: "required",
  },
  {
    name: "sheet-delete-semantics",
    functionName: "captureReferenceSheetDeleteSemantics",
    fixtureFile: "sheet-delete-semantics.json",
    runtimeTest: "required",
  },
  {
    name: "drive-app-surface",
    functionName: "captureReferenceDriveAppSurface",
    fixtureFile: "drive-app-surface.json",
    runtimeTest: "required",
  },
  {
    name: "logger-surface",
    functionName: "captureReferenceLoggerSurface",
    fixtureFile: "logger-surface.json",
    runtimeTest: "required",
  },
  {
    name: "console-surface",
    functionName: "captureReferenceConsoleSurface",
    fixtureFile: "console-surface.json",
    runtimeTest: "required",
  },
  {
    name: "logger-semantics",
    functionName: "captureReferenceLoggerSemantics",
    fixtureFile: "logger-semantics.json",
    runtimeTest: "required",
  },
  {
    name: "console-semantics",
    functionName: "captureReferenceConsoleSemantics",
    fixtureFile: "console-semantics.json",
    runtimeTest: "required",
  },
  {
    name: "session-service-surface",
    functionName: "captureReferenceSessionServiceSurface",
    fixtureFile: "session-service-surface.json",
    runtimeTest: "required",
  },
  {
    name: "session-deprecated-semantics",
    functionName: "captureReferenceSessionDeprecatedSemantics",
    fixtureFile: "session-deprecated-semantics.json",
    runtimeTest: "required",
  },
  {
    name: "user-object-surface",
    functionName: "captureReferenceUserObjectSurface",
    fixtureFile: "user-object-surface.json",
    runtimeTest: "required",
  },
  {
    name: "user-object-identity",
    functionName: "captureReferenceUserObjectIdentity",
    fixtureFile: "user-object-identity.json",
    runtimeTest: "required",
  },
  {
    name: "properties-service-surface",
    functionName: "captureReferencePropertiesServiceSurface",
    fixtureFile: "properties-service-surface.json",
    runtimeTest: "required",
  },
  {
    name: "properties-service-semantics",
    functionName: "captureReferencePropertiesServiceSemantics",
    fixtureFile: "properties-service-semantics.json",
    runtimeTest: "required",
  },
  {
    name: "properties-object-surface",
    functionName: "captureReferencePropertiesObjectSurface",
    fixtureFile: "properties-object-surface.json",
    runtimeTest: "required",
  },
  {
    name: "properties-object-semantics",
    functionName: "captureReferencePropertiesObjectSemantics",
    fixtureFile: "properties-object-semantics.json",
    runtimeTest: "required",
  },
  {
    name: "web-app-do-get-empty-event",
    functionName: "doGet",
    fixtureFile: "web-app-do-get-empty-event.json",
    runtimeTest: "required",
    acquisition: {
      kind: "web-app",
      request: {
        method: "GET",
      },
    },
  },
  {
    name: "web-app-do-get-single-parameter",
    functionName: "doGet",
    fixtureFile: "web-app-do-get-single-parameter.json",
    runtimeTest: "required",
    acquisition: {
      kind: "web-app",
      request: {
        method: "GET",
        queryString: "a=1",
      },
    },
  },
  {
    name: "web-app-do-get-repeated-parameter",
    functionName: "doGet",
    fixtureFile: "web-app-do-get-repeated-parameter.json",
    runtimeTest: "required",
    acquisition: {
      kind: "web-app",
      request: {
        method: "GET",
        queryString: "a=1&a=2",
      },
    },
  },
  {
    name: "web-app-do-get-empty-first-parameter",
    functionName: "doGet",
    fixtureFile: "web-app-do-get-empty-first-parameter.json",
    runtimeTest: "required",
    acquisition: {
      kind: "web-app",
      request: {
        method: "GET",
        queryString: "a=&a=2",
      },
    },
  },
  {
    name: "web-app-do-get-percent-encoded-parameter",
    functionName: "doGet",
    fixtureFile: "web-app-do-get-percent-encoded-parameter.json",
    runtimeTest: "required",
    acquisition: {
      kind: "web-app",
      request: {
        method: "GET",
        queryString: "encoded=%E3%81%82",
      },
    },
  },
  {
    name: "web-app-do-get-plus-encoded-parameter",
    functionName: "doGet",
    fixtureFile: "web-app-do-get-plus-encoded-parameter.json",
    runtimeTest: "required",
    acquisition: {
      kind: "web-app",
      request: {
        method: "GET",
        queryString: "a=hello+world",
      },
    },
  },
  {
    name: "web-app-do-get-value-containing-equals",
    functionName: "doGet",
    fixtureFile: "web-app-do-get-value-containing-equals.json",
    runtimeTest: "required",
    acquisition: {
      kind: "web-app",
      request: {
        method: "GET",
        queryString: "a=left=right",
      },
    },
  },
  {
    name: "web-app-do-get-path-info",
    functionName: "doGet",
    fixtureFile: "web-app-do-get-path-info.json",
    runtimeTest: "required",
    acquisition: {
      kind: "web-app",
      request: {
        method: "GET",
        pathInfo: "path/to/resource",
        queryString: "a=1",
        authentication: "oauth",
      },
    },
  },
  {
    name: "web-app-do-post-empty-body",
    functionName: "doPost",
    fixtureFile: "web-app-do-post-empty-body.json",
    runtimeTest: "required",
    acquisition: {
      kind: "web-app",
      request: {
        method: "POST",
      },
    },
  },
  {
    name: "web-app-do-post-text-body",
    functionName: "doPost",
    fixtureFile: "web-app-do-post-text-body.json",
    runtimeTest: "required",
    acquisition: {
      kind: "web-app",
      request: {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
        },
        body: "hello",
      },
    },
  },
  {
    name: "web-app-do-post-utf8-body",
    functionName: "doPost",
    fixtureFile: "web-app-do-post-utf8-body.json",
    runtimeTest: "required",
    acquisition: {
      kind: "web-app",
      request: {
        method: "POST",
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
        body: "こんにちは",
      },
    },
  },
  {
    name: "web-app-do-post-form-repeated",
    functionName: "doPost",
    fixtureFile: "web-app-do-post-form-repeated.json",
    runtimeTest: "required",
    acquisition: {
      kind: "web-app",
      request: {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "a=1&a=2",
      },
    },
  },
  {
    name: "web-app-do-post-query-form-collision",
    functionName: "doPost",
    fixtureFile: "web-app-do-post-query-form-collision.json",
    runtimeTest: "required",
    acquisition: {
      kind: "web-app",
      request: {
        method: "POST",
        queryString: "a=query",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "a=body1&a=body2",
      },
    },
  },
  {
    name: "web-app-do-post-query-form-disjoint",
    functionName: "doPost",
    fixtureFile: "web-app-do-post-query-form-disjoint.json",
    runtimeTest: "required",
    acquisition: {
      kind: "web-app",
      request: {
        method: "POST",
        queryString: "q=query",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "a=body1&a=body2",
      },
    },
  },
  {
    name: "web-app-do-post-reserved-parameter-c-http-outcome",
    functionName: "doPost",
    fixtureFile: "web-app-do-post-reserved-parameter-c-http-outcome.json",
    runtimeTest: "pending",
    acquisition: {
      kind: "web-app",
      request: {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "c=reserved",
        responseMode: "http",
      },
    },
  },
  {
    name: "web-app-post-data-surface",
    functionName: "doPost",
    fixtureFile: "web-app-post-data-surface.json",
    runtimeTest: "required",
    acquisition: {
      kind: "web-app",
      request: {
        method: "POST",
        pathInfo: "__vegas_reference/post-data-surface",
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
        body: "こんにちは",
        authentication: "oauth",
      },
    },
  },
  {
    name: "web-app-do-get-html-output-http-response",
    functionName: "doGet",
    fixtureFile: "web-app-do-get-html-output-http-response.json",
    runtimeTest: "pending",
    acquisition: {
      kind: "web-app",
      request: {
        method: "GET",
        queryString: "__vegas_reference_result=html",
        responseMode: "http",
      },
    },
  },
  {
    name: "web-app-do-get-text-output-http-response",
    functionName: "doGet",
    fixtureFile: "web-app-do-get-text-output-http-response.json",
    runtimeTest: "pending",
    acquisition: {
      kind: "web-app",
      request: {
        method: "GET",
        queryString: "__vegas_reference_result=text",
        responseMode: "http-text",
      },
    },
  },
  {
    name: "web-app-do-post-html-output-http-response",
    functionName: "doPost",
    fixtureFile: "web-app-do-post-html-output-http-response.json",
    runtimeTest: "pending",
    acquisition: {
      kind: "web-app",
      request: {
        method: "POST",
        queryString: "__vegas_reference_result=html",
        headers: {
          "Content-Type": "text/plain",
        },
        body: "request-body",
        responseMode: "http",
      },
    },
  },
  {
    name: "web-app-do-post-text-output-http-response",
    functionName: "doPost",
    fixtureFile: "web-app-do-post-text-output-http-response.json",
    runtimeTest: "pending",
    acquisition: {
      kind: "web-app",
      request: {
        method: "POST",
        queryString: "__vegas_reference_result=text",
        headers: {
          "Content-Type": "text/plain",
        },
        body: "request-body",
        responseMode: "http-text",
      },
    },
  },
  {
    name: "web-app-do-get-invalid-result-http-outcome",
    functionName: "doGet",
    fixtureFile: "web-app-do-get-invalid-result-http-outcome.json",
    runtimeTest: "pending",
    acquisition: {
      kind: "web-app",
      request: {
        method: "GET",
        queryString: "__vegas_reference_result=invalid",
        responseMode: "http",
      },
    },
  },
  {
    name: "web-app-do-post-invalid-result-http-outcome",
    functionName: "doPost",
    fixtureFile: "web-app-do-post-invalid-result-http-outcome.json",
    runtimeTest: "pending",
    acquisition: {
      kind: "web-app",
      request: {
        method: "POST",
        queryString: "__vegas_reference_result=invalid",
        responseMode: "http",
      },
    },
  },
  {
    name: "content-service-surface",
    functionName: "captureReferenceContentServiceSurface",
    fixtureFile: "content-service-surface.json",
    runtimeTest: "required",
  },
  {
    name: "text-output-object-surface",
    functionName: "captureReferenceTextOutputObjectSurface",
    fixtureFile: "text-output-object-surface.json",
    runtimeTest: "required",
  },
  {
    name: "text-output-semantics",
    functionName: "captureReferenceTextOutputSemantics",
    fixtureFile: "text-output-semantics.json",
    runtimeTest: "required",
  },
  {
    name: "web-app-text-output-csv-http-transport",
    functionName: "doGet",
    fixtureFile: "web-app-text-output-csv-http-transport.json",
    runtimeTest: "pending",
    acquisition: {
      kind: "web-app",
      request: {
        method: "GET",
        queryString: "__vegas_reference_result=text&__vegas_reference_mime=CSV",
        responseMode: "http-details",
      },
    },
  },
  {
    name: "web-app-text-output-ical-http-transport",
    functionName: "doGet",
    fixtureFile: "web-app-text-output-ical-http-transport.json",
    runtimeTest: "pending",
    acquisition: {
      kind: "web-app",
      request: {
        method: "GET",
        queryString: "__vegas_reference_result=text&__vegas_reference_mime=ICAL",
        responseMode: "http-details",
      },
    },
  },
  {
    name: "web-app-text-output-javascript-http-transport",
    functionName: "doGet",
    fixtureFile: "web-app-text-output-javascript-http-transport.json",
    runtimeTest: "pending",
    acquisition: {
      kind: "web-app",
      request: {
        method: "GET",
        queryString: "__vegas_reference_result=text&__vegas_reference_mime=JAVASCRIPT",
        responseMode: "http-details",
      },
    },
  },
  {
    name: "web-app-text-output-json-http-transport",
    functionName: "doGet",
    fixtureFile: "web-app-text-output-json-http-transport.json",
    runtimeTest: "pending",
    acquisition: {
      kind: "web-app",
      request: {
        method: "GET",
        queryString: "__vegas_reference_result=text&__vegas_reference_mime=JSON",
        responseMode: "http-details",
      },
    },
  },
  {
    name: "web-app-text-output-text-http-transport",
    functionName: "doGet",
    fixtureFile: "web-app-text-output-text-http-transport.json",
    runtimeTest: "pending",
    acquisition: {
      kind: "web-app",
      request: {
        method: "GET",
        queryString: "__vegas_reference_result=text&__vegas_reference_mime=TEXT",
        responseMode: "http-details",
      },
    },
  },
  {
    name: "web-app-text-output-vcard-http-transport",
    functionName: "doGet",
    fixtureFile: "web-app-text-output-vcard-http-transport.json",
    runtimeTest: "pending",
    acquisition: {
      kind: "web-app",
      request: {
        method: "GET",
        queryString: "__vegas_reference_result=text&__vegas_reference_mime=VCARD",
        responseMode: "http-details",
      },
    },
  },
  {
    name: "web-app-text-output-download-http-transport",
    functionName: "doGet",
    fixtureFile: "web-app-text-output-download-http-transport.json",
    runtimeTest: "pending",
    acquisition: {
      kind: "web-app",
      request: {
        method: "GET",
        queryString:
          "__vegas_reference_result=text&__vegas_reference_mime=TEXT&__vegas_reference_file=reference.txt",
        responseMode: "http-details",
      },
    },
  },
  {
    name: "web-app-do-get-reserved-parameter-c-http-outcome",
    functionName: "doGet",
    fixtureFile: "web-app-do-get-reserved-parameter-c-http-outcome.json",
    runtimeTest: "pending",
    acquisition: {
      kind: "web-app",
      request: {
        method: "GET",
        queryString: "c=reserved",
        responseMode: "http",
      },
    },
  },
  {
    name: "web-app-do-get-reserved-parameter-sid-http-outcome",
    functionName: "doGet",
    fixtureFile: "web-app-do-get-reserved-parameter-sid-http-outcome.json",
    runtimeTest: "pending",
    acquisition: {
      kind: "web-app",
      request: {
        method: "GET",
        queryString: "sid=reserved",
        responseMode: "http",
      },
    },
  },
  {
    name: "web-app-do-post-query-reserved-parameter-c-http-outcome",
    functionName: "doPost",
    fixtureFile: "web-app-do-post-query-reserved-parameter-c-http-outcome.json",
    runtimeTest: "pending",
    acquisition: {
      kind: "web-app",
      request: {
        method: "POST",
        queryString: "c=reserved",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "a=1",
        responseMode: "http",
      },
    },
  },
  {
    name: "web-app-do-post-query-reserved-parameter-sid-http-outcome",
    functionName: "doPost",
    fixtureFile: "web-app-do-post-query-reserved-parameter-sid-http-outcome.json",
    runtimeTest: "pending",
    acquisition: {
      kind: "web-app",
      request: {
        method: "POST",
        queryString: "sid=reserved",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "a=1",
        responseMode: "http",
      },
    },
  },
  {
    name: "web-app-do-post-reserved-parameter-sid-http-outcome",
    functionName: "doPost",
    fixtureFile: "web-app-do-post-reserved-parameter-sid-http-outcome.json",
    runtimeTest: "pending",
    acquisition: {
      kind: "web-app",
      request: {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "sid=reserved",
        responseMode: "http",
      },
    },
  },
];
