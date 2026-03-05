import path from "node:path";

import { Plugin } from "vite";

import { HTML } from "../../core";

type VirtualHTMLOption = {
  webDir: string;
  webEntry: string;
};

export function virtualHTML(option: VirtualHTMLOption): Plugin {
  return {
    name: "vite-plugin-virtualhtml",
    enforce: "post",

    applyToEnvironment(environment) {
      return environment.name.startsWith("web");
    },

    generateBundle(_outputOptions, bundle, _isWrite) {
      const assets: string[] = [];
      const chunks: { id: string; original: string; jsCode: string }[] = [];
      Object.keys(bundle).forEach((key) => {
        const output = bundle[key];

        if (output.type === "chunk") {
          const relativeDirname = path.relative(
            option.webDir,
            path.parse(output.facadeModuleId!).dir,
          );
          const htmlPath = relativeDirname
            ? `${relativeDirname}.html`
            : path.join(relativeDirname, "index.html");

          chunks.push({ id: htmlPath, original: output.facadeModuleId ?? "", jsCode: output.code });
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
