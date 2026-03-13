# CodeSnippets

## Candidate of GAS API's base object

```typescript
class Base {
  #getProps(
    obj: object | null = this,
    props: Set<string> = new Set(),
    filter?: (arg: [string, PropertyDescriptor]) => boolean,
  ): string[] {
    if (!obj || obj === Object.prototype) {
      return Array.from(props).reverse();
    }
    Object.entries(Object.getOwnPropertyDescriptors(obj))
      .reverse()
      .forEach(([key, desc]) => {
        if (key !== "constructor" && (filter?.([key, desc]) ?? true)) {
          props.add(key);
        }
      });
    return this.#getProps(Object.getPrototypeOf(obj), props, filter);
  }
  toString() {
    return this.#getProps();
  }
}
```
