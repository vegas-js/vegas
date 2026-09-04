import type { CreateGasObject } from "../../globals/object";
import { createGasServiceObject } from "../../globals/serviceObject";
import { Sheet } from "./Sheet";
import { createSheetObjectFacade } from "./sheetObjectFacade";
import { Spreadsheet } from "./Spreadsheet";

export const SPREADSHEET_GAS_METHOD_NAMES = [
  "addCollaborator",
  "addCollaborators",
  "addDeveloperMetadata",
  "addEditor",
  "addEditors",
  "addMenu",
  "addViewer",
  "addViewers",
  "appendRow",
  "autoResizeColumn",
  "copy",
  "createDeveloperMetadataFinder",
  "createTextFinder",
  "deleteActiveSheet",
  "deleteColumn",
  "deleteColumns",
  "deleteRow",
  "deleteRows",
  "deleteSheet",
  "duplicateActiveSheet",
  "find",
  "findSheet",
  "findSheetByName",
  "getActiveCell",
  "getActiveRange",
  "getActiveRangeList",
  "getActiveSelection",
  "getActiveSheet",
  "getAs",
  "getBandings",
  "getBlob",
  "getChanges",
  "getCollaborators",
  "getColumnWidth",
  "getCurrentCell",
  "getDataRange",
  "getDataSourceFormulas",
  "getDataSourcePivotTables",
  "getDataSourceRefreshSchedules",
  "getDataSources",
  "getDataSourceSheets",
  "getDataSourceTables",
  "getDeveloperMetadata",
  "getEditors",
  "getFormUrl",
  "getFrozenColumns",
  "getFrozenRows",
  "getId",
  "getImages",
  "getIterativeCalculationConvergenceThreshold",
  "getKey",
  "getLastColumn",
  "getLastRow",
  "getMaxIterativeCalculationCycles",
  "getName",
  "getNamedRanges",
  "getNumSheets",
  "getOwner",
  "getPredefinedSpreadsheetThemes",
  "getProtections",
  "getRange",
  "getRangeByName",
  "getRangeList",
  "getRecalculationInterval",
  "getRowHeight",
  "getSelection",
  "getSheetById",
  "getSheetByName",
  "getSheetId",
  "getSheetName",
  "getSheetPermissions",
  "getSheetProtection",
  "getSheets",
  "getSheetValues",
  "getSpreadsheetLocale",
  "getSpreadsheetTheme",
  "getSpreadsheetTimeZone",
  "getUrl",
  "getViewers",
  "hideColumn",
  "hideRow",
  "inputBox",
  "insertColumnAfter",
  "insertColumnBefore",
  "insertColumnsAfter",
  "insertColumnsBefore",
  "insertDataSourceSheet",
  "insertImage",
  "insertRowAfter",
  "insertRowBefore",
  "insertRowsAfter",
  "insertRowsBefore",
  "insertSheet",
  "insertSheetWithDataSourceTable",
  "isAnonymousView",
  "isAnonymousWrite",
  "isColumnHiddenByUser",
  "isIterativeCalculationEnabled",
  "isReadable",
  "isRowHiddenByFilter",
  "isRowHiddenByUser",
  "isWritable",
  "moveActiveSheet",
  "moveChartToObjectSheet",
  "msgBox",
  "refreshAllDataSources",
  "removeCollaborator",
  "removeEditor",
  "removeMenu",
  "removeNamedRange",
  "removeViewer",
  "rename",
  "renameActiveSheet",
  "resetSpreadsheetTheme",
  "revealColumn",
  "revealRow",
  "setActiveCell",
  "setActiveRange",
  "setActiveRangeList",
  "setActiveSelection",
  "setActiveSheet",
  "setAnonymousAccess",
  "setColumnWidth",
  "setCurrentCell",
  "setFrozenColumns",
  "setFrozenRows",
  "setIterativeCalculationConvergenceThreshold",
  "setIterativeCalculationEnabled",
  "setMaxIterativeCalculationCycles",
  "setName",
  "setNamedRange",
  "setRecalculationInterval",
  "setRowHeight",
  "setSheetPermissions",
  "setSheetProtection",
  "setSpreadsheetLocale",
  "setSpreadsheetTheme",
  "setSpreadsheetTimeZone",
  "show",
  "sort",
  "toast",
  "unhideColumn",
  "unhideRow",
  "updateMenu",
  "waitForAllDataExecutionsCompletion",
] as const;

type SpreadsheetGasMethodName = (typeof SPREADSHEET_GAS_METHOD_NAMES)[number];

type RuntimeMethod = (...args: any[]) => unknown;

export interface CreateSpreadsheetObjectFacadeOptions {
  createObject?: CreateGasObject;
  createSheetFacade?: (implementation: Sheet) => GoogleAppsScript.Spreadsheet.Sheet;
}

function createUnsupportedSurfaceMethod(): RuntimeMethod {
  return () => {
    throw new Error("Function not implemented.");
  };
}

export function createSpreadsheetObjectFacade(
  implementation: Spreadsheet,
  options: CreateSpreadsheetObjectFacadeOptions = {},
): GoogleAppsScript.Spreadsheet.Spreadsheet {
  const {
    createObject,
    createSheetFacade = (sheet) => createSheetObjectFacade(sheet, createObject),
  } = options;

  let value: Record<string, unknown>;

  const createMethod = (name: SpreadsheetGasMethodName): RuntimeMethod => {
    const method = (implementation as unknown as Record<string, unknown>)[name];

    if (typeof method !== "function") {
      return createUnsupportedSurfaceMethod();
    }

    return (...args: any[]) => {
      const result = Reflect.apply(method, implementation, args);

      if (result === implementation) {
        return value;
      }

      /*
       * Internal implementations may use `return this`.
       * Never expose that host-realm receiver through
       * the GAS-visible facade.
       */
      if (name === "getSheetById" && result instanceof Sheet) {
        return createSheetFacade(result);
      }

      return result;
    };
  };

  const methodEntries = SPREADSHEET_GAS_METHOD_NAMES.map((name) => ({
    name,
    value: createMethod(name),
    writable: true as const,
  }));

  value = createGasServiceObject(
    {
      entries: [
        {
          name: "toString",
          value: () => "Spreadsheet",
          writable: true,
        },
        ...methodEntries,
      ],
    },
    createObject,
  );

  return value as unknown as GoogleAppsScript.Spreadsheet.Spreadsheet;
}
