import type { AppsScriptPushRequest } from "./request";

export interface AppsScriptPushTransport {
  push(request: AppsScriptPushRequest): Promise<void>;
}
