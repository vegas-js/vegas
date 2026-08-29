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

export type RuntimeService = keyof RuntimeProtocol;

export type RuntimeMethod<Service extends RuntimeService> = keyof RuntimeProtocol[Service];

type AnyOperation = (payload: any) => any;
export type RuntimeOperation<
  Service extends RuntimeService,
  Method extends RuntimeMethod<Service>,
> = Extract<RuntimeProtocol[Service][Method], AnyOperation>;

export type RuntimePayload<
  Service extends RuntimeService,
  Method extends RuntimeMethod<Service>,
> = Parameters<RuntimeOperation<Service, Method>>[0];

export type RuntimeRequest = {
  [Service in RuntimeService]: {
    [Method in RuntimeMethod<Service>]: {
      type: "service-call";
      service: Service;
      method: Method;
      payload: RuntimePayload<Service, Method>;
    };
  }[RuntimeMethod<Service>];
}[RuntimeService];

export type RuntimeResult<
  Service extends RuntimeService,
  Method extends RuntimeMethod<Service>,
> = ReturnType<RuntimeOperation<Service, Method>>;

export type ServiceCaller = <Service extends RuntimeService, Method extends RuntimeMethod<Service>>(
  service: Service,
  method: Method,
  payload: RuntimePayload<Service, Method>,
) => RuntimeResult<Service, Method>;
