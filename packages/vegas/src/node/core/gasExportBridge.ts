type GasExportBridgeOutputOptions = {
  name?: string;
};

type GasExportBridgeChunk = {
  type: "chunk";
  isEntry: boolean;
  exports: readonly string[];
  code: string;
};

type GasExportBridgeAsset = {
  type: "asset";
};

type GasExportBridgeBundle = Record<string, GasExportBridgeChunk | GasExportBridgeAsset>;

export function appendGasExportBridge(
  outputOptions: GasExportBridgeOutputOptions,
  bundle: GasExportBridgeBundle,
): void {
  Object.values(bundle).forEach((output) => {
    if (output.type === "chunk" && output.isEntry) {
      const bridgeCodes: string[] = ["\n/* Function bridge for GAS Client */"];

      output.exports.forEach((expo) => {
        bridgeCodes.push(
          `function ${expo}(...args) { return ${
            outputOptions.name ?? "globalThis"
          }.${expo}(...args); };`,
        );
      });

      if (bridgeCodes.length > 1) {
        output.code += bridgeCodes.join("\n");
      }
    }
  });
}
