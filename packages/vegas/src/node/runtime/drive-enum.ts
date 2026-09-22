import { createRuntimeEnum } from "./runtime-enum";

export const DRIVE_ACCESS = createRuntimeEnum(
  "ANYONE",
  "ANYONE_WITH_LINK",
  "DOMAIN",
  "DOMAIN_WITH_LINK",
  "PRIVATE",
);

export type DriveAccess = (typeof DRIVE_ACCESS)[keyof typeof DRIVE_ACCESS];

export const DRIVE_PERMISSION = createRuntimeEnum(
  "VIEW",
  "EDIT",
  "COMMENT",
  "OWNER",
  "ORGANIZER",
  "NONE",
);

export type DrivePermission = (typeof DRIVE_PERMISSION)[keyof typeof DRIVE_PERMISSION];
