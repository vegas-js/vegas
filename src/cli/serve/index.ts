import path from "node:path";
import { MessageChannel, Worker } from "node:worker_threads";

import { OutputChunk, RolldownOutput } from "rolldown";
import { Connect, createLogger, createServer } from "vite";

import { HTML, resolvePath } from "../../core";
import { MockTarget } from "../../shared/gas";
import { collectSources, detectEntries, ProjectEntry } from "../analyze";
import { buildServerApp, buildWebApp } from "../build";
import { loadConfig, resolveConfig, ResolvedUserConfig } from "../config";

async function serveApp(
  config: ResolvedUserConfig,
  projectEntry: ProjectEntry,
  gasMockSources: string[],
) {
  function launchGAS(fn: string, ...args: any[]): Promise<any> {
    return new Promise((resolve) => {
      const sharedBuffer = new SharedArrayBuffer(4);
      const sharedArray = new Int32Array(sharedBuffer);
      const { port1, port2 } = new MessageChannel();
      new Worker(path.join(import.meta.dirname, "gas.js"), {
        env: { ...process.env, FORCE_COLOR: "1" },
        transferList: [port2],
        workerData: { code: userCodes.server, sharedArray, port: port2 },
      });

      port1.postMessage({ fn, args });
      port1.on("message", async (data) => {
        if (data.message === "vegas:HtmlService#createHtmlOutputFromFile") {
          const filePath = `${path.parse(data.payload).name}.html`;
          const html = userCodes.web.map.get(filePath);
          port1.postMessage(html);
          Atomics.store(sharedArray, 0, 0);
          Atomics.notify(sharedArray, 0);
        } else if (data.message === "vegas:Session#getActiveUser") {
          const email =
            config.gas.webapp!.executeAs === "USER_ACCESSING"
              ? (mockSeed["Session"]?.activeUserEmail ?? "active@gmail.com")
              : (mockSeed["Session"]?.effectiveUserEmail ?? "effective@gmail.com");
          port1.postMessage(email);
          Atomics.store(sharedArray, 0, 0);
          Atomics.notify(sharedArray, 0);
        } else if (data.message === "vegas:Session#getActiveUserLocale") {
          const userLocale = mockSeed["Session"]?.activeUserLocale ?? "en";
          port1.postMessage(userLocale);
          Atomics.store(sharedArray, 0, 0);
          Atomics.notify(sharedArray, 0);
        } else if (data.message === "vegas:Session#getEffectiveUser") {
          const email =
            config.gas.webapp!.executeAs === "USER_ACCESSING"
              ? (mockSeed["Session"]?.activeUserEmail ?? "active@gmail.com")
              : (mockSeed["Session"]?.effectiveUserEmail ?? "effective@gmail.com");
          port1.postMessage(email);
          Atomics.store(sharedArray, 0, 0);
          Atomics.notify(sharedArray, 0);
        } else if (data.message === "vegas:Session#getScriptTimeZone") {
          const timeZone = config.gas.timeZone ?? "UTC";
          port1.postMessage(timeZone);
          Atomics.store(sharedArray, 0, 0);
          Atomics.notify(sharedArray, 0);
        } else if (data.message === "vegas:Session#getTemporaryActiveUserKey") {
          const key =
            mockSeed["Session"]?.temporaryActiveUserKey ??
            "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
          port1.postMessage(key);
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
            const now = Date.now();
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
            const now = Date.now();
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
            const expired = Date.now() + record.expired * 1000;
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
            const expired = Date.now() + data.payload.expired * 1000;
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

  const hostServer = await createServer({
    root: config.root,
    configFile: false,
    customLogger: createLogger("info", { prefix: "[vegas]" }),
    cacheDir: path.join(config.root, "node_modules", ".vegas-host"),
  });

  const webResult = await Promise.all(buildWebApp(config, projectEntry.webEntries, false));
  const newWebMap = new Map<string, string>();
  webResult.flat().forEach((result) => {
    (result as RolldownOutput).output.flat().forEach((output) => {
      if (output.type === "asset") {
        newWebMap.set(output.fileName, Buffer.from(output.source).toString("utf8"));
      }
    });
  });
  userCodes.web.map = newWebMap;

  const serverResult = await buildServerApp(config, projectEntry.serverEntry);
  const serverOutput = serverResult.output.flat()[0] as OutputChunk;
  userCodes.server = serverOutput.code;

  for (const source of gasMockSources) {
    const mod = await hostServer.ssrLoadModule(source);
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

  hostServer.watcher.add([config.webDir, config.serverDir]);

  hostServer.watcher.on("change", async (path) => {
    if (path.startsWith(config.webDir)) {
      const frontResult = await Promise.all(buildWebApp(config, projectEntry.webEntries, false));
      const newWeb = new Map<string, string>();
      frontResult.flat().forEach((result) => {
        (result as RolldownOutput).output.flat().forEach((out) => {
          if (out.type === "asset") {
            newWeb.set(out.fileName, Buffer.from(out.source).toString("utf8"));
          }
        });
      });
      userCodes.web.map = newWeb;
      hostServer.moduleGraph.invalidateAll();
      for (const href of userCodes.web.hrefs) {
        const mod = await hostServer.moduleGraph.getModuleByUrl(href);
        if (mod) {
          hostServer.moduleGraph.invalidateModule(mod);
        }
      }
      hostServer.ws.send({ type: "full-reload" });
      return [];
    } else if (path.startsWith(config.serverDir)) {
      const serverResult = await buildServerApp(config, projectEntry.serverEntry, false);
      const serverOutput = serverResult.output.flat()[0] as OutputChunk;
      userCodes.server = serverOutput.code;
      return [];
    }
  });

  hostServer.ws.on("vegas:gascall", async (data, client) => {
    try {
      const result = await launchGAS(data.func, ...JSON.parse(data.args));
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

  const hostHandler: Connect.NextHandleFunction = async (request, response, next) => {
    if (request.url) {
      const scheme = userContentServer.config.server.https ? "https" : "http";
      const url = new URL(request.url, `${scheme}://${request.headers.host}`);
      url.port = String(Number.parseInt(url.port) + 1);
      if (url.pathname === "/") {
        // redirect to iframe
        const basePath = hostServer.config.mode === "production" ? "/exec" : "/dev";
        response.statusCode = 307;
        response.setHeader("Location", `${basePath}${url.search}`);
        response.end();
        return;
      } else if (/^\/(exec|dev)/.test(url.pathname)) {
        // response iframe
        if (!userCodes.web.hrefs.includes(url.href)) {
          userCodes.web.hrefs.push(url.href);
        }
        const result = JSON.parse(await launchGAS("doGet"));
        const html = new HTML();

        if (result.metaTags > 0) {
          (result.metaTags as { name: string; content: string }[]).forEach((metaTag) => {
            html.appendToHead("meta", [
              { name: "name", value: metaTag.name },
              { name: "content", value: metaTag.content },
            ]);
          });
        }

        if (result.title) {
          html.appendToHead("title", result.title);
        }

        if (result.faviconUrl) {
          html.appendToHead("link", [
            { name: "rel", value: "shortcut icon" },
            { name: "type", value: "image/png" },
            { name: "href", value: result.faviconUrl },
          ]);
        }

        html.appendToHead(
          "style",
          "html,body,iframe#sandboxFrame{margin:0;padding:0;height:100%;width:100%;}iframe#sandboxFrame{border:none;display:block;};",
        );

        html.appendToBody("iframe", [
          { name: "id", value: "sandboxFrame" },
          {
            name: "allow",
            value:
              "accelerometer *; ambient-light-sensor *; autoplay *; camera *; clipboard-read *; clipboard-write *; encrypted-media *; fullscreen *; geolocation *; gyroscope *; local-network-access *; magnetometer *; microphone *; midi *; payment *; picture-in-picture *; screen-wake-lock *; speaker *; sync-xhr *; usb *; vibrate *; vr *; web-share *",
          },
          {
            name: "sandbox",
            value:
              "allow-downloads allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-top-navigation-by-user-activation allow-storage-access-by-user-activation",
          },
          { name: "src", value: `${url.origin}/userCodeAppPanel` },
        ]);
        const initRecord: Record<string, any> = {};
        initRecord["userHtml"] = result.content;
        html.appendToBody(
          "script",
          `if (import.meta.hot) {
  import.meta.hot.on("vegas:gasreturn", (data) => {
    document.getElementById("sandboxFrame").contentWindow.postMessage({ type: "vegas:gasreturn", payload: data }, "${url.origin}");
  });
  window.addEventListener("message", (event) => {
    if (event.origin !== "${url.origin}") return;
    if (event.data.type === "vegas:gascall") import.meta.hot.send(event.data.type, event.data.payload);
  });
}
document.getElementById("sandboxFrame").onload = (event) => {
  event.currentTarget.contentWindow.postMessage({ type: "vegas:gasinit", payload: { host: window.location.origin, serverData: JSON.parse(decodeURIComponent("${encodeURIComponent(JSON.stringify(initRecord))}"))}}, "${url.origin}");
}`,
          [{ name: "type", value: "module" }],
        );
        const transFormedHtml = await hostServer.transformIndexHtml(url.href, html.toString());
        response.statusCode = 200;
        response.setHeader("Content-Type", "text/html");
        response.end(transFormedHtml);
        return;
      }
    }
    next();
  };

  hostServer.middlewares.stack.unshift({ route: "", handle: hostHandler });

  await hostServer.listen();

  const userContentServer = await createServer({
    root: config.root,
    configFile: false,
    plugins: [
      {
        name: "vegas",

        resolveId(source, _importer, _options) {
          if (source === "/@vegas/client") {
            return "\0virtual:vegas";
          }
        },

        async load(id, _options) {
          if (id === "\0virtual:vegas") {
            return await this.fs.readFile(path.join(import.meta.dirname, "client.js"), {
              encoding: "utf8",
            });
          }
        },
      },
    ],
    server: { port: hostServer.config.server.port + 1 },
    customLogger: createLogger("info", { prefix: "[vegas]" }),
    cacheDir: path.join(config.root, "node_modules", ".vegas-content"),
  });

  const userContentHandler: Connect.NextHandleFunction = async (request, response, next) => {
    if (request.url) {
      const scheme = userContentServer.config.server.https ? "https" : "http";
      const url = new URL(request.url, `${scheme}://${request.headers.host}`);
      if (url.pathname === "/blank") {
        const html = new HTML();
        html.appendToHead("meta", [
          { name: "http-equiv", value: "X-UA-Compatible" },
          { name: "content", value: "IE=edge" },
        ]);
        response.statusCode = 200;
        response.setHeader("Content-Type", "text/html");
        response.end(html.toString());
        return;
      } else if (url.pathname === "/userCodeAppPanel") {
        const html = new HTML();
        html.appendToHead(
          "style",
          "html, body, iframe {border: 0; display: block; height: 100%; margin: 0; padding: 0; width: 100%;}iframe#userHtmlFrame {overflow-y: scroll; -webkit-overflow-scrolling: touch;}",
        );
        html.appendToHead("script", [
          { name: "type", value: "module" },
          { name: "src", value: "/@vegas/client" },
        ]);

        html.appendToBody("iframe", [
          { name: "id", value: "userHtmlFrame" },
          {
            name: "allow",
            value:
              "accelerometer *; ambient-light-sensor *; autoplay *; camera *; clipboard-read *; clipboard-write *; encrypted-media *; fullscreen *; geolocation *; gyroscope *; local-network-access *; magnetometer *; microphone *; midi *; payment *; picture-in-picture *; screen-wake-lock *; speaker *; sync-xhr *; usb *; vibrate *; vr *; web-share *",
          },
          { name: "src", value: "/blank" },
        ]);

        response.statusCode = 200;
        response.setHeader("Content-Type", "text/html");
        response.end(html.toString());
        return;
      }
    }
    next();
  };

  userContentServer.middlewares.stack.unshift({ route: "", handle: userContentHandler });

  await userContentServer.listen();

  hostServer.printUrls();
  hostServer.bindCLIShortcuts({ print: true });
}

export async function runServe(root?: string) {
  const resolvedRoot = resolvePath(root);
  const userConfig = await loadConfig(resolvedRoot);
  const resolvedUserConfig = resolveConfig(userConfig);
  const projectSource = collectSources(resolvedUserConfig);
  const projectEntry = detectEntries(projectSource);

  await serveApp(resolvedUserConfig, projectEntry, projectSource.gasMockSources);
}
