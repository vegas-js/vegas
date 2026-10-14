import { describe, expect, test } from "vitest";

import { resolveTemplateVegasRequirement } from "./verify-create-vegas-dependency.js";

const manifests = {
  "template-vanilla": { devDependencies: { "@vegasjs/vegas": "^0.3.0" } },
  "template-react": { devDependencies: { "@vegasjs/vegas": "^0.3.0" } },
};

describe("create-vegas release dependency guard", () => {
  test("uses the shared Vegas requirement from the packaged templates", () => {
    expect(resolveTemplateVegasRequirement(Object.keys(manifests), (name) => manifests[name])).toBe(
      "^0.3.0",
    );
  });

  test("rejects packaging no templates", () => {
    expect(() => resolveTemplateVegasRequirement([], () => ({}))).toThrow(
      "create-vegas must publish at least one template.",
    );
  });

  test("rejects missing and inconsistent requirements", () => {
    expect(() =>
      resolveTemplateVegasRequirement(["template-vanilla"], () => ({ devDependencies: {} })),
    ).toThrow("Template template-vanilla must declare an @vegasjs/vegas dependency.");

    expect(() =>
      resolveTemplateVegasRequirement(Object.keys(manifests), (name) =>
        name === "template-react"
          ? { dependencies: { "@vegasjs/vegas": "^0.2.0" } }
          : manifests[name],
      ),
    ).toThrow("Template template-react requires ^0.2.0, expected ^0.3.0.");
  });
});
