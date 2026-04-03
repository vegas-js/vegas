import fs from "node:fs";
import module from "node:module";
import path from "node:path";

import vfs from "@platformatic/vfs";

export async function runPush() {
  const importer = path.join(process.cwd(), "index.js");
  const pkgJsonPath = module.findPackageJSON("@google/clasp", importer);

  if (pkgJsonPath) {
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
    const pkgBin = pkgJson.bin.clasp;

    if (typeof pkgBin === "string") {
      const claspPath = path.resolve(path.dirname(pkgJsonPath), pkgBin);
      const claspConfigPath = path.join(process.cwd(), ".clasp.json");
      const claspConfig = fs.existsSync(claspConfigPath)
        ? JSON.parse(fs.readFileSync(claspConfigPath, "utf8"))
        : {};

      using mvfs = vfs.create({ overlay: true });
      mvfs.mount(process.cwd());

      const fsPromises = fs.promises;

      const origAccess = fsPromises.access;
      fsPromises.access = async (target, mode) => {
        if (path.resolve(String(target)) === claspConfigPath) {
          return mvfs.promises.access(claspConfigPath, mode);
        }
        return origAccess(target, mode);
      };

      const origStat = fsPromises.stat;
      fsPromises.stat = async (target, options) => {
        if (path.resolve(String(target)) === claspConfigPath) {
          return mvfs.promises.stat(claspConfigPath, options) as any;
        }
        return origStat(target, options);
      };

      const origReadFile = fsPromises.readFile;
      fsPromises.readFile = async (target, options) => {
        // oxlint-disable-next-line no-base-to-string
        if (path.resolve(String(target)) === claspConfigPath) {
          return mvfs.promises.readFile(claspConfigPath, options) as any;
        }
        return origReadFile(target, options);
      };

      const mergedConfig: Record<string, string> = {};
      mergedConfig.parentId = process.env.VEGAS_PARENT_ID ?? claspConfig.parentId;
      mergedConfig.scriptId = process.env.VEGAS_SCRIPT_ID ?? claspConfig.scriptId;
      mergedConfig.rootDir = "dist";

      mvfs.writeFileSync(claspConfigPath, JSON.stringify(mergedConfig), "utf8");

      const prevArgv = process.argv;
      process.argv = process.argv.slice(0, 3);

      try {
        await import(claspPath);
      } finally {
        process.argv = prevArgv;
        fsPromises.access = origAccess;
        fsPromises.stat = origStat;
        fsPromises.readFile = origReadFile;
      }
    }
  }
}
