import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const CREATE_VEGAS_ROOT = fileURLToPath(new URL("../packages/create-vegas/", import.meta.url));

/** All templates shipped by create-vegas must depend on the same Vegas release. */
export function resolveTemplateVegasRequirement(templateNames, readTemplateManifest) {
  if (templateNames.length === 0) {
    throw new Error("create-vegas must publish at least one template.");
  }

  let requirement;
  for (const name of templateNames) {
    const manifest = readTemplateManifest(name);
    const candidate =
      manifest.devDependencies?.["@vegasjs/vegas"] ?? manifest.dependencies?.["@vegasjs/vegas"];
    if (typeof candidate !== "string" || candidate.trim() === "") {
      throw new Error(`Template ${name} must declare an @vegasjs/vegas dependency.`);
    }

    if (requirement !== undefined && requirement !== candidate) {
      throw new Error(`Template ${name} requires ${candidate}, expected ${requirement}.`);
    }
    requirement = candidate;
  }

  return requirement;
}

function verifyPublishedVegasDependency() {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(CREATE_VEGAS_ROOT, "package.json"), "utf8"),
  );
  const templateNames = packageJson.files.filter((name) => name.startsWith("template-"));
  const requirement = resolveTemplateVegasRequirement(templateNames, (name) =>
    JSON.parse(fs.readFileSync(path.join(CREATE_VEGAS_ROOT, name, "package.json"), "utf8")),
  );

  // A successful npm view proves that an installable version satisfying this
  // requirement is already published, not merely present in the monorepo.
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(npm, ["view", `@vegasjs/vegas@${requirement}`, "version"], {
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.error || result.status !== 0 || !result.stdout.trim()) {
    throw new Error(
      `create-vegas requires published @vegasjs/vegas@${requirement}. ` +
        "Publish the compatible Vegas version to npm before releasing create-vegas.",
      { cause: result.error },
    );
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  verifyPublishedVegasDependency();
}
