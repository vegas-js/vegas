import path from "node:path";

import { build, TsdownPlugin } from "tsdown";

import { appendGasExportBridge } from "../../../src/node/cli/core/plugins/exportbridge";

function referenceExportBridge(): TsdownPlugin {
  return {
    name: "reference-export-bridge",

    generateBundle(outputOptions, bundle) {
      appendGasExportBridge(outputOptions, bundle);
    },
  };
}

export async function bundleReferenceCases(referenceDir: string): Promise<string> {
  const bundles = await build({
    entry: [path.join(referenceDir, "cases/index.ts")],
    format: "iife",
    write: false,
    clean: false,
    dts: false,
    logLevel: "silent",
    outputOptions: {
      name: "GASReference",
      entryFileNames: "Code.js",
    },
    plugins: [referenceExportBridge()],
  });
  if (bundles.length !== 1) {
    throw new Error("Bundle is multiple files");
  }
  const bundle = bundles[0];

  if (bundle.chunks.length !== 1) {
    throw new Error("Bundle is multiple chunks");
  }
  const chunk = bundle.chunks[0];
  if (chunk.type !== "chunk") {
    throw new Error("Bundle is not chunk");
  }

  return chunk.code;
}
