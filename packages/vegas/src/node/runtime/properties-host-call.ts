export type PropertiesHostScope = "document" | "script" | "user";

export type PropertiesHostCall =
  | {
      readonly service: "properties";
      readonly operation: "isAvailable";
      readonly namespace: PropertiesHostScope;
    }
  | {
      readonly service: "properties";
      readonly operation: "get";
      readonly namespace: PropertiesHostScope;
      readonly key: string;
    }
  | {
      readonly service: "properties";
      readonly operation: "getAll";
      readonly namespace: PropertiesHostScope;
    }
  | {
      readonly service: "properties";
      readonly operation: "getKeys";
      readonly namespace: PropertiesHostScope;
    }
  | {
      readonly service: "properties";
      readonly operation: "set";
      readonly namespace: PropertiesHostScope;
      readonly key: string;
      readonly value: string;
    }
  | {
      readonly service: "properties";
      readonly operation: "merge";
      readonly namespace: PropertiesHostScope;
      readonly values: Readonly<Record<string, string>>;
    }
  | {
      readonly service: "properties";
      readonly operation: "replace";
      readonly namespace: PropertiesHostScope;
      readonly values: Readonly<Record<string, string>>;
    }
  | {
      readonly service: "properties";
      readonly operation: "remove";
      readonly namespace: PropertiesHostScope;
      readonly key: string;
    }
  | {
      readonly service: "properties";
      readonly operation: "clear";
      readonly namespace: PropertiesHostScope;
    };

export type PropertiesHostCallResult<C extends PropertiesHostCall> = C extends {
  readonly operation: "isAvailable";
}
  ? boolean
  : C extends {
        readonly operation: "get";
      }
    ? string | null
    : C extends {
          readonly operation: "getAll";
        }
      ? Record<string, string>
      : C extends {
            readonly operation: "getKeys";
          }
        ? string[]
        : void;
