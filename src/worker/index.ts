import { parentPort } from "node:worker_threads";

parentPort?.on("message", async (data) => {
  const int32Array = new Int32Array(data.sharedBuffer);
  try {
    const response = await fetch(data.url);
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    const obj = {
      headers,
      content: Array.from(await response.bytes()),
      responseCode: response.status,
    };
    data.port.postMessage(obj);
  } catch (err) {
    data.port.postMessage(err);
  } finally {
    Atomics.store(int32Array, 0, 1);
    Atomics.notify(int32Array, 0);
  }
});
