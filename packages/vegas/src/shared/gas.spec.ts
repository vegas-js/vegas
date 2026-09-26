import { expectTypeOf, test } from "vitest";

import type { RuntimeDataSnapshot } from "./gas";

test("keep Runtime data sources and values explicit", () => {
  expectTypeOf<RuntimeDataSnapshot>().toEqualTypeOf<{
    readonly properties?: {
      readonly source: string;
      readonly value: {
        readonly documentProperties?: Readonly<Record<string, string>>;
        readonly scriptProperties?: Readonly<Record<string, string>>;
        readonly userProperties?: Readonly<Record<string, string>>;
      };
    };
    readonly session?: {
      readonly source: string;
      readonly value: {
        readonly activeUserEmail?: string;
        readonly activeUserLocale?: string;
        readonly effectiveUserEmail?: string;
        readonly temporaryActiveUserKey?: string;
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
