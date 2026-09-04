import type { CreateGasObject } from "../../globals/object";
import { createGasServiceObject } from "../../globals/serviceObject";
import { Range } from "./Range";
import { createRangeObjectFacade } from "./rangeObjectFacade";
import { Sheet } from "./Sheet";

export const SHEET_GAS_METHOD_NAMES = [
  "activate",
  "addDeveloperMetadata",
  "appendRow",
  "asDataSourceSheet",
  "autoResizeColumn",
  "autoResizeColumns",
  "autoResizeRows",
  "clear",
  "clearComments",
  "clearConditionalFormatRules",
  "clearContents",
  "clearFormats",
  "clearNotes",
  "collapseAllColumnGroups",
  "collapseAllRowGroups",
  "copyTo",
  "createDeveloperMetadataFinder",
  "createTextFinder",
  "deleteColumn",
  "deleteColumns",
  "deleteRow",
  "deleteRows",
  "expandAllColumnGroups",
  "expandAllRowGroups",
  "expandColumnGroupsUpToDepth",
  "expandRowGroupsUpToDepth",
  "find",
  "getActiveCell",
  "getActiveRange",
  "getActiveRangeList",
  "getActiveSelection",
  "getBandings",
  "getCharts",
  "getColumnGroup",
  "getColumnGroupControlPosition",
  "getColumnGroupDepth",
  "getColumnWidth",
  "getConditionalFormatRules",
  "getCurrentCell",
  "getDataRange",
  "getDataSourceFormulas",
  "getDataSourcePivotTables",
  "getDataSourceTables",
  "getDataSourceUrl",
  "getDeveloperMetadata",
  "getDrawings",
  "getFilter",
  "getFormUrl",
  "getFrozenColumns",
  "getFrozenRows",
  "getImages",
  "getIndex",
  "getLastColumn",
  "getLastRow",
  "getMaxColumns",
  "getMaxRows",
  "getName",
  "getNamedRanges",
  "getParent",
  "getPivotTables",
  "getProtections",
  "getRange",
  "getRangeList",
  "getRowGroup",
  "getRowGroupControlPosition",
  "getRowGroupDepth",
  "getRowHeight",
  "getSelection",
  "getSheetId",
  "getSheetName",
  "getSheetPermissions",
  "getSheetProtection",
  "getSheetValues",
  "getSlicers",
  "getTabColor",
  "getTabColorObject",
  "getType",
  "hasHiddenGridlines",
  "hideColumn",
  "hideColumns",
  "hideRow",
  "hideRows",
  "hideSheet",
  "insertChart",
  "insertColumnAfter",
  "insertColumnBefore",
  "insertColumns",
  "insertColumnsAfter",
  "insertColumnsBefore",
  "insertImage",
  "insertRowAfter",
  "insertRowBefore",
  "insertRows",
  "insertRowsAfter",
  "insertRowsBefore",
  "insertSlicer",
  "isColumnHiddenByUser",
  "isRightToLeft",
  "isRowHiddenByFilter",
  "isRowHiddenByUser",
  "isSheetHidden",
  "moveColumns",
  "moveRows",
  "newChart",
  "protect",
  "removeChart",
  "revealColumn",
  "revealRow",
  "setActiveCell",
  "setActiveRange",
  "setActiveRangeList",
  "setActiveSelection",
  "setColumnGroupControlPosition",
  "setColumnWidth",
  "setColumnWidths",
  "setConditionalFormatRules",
  "setCurrentCell",
  "setFrozenColumns",
  "setFrozenRows",
  "setHiddenGridlines",
  "setName",
  "setRightToLeft",
  "setRowGroupControlPosition",
  "setRowHeight",
  "setRowHeights",
  "setRowHeightsForced",
  "setSheetPermissions",
  "setSheetProtection",
  "setTabColor",
  "setTabColorObject",
  "showColumns",
  "showRows",
  "showSheet",
  "sort",
  "unhideColumn",
  "unhideRow",
  "updateChart",
] as const;

type SheetGasMethodName = (typeof SHEET_GAS_METHOD_NAMES)[number];

type RuntimeMethod = (...args: any[]) => unknown;

function createUnsupportedSurfaceMethod(): RuntimeMethod {
  return () => {
    throw new Error("Function not implemented.");
  };
}

export function createSheetObjectFacade(
  implementation: Sheet,
  createObject?: CreateGasObject,
  createRangeFacade: (implementation: Range) => GoogleAppsScript.Spreadsheet.Range = (range) =>
    createRangeObjectFacade(range, createObject),
): GoogleAppsScript.Spreadsheet.Sheet {
  let value: Record<string, unknown>;

  const createMethod = (name: SheetGasMethodName): RuntimeMethod => {
    const method = (implementation as unknown as Record<string, unknown>)[name];

    if (typeof method !== "function") {
      return createUnsupportedSurfaceMethod();
    }

    return (...args: any[]) => {
      const result = Reflect.apply(method, implementation, args);

      if (result === implementation) {
        return value;
      }

      if (name === "getRange" && result instanceof Range) {
        return createRangeFacade(result);
      }

      return result;
    };
  };

  const methodEntries = SHEET_GAS_METHOD_NAMES.map((name) => ({
    name,
    value: createMethod(name),
    writable: true as const,
  }));

  value = createGasServiceObject(
    {
      entries: [
        {
          name: "toString",
          value: () => "Sheet",
          writable: true,
        },
        ...methodEntries,
      ],
    },
    createObject,
  );

  return value as unknown as GoogleAppsScript.Spreadsheet.Sheet;
}
