import type { HostBridge } from "./host-bridge";
import type { PropertiesHostScope } from "./properties-host-call";

// https://developers.google.com/apps-script/reference/properties/properties
export class Properties {
  readonly #bridge: HostBridge;
  readonly #namespace: PropertiesHostScope;

  constructor(bridge: HostBridge, namespace: PropertiesHostScope) {
    this.#bridge = bridge;
    this.#namespace = namespace;
  }

  deleteAllProperties(): this {
    this.#bridge.call({
      service: "properties",
      operation: "clear",
      namespace: this.#namespace,
    });
    return this;
  }

  deleteProperty(key: string): this {
    this.#bridge.call({
      service: "properties",
      operation: "remove",
      namespace: this.#namespace,
      key,
    });
    return this;
  }

  getKeys(): string[] {
    return this.#bridge.call({
      service: "properties",
      operation: "getKeys",
      namespace: this.#namespace,
    });
  }

  getProperties(): Record<string, string> {
    return this.#bridge.call({
      service: "properties",
      operation: "getAll",
      namespace: this.#namespace,
    });
  }

  getProperty(key: string): string | null {
    return this.#bridge.call({
      service: "properties",
      operation: "get",
      namespace: this.#namespace,
      key,
    });
  }

  setProperties(properties: object, deleteAllOthers = false): this {
    const values = Object.fromEntries(
      Object.entries(properties).map(([key, value]) => [key, String(value)]),
    );

    this.#bridge.call({
      service: "properties",
      operation: deleteAllOthers ? "replace" : "merge",
      namespace: this.#namespace,
      values,
    });
    return this;
  }

  setProperty(key: string, value: string): this {
    this.#bridge.call({
      service: "properties",
      operation: "set",
      namespace: this.#namespace,
      key,
      value: String(value),
    });
    return this;
  }
}
