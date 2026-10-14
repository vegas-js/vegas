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
    removed: "were removed in v0.3.0",
    migration: "To migrate, export a registry named `rpc`",
  },
  {
    file: "docs/ja/guide/api-javascript.md",
    runtime: "登録型 RPC の値も実行時に検証",
    limitation: "シリアライズを行わず",
    removed: "v0.3.0 で削除されました",
    migration: "移行するには、server から `rpc`",
  },
  {
    file: "docs/ko/guide/api-javascript.md",
    runtime: "등록형 RPC 값도 런타임에 검증",
    limitation: "값을 직렬화하지 않으며",
    removed: "v0.3.0에서 제거되었습니다",
    migration: "마이그레이션하려면 서버에서 `rpc`",
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
    expect(section).toContain("createRpcClient()");
    expect(section).toContain("vegasRpcCall");
    expect(section).toContain("type RpcClient");
    expect(section).toContain("RpcClient<ServerRpc>");
    expect(section).toContain(document.removed);
    expect(section).toContain(document.migration);
  });

  test.each(documents)("does not document a usable legacy client API in $file", (document) => {
    const markdown = readFileSync(join(root, document.file), "utf8");
    const clientSection = markdown
      .split("## `@vegasjs/vegas/client`")[1]
      ?.split("## `@vegasjs/vegas/server`")[0];

    expect(clientSection).toBeDefined();
    expect(clientSection).toContain("### `createRpcClient<T>()`");
    expect(clientSection).not.toContain("### `createServerFunctionClient<T>()`");
    expect(clientSection).not.toContain("import { createServerFunctionClient");
  });
});
