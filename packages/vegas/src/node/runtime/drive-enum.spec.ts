import { describe, expect, test } from "vitest";

import { createDriveApp, DRIVE_ACCESS, DRIVE_PERMISSION, type HostBridge } from "./index";

const hostBridge: HostBridge = {
  call() {
    throw new Error("unexpected HostBridge call");
  },
};

describe("Drive enums", () => {
  test("expose Drive access values through DriveApp", () => {
    const drive = createDriveApp(hostBridge);

    expect(drive.Access).toBe(DRIVE_ACCESS);
    expect(drive.Access).toStrictEqual({
      ANYONE: "ANYONE",
      ANYONE_WITH_LINK: "ANYONE_WITH_LINK",
      DOMAIN: "DOMAIN",
      DOMAIN_WITH_LINK: "DOMAIN_WITH_LINK",
      PRIVATE: "PRIVATE",
    });
  });

  test("expose Drive permission values through DriveApp", () => {
    const drive = createDriveApp(hostBridge);

    expect(drive.Permission).toBe(DRIVE_PERMISSION);
    expect(drive.Permission).toStrictEqual({
      VIEW: "VIEW",
      EDIT: "EDIT",
      COMMENT: "COMMENT",
      OWNER: "OWNER",
      ORGANIZER: "ORGANIZER",
      NONE: "NONE",
    });
  });
});
