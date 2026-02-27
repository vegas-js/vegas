import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Nodejs 20 LTS / 22 LTS polyfill
export class DisposableTempDir {
  readonly #tempDirPath: string;

  constructor(name: string) {
    const safeBasename = path.basename(name);
    const resolvedBasename = safeBasename.replace(/\.\.?/, "");
    const nodeModuleDirPath = path.join(process.cwd(), "node_modules");
    const tempDirRoot = fs.existsSync(nodeModuleDirPath) ? nodeModuleDirPath : os.tmpdir();
    const prefix = path.join(tempDirRoot, `${resolvedBasename ? resolvedBasename : "temp"}-`);

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
