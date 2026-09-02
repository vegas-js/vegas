export function installGasGlobal(target: object, name: string, value: unknown): void {
  Object.defineProperty(target, name, {
    value,
    configurable: true,
    enumerable: false,
    writable: true,
  });
}
