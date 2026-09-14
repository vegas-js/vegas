import type { EnvironmentOptions, InlineConfig } from "vite";

import {
  VIRTUAL_DETECT_SERVER_ENTRY,
  detectServerEntry,
} from "../../cli/core/plugins/detectserverentry";
import { exportBridge } from "../../cli/core/plugins/exportbridge";
import { virtualHTML } from "../../cli/core/plugins/virtualhtml";
import type { ProjectSnapshot, ResolvedProject } from "../../project";

export function createBuilderConfig(
  project: ResolvedProject,
  mode: "development" | "production",
  snapshot: ProjectSnapshot,
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
  const sharedClientOptions: EnvironmentOptions = {
    consumer: "client",
    define: {
      "import.meta.env.BASE_URL": JSON.stringify("/userCodeAppPanel"),
      "import.meta.env.ENDPOINT_URL": JSON.stringify(mode === "production" ? "/exec" : "/dev"),
      "import.meta.env.SSR": false,
    },
    resolve: {
      conditions: ["module", "browser", mode],
    },
  };
  snapshot.clientEntries.forEach((entry, index) => {
    environments[`client${index}`] = {
      ...sharedClientOptions,
      build: {
        rolldownOptions: {
          input: entry.sourcePath,
        },
      },
    };
  });
  const builderConfig: InlineConfig = {
    root: project.root,
    define: {
      "import.meta.env.DEV": mode === "development",
      "import.meta.env.MODE": mode,
      "import.meta.env.PROD": mode === "production",
    },
    configFile: false,
    plugins: [
      ...project.plugins,
      virtualHTML(project.clientDir),
      detectServerEntry(project, snapshot),
      exportBridge(),
    ],
    environments,
    build: {
      outDir: project.outputDir,
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
