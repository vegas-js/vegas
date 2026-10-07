# Configuring Vegas

When you run Vegas from the command line, Vegas looks for one of these configuration files in the resolved project root:

- `vegas.config.ts`
- `vegas.config.js`
- `vegas.config.json`

A configuration file is optional; when none is present, Vegas uses its default configuration. Only one supported configuration file may exist in a project at a time.

TypeScript and JavaScript configuration files use a default export. They may export a configuration object, a Promise of a configuration object, or a zero-argument function that returns either form. JSON configuration files contain the configuration object directly.

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
