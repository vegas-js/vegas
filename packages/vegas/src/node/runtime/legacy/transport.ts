export type LegacyRequest = {
  message: string;
  payload?: unknown;
};

export type RequestLegacySync = (request: LegacyRequest, timeout?: number) => any;
