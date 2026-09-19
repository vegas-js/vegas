import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import {
  collectBundledPackages,
  formatBundledPackageHeading,
  readAdditionalLicenseFiles,
  resolveBundledPackage,
  resolvePackageLegalFiles,
} from "./rolldown-license-plugin";

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

describe("resolveBundledPackage", () => {
  test("resolve an unscoped package from a POSIX module path", () => {
    expect(resolveBundledPackage("/repo/node_modules/cac/dist/index.js")).toStrictEqual({
      name: "cac",
      root: "/repo/node_modules/cac",
    });
  });

  test("resolve a scoped package from a POSIX module path", () => {
    expect(resolveBundledPackage("/repo/node_modules/@clack/prompts/dist/index.js")).toStrictEqual({
      name: "@clack/prompts",
      root: "/repo/node_modules/@clack/prompts",
    });
  });

  test("resolve the innermost package root from a pnpm module path", () => {
    expect(
      resolveBundledPackage(
        "/repo/node_modules/.pnpm/@clack+prompts@1.8.0/node_modules/@clack/prompts/dist/index.js",
      ),
    ).toStrictEqual({
      name: "@clack/prompts",
      root: "/repo/node_modules/.pnpm/@clack+prompts@1.8.0/node_modules/@clack/prompts",
    });
  });

  test("normalize Windows module path separators", () => {
    expect(
      resolveBundledPackage(
        String.raw`C:\repo\node_modules\.pnpm\cac@7.0.0\node_modules\cac\dist\index.js`,
      ),
    ).toStrictEqual({
      name: "cac",
      root: "C:/repo/node_modules/.pnpm/cac@7.0.0/node_modules/cac",
    });
  });

  test("ignore modules outside node_modules", () => {
    expect(resolveBundledPackage("/repo/src/index.ts")).toBeNull();
  });

  test("ignore malformed scoped package paths", () => {
    expect(resolveBundledPackage("/repo/node_modules/@scope")).toBeNull();
  });
});

describe("collectBundledPackages", () => {
  test("deduplicate modules from the same package root and retain separate installed versions", () => {
    expect(
      collectBundledPackages([
        "/repo/node_modules/.pnpm/shared@1.0.0/node_modules/shared/a.js",
        "/repo/node_modules/.pnpm/shared@1.0.0/node_modules/shared/b.js",
        "/repo/node_modules/.pnpm/shared@2.0.0/node_modules/shared/index.js",
        "/repo/src/local.ts",
      ]),
    ).toStrictEqual([
      {
        name: "shared",
        root: "/repo/node_modules/.pnpm/shared@1.0.0/node_modules/shared",
      },
      {
        name: "shared",
        root: "/repo/node_modules/.pnpm/shared@2.0.0/node_modules/shared",
      },
    ]);
  });
});

describe("formatBundledPackageHeading", () => {
  test("preserve the package name when it is unique", () => {
    expect(formatBundledPackageHeading("shared", undefined, false)).toBe("shared");
  });

  test("include the package version when the name is duplicated", () => {
    expect(formatBundledPackageHeading("shared", "2.0.0", true)).toBe("shared@2.0.0");
  });

  test("fail when a duplicate package has no usable version", () => {
    for (const version of [undefined, null, ""]) {
      expect(() => formatBundledPackageHeading("shared", version, true)).toThrow(
        "Could not determine version for duplicate bundled package: shared",
      );
    }
  });
});

describe("readAdditionalLicenseFiles", () => {
  test("read configured files in order", () => {
    withPackageRoot(
      {
        FIRST: "first",
        SECOND: "second",
      },
      (packageRoot) => {
        expect(readAdditionalLicenseFiles(packageRoot, ["SECOND", "FIRST"])).toStrictEqual([
          "second",
          "first",
        ]);
      },
    );
  });

  test("allow no additional license files", () => {
    withPackageRoot({}, (packageRoot) => {
      expect(readAdditionalLicenseFiles(packageRoot, undefined)).toStrictEqual([]);
    });
  });

  test("fail when a configured additional license file is missing or not a file", () => {
    withPackageRoot({ DIRECTORY: null }, (packageRoot) => {
      for (const licenseFile of ["MISSING", "DIRECTORY"]) {
        expect(() => readAdditionalLicenseFiles(packageRoot, [licenseFile])).toThrow(
          `Could not find additional license file: ${path.join(packageRoot, licenseFile)}`,
        );
      }
    });
  });
});

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
