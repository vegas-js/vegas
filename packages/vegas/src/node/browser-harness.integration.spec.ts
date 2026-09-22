import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, test, vi } from "vitest";

import {
  createBrowserHarnessWithDependencies,
  type BrowserHarnessOptions,
} from "./browser-harness";
import { startEphemeralWebAppApplication } from "./dev/webapp/server-application";
import type { LocalRuntimeHarness, LocalRuntimeHarnessOptions } from "./local-runtime-harness";
import type { ResolvedProject } from "./project";
import {
  InMemoryPropertiesStore,
  InMemorySpreadsheetStore,
  LocalRuntimeSession,
  type LocalRuntime,
  type Program,
} from "./runtime";

const program = {
  source: "",
  htmlFiles: {},
} satisfies Program;

function createProject(root: string): ResolvedProject {
  return {
    root,
    configFile: null,
    clientDir: path.join(root, "src", "client"),
    serverDir: path.join(root, "src", "server"),
    runtimeDataDir: path.join(root, "runtime"),
    outputDir: path.join(root, "dist"),
    appType: "spa",
    plugins: [],
    devServer: {
      open: false,
    },
    appsScript: {
      manifest: {
        exceptionLogging: "STACKDRIVER",
        runtimeVersion: "V8",
        timeZone: "UTC",
        webapp: {
          access: "MYSELF",
          executeAs: "USER_ACCESSING",
        },
      },
    },
  };
}

function createRuntimeHarness(): LocalRuntimeHarness {
  const spreadsheetStore = new InMemorySpreadsheetStore([]);
  const execute = vi.fn(async (request) => {
    if (request.functionName !== "doGet") {
      throw new Error(`Unexpected Runtime function: ${request.functionName}`);
    }

    return {
      kind: "html",
      output: {
        metaTags: [],
        title: "Browser Harness",
        faviconUrl: "",
        content: '<main id="app">Hello from BrowserHarness</main>',
        xFrameOptionsMode: "DEFAULT",
      },
    };
  });
  const runtime = {
    execute,
    resources: {
      spreadsheets: spreadsheetStore,
    },
  } satisfies LocalRuntime;

  return {
    appsScript: {
      execute(functionName, args = []) {
        return runtime.execute({ functionName, args });
      },
    },
    runtime,
    session: new LocalRuntimeSession(),
    propertiesStore: new InMemoryPropertiesStore(),
    spreadsheetStore,
  };
}

function readSandboxFrameUrl(html: string): string {
  const iframe = html.match(/<iframe\b[^>]*\bid="sandboxFrame"[^>]*>/)?.[0];
  const src = iframe?.match(/\bsrc="([^"]+)"/)?.[1];

  if (src === undefined) {
    throw new Error("BrowserHarness host HTML did not contain the sandbox iframe URL.");
  }

  return src;
}

describe("BrowserHarness integration", () => {
  test("serve a cross-origin user-content session through real ephemeral servers", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "vegas-browser-harness-"));
    const project = createProject(root);
    const runtimeHarness = createRuntimeHarness();
    const loadProject = vi.fn(async () => project);
    const buildRuntimeProgram = vi.fn(async () => program);
    const createLocalRuntimeHarness = vi.fn(
      async (_options: LocalRuntimeHarnessOptions) => runtimeHarness,
    );
    let harness: Awaited<ReturnType<typeof createBrowserHarnessWithDependencies>> | undefined;

    try {
      harness = await createBrowserHarnessWithDependencies({} satisfies BrowserHarnessOptions, {
        cwd: root,
        loadProject,
        buildRuntimeProgram,
        createLocalRuntimeHarness,
        startWebAppApplication: startEphemeralWebAppApplication,
      });

      const hostUrl = new URL(harness.urls.host);
      const userContentUrl = new URL(harness.urls.userContent);

      expect(hostUrl.hostname).toBe("127.0.0.1");
      expect(userContentUrl.hostname).toBe("127.0.0.1");
      expect(hostUrl.port).not.toBe("");
      expect(userContentUrl.port).not.toBe("");
      expect(userContentUrl.origin).not.toBe(hostUrl.origin);

      const hostResponse = await fetch(harness.urls.host);
      const hostHtml = await hostResponse.text();

      expect(hostResponse.status).toBe(200);
      expect(hostHtml).toContain("Browser Harness");

      const sandboxFrameUrl = new URL(readSandboxFrameUrl(hostHtml));
      const sessionId = sandboxFrameUrl.searchParams.get("sessionId");

      expect(sandboxFrameUrl.origin).toBe(userContentUrl.origin);
      expect(sandboxFrameUrl.pathname).toBe("/userCodeAppPanel");
      expect(sessionId).not.toBeNull();
      expect(sessionId).not.toBe("");

      const userContentResponse = await fetch(sandboxFrameUrl);
      const userContentHtml = await userContentResponse.text();

      expect(userContentResponse.status).toBe(200);
      expect(userContentHtml).toContain(`id: "${sessionId}"`);
      expect(userContentHtml).toContain(`hostOrigin: "${hostUrl.origin}"`);
      expect(userContentHtml).toContain('src="/@vegas/client"');
      expect(userContentHtml).toContain('id="userHtmlFrame"');
    } finally {
      await harness?.dispose();
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
