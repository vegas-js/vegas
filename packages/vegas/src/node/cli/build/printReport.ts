import path from "node:path";
import util from "node:util";

import { BuildArtifact } from "../core/analyze";
import { ResolvedUserConfig } from "../core/config";

function formatSize(bytes: number): string {
  const units = ["B", "kB", "mB"];
  let size = bytes;
  let unit = 0;

  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }

  return `${size.toFixed(2)} ${units[unit].padStart(2)}`;
}

export function printReport(
  config: ResolvedUserConfig,
  artifacts: BuildArtifact[],
  durationMs: number,
) {
  const basePath = util.styleText(
    "dim",
    `${path.relative(config.root, config.output.dir)}${path.sep}`,
  );

  const rows = artifacts.map((artifact) => ({
    path: artifact.path,
    size: formatSize(artifact.size),
  }));

  const maxPathLength = Math.max(...rows.map((artifact) => artifact.path.length));
  const maxSizeLength = Math.max(...rows.map((artifact) => artifact.size.toString().length));

  const lines = rows.map(({ path: filePath, size }) => {
    const paddedPath = filePath.padEnd(maxPathLength);
    const paddedSize = size.padStart(maxSizeLength);

    const coloredPath = `${util.styleText("dim", basePath)}${util.styleText("green", paddedPath)}`;
    const coloredSize = `${util.styleText(["dim", "bold"], paddedSize)}`;

    return `${coloredPath}  ${coloredSize}`;
  });

  console.log(lines.join("\n"));
  console.log(util.styleText("green", `\n✓ built in ${durationMs.toFixed(0)}ms`));
}
