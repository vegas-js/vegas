import type { EnvironmentOptions, InlineConfig } from "vite";

import type { BuildPlan } from "../plan";
import { createClientEnvironmentName, SERVER_ENVIRONMENT_NAME } from "./environment";
import { VIRTUAL_DETECT_SERVER_ENTRY, detectServerEntry } from "./plugin/detect-server-entry";
import { exportBridge } from "./plugin/exportbridge";
import { virtualHtml } from "./plugin/virtual-html";

export function createBuilderConfig(plan: BuildPlan): InlineConfig {
  const environments: Record<string, EnvironmentOptions> = {
    [SERVER_ENVIRONMENT_NAME]: {
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
  plan.clientModuleTargets.forEach((entry, index) => {
    environments[createClientEnvironmentName(index)] = {
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
    mode: plan.mode,
    define: {
      "import.meta.env.DEV": plan.mode === "development",
      "import.meta.env.MODE": plan.mode,
      "import.meta.env.PROD": plan.mode === "production",
    },
    configFile: false,
    plugins: [
      ...plan.plugins,
      virtualHtml(plan.clientModuleTargets),
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
