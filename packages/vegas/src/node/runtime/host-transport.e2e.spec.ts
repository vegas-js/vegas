import worker from "node:worker_threads";

import { describe, expect, test } from "vitest";

import {
  handleHostRequestMessage,
  HostDispatcher,
  InMemoryDriveIteratorStore,
  InMemoryDriveStore,
  InMemoryPropertiesStore,
  LocalDriveHostHandler,
  PropertiesHostHandler,
  resolveDriveNamespace,
} from "./index";

const WORKER_SOURCE = String.raw`
const worker = require("node:worker_threads");

const port = worker.workerData.port;
const sharedArray = worker.workerData.sharedArray;
let nextRequestId = 0;

function callHost(call) {
  const request = {
    id: ++nextRequestId,
    call,
  };

  Atomics.store(sharedArray, 0, 1);
  port.postMessage(request);

  const waitResult = Atomics.wait(sharedArray, 0, 1, 5000);
  if (waitResult === "timed-out") {
    throw new Error("Timed out waiting for the host response.");
  }

  const received = worker.receiveMessageOnPort(port);
  if (!received) {
    throw new Error("Host response is missing.");
  }

  return received.message;
}

try {
  const setResponse = callHost({
    service: "properties",
    operation: "set",
    namespace: "script",
    key: "name",
    value: "Vegas",
  });
  const getResponse = callHost({
    service: "properties",
    operation: "get",
    namespace: "script",
    key: "name",
  });
  const rootResponse = callHost({
    service: "drive",
    operation: "get-root-folder",
  });
  const missingFileResponse = callHost({
    service: "drive",
    operation: "get-file",
    id: "missing-file",
  });

  worker.parentPort.postMessage({
    ok: true,
    setResponse,
    getResponse,
    rootResponse,
    missingFileResponse,
  });
} catch (error) {
  worker.parentPort.postMessage({
    ok: false,
    message: error instanceof Error ? error.message : String(error),
  });
} finally {
  port.close();
}
`;

type WorkerResult =
  | {
      readonly ok: true;
      readonly setResponse: unknown;
      readonly getResponse: unknown;
      readonly rootResponse: unknown;
      readonly missingFileResponse: unknown;
    }
  | {
      readonly ok: false;
      readonly message: string;
    };

function waitForWorkerMessage(gasWorker: worker.Worker): Promise<WorkerResult> {
  return new Promise((resolve, reject) => {
    gasWorker.once("message", (message: WorkerResult) => resolve(message));
    gasWorker.once("error", reject);
  });
}

describe("typed host transport", () => {
  test("round-trip typed calls through Worker, MessagePort, SharedArrayBuffer, and HostDispatcher", async () => {
    const scope = {
      scriptKey: "script",
      userKey: "user",
    };
    const driveNamespace = resolveDriveNamespace(scope);
    const driveIteratorStore = new InMemoryDriveIteratorStore();
    const dispatcher = new HostDispatcher({
      drive: new LocalDriveHostHandler(
        new InMemoryDriveStore(),
        driveNamespace,
        driveIteratorStore.createSession(driveNamespace),
      ),
      properties: new PropertiesHostHandler(new InMemoryPropertiesStore(), scope),
    });
    const sharedArray = new Int32Array(new SharedArrayBuffer(4));
    const { port1, port2 } = new worker.MessageChannel();

    port1.on("message", (value) => {
      void handleHostRequestMessage(port1, sharedArray, dispatcher, value);
    });

    const gasWorker = new worker.Worker(WORKER_SOURCE, {
      eval: true,
      transferList: [port2],
      workerData: {
        port: port2,
        sharedArray,
      },
    });

    try {
      const result = await waitForWorkerMessage(gasWorker);

      expect(result).toMatchObject({
        ok: true,
        setResponse: {
          id: 1,
          ok: true,
          value: undefined,
        },
        getResponse: {
          id: 2,
          ok: true,
          value: "Vegas",
        },
        rootResponse: {
          id: 3,
          ok: true,
          value: {
            service: "drive",
            kind: "folder",
            id: "drive-root:1",
          },
        },
        missingFileResponse: {
          id: 4,
          ok: false,
          error: {
            name: "Error",
            type: "Error",
            message: "Unknown local Drive file: missing-file",
          },
        },
      });
      expect(Atomics.load(sharedArray, 0)).toBe(0);
    } finally {
      port1.close();
      await gasWorker.terminate();
    }
  });

  test("leave legacy worker messages untouched", async () => {
    const dispatcher = new HostDispatcher({
      properties: new PropertiesHostHandler(new InMemoryPropertiesStore(), {
        scriptKey: "script",
        userKey: "user",
      }),
    });
    const sharedArray = new Int32Array(new SharedArrayBuffer(4));
    const { port1, port2 } = new worker.MessageChannel();

    try {
      await expect(
        handleHostRequestMessage(port1, sharedArray, dispatcher, {
          message: "resolve",
          payload: "legacy",
        }),
      ).resolves.toBe(false);
    } finally {
      port1.close();
      port2.close();
    }
  });
});
