import { join, parse } from "node:path";
import { MessageChannel, Worker } from "node:worker_threads";

import { build as buildWithRolldownApi, OutputChunk, RolldownOutput } from "rolldown";
import { build as buildWithViteApi, Plugin } from "vite";

import { MockTarget } from "../../../shared/gas";
import { ProjectEntry } from "../../analyze";
import { exportBridge } from "../../build/plugins/exportbridge";
import { virtualHTML } from "../../build/plugins/virtualhtml";
import { ResolvedUserConfig } from "../../config";

function buildWithVite(config: ResolvedUserConfig, webEntry: string) {
  return buildWithViteApi({
    root: config.root,
    configFile: false,
    plugins: [...config.plugins, virtualHTML({ webDir: config.webDir, webEntry: webEntry })],
    build: {
      rolldownOptions: {
        input: webEntry,
      },
      outDir: config.output.dir,
      write: false,
    },
    logLevel: "silent",
  });
}

function buildWithRolldown(config: ResolvedUserConfig, serverEntry: string) {
  return buildWithRolldownApi({
    cwd: config.root,
    input: serverEntry,
    plugins: [exportBridge(serverEntry)],
    output: {
      format: "iife",
      name: "GASApp",
      exports: "named",
    },
    write: false,
  });
}

export function hostFrame(
  config: ResolvedUserConfig,
  projectEntry: ProjectEntry,
  gasMockSources: string[],
): Plugin {
  const userCodes = {
    web: { hrefs: [] as string[], map: new Map<string, string>() },
    server: "",
  };
  const mockSeed: Record<string, any> = {};
  const inMemoryStore = {
    documentProperties: {} as Record<string, string>,
    scriptProperties: {} as Record<string, string>,
    userProperties: {} as Record<string, string>,
    documentCache: {} as Record<string, { value: string; expired: number }>,
    scriptCache: {} as Record<string, { value: string; expired: number }>,
    userCache: {} as Record<string, { value: string; expired: number }>,
  };
  function launchGAS(
    contentBaseUrl: string,
    mockSeed: Record<string, any>,
    fn: string,
    ...args: any[]
  ): Promise<any> {
    return new Promise((resolve) => {
      const worker = new Worker(join(import.meta.dirname, "gas.js"), {
        env: { ...process.env, FORCE_COLOR: "1" },
        workerData: userCodes.server,
      });
      const sharedBuffer = new SharedArrayBuffer(4);
      const sharedArray = new Int32Array(sharedBuffer);
      const { port1, port2 } = new MessageChannel();

      worker.postMessage(
        {
          gasManifest: config.gas,
          mockSeed,
          fn,
          args,
          contentBaseUrl,
          port: port2,
          sharedBuffer,
        },
        [port2],
      );
      worker.on("message", async (data) => {
        if (data.message === "vegas:HtmlService#createHtmlOutputFromFile") {
          const filePath = `${parse(data.payload).name}.html`;
          const html = userCodes.web.map.get(filePath);
          port1.postMessage(html);
          Atomics.store(sharedArray, 0, 0);
          Atomics.notify(sharedArray, 0);
        } else if (data.message === "vegas:Cache#get") {
          let cache = null;
          if (data.payload.scope === "document") {
            cache = inMemoryStore.documentCache;
          } else if (data.payload.scope === "script") {
            cache = inMemoryStore.scriptCache;
          } else if (data.payload.scope === "user") {
            cache = inMemoryStore.userCache;
          }

          if (cache) {
            const now = new Date().valueOf();
            Object.entries(cache).forEach(([key, data]) => {
              if (data.expired <= now) {
                delete cache[key];
              }
            });
            port1.postMessage(cache[data.payload.key].value);
          }
          Atomics.store(sharedArray, 0, 0);
          Atomics.notify(sharedArray, 0);
        } else if (data.message === "vegas:Cache#getAll") {
          let cache = null;
          if (data.payload.scope === "document") {
            cache = inMemoryStore.documentCache;
          } else if (data.payload.scope === "script") {
            cache = inMemoryStore.scriptCache;
          } else if (data.payload.scope === "user") {
            cache = inMemoryStore.userCache;
          }

          if (cache) {
            const now = new Date().valueOf();
            const obj: Record<string, string> = {};
            Object.entries(cache).forEach(([key, value]) => {
              if (value.expired <= now) {
                delete cache[key];
              } else if ((data.payload.keys as string[]).includes(key)) {
                obj[key] = cache[key].value;
              }
            });
            port1.postMessage(obj);
          }
          Atomics.store(sharedArray, 0, 0);
          Atomics.notify(sharedArray, 0);
        } else if (data.message === "vegas:Cache#put") {
          let cache = null;
          if (data.payload.scope === "document") {
            cache = inMemoryStore.documentCache;
          } else if (data.payload.scope === "script") {
            cache = inMemoryStore.scriptCache;
          } else if (data.payload.scope === "user") {
            cache = inMemoryStore.userCache;
          }

          if (cache) {
            const record = data.payload.record;
            const expired = new Date().valueOf() + record.expired * 1000;
            cache[record.key] = { value: record.value, expired };

            const cachedLength = Object.keys(cache).length;
            if (cachedLength > 1000) {
              const objArray: { expired: number; key: string }[] = [];
              Object.entries(cache).forEach(([key, data]) => {
                objArray.push({ expired: data.expired, key });
              });
              // desc sort
              objArray.sort((a, b) => b.expired - a.expired);
              // remove cached value ( result 900 cache values )
              for (let i = 0; i < 100 + cachedLength - 1000; i++) {
                delete cache[objArray[i].key];
              }
            }
          }
          Atomics.store(sharedArray, 0, 0);
          Atomics.notify(sharedArray, 0);
        } else if (data.message === "vegas:Cache#putAll") {
          let cache = null;
          if (data.payload.scope === "document") {
            cache = inMemoryStore.documentCache;
          } else if (data.payload.scope === "script") {
            cache = inMemoryStore.scriptCache;
          } else if (data.payload.scope === "user") {
            cache = inMemoryStore.userCache;
          }

          if (cache) {
            const expired = new Date().valueOf() + data.payload.expired * 1000;
            Object.entries(data.payload.values as Record<string, string>).forEach(
              ([key, value]) => {
                cache[key] = { value, expired };
              },
            );

            const cachedLength = Object.keys(cache).length;
            if (cachedLength > 1000) {
              const objArray: { expired: number; key: string }[] = [];
              Object.entries(cache).forEach(([key, data]) => {
                objArray.push({ expired: data.expired, key });
              });
              // desc sort
              objArray.sort((a, b) => b.expired - a.expired);
              // remove cached value ( result 900 cache values )
              for (let i = 0; i < 100 + cachedLength - 1000; i++) {
                delete cache[objArray[i].key];
              }
            }
          }
          Atomics.store(sharedArray, 0, 0);
          Atomics.notify(sharedArray, 0);
        } else if (data.message === "vegas:Cache#remove") {
          let cache = null;
          if (data.payload.scope === "document") {
            cache = inMemoryStore.documentCache;
          } else if (data.payload.scope === "script") {
            cache = inMemoryStore.scriptCache;
          } else if (data.payload.scope === "user") {
            cache = inMemoryStore.userCache;
          }

          if (cache) {
            delete cache[data.payload.key];
          }
          Atomics.store(sharedArray, 0, 0);
          Atomics.notify(sharedArray, 0);
        } else if (data.message === "vegas:Cache#removeAll") {
          let cache = null;
          if (data.payload.scope === "document") {
            cache = inMemoryStore.documentCache;
          } else if (data.payload.scope === "script") {
            cache = inMemoryStore.scriptCache;
          } else if (data.payload.scope === "user") {
            cache = inMemoryStore.userCache;
          }

          if (cache) {
            (data.payload.keys as string[]).forEach((key) => {
              delete cache[key];
            });
          }
          Atomics.store(sharedArray, 0, 0);
          Atomics.notify(sharedArray, 0);
        } else if (data.message === "vegas:resolve") {
          resolve(data.payload);
        }
      });
    });
  }

  return {
    name: "vite-plugin-hostframe",

    async handleHotUpdate(ctx) {
      if (ctx.file.startsWith(config.webDir)) {
        const frontResult = await Promise.all(
          projectEntry.webEntries.map((webEntry) => buildWithVite(config, webEntry)),
        );
        const newWeb = new Map<string, string>();
        frontResult.flat().forEach((result) => {
          (result as RolldownOutput).output.flat().forEach((out) => {
            if (out.type === "asset") {
              newWeb.set(out.fileName, Buffer.from(out.source).toString("utf8"));
            }
          });
        });
        userCodes.web.map = newWeb;
        ctx.server.moduleGraph.invalidateAll();
        for (const href of userCodes.web.hrefs) {
          const mod = await ctx.server.moduleGraph.getModuleByUrl(href);
          if (mod) {
            ctx.server.moduleGraph.invalidateModule(mod);
          }
        }
        ctx.server.ws.send({ type: "full-reload" });
        return [];
      } else if (ctx.file.startsWith(config.serverDir)) {
        const serverResult = await buildWithRolldown(config, projectEntry.serverEntry);
        const serverOutput = serverResult.output.flat()[0] as OutputChunk;
        userCodes.server = serverOutput.code;
        return [];
      }
    },

    async configureServer(server) {
      const frontResult = await Promise.all(
        projectEntry.webEntries.map((webEntry) => buildWithVite(config, webEntry)),
      );
      const newMap = new Map<string, string>();
      frontResult.flat().forEach((result) => {
        (result as RolldownOutput).output.flat().forEach((out) => {
          if (out.type === "asset") {
            newMap.set(out.fileName, Buffer.from(out.source).toString("utf8"));
          }
        });
      });
      userCodes.web.map = newMap;
      const serverResult = await buildWithRolldown(config, projectEntry.serverEntry);
      const serverOutput = serverResult.output.flat()[0] as OutputChunk;
      userCodes.server = serverOutput.code;
      for (const source of gasMockSources) {
        const mod = await server.ssrLoadModule(source);
        const mock = mod.default;

        switch (mock.target) {
          case MockTarget.Properties: {
            inMemoryStore.documentProperties = mock?.documentProperties ?? {};
            inMemoryStore.scriptProperties = mock?.scriptProperties ?? {};
            inMemoryStore.userProperties = mock?.userProperties ?? {};
            break;
          }
          case MockTarget.Session: {
            mockSeed[mock.target] = mock;
            break;
          }
          // TODO
        }
      }

      server.watcher.add([config.webDir, config.serverDir]);

      server.ws.on("vegas:gascall", async (data, client) => {
        try {
          const result = await launchGAS("", mockSeed, data.func, ...JSON.parse(data.args));
          client.send("vegas:gasreturn", {
            id: data.id,
            status: "ok",
            result,
          });
        } catch (error) {
          client.send("vegas:gasreturn", {
            id: data.id,
            status: "err",
            message: (error as any).message,
          });
        }
      });

      server.middlewares.use(async (request, response, next) => {
        if (request.url) {
          const scheme = server.config.server.https ? "https" : "http";
          const host =
            server.config.server.host !== undefined
              ? typeof server.config.server.host === "boolean"
                ? server.config.server.host
                  ? "0.0.0.0"
                  : "localhost"
                : server.config.server.host
              : "localhost";
          const contentPort = server.config.server.port + 1;
          const contentBaseUrl = `${scheme}://${host}:${contentPort}`;
          const url = new URL(request.url, contentBaseUrl);
          if (url.pathname === "/") {
            // redirect to iframe
            const basePath = server.config.mode === "production" ? "/exec" : "/dev";
            response.statusCode = 307;
            response.setHeader("Location", `${basePath}${url.search}`);
            response.end();
            return;
          } else if (/^\/(exec|dev)/.test(url.pathname)) {
            // response iframe
            if (!userCodes.web.hrefs.includes(url.href)) {
              userCodes.web.hrefs.push(url.href);
            }
            const result = await launchGAS(contentBaseUrl, mockSeed, "doGet");
            const transFormedHtml = await server.transformIndexHtml(url.href, result);
            response.statusCode = 200;
            response.setHeader("Content-Type", "text/html");
            response.end(transFormedHtml);
            return;
          }
        }
        next();
      });
    },
  };
}
