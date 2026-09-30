# Vegas 설정

명령줄에서 Vegas를 실행하면, 해석된 프로젝트 루트에서 다음 설정 파일 중 하나를 찾습니다.

- `vegas.config.ts`
- `vegas.config.js`
- `vegas.config.json`

설정 파일은 선택 사항입니다. 파일이 없으면 Vegas는 기본 설정을 사용합니다. 한 프로젝트에는 지원되는 설정 파일이 하나만 존재할 수 있습니다.

TypeScript와 JavaScript 설정 파일은 default export를 사용합니다. 설정 객체, 설정 객체의 Promise, 또는 이 둘 중 하나를 반환하는 인수 없는 함수를 export할 수 있습니다. JSON 설정 파일은 설정 객체를 직접 포함합니다.

::: code-group

```typescript [vegas.config.ts]
import { defineConfig } from "@vegasjs/vegas";

export default defineConfig({
  // config options
});
```

```typescript [vegas.config.ts (async)]
import { defineConfig } from "@vegasjs/vegas";

export default defineConfig(async () => {
  return {
    // config options
  };
});
```

```javascript [vegas.config.js]
export default {
  // config options
};
```

```json [vegas.config.json]
{
  "appType": "spa"
}
```

:::
