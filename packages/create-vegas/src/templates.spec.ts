import { describe, expect, test } from "vitest";

import { CreateVegasUsageError } from "./error";
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

  test("reject unknown template id as usage error", () => {
    const resolve = () => resolveTemplate("unknown");

    expect(resolve).toThrow(CreateVegasUsageError);
    expect(resolve).toThrow(
      'Unknown template "unknown". Available templates: vanilla, apps-script-scriptlet, lit, vue, react, preact, svelte, solid.',
    );
  });
});
