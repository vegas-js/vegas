export const excludesGASUserFunctionNames = [
  "onOpen",
  "onInstall",
  "onEdit",
  "onSelectionChange",
  "doGet",
  "doPost",
] as const;

export enum MockTarget {
  Properties = "Properties",
  Session = "Session",
  // TODO
}

export interface MockProperties {
  documentProperties?: Record<string, string>;
  scriptProperties?: Record<string, string>;
  userProperties?: Record<string, string>;
}

export interface MockSession {
  activeUserEmail?: string;
  activeUserLocale?: string;
  effectiveUserEmail?: string;
  temporaryActiveUserKey?: string;
}
