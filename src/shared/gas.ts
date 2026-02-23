export const excludesGASUserFunctionNames = [
  "onOpen",
  "onInstall",
  "onEdit",
  "onSelectionChange",
  "doGet",
  "doPost",
] as const;

export enum MockTarget {
  Session,
  Properties,
  // TODO
}

export interface MockGASSession {
  activeUserEmail?: string;
  activeUserLocale?: string;
  effectiveUserEmail?: string;
  temporaryActiveUserKey?: string;
}
