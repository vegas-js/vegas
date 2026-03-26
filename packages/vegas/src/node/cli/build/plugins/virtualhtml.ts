import path from "node:path";

import { Plugin } from "vite";

import { HTML } from "../../core";

export function virtualHTML(clientDir: string): Plugin {
  return {
    name: "vite-plugin-virtualhtml",
    enforce: "post",

    applyToEnvironment(environment) {
      return /^client\d+$/.test(environment.name);
    },

    generateBundle(_outputOptions, bundle, _isWrite) {
      const assets: string[] = [];
      const chunks: { id: string; original: string; jsCode: string }[] = [];
      Object.keys(bundle).forEach((key) => {
        const output = bundle[key];

        if (output.type === "chunk") {
          const relativeDirname = path.relative(clientDir, path.parse(output.facadeModuleId!).dir);
          const htmlPath = relativeDirname
            ? `${relativeDirname}.html`
            : path.join(relativeDirname, "index.html");

          chunks.push({ id: htmlPath, original: output.facadeModuleId ?? "", jsCode: output.code });
        } else if (typeof output.source === "string") {
          assets.push(output.source);
        } else {
          assets.push(Buffer.from(output.source).toString("utf8"));
        }

        delete bundle[key];
      });

      chunks.forEach((chunk) => {
        const html = new HTML();
        assets.forEach((asset) => {
          html.appendToHead("style", asset);
        });
        html.appendToBody("div", [{ name: "id", value: "root" }]);
        html.appendToBody("script", chunk.jsCode, [{ name: "type", value: "module" }]);

        this.emitFile({
          originalFileName: chunk.original,
          fileName: chunk.id,
          type: "asset",
          source: html.toString(),
        });
      });
    },
  };
}
