import fs from "node:fs";
import path from "node:path";
import util from "node:util";

import vfs from "@platformatic/vfs";
import {
  EnvironmentOptions,
  InlineConfig,
  Rolldown,
  version as VITE_VERSION,
  ViteBuilder,
} from "vite";

import { version as VEGAS_VERSION } from "../../../../package.json";
import { ProjectSource } from "../core/analyze";
import { ResolvedUserConfig } from "../core/config";
import { detectServerEntry, VIRTUAL_DETECT_SERVER_ENTRY } from "../core/plugins/detectserverentry";
import { exportBridge } from "../core/plugins/exportbridge";
import { virtualHTML } from "../core/plugins/virtualhtml";

type FileSystem = typeof fs;

export async function buildApp(
  fs: FileSystem | vfs.VirtualFileSystem,
  builder: ViteBuilder,
  envFilter?: RegExp,
) {
  const buildPromises = [];
  const config = builder.config;
  for (const environment of Object.values(builder.environments)) {
    if (/^(client|ssr)$/.test(environment.name)) {
      continue;
    }
    if (!envFilter || envFilter.test(environment.name)) {
      buildPromises.push(builder.build(environment));
    }
  }
  const output = await Promise.all(buildPromises);
  (output.flat() as Rolldown.RolldownOutput[]).map((result) => {
    const outputs = result.output.flat();
    outputs.map((out) => {
      const outputPath = path.join(config.build.outDir, out.fileName);
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      const content = out.type === "asset" ? Buffer.from(out.source).toString("utf8") : out.code;
      fs.writeFileSync(outputPath, content, "utf8");
    });
  });
}

export function createBuilderConfig(
  config: ResolvedUserConfig,
  mode: "development" | "production",
  projectSource: ProjectSource,
  clientEntries: string[],
) {
  const environments: Record<string, EnvironmentOptions> = {
    server: {
      build: {
        lib: {
          formats: ["iife"],
          name: "GASApp",
          entry: VIRTUAL_DETECT_SERVER_ENTRY,
        },
      },
    },
  };
  clientEntries.forEach((entry, index) => {
    environments[`client${index}`] = {
      consumer: "client",
      define: {
        "import.meta.env.BASE_URL": JSON.stringify("/userCodeAppPanel"),
        "import.meta.env.ENDPOINT_URL": JSON.stringify(mode === "production" ? "/exec" : "/dev"),
        "import.meta.env.SSR": false,
      },
      resolve: {
        conditions: ["module", "browser", mode],
      },
      build: {
        rolldownOptions: {
          input: entry,
        },
      },
    };
  });
  const builderConfig: InlineConfig = {
    root: config.root,
    define: {
      "import.meta.env.DEV": mode === "development",
      "import.meta.env.MODE": mode,
      "import.meta.env.PROD": mode === "production",
    },
    configFile: false,
    plugins: [
      ...config.plugins,
      virtualHTML(config.clientDir),
      detectServerEntry(config, projectSource),
      exportBridge(),
    ],
    environments,
    build: {
      outDir: config.output.dir,
      assetsInlineLimit: () => true,
      cssCodeSplit: false,
      write: false,
      emptyOutDir: false,
      reportCompressedSize: false,
      rolldownOptions: {
        output: {
          codeSplitting: false,
        },
      },
    },
    logLevel: "silent",
  };
  return builderConfig;
}

export function printBanner() {
  const vegasId = util.styleText("cyan", `vegas v${VEGAS_VERSION}`);
  const byVite = util.styleText("magenta", `vite v${VITE_VERSION}`);
  const message = util.styleText("green", "building client environment for production...");
  const poweredBy = `${util.styleText("dim", "> powered by")} ${byVite}\n`;
  console.log(vegasId, message);
  console.log(poweredBy);
}
