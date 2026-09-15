import type { EnvironmentOptions, InlineConfig } from "vite";

import {
  VIRTUAL_DETECT_SERVER_ENTRY,
  detectServerEntry,
} from "../../cli/core/plugins/detectserverentry";
import { exportBridge } from "../../cli/core/plugins/exportbridge";
import { virtualHTML } from "../../cli/core/plugins/virtualhtml";
import { BuildPlan } from "../plan";

export function createBuilderConfig(plan: BuildPlan): InlineConfig {
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
      "import.meta.env.ENDPOINT_URL": JSON.stringify(plan.mode === "production" ? "/exec" : "/dev"),
      "import.meta.env.SSR": false,
    },
    resolve: {
      conditions: ["module", "browser", plan.mode],
    },
  };
  plan.clientEntries.forEach((entry, index) => {
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
    root: plan.root,
    define: {
      "import.meta.env.DEV": plan.mode === "development",
      "import.meta.env.MODE": plan.mode,
      "import.meta.env.PROD": plan.mode === "production",
    },
    configFile: false,
    plugins: [
      ...plan.plugins,
      virtualHTML(plan.clientDir),
      detectServerEntry(plan),
      exportBridge(),
    ],
    environments,
    build: {
      outDir: plan.outputDir,
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
