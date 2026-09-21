import path from "node:path";

import * as prompts from "@clack/prompts";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { CreateVegasUsageError } from "../error";
import { inspectScaffoldDirectory } from "../scaffold/directory";
import { collectCreateProjectInput } from "./input";

vi.mock("@clack/prompts", () => ({
  confirm: vi.fn(),
  isCancel: vi.fn(),
  select: vi.fn(),
  text: vi.fn(),
}));

vi.mock("../scaffold/directory", () => ({
  inspectScaffoldDirectory: vi.fn(),
}));

const CANCEL = Symbol("cancel");
const confirmMock = vi.mocked(prompts.confirm);
const isCancelMock = vi.mocked(prompts.isCancel);
const selectMock = vi.mocked(prompts.select);
const textMock = vi.mocked(prompts.text);
const inspectScaffoldDirectoryMock = vi.mocked(inspectScaffoldDirectory);

const cwd = path.resolve("/workspace");

const templateOptions = [
  {
    label: "Vanilla",
    value: "vanilla",
  },
  {
    label: "React",
    value: "react",
  },
];

beforeEach(() => {
  confirmMock.mockReset();
  isCancelMock.mockReset();
  selectMock.mockReset();
  textMock.mockReset();
  inspectScaffoldDirectoryMock.mockReset();

  isCancelMock.mockImplementation((value): value is symbol => value === CANCEL);
  inspectScaffoldDirectoryMock.mockReturnValue("missing");
});

describe("collectCreateProjectInput", () => {
  test("collect minimal project input", async () => {
    selectMock.mockResolvedValueOnce("react");
    confirmMock.mockResolvedValueOnce(false).mockResolvedValueOnce(false);

    await expect(
      collectCreateProjectInput({
        cwd,
        directory: "my-app",
        templateOptions,
      }),
    ).resolves.toStrictEqual({
      projectName: "my-app",
      packageName: "my-app",
      templateId: "react",
      operation: "create",
      scriptId: undefined,
      installDependencies: false,
      oauthClientFile: undefined,
      startDevServer: false,
    });

    expect(inspectScaffoldDirectoryMock).toHaveBeenCalledWith(path.resolve(cwd, "my-app"));
  });

  test("collect full project input", async () => {
    inspectScaffoldDirectoryMock.mockReturnValue("non-empty");

    selectMock.mockResolvedValueOnce("keep").mockResolvedValueOnce("vanilla");

    textMock
      .mockResolvedValueOnce("my-app")
      .mockResolvedValueOnce(" script-id ")
      .mockResolvedValueOnce(" oauth-client.json ");

    confirmMock
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);

    await expect(
      collectCreateProjectInput({
        cwd,
        directory: "My App",
        templateOptions,
      }),
    ).resolves.toStrictEqual({
      projectName: "My App",
      packageName: "my-app",
      templateId: "vanilla",
      operation: "keep",
      scriptId: "script-id",
      installDependencies: true,
      oauthClientFile: path.resolve(cwd, "oauth-client.json"),
      startDevServer: true,
    });
  });

  test("return undefined when prompt is cancelled", async () => {
    textMock.mockResolvedValueOnce(CANCEL);

    await expect(
      collectCreateProjectInput({
        cwd,
        templateOptions,
      }),
    ).resolves.toBeUndefined();

    expect(inspectScaffoldDirectoryMock).not.toHaveBeenCalled();
  });

  test("reject invalid target directory", async () => {
    inspectScaffoldDirectoryMock.mockReturnValue("invalid");

    const promise = collectCreateProjectInput({
      cwd,
      directory: "project",
      templateOptions,
    });

    await expect(promise).rejects.toBeInstanceOf(CreateVegasUsageError);
    await expect(promise).rejects.toThrow('Target path "project" is not a directory.');
  });
});
