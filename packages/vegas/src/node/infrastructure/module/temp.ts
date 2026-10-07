import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function findNodeModulesDirectory(cwd: string): string | undefined {
  let directory = path.resolve(cwd);

  while (true) {
    const nodeModulesPath = path.join(directory, "node_modules");

    if (fs.existsSync(nodeModulesPath)) {
      return nodeModulesPath;
    }

    const parent = path.dirname(directory);
    if (parent === directory) {
      return undefined;
    }

    directory = parent;
  }
}

// Node.js v22 LTS polyfill
export class DisposableTempDir {
  readonly #tempDirPath: string;

  constructor(name: string, cwd = process.cwd()) {
    const safeBasename = path.basename(name).replace(/\.\.?/, "");
    const tempDirRoot = findNodeModulesDirectory(cwd) ?? os.tmpdir();
    const prefix = path.join(tempDirRoot, `${safeBasename || "temp"}-`);

    this.#tempDirPath = fs.mkdtempSync(prefix);
  }

  [Symbol.dispose](): void {
    this.delete();
  }

  getPath(): string {
    return this.#tempDirPath;
  }
  delete(): void {
    fs.rmSync(this.#tempDirPath, { recursive: true, force: true });
  }
}
