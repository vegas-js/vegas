import fs from "node:fs";
import { pathToFileURL } from "node:url";

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractReleaseNotes(changelog, version) {
  if (!version) {
    throw new Error("Release version is required.");
  }

  const lines = changelog.split(/\r?\n/);
  const versionPattern = new RegExp(`^## ${escapeRegExp(version)} - \\d{4}-\\d{2}-\\d{2}$`);
  const releaseHeadings = lines
    .map((line, index) => (versionPattern.test(line) ? index : -1))
    .filter((index) => index !== -1);

  if (releaseHeadings.length === 0) {
    throw new Error(`Missing release section for version ${version}.`);
  }

  if (releaseHeadings.length > 1) {
    throw new Error(`Duplicate release sections for version ${version}.`);
  }

  const start = releaseHeadings[0];
  const nextHeading = lines.findIndex((line, index) => index > start && line.startsWith("## "));
  const end = nextHeading === -1 ? lines.length : nextHeading;
  const notes = lines
    .slice(start + 1, end)
    .join("\n")
    .trim();

  if (!notes) {
    throw new Error(`Empty release section for version ${version}.`);
  }

  return notes;
}

export function readReleaseNotes(path, version) {
  return extractReleaseNotes(fs.readFileSync(path, "utf8"), version);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [path, version] = process.argv.slice(2);

  if (!path || !version) {
    throw new Error("Usage: node scripts/release-notes.js <changelog> <version>");
  }

  process.stdout.write(`${readReleaseNotes(path, version)}\n`);
}
