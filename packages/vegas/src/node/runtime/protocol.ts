import type { RuntimeScope } from "./scope";

export interface RuntimeProtocol {
  SpreadsheetApp: {
    create: (payload: { name: string; rows: number; columns: number }) => string;
  };

  Sheet: {
    getLastRow: (payload: { spreadsheetId: string; sheetId: number }) => number | null;
    getLastColumn: (payload: { spreadsheetId: string; sheetId: number }) => number | null;
    getMaxRows: (payload: { spreadsheetId: string; sheetId: number }) => number | null;
    getMaxColumns: (payload: { spreadsheetId: string; sheetId: number }) => number | null;
    getSheetName: (payload: { spreadsheetId: string; sheetId: number }) => string | null;
  };

  Range: {
    getValue: (payload: {
      spreadsheetId: string;
      sheetId: number;
      range: {
        row: number;
        column: number;
      };
    }) => unknown;

    getValues: (payload: {
      spreadsheetId: string;
      sheetId: number;
      range: {
        row: number;
        column: number;
        numRows: number;
        numColumns: number;
      };
    }) => unknown[][];

    setValue: (payload: {
      spreadsheetId: string;
      sheetId: number;
      range: {
        row: number;
        column: number;
        numRows: number;
        numColumns: number;
      };
      value: unknown;
    }) => void;

    setValues: (payload: {
      spreadsheetId: string;
      sheetId: number;
      range: {
        row: number;
        column: number;
        numRows: number;
        numColumns: number;
      };
      values: unknown[][];
    }) => void;
  };

  UrlFetch: {
    fetch: (request: RuntimeFetchRequest) => RuntimeFetchResponse;
    fetchAll: (requests: RuntimeFetchRequest[]) => RuntimeFetchResponse[];
  };

  Html: {
    getFileContent: (filename: string) => string;
  };

  Session: {
    getActiveUser: () => string;
    getActiveUserLocale: () => string;
    getEffectiveUser: () => string;
    getScriptTimeZone: () => string;
    getTemporaryActiveUserKey: () => string;
  };

  Cache: {
    get: (scope: RuntimeScope, key: string) => string | null;
    getAll: (scope: RuntimeScope, keys: string[]) => Record<string, string>;
    put: (scope: RuntimeScope, key: string, value: string, expirationInSeconds: number) => void;
    putAll: (
      scope: RuntimeScope,
      values: Record<string, string>,
      expirationInSeconds: number,
    ) => void;
    remove: (scope: RuntimeScope, key: string) => void;
    removeAll: (scope: RuntimeScope, keys: string[]) => void;
  };

  Properties: {
    deleteAllProperties: (scope: RuntimeScope) => void;
    deleteProperty: (scope: RuntimeScope, key: string) => void;
    getKeys: (scope: RuntimeScope) => string[];
    getProperties: (scope: RuntimeScope) => Record<string, string>;
    getProperty: (scope: RuntimeScope, key: string) => string | null;
    setProperties: (
      scope: RuntimeScope,
      properties: Record<string, string>,
      deleteAllOthers: boolean,
    ) => void;
    setProperty: (scope: RuntimeScope, key: string, value: string) => void;
  };
}

export type RuntimeService = Extract<keyof RuntimeProtocol, string>;

export type RuntimeServicePort<Service extends RuntimeService> = RuntimeProtocol[Service];

export type RuntimeMethod<Service extends RuntimeService> = Extract<
  keyof RuntimeProtocol[Service],
  string
>;

export type RuntimeArgs<
  Service extends RuntimeService,
  Method extends RuntimeMethod<Service>,
> = Parameters<RuntimeOperation<Service, Method>>;

export type RuntimeRequestFor<
  Service extends RuntimeService,
  Method extends RuntimeMethod<Service>,
> = {
  type: "service-call";
  service: Service;
  method: Method;
  args: RuntimeArgs<Service, Method>;
};

export type RuntimeRequest = {
  [Service in RuntimeService]: {
    [Method in RuntimeMethod<Service>]: RuntimeRequestFor<Service, Method>;
  }[RuntimeMethod<Service>];
}[RuntimeService];

type AnyOperation = (...args: any[]) => any;
export type RuntimeOperation<
  Service extends RuntimeService,
  Method extends RuntimeMethod<Service>,
> = Extract<RuntimeProtocol[Service][Method], AnyOperation>;

export type RuntimeResult<
  Service extends RuntimeService,
  Method extends RuntimeMethod<Service>,
> = ReturnType<RuntimeOperation<Service, Method>>;

export type ServiceCaller = <Service extends RuntimeService, Method extends RuntimeMethod<Service>>(
  service: Service,
  method: Method,
  ...args: RuntimeArgs<Service, Method>
) => RuntimeResult<Service, Method>;

type Awaitable<T> = T | Promise<T>;

export type RuntimeServiceImplementation<Service extends RuntimeService> = {
  [Method in RuntimeMethod<Service>]: (
    ...args: RuntimeArgs<Service, Method>
  ) => Awaitable<RuntimeResult<Service, Method>>;
};

export type RuntimeSerializedError = {
  name: string;
  message: string;
  stack?: string;
};

export type RuntimeResponse<Result = unknown> =
  | { type: "service-result"; result: Result }
  | { type: "service-error"; error: RuntimeSerializedError };

export type RuntimeServiceRegistry = {
  [Service in RuntimeService]: RuntimeServiceImplementation<Service>;
};

export type RuntimeFetchRequest = {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  redirect?: "follow" | "manual";
  body?: unknown;
};

export type RuntimeFetchResponse = {
  headers: Record<string, string>;
  content: number[];
  responseCode: number;
};
