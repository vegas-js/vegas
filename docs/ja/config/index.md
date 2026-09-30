# Vegas の設定

コマンドラインから Vegas を実行すると、解決されたプロジェクトルートで次の設定ファイルを探します。

- `vegas.config.ts`
- `vegas.config.js`
- `vegas.config.json`

設定ファイルは省略できます。存在しない場合、Vegas は既定の設定を使用します。1 つのプロジェクトに置ける対応形式の設定ファイルは 1 つだけです。

TypeScript／JavaScript の設定ファイルは default export を使用します。設定オブジェクト、設定オブジェクトの Promise、またはどちらかを返す引数なし関数を export できます。JSON 設定ファイルには設定オブジェクトを直接記述します。

::: code-group

```typescript [vegas.config.ts]
import { defineConfig } from "@vegasjs/vegas";

export default defineConfig({
  // 設定オプション
});
```

```typescript [vegas.config.ts (async)]
import { defineConfig } from "@vegasjs/vegas";

export default defineConfig(async () => {
  return {
    // 設定オプション
  };
});
```

```javascript [vegas.config.js]
export default {
  // 設定オプション
};
```

```json [vegas.config.json]
{
  "appType": "spa"
}
```

:::

各設定項目については [共有オプション](./shared-options) を参照してください。
