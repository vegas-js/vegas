import { createReferenceClient } from "./client";
import { loadOAuthConfig, loadReferenceConfig } from "./config";
import { acquireReference } from "./core/acquire";
import { createAccessTokenProvider } from "./oauth";

const config = loadReferenceConfig();
const oauthConfig = loadOAuthConfig();
const accessTokenProvider = createAccessTokenProvider(oauthConfig);
const client = createReferenceClient(config, accessTokenProvider);

const result = await acquireReference(client, "captureReferenceSmoke");

console.log(JSON.stringify(result, null, 2));
