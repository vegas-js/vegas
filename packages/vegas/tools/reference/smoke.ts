import { acquireReference } from "./core/acquire";
import { createReferenceClient } from "./gas/client";
import { loadOAuthConfig, loadReferenceConfig } from "./gas/config";
import { createAccessTokenProvider } from "./gas/oauth";

const config = loadReferenceConfig();
const oauthConfig = loadOAuthConfig();
const accessTokenProvider = createAccessTokenProvider(oauthConfig);
const client = createReferenceClient(config, accessTokenProvider);

const result = await acquireReference(client, "captureReferenceSmoke");

console.log(JSON.stringify(result, null, 2));
