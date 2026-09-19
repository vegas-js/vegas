import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { resolvePackageLegalFiles } from "./rolldown-license-plugin";

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

describe("resolvePackageLegalFiles", () => {
  test("preserve the existing preferred license file order", () => {
    withPackageRoot(
      {
        LICENSE: "license",
        "LICENSE.md": "license markdown",
        license: "lowercase license",
      },
      (packageRoot) => {
        expect(resolvePackageLegalFiles(packageRoot)).toStrictEqual([
          path.join(packageRoot, "LICENSE"),
          path.join(packageRoot, "LICENSE.md"),
          path.join(packageRoot, "license"),
        ]);
      },
    );
  });

  test("support conventional alternative license file names", () => {
    for (const fileName of ["LICENSE.txt", "LICENCE.md", "COPYING", "LICENSE-MIT"]) {
      withPackageRoot({ [fileName]: "license" }, (packageRoot) => {
        expect(resolvePackageLegalFiles(packageRoot)).toStrictEqual([
          path.join(packageRoot, fileName),
        ]);
      });
    }
  });

  test("collect multiple license files and notice files", () => {
    withPackageRoot(
      {
        LICENSE: "license",
        "LICENSE-MIT": "mit",
        "LICENSE-APACHE": "apache",
        NOTICE: "notice",
        "NOTICE.txt": "notice text",
      },
      (packageRoot) => {
        expect(resolvePackageLegalFiles(packageRoot)).toStrictEqual([
          path.join(packageRoot, "LICENSE"),
          path.join(packageRoot, "LICENSE-APACHE"),
          path.join(packageRoot, "LICENSE-MIT"),
          path.join(packageRoot, "NOTICE"),
          path.join(packageRoot, "NOTICE.txt"),
        ]);
      },
    );
  });

  test("ignore directories that look like legal files", () => {
    withPackageRoot(
      {
        LICENSE: null,
        NOTICE: null,
        "COPYING.txt": "license",
      },
      (packageRoot) => {
        expect(resolvePackageLegalFiles(packageRoot)).toStrictEqual([
          path.join(packageRoot, "COPYING.txt"),
        ]);
      },
    );
  });

  test("require a license file even when a notice file exists", () => {
    withPackageRoot({ NOTICE: "notice" }, (packageRoot) => {
      expect(() => resolvePackageLegalFiles(packageRoot)).toThrow(
        `Could not find a license file for bundled package: ${packageRoot}`,
      );
    });
  });

  test("fail with the package path when no license file can be found", () => {
    withPackageRoot({ "README.md": "readme" }, (packageRoot) => {
      expect(() => resolvePackageLegalFiles(packageRoot)).toThrow(
        `Could not find a license file for bundled package: ${packageRoot}`,
      );
    });
  });
});
