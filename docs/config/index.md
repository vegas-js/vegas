# Configuring Vegas

When you run Vegas from the command line, Vegas looks for a configuration file named `vegas.config.ts` in the resolved project root. A configuration file is optional; when it is not present, Vegas uses its default configuration.

The most basic config file looks like this:

::: code-group

```typescript [vegas.config.ts]
import { defineConfig } from "@vegasjs/vegas";

export default defineConfig({
  // config options
});
```

:::
