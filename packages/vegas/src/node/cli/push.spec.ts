import { beforeEach, describe, expect, test, vi } from "vitest";

import { runPushApplication } from "../push";
import { runPush } from "./push";

vi.mock("../push", () => ({
  runPushApplication: vi.fn(),
}));

const runPushApplicationMock = vi.mocked(runPushApplication);

beforeEach(() => {
  runPushApplicationMock.mockReset();
});

describe("runPush", () => {
  test("push project and report success", async () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});

    await runPush("/project", {
      profile: "work",
    });

    expect(runPushApplicationMock).toHaveBeenCalledWith("/project", {
      profile: "work",
    });
    expect(consoleMock).toHaveBeenCalledWith("✓ Pushed project to Apps Script.");
  });

  test("reject empty auth profile before starting the push application", async () => {
    await expect(
      runPush("/project", {
        profile: "   ",
      }),
    ).rejects.toThrow("Apps Script auth profile must not be empty.");

    expect(runPushApplicationMock).not.toHaveBeenCalled();
  });
});
