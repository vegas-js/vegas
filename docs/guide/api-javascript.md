---
outline: deep
---

# JavaScript API

## `createGASClient<T>`

**Type Signature:**

```typescript
function createGASClient<T extends object>(): GASClient<T>;
```

**Example Usage:**

```typescript
import { createGASClient } from "@vegasjs/vegas";
import type * as serverFunctions from "../path/to/Code.ts";

const client = createGASClient<typeof serverFunctions>();
await client.myFunction();
```
