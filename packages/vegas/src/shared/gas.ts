export enum RuntimeDataTarget {
  Cache = "Cache",
  Properties = "Properties",
  Session = "Session",
  // TODO
}

export interface RuntimeDataProperties {
  documentProperties?: Record<string, string>;
  scriptProperties?: Record<string, string>;
  userProperties?: Record<string, string>;
}

export interface RuntimeDataSession {
  activeUserEmail?: string;
  activeUserLocale?: string;
  effectiveUserEmail?: string;
  temporaryActiveUserKey?: string;
}
