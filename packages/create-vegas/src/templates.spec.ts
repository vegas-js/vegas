import { describe, expect, test } from "vitest";

import { resolveTemplate, templates } from "./templates";

describe("templates", () => {
  test("define unique template ids and directories", () => {
    const ids = templates.map((template) => template.id);
    const directories = templates.map((template) => template.directory);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(directories).size).toBe(directories.length);
  });

  test("resolve template by stable id", () => {
    expect(resolveTemplate("react")).toMatchObject({
      id: "react",
      directory: "template-react",
    });
  });

  test("reject unknown template id", () => {
    expect(() => resolveTemplate("unknown")).toThrow('Unknown create-vegas template "unknown".');
  });
});
