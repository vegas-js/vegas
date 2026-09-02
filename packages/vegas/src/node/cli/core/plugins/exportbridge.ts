import { Plugin } from "vite";

import { appendGasExportBridge } from "../../../core/gasExportBridge";

export function exportBridge(): Plugin {
  return {
    name: "vite-plugin-exportbridge",

    applyToEnvironment(environment) {
      return environment.name === "server";
    },

    generateBundle(outputOptions, bundle) {
      appendGasExportBridge(outputOptions, bundle);
    },
  };
}
