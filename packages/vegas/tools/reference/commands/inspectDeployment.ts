import { loadOAuthConfig, loadReferenceConfig } from "../gas/config";
import { getReferenceDeploymentSummary } from "../gas/deployment";
import { createAccessTokenProvider } from "../gas/oauth";

async function main(): Promise<void> {
  const config = loadReferenceConfig();
  const oauthConfig = loadOAuthConfig();
  const accessTokenProvider = createAccessTokenProvider(oauthConfig);

  const deployment = await getReferenceDeploymentSummary(config, accessTokenProvider);

  console.log(JSON.stringify(deployment, null, 2));
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));

  process.exitCode = 1;
}
