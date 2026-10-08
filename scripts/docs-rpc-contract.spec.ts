import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

const root = fileURLToPath(new URL("../", import.meta.url));

const documents = [
  {
    file: "docs/guide/api-javascript.md",
    runtime: "also validates registered RPC values at runtime",
    limitation: "do not serialize values or guarantee",
    legacy: "does not perform this additional argument validation",
    preferred: "For new projects, use `createRpcClient<T>()`",
  },
  {
    file: "docs/ja/guide/api-javascript.md",
    runtime: "登録型 RPC の値も実行時に検証",
    limitation: "シリアライズを行わず",
    legacy: "追加の引数検証を実行しません",
    preferred:
      "新規プロジェクトでは、server が export する `rpc` レジストリと `createRpcClient<T>()` の利用を推奨します",
  },
  {
    file: "docs/ko/guide/api-javascript.md",
    runtime: "등록형 RPC 값도 런타임에 검증",
    limitation: "값을 직렬화하지 않으며",
    legacy: "추가 인수 검증이 적용되지 않습니다",
    preferred:
      "새 프로젝트에서는 서버가 export하는 `rpc` 레지스트리와 `createRpcClient<T>()` 사용을 권장합니다",
  },
] as const;

describe("registered RPC documentation", () => {
  test.each(documents)("documents the actual transport boundary in $file", (document) => {
    const markdown = readFileSync(join(root, document.file), "utf8");
    const section = markdown
      .split("### `createRpcClient<T>()`")[1]
      ?.split("## `@vegasjs/vegas/server`")[0];

    expect(section).toBeDefined();
    expect(section).toContain(document.runtime);
    expect(section).toContain(document.limitation);
    expect(section).toContain(document.legacy);
    expect(section).toContain("createRpcClient()");
    expect(section).toContain("vegasRpcCall");
    expect(section).toContain("createServerFunctionClient()");
  });

  test.each(documents)(
    "recommends registered RPC and marks the legacy client deprecated in $file",
    (document) => {
      const markdown = readFileSync(join(root, document.file), "utf8");
      const clientSection = markdown
        .split("## `@vegasjs/vegas/client`")[1]
        ?.split("## `@vegasjs/vegas/server`")[0];

      expect(clientSection).toBeDefined();
      expect(clientSection).toContain(document.preferred);
      expect(clientSection).toContain("### `createServerFunctionClient<T>()` (deprecated)");
      expect(clientSection).toContain("### `createRpcClient<T>()`");
      expect(clientSection?.indexOf(document.preferred)).toBeLessThan(
        clientSection?.indexOf("### `createServerFunctionClient<T>()`"),
      );
    },
  );
});
