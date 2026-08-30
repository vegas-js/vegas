export interface RuntimeProtocol {
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
}

export type RuntimeService = Extract<keyof RuntimeProtocol, string>;

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
