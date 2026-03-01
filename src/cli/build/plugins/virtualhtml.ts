import path from "node:path";

import { HtmlTagDescriptor, Plugin } from "vite";

type VirtualHTMLOption = {
  webDir: string;
  webEntry: string;
};

export function virtualHTML(option: VirtualHTMLOption): Plugin {
  return {
    name: "vite-plugin-virtualhtml",

    configResolved(config) {
      const relativeDirname = path.relative(option.webDir, path.parse(option.webEntry).dir);
      const htmlPath = relativeDirname
        ? `${relativeDirname}.html`
        : path.join(relativeDirname, "index.html");
      config.build.rolldownOptions.input = htmlPath;
    },

    resolveId(source, _importer, _options) {
      if (source.endsWith(".html")) {
        return source;
      }
    },

    load(id, _options) {
      if (id.endsWith(".html")) {
        return `<script type="module" src="${option.webEntry}"></script>`;
      }
    },

    transformIndexHtml(_html, ctx) {
      const bundle = ctx.bundle;
      if (!bundle) {
        return;
      }
      const injectTags: HtmlTagDescriptor[] = [];
      Object.keys(bundle).forEach((key) => {
        const output = bundle[key];
        const name = output.fileName;
        if (output.type === "asset") {
          if (name.endsWith(".css")) {
            injectTags.push({
              tag: "style",
              children: Buffer.from(output.source).toString("utf8"),
              injectTo: "head",
            });
            delete bundle[key];
          } else {
            console.log(`no processing: ${JSON.stringify(name)}`);
          }
        } else if (output.type === "chunk") {
          if (name.endsWith(".js")) {
            injectTags.push({
              tag: "script",
              children: output.code,
              attrs: { type: "module" },
              injectTo: "body",
            });
            delete bundle[key];
          } else {
            console.log(`no processing: ${JSON.stringify(name)}`);
          }
        } else {
          console.log(`no processing: ${JSON.stringify(name)}`);
        }
      });

      return {
        html: `<!DOCTYPE html><html><head></head><body><div id="root"></div></body></html>`,
        tags: injectTags,
      };
    },
  };
}
