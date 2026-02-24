import { join, parse } from "node:path";
import { MessageChannel, Worker } from "node:worker_threads";

import { build as buildWithRolldownApi, OutputChunk, RolldownOutput } from "rolldown";
import { build as buildWithViteApi, Plugin } from "vite";

import { MockTarget } from "../../../../shared/gas";
import { ProjectEntry } from "../../../analyze";
import { exportBridge } from "../../../build/plugins/exportbridge";
import { virtualHTML } from "../../../build/plugins/virtualhtml";
import { ResolvedUserConfig } from "../../../config";
import { GASCache } from "./gasapi/cache";
import { GASCacheService } from "./gasapi/cacheservice";
import { GASProperties } from "./gasapi/properties";
import { GASUrlFetchApp } from "./gasapi/urlfetchapp";

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
    documentProperties: new GASProperties(),
    scriptProperties: new GASProperties(),
    userProperties: new GASProperties(),
    documentCache: new GASCache(),
    scriptCache: new GASCache(),
    userCache: new GASCache(),
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
      });
      const sharedBuffer = new SharedArrayBuffer(4);
      const sharedArray = new Int32Array(sharedBuffer);
      const { port1, port2 } = new MessageChannel();

      worker.postMessage(
        {
          gasManifest: config.gas,
          code: userCodes.server,
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
        if (data.message === "vegas:htmlservice") {
          const filePath = `${parse(data.filename).name}.html`;
          const html = userCodes.web.map.get(filePath);
          port1.postMessage(html);
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
            inMemoryStore.documentProperties.setProperties(mock?.documentProperties ?? {});
            inMemoryStore.scriptProperties.setProperties(mock?.scriptProperties ?? {});
            inMemoryStore.userProperties.setProperties(mock?.userProperties ?? {});
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
