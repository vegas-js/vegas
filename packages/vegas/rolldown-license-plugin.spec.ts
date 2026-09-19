import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { resolvePackageLicenseFile } from "./rolldown-license-plugin";

function withPackageRoot(
  files: Readonly<Record<string, string | null>>,
  run: (packageRoot: string) => void,
): void {
  const packageRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-license-plugin-"));

  try {
    for (const [fileName, content] of Object.entries(files)) {
      const filePath = path.join(packageRoot, fileName);

      if (content === null) {
        fs.mkdirSync(filePath);
      } else {
        fs.writeFileSync(filePath, content);
      }
    }

    run(packageRoot);
  } finally {
    fs.rmSync(packageRoot, { recursive: true, force: true });
  }
}

describe("resolvePackageLicenseFile", () => {
  test("preserve the existing preferred license file order", () => {
    withPackageRoot(
      {
        LICENSE: "license",
        "LICENSE.md": "license markdown",
        license: "lowercase license",
      },
      (packageRoot) => {
        expect(resolvePackageLicenseFile(packageRoot)).toBe(path.join(packageRoot, "LICENSE"));
      },
    );
  });

  test("support conventional alternative license file names", () => {
    for (const fileName of ["LICENSE.txt", "LICENCE.md", "COPYING", "LICENSE-MIT"]) {
      withPackageRoot({ [fileName]: "license" }, (packageRoot) => {
        expect(resolvePackageLicenseFile(packageRoot)).toBe(path.join(packageRoot, fileName));
      });
    }
  });

  test("ignore directories that look like license files", () => {
    withPackageRoot(
      {
        LICENSE: null,
        "COPYING.txt": "license",
      },
      (packageRoot) => {
        expect(resolvePackageLicenseFile(packageRoot)).toBe(path.join(packageRoot, "COPYING.txt"));
      },
    );
  });

  test("fail with the package path when no license file can be found", () => {
    withPackageRoot({ "README.md": "readme" }, (packageRoot) => {
      expect(() => resolvePackageLicenseFile(packageRoot)).toThrow(
        `Could not find a license file for bundled package: ${packageRoot}`,
      );
    });
  });
});
