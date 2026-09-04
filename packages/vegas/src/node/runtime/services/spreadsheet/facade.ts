import { createGasEnum, type GasEnumDefinition } from "../../globals/enum";
import type { CreateGasObject } from "../../globals/object";
import { createGasServiceObject } from "../../globals/serviceObject";
import type { CreateSpreadsheet } from "../../objects/types";
import type { RuntimeServicePort } from "../../protocol";
import { spreadsheetEnumDefinitions } from "./enumDefinitions";
import { Spreadsheet } from "./Spreadsheet";
import { SpreadsheetApp } from "./SpreadsheetApp";
import { createSpreadsheetObjectFacade } from "./spreadsheetObjectFacade";

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
  const createSpreadsheetFacade: CreateSpreadsheet = (spreadsheetId) =>
    createSpreadsheetObjectFacade(createSpreadsheet(spreadsheetId) as Spreadsheet, {
      createObject,
    });

  const implementation = new SpreadsheetApp(createSpreadsheetFacade, service);

  const enumEntries = Object.entries(spreadsheetEnumDefinitions).map(([name, definition]) => ({
    name,
    value: createEnum(definition, createObject),
    writable: false,
  }));

  const methodEntries = FORWARDED_METHOD_NAMES.map((name) => ({
    name,
    value: forwardMethod(implementation, name),
    writable: true,
  }));

  return createGasServiceObject(
    {
      entries: [
        {
          name: "toString",
          value: () => "SpreadsheetApp",
          writable: true,
        },
        ...enumEntries,
        ...methodEntries,
        {
          name: "enableLookerExecution",
          value: unsupportedSurfaceMethod,
          writable: true,
        },
        {
          name: "openByKey",
          value: unsupportedSurfaceMethod,
          writable: true,
        },
      ],
    },
    createObject,
  );
}
