import { describe, expect, test } from "vitest";

import {
  createPropertiesService,
  Properties,
  PropertiesService,
  type HostBridge,
  type HostCall,
  type HostCallResult,
} from "./index";

class RecordingHostBridge implements HostBridge {
  readonly calls: HostCall[] = [];
  readonly #documentAvailable: boolean;

  constructor(documentAvailable: boolean) {
    this.#documentAvailable = documentAvailable;
  }

  call<C extends HostCall>(call: C): HostCallResult<C> {
    this.calls.push(call);

    if (call.service !== "properties" || call.operation !== "isAvailable") {
      throw new Error("unexpected host call");
    }

    return this.#documentAvailable as HostCallResult<C>;
  }
}

describe("PropertiesService Runtime object", () => {
  test("expose script and user stores and return null when document store is unavailable", () => {
    const bridge = new RecordingHostBridge(false);
    const service = createPropertiesService(bridge);

    expect(service).toBeInstanceOf(PropertiesService);
    expect(service.getScriptProperties()).toBeInstanceOf(Properties);
    expect(service.getUserProperties()).toBeInstanceOf(Properties);
    expect(service.getDocumentProperties()).toBeNull();

    expect(bridge.calls).toStrictEqual([
      {
        service: "properties",
        operation: "isAvailable",
        namespace: "document",
      },
    ]);
  });

  test("return document Properties when the host has document context", () => {
    const bridge = new RecordingHostBridge(true);
    const properties = createPropertiesService(bridge).getDocumentProperties();

    expect(properties).toBeInstanceOf(Properties);
  });
});
