import type { CreateGasObject } from "../../globals/object";
import { createGasServiceObject } from "../../globals/serviceObject";
import { Range } from "./Range";

export const RANGE_GAS_METHOD_NAMES = [
  "activate",
  "activateAsCurrentCell",
  "addDeveloperMetadata",
  "applyColumnBanding",
  "applyRowBanding",
  "autoFill",
  "autoFillToNeighbor",
  "breakApart",
  "canEdit",
  "check",
  "clear",
  "clearComment",
  "clearContent",
  "clearDataValidations",
  "clearFormat",
  "clearNote",
  "collapseGroups",
  "copyFormatToRange",
  "copyTo",
  "copyValuesToRange",
  "createDataSourcePivotTable",
  "createDataSourceTable",
  "createDeveloperMetadataFinder",
  "createFilter",
  "createPivotTable",
  "createTextFinder",
  "deleteCells",
  "expandGroups",
  "getA1Notation",
  "getBackground",
  "getBackgroundColor",
  "getBackgroundColors",
  "getBackgroundObject",
  "getBackgroundObjects",
  "getBackgrounds",
  "getBandings",
  "getBorder",
  "getBorders",
  "getCell",
  "getColumn",
  "getColumnIndex",
  "getComment",
  "getComments",
  "getDataRegion",
  "getDataSourceFormula",
  "getDataSourceFormulas",
  "getDataSourcePivotTables",
  "getDataSourceTables",
  "getDataSourceUrl",
  "getDataTable",
  "getDataValidation",
  "getDataValidations",
  "getDeveloperMetadata",
  "getDisplayValue",
  "getDisplayValues",
  "getEndColumn",
  "getEndRow",
  "getFilter",
  "getFontColor",
  "getFontColorObject",
  "getFontColorObjects",
  "getFontColors",
  "getFontFamilies",
  "getFontFamily",
  "getFontLine",
  "getFontLines",
  "getFontSize",
  "getFontSizes",
  "getFontStyle",
  "getFontStyles",
  "getFontWeight",
  "getFontWeights",
  "getFormula",
  "getFormulaR1C1",
  "getFormulas",
  "getFormulasR1C1",
  "getGridId",
  "getHeight",
  "getHorizontalAlignment",
  "getHorizontalAlignments",
  "getLastColumn",
  "getLastRow",
  "getMergedRanges",
  "getNextDataCell",
  "getNote",
  "getNotes",
  "getNumberFormat",
  "getNumberFormats",
  "getNumColumns",
  "getNumRows",
  "getRichTextValue",
  "getRichTextValues",
  "getRow",
  "getRowIndex",
  "getSheet",
  "getTextDirection",
  "getTextDirections",
  "getTextRotation",
  "getTextRotations",
  "getTextStyle",
  "getTextStyles",
  "getValue",
  "getValues",
  "getVerticalAlignment",
  "getVerticalAlignments",
  "getWidth",
  "getWrap",
  "getWraps",
  "getWrapStrategies",
  "getWrapStrategy",
  "insertCells",
  "insertCheckboxes",
  "isBlank",
  "isChecked",
  "isDataValid",
  "isDataValidForAll",
  "isEndColumnBounded",
  "isEndRowBounded",
  "isPartOfMerge",
  "isStartColumnBounded",
  "isStartRowBounded",
  "merge",
  "mergeAcross",
  "mergeVertically",
  "moveTo",
  "offset",
  "protect",
  "randomize",
  "removeCheckboxes",
  "removeDuplicates",
  "setBackground",
  "setBackgroundColor",
  "setBackgroundColors",
  "setBackgroundObject",
  "setBackgroundObjects",
  "setBackgroundRGB",
  "setBackgrounds",
  "setBorder",
  "setComment",
  "setComments",
  "setDataValidation",
  "setDataValidations",
  "setFontColor",
  "setFontColorObject",
  "setFontColorObjects",
  "setFontColors",
  "setFontFamilies",
  "setFontFamily",
  "setFontLine",
  "setFontLines",
  "setFontSize",
  "setFontSizes",
  "setFontStyle",
  "setFontStyles",
  "setFontWeight",
  "setFontWeights",
  "setFormula",
  "setFormulaR1C1",
  "setFormulas",
  "setFormulasR1C1",
  "setHorizontalAlignment",
  "setHorizontalAlignments",
  "setNote",
  "setNotes",
  "setNumberFormat",
  "setNumberFormats",
  "setRichTextValue",
  "setRichTextValues",
  "setShowHyperlink",
  "setTextDirection",
  "setTextDirections",
  "setTextRotation",
  "setTextRotations",
  "setTextStyle",
  "setTextStyles",
  "setValue",
  "setValues",
  "setVerticalAlignment",
  "setVerticalAlignments",
  "setVerticalText",
  "setWrap",
  "setWraps",
  "setWrapStrategies",
  "setWrapStrategy",
  "shiftColumnGroupDepth",
  "shiftRowGroupDepth",
  "sort",
  "splitTextToColumns",
  "trimWhitespace",
  "uncheck",
] as const;

type RangeGasMethodName = (typeof RANGE_GAS_METHOD_NAMES)[number];

type RuntimeMethod = (...args: any[]) => unknown;

function createUnsupportedSurfaceMethod(): RuntimeMethod {
  return () => {
    throw new Error("Function not implemented.");
  };
}

export function createRangeObjectFacade(
  implementation: Range,
  createObject?: CreateGasObject,
): GoogleAppsScript.Spreadsheet.Range {
  let value: Record<string, unknown>;

  const createMethod = (name: RangeGasMethodName): RuntimeMethod => {
    const method = (implementation as unknown as Record<string, unknown>)[name];

    if (typeof method !== "function") {
      return createUnsupportedSurfaceMethod();
    }

    return (...args: any[]) => {
      const result = Reflect.apply(method, implementation, args);

      if (result === implementation) {
        if (name === "setValue" || name === "setValues") {
          return createRangeObjectFacade(implementation, createObject);
        }

        return value;
      }

      if (name === "getCell" && result instanceof Range) {
        return createRangeObjectFacade(result, createObject);
      }

      return result;
    };
  };

  const methodEntries = RANGE_GAS_METHOD_NAMES.map((name) => ({
    name,
    value: createMethod(name),
    writable: true as const,
  }));

  value = createGasServiceObject(
    {
      entries: [
        {
          name: "toString",
          value: () => "Range",
          writable: true,
        },
        ...methodEntries,
      ],
    },
    createObject,
  );

  return value as unknown as GoogleAppsScript.Spreadsheet.Range;
}
