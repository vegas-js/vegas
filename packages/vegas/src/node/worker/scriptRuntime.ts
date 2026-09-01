import vm from "node:vm";

export function evaluateScript(code: string, context: vm.Context): void {
  const script = new vm.Script(code);
  script.runInContext(context);
}

export function evaluateScriptWithBindings<T>(
  code: string,
  baseContext: vm.Context,
  bindings: Record<string, unknown>,
): T {
  const previousDescriptors: Array<readonly [string, PropertyDescriptor | undefined]> = [];

  try {
    for (const [name, value] of Object.entries(bindings)) {
      const previousDescriptor = Object.getOwnPropertyDescriptor(baseContext, name);
      Object.defineProperty(baseContext, name, {
        value,
        configurable: true,
        enumerable: true,
        writable: true,
      });
      previousDescriptors.push([name, previousDescriptor]);
    }
    const script = new vm.Script(code);

    return script.runInContext(baseContext) as T;
  } finally {
    for (let i = previousDescriptors.length - 1; i >= 0; i--) {
      const [name, previousDescriptor] = previousDescriptors[i];
      if (previousDescriptor) {
        Object.defineProperty(baseContext, name, previousDescriptor);
      } else if (!Reflect.deleteProperty(baseContext, name)) {
        // oxlint-disable-next-line no-unsafe-finally
        throw new Error(`Failed to restore script binding: ${name}`);
      }
    }
  }
}
