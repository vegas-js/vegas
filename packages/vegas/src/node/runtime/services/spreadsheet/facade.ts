import { createGasEnum, type GasEnumDefinition } from "../../globals/enum";
import type { CreateGasObject } from "../../globals/object";
import { createGasServiceObject } from "../../globals/serviceObject";
import type { CreateSpreadsheet } from "../../objects/types";
import type { RuntimeServicePort } from "../../protocol";
import { spreadsheetEnumDefinitions } from "./enumDefinitions";
import { SpreadsheetApp } from "./SpreadsheetApp";

const FORWARDED_METHOD_NAMES = [
  "create",
  "enableAllDataSourcesExecution",
  "enableBigQueryExecution",
  "flush",
  "getActive",
  "getActiveRange",
  "getActiveRangeList",
  "getActiveSheet",
  "getActiveSpreadsheet",
  "getCurrentCell",
  "getSelection",
  "getUi",
  "newCellImage",
  "newColor",
  "newConditionalFormatRule",
  "newDataSourceSpec",
  "newDataValidation",
  "newFilterCriteria",
  "newRichTextValue",
  "newTextStyle",
  "open",
  "openById",
  "openByUrl",
  "setActiveRange",
  "setActiveRangeList",
  "setActiveSheet",
  "setActiveSpreadsheet",
  "setCurrentCell",
] as const satisfies readonly (keyof SpreadsheetApp)[];

type ForwardedMethodName = (typeof FORWARDED_METHOD_NAMES)[number];
type RuntimeMethod = (...args: any[]) => unknown;

function createEnum(definition: GasEnumDefinition<string>, createObject?: CreateGasObject) {
  return createGasEnum(definition, createObject);
}

function forwardMethod(implementation: SpreadsheetApp, name: ForwardedMethodName): RuntimeMethod {
  const method = implementation[name];

  if (typeof method !== "function") {
    throw new TypeError(`SpreadsheetApp.${name} is not callable.`);
  }

  return (...args: any[]) => Reflect.apply(method as RuntimeMethod, implementation, args);
}

function unsupportedSurfaceMethod(): never {
  throw new Error("Function not implemented.");
}

export function createSpreadsheetApp(
  createSpreadsheet: CreateSpreadsheet,
  service: RuntimeServicePort<"SpreadsheetApp">,
  createObject?: CreateGasObject,
) {
  const implementation = new SpreadsheetApp(createSpreadsheet, service);

  const enumEntries = Object.entries(spreadsheetEnumDefinitions).map(([name, definition]) => ({
    kind: "property" as const,
    name,
    value: createEnum(definition, createObject),
  }));

  const methodEntries = FORWARDED_METHOD_NAMES.map((name) => ({
    kind: "method" as const,
    name,
    value: forwardMethod(implementation, name),
  }));

  return createGasServiceObject(
    {
      entries: [
        {
          kind: "method",
          name: "toString",
          value: () => "SpreadsheetApp",
        },
        ...enumEntries,
        ...methodEntries,
        {
          kind: "method",
          name: "enableLookerExecution",
          value: unsupportedSurfaceMethod,
        },
        {
          kind: "method",
          name: "openByKey",
          value: unsupportedSurfaceMethod,
        },
      ],
    },
    createObject,
  );
}
