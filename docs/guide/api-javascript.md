---
outline: deep
---

# JavaScript API

## `createServerFunctionClient<T>`

**Type Signature:**

```typescript
function createServerFunctionClient<T extends object>(): ServerFunctionClient<T>;
```

**Example Usage:**

```typescript
import { createServerFunctionClient } from "@vegasjs/vegas/client";
import type * as serverFunctions from "../path/to/Code.ts";

const server = createServerFunctionClient<typeof serverFunctions>();

await server.myFunction();
```
