import { runBuildApplication } from "../build";
import { printBanner } from "./presentation/banner";
import { printReport } from "./presentation/print-report";

export async function runBuild(root?: string) {
  printBanner();

  const { project, artifacts, durationMs } = await runBuildApplication(root);

  printReport(project, artifacts, durationMs);
}
