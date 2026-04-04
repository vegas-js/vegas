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

      const originalPromiseAccess = fsPromises.access;
      fsPromises.access = async (target, mode) => {
        if (typeof target === "string" && mvfs) {
          const normalizedPath = path.normalize(path.resolve(target));
          if (mvfs.shouldHandle(normalizedPath)) {
            return await mvfs.promises.access(claspConfigPath, mode);
          }
        }
        return originalPromiseAccess.call(fsPromises, target, mode);
      };

      const mergedConfig: Record<string, string> = {};
      mergedConfig.parentId = process.env.VEGAS_PARENT_ID ?? claspConfig.parentId;
      mergedConfig.scriptId = process.env.VEGAS_SCRIPT_ID ?? claspConfig.scriptId;
      mergedConfig.rootDir = "dist";

      const prevArgv = process.argv;
      process.argv = process.argv.slice(0, 3);

      try {
        mvfs.writeFileSync(claspConfigPath, JSON.stringify(mergedConfig), "utf8");
        await import(claspPath);
      } finally {
        process.argv = prevArgv;
        fsPromises.access = originalPromiseAccess;
      }
    }
  }
}
