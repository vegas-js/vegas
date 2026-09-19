import type { HostBridge } from "./host-bridge";
import { Properties } from "./properties";

// https://developers.google.com/apps-script/reference/properties/properties-service
export class PropertiesService {
  readonly #bridge: HostBridge;
  readonly #documentProperties: Properties;
  readonly #scriptProperties: Properties;
  readonly #userProperties: Properties;

  constructor(bridge: HostBridge) {
    this.#bridge = bridge;
    this.#documentProperties = new Properties(bridge, "document");
    this.#scriptProperties = new Properties(bridge, "script");
    this.#userProperties = new Properties(bridge, "user");
  }

  getDocumentProperties(): Properties | null {
    const isAvailable = this.#bridge.call({
      service: "properties",
      operation: "isAvailable",
      namespace: "document",
    });

    return isAvailable ? this.#documentProperties : null;
  }

  getScriptProperties(): Properties {
    return this.#scriptProperties;
  }

  getUserProperties(): Properties {
    return this.#userProperties;
  }
}

export function createPropertiesService(bridge: HostBridge): PropertiesService {
  return new PropertiesService(bridge);
}
