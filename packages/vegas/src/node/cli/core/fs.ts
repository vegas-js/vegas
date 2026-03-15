import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Node.js v22 LTS polyfill
export class DisposableTempDir {
  readonly #tempDirPath: string;

  constructor(name: string) {
    const safeBasename = path.basename(name).replace(/\.\.?/, "");
    const nodeModuleDirPath = path.join(process.cwd(), "node_modules");
    const tempDirRoot = fs.existsSync(nodeModuleDirPath) ? nodeModuleDirPath : os.tmpdir();
    const prefix = path.join(tempDirRoot, `${safeBasename ? safeBasename : "temp"}-`);

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
