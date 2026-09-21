import path from "node:path";

export type ProjectSourceKind = "client" | "server" | "runtimeData";

const SOURCE_EXTENSIONS: Record<ProjectSourceKind, readonly string[]> = {
  client: [".ts", ".tsx", ".js", ".jsx"],
  server: [".ts"],
  runtimeData: [".ts"],
};

export function createSourceGlobPatterns(directory: string, kind: ProjectSourceKind): string[] {
  return SOURCE_EXTENSIONS[kind].map((extension) => path.join(directory, "**", `*${extension}`));
}

export function isDeclarationSource(fileName: string): boolean {
  return fileName.endsWith(".d.ts");
}
