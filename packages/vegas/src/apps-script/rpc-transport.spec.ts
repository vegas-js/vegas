import { describe, expectTypeOf, test } from "vitest";

import type { IsRpcTransportFunction, IsRpcTransportValue } from "./rpc-transport";
import type { ServerFunctionHandlers } from "./server-functions";

describe("registered RPC transport contracts", () => {
  test("accepts GAS-compatible value types", () => {
    expectTypeOf<IsRpcTransportValue<string | number | null>>().toEqualTypeOf<true>();
    expectTypeOf<
      IsRpcTransportValue<readonly { name: string; scores: number[] }[]>
    >().toEqualTypeOf<true>();
    expectTypeOf<IsRpcTransportFunction<() => void>>().toEqualTypeOf<true>();
    expectTypeOf<
      IsRpcTransportFunction<(name: string, values: number[]) => { ok: boolean }>
    >().toEqualTypeOf<true>();
  });

  test("rejects values that cannot cross google.script.run", () => {
    expectTypeOf<IsRpcTransportValue<Date>>().toEqualTypeOf<false>();
    expectTypeOf<IsRpcTransportValue<{ created: Date }>>().toEqualTypeOf<false>();
    expectTypeOf<IsRpcTransportValue<{ callback: () => void }>>().toEqualTypeOf<false>();
    expectTypeOf<IsRpcTransportValue<number[] | undefined>>().toEqualTypeOf<false>();
    expectTypeOf<IsRpcTransportValue<{ optional?: string }>>().toEqualTypeOf<false>();
    expectTypeOf<IsRpcTransportValue<unknown>>().toEqualTypeOf<false>();
    expectTypeOf<IsRpcTransportValue<ReturnType<typeof JSON.parse>>>().toEqualTypeOf<false>();
    expectTypeOf<IsRpcTransportFunction<(input: Date) => string>>().toEqualTypeOf<false>();
    expectTypeOf<IsRpcTransportFunction<() => Promise<string>>>().toEqualTypeOf<false>();
  });

  test("rejects recursive declarations without evaluating runtime data", () => {
    interface Recursive {
      next: Recursive;
    }
    expectTypeOf<IsRpcTransportValue<Recursive>>().toEqualTypeOf<false>();
  });

  test("keeps valid handlers and makes invalid contract members never", () => {
    interface Contract {
      greet(name: string): string;
      fetch(): { ids: number[] };
      invalidDate(date: Date): string;
      invalidResult(): { lastUpdate: Date };
      invalidCallback(callback: () => void): void;
    }
    expectTypeOf<ServerFunctionHandlers<Contract>>().toEqualTypeOf<{
      greet(name: string): string;
      fetch(): { ids: number[] };
      invalidDate: never;
      invalidResult: never;
      invalidCallback: never;
    }>();
  });
});
