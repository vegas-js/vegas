import { MessagePort, workerData } from "node:worker_threads";

const sharedArray = workerData.sharedArray;
const port: MessagePort = workerData.port;

port.on("message", async (data) => {
  try {
    const response = await fetch(data.url, data.init);
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    const obj = {
      headers,
      content: Array.from(await response.bytes()),
      responseCode: response.status,
    };
    port.postMessage(obj);
  } catch (err) {
    port.postMessage(err);
  } finally {
    Atomics.store(sharedArray, 0, 0);
    Atomics.notify(sharedArray, 0);

    process.exit(0);
  }
});
