/**
 * A conservative static approximation of google.script.run values.
 *
 * Supported: null, strings, numbers, booleans, arrays and plain data records.
 * Unsupported: undefined (except a void return), functions, Date, class APIs,
 * symbols, any/unknown and recursively defined object shapes.
 *
 * This is type checking only: cyclic runtime values, non-plain instances and
 * non-finite numbers still require handling at the transport boundary.
 * Apps Script also accepts a DOM form element in a special argument position;
 * that exception is intentionally not part of the registered RPC contract.
 */
type RpcPrimitive = string | number | boolean | null;

type IsAny<Value> = 0 extends 1 & Value ? true : false;

type IsRpcTransportMember<Value, Seen> = Value extends RpcPrimitive
  ? true
  : Value extends (...args: never[]) => unknown
    ? false
    : Value extends readonly (infer Element)[]
      ? [Element] extends [never]
        ? true
        : IsRpcTransportValue<Element, Seen | Value>
      : Value extends object
        ? [Extract<keyof Value, symbol>] extends [never]
          ? [keyof Value] extends [never]
            ? true
            : false extends {
                  [Key in keyof Value]-?: IsRpcTransportValue<Value[Key], Seen | Value>;
                }[keyof Value]
              ? false
              : true
          : false
        : false;

/**
 * Whether an RPC value's *declared type* fits the supported GAS transport subset.
 * All members of a union must be transportable.
 */
export type IsRpcTransportValue<Value, Seen = never> = [Value] extends [never]
  ? false
  : IsAny<Value> extends true
    ? false
    : [Value] extends [Seen]
      ? false
      : false extends (Value extends unknown ? IsRpcTransportMember<Value, Seen> : never)
        ? false
        : true;

/**
 * Validate the declared parameters and return type of a registered RPC method.
 * Functions with no result (void) are permitted.
 */
export type IsRpcTransportFunction<Handler> = Handler extends (...args: infer Args) => infer Result
  ? ([Args[number]] extends [never] ? true : IsRpcTransportValue<Args>) extends true
    ? [Result] extends [void]
      ? true
      : IsRpcTransportValue<Result>
    : false
  : false;
