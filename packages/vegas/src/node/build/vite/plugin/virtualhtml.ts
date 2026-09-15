import type { Plugin } from "vite";

import { HtmlDocument } from "../../../html";
import { BuildPlan } from "../../plan";

export function virtualHTML(entries: BuildPlan["clientEntries"]): Plugin {
  return {
    name: "vite-plugin-virtualhtml",
    enforce: "post",

    applyToEnvironment(environment) {
      return /^client\d+$/.test(environment.name);
    },

    generateBundle(_outputOptions, bundle) {
      const match = /^client(\d+)$/.exec(this.environment.name);

      if (!match) {
        return;
      }

      const entry = entries[Number(match[1])];

      if (!entry) {
        throw new Error(`Client entry not found for environment: ${this.environment.name}`);
      }

      const assets: string[] = [];
      const chunks: { original: string; jsCode: string }[] = [];

      Object.keys(bundle).forEach((key) => {
        const output = bundle[key];

        if (output.type === "chunk") {
          chunks.push({ original: output.facadeModuleId ?? "", jsCode: output.code });
        } else if (typeof output.source === "string") {
          assets.push(output.source);
        } else {
          assets.push(Buffer.from(output.source).toString("utf8"));
        }

        delete bundle[key];
      });

      chunks.forEach((chunk) => {
        const html = new HtmlDocument();
        assets.forEach((asset) => {
          html.appendToHead("style", { text: asset });
        });
        html.appendToBody("div", { attributes: { id: "root" } });
        html.appendToBody("script", {
          text: chunk.jsCode,
          attributes: { type: "module" },
        });

        this.emitFile({
          originalFileName: chunk.original,
          fileName: entry.htmlPath,
          type: "asset",
          source: html.toString(),
        });
      });
    },
  };
}
