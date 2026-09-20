import type { Plugin, Rolldown } from "vite";

import { HtmlDocument } from "../../../html";
import type { BuildPlan } from "../../plan";

function escapeInlineScript(code: string): string {
  return code.replace(/<\/script/gi, "<\\/script");
}

function readCssAsset(asset: Rolldown.OutputAsset): string {
  if (!asset.fileName.toLowerCase().endsWith(".css")) {
    throw new Error(`Unsupported client asset: ${asset.fileName}`);
  }

  if (typeof asset.source === "string") {
    return asset.source;
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(asset.source);
  } catch {
    throw new Error(`Client CSS asset must be UTF-8: ${asset.fileName}`);
  }
}

export function virtualHtml(entries: BuildPlan["clientEntries"]): Plugin {
  return {
    name: "vite-plugin-virtual-html",
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

      const styles: string[] = [];
      const chunks: {
        originalFileName: string;
        code: string;
      }[] = [];

      for (const output of Object.values(bundle)) {
        if (output.type === "chunk") {
          chunks.push({
            originalFileName: output.facadeModuleId ?? "",
            code: output.code,
          });
        } else {
          styles.push(readCssAsset(output));
        }
      }

      if (chunks.length !== 1) {
        throw new Error(
          `Client environment "${this.environment.name}" must produce exactly one JavaScript chunk; received ${chunks.length}.`,
        );
      }

      for (const key of Object.keys(bundle)) {
        delete bundle[key];
      }

      const [chunk] = chunks;
      const html = new HtmlDocument();

      for (const style of styles) {
        html.appendToHead("style", { text: style });
      }

      html.appendToBody("div", { attributes: { id: "root" } });
      html.appendToBody("script", {
        text: escapeInlineScript(chunk.code),
        attributes: { type: "module" },
      });

      this.emitFile({
        originalFileName: chunk.originalFileName,
        fileName: entry.htmlPath,
        type: "asset",
        source: html.toString(),
      });
    },
  };
}
