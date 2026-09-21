import { expectTypeOf, test } from "vitest";

import type { RuntimeDataSnapshot } from "./gas";

test("keep Runtime data sources and values explicit", () => {
  expectTypeOf<RuntimeDataSnapshot>().toEqualTypeOf<{
    readonly properties?: {
      readonly source: string;
      readonly value: {
        documentProperties?: Record<string, string>;
        scriptProperties?: Record<string, string>;
        userProperties?: Record<string, string>;
      };
    };
    readonly session?: {
      readonly source: string;
      readonly value: {
        activeUserEmail?: string;
        activeUserLocale?: string;
        effectiveUserEmail?: string;
        temporaryActiveUserKey?: string;
      };
    };
    readonly spreadsheets: readonly {
      readonly source: string;
      readonly value: {
        readonly id: string;
        readonly url?: string;
        readonly name: string;
        readonly sheets: readonly {
          readonly id: number;
          readonly name: string;
          readonly maxRows: number;
          readonly maxColumns: number;
          readonly values?: readonly (readonly (string | number | boolean | Date)[])[];
        }[];
      };
    }[];
  }>();
});
