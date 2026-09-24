import worker from "node:worker_threads";

import { describe, expect, test } from "vitest";

import type { HostCall } from "../host-call";
import type { HostRequestMessage } from "../host-protocol";
import { RuntimeInfrastructureError } from "../runtime-infrastructure-error";
import { createWorkerHostBridge, readHostResponse } from "./worker-host-bridge";

const request = {
  id: 1,
  call: {
    service: "properties",
    operation: "get",
    namespace: "script",
    key: "environment",
  },
} satisfies HostRequestMessage;

describe("Worker host bridge transport failures", () => {
  test("classify missing and mismatched host responses as protocol failures", () => {
    let missingResponseError: unknown;

    try {
      readHostResponse(request, undefined);
    } catch (error) {
      missingResponseError = error;
    }

    expect(missingResponseError).toBeInstanceOf(RuntimeInfrastructureError);
    expect(missingResponseError).toMatchObject({
      kind: "protocol",
      message: "Host response 1 is missing or invalid.",
    });

    let mismatchedResponseError: unknown;

    try {
      readHostResponse(request, {
        id: 2,
        ok: true,
        value: "value",
      });
    } catch (error) {
      mismatchedResponseError = error;
    }

    expect(mismatchedResponseError).toBeInstanceOf(RuntimeInfrastructureError);
    expect(mismatchedResponseError).toMatchObject({
      kind: "protocol",
      message: "Host response id 2 does not match request 1.",
    });
  });

  test("classify host request structured-clone failures as serialization failures", () => {
    const { port1, port2 } = new worker.MessageChannel();
    const sharedArray = new Int32Array(new SharedArrayBuffer(4));
    const bridge = createWorkerHostBridge(port1, sharedArray);
    const invalidCall = {
      service: "properties",
      operation: "get",
      namespace: "script",
      key: () => "not cloneable",
    } as unknown as HostCall;

    try {
      let caught: unknown;

      try {
        bridge.call(invalidCall);
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(RuntimeInfrastructureError);
      expect(caught).toMatchObject({
        kind: "serialization",
        message: "Apps Script host request 1 could not be serialized.",
      });
      expect(Atomics.load(sharedArray, 0)).toBe(0);
    } finally {
      port1.close();
      port2.close();
    }
  });
});
