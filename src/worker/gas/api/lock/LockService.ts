import { Lock } from "./Lock";

// https://developers.google.com/apps-script/reference/lock/lock-service
export class LockService implements GoogleAppsScript.Lock.LockService {
  getDocumentLock = () => {
    return new Lock("document");
  };
  getScriptLock = () => {
    return new Lock("script");
  };
  getUserLock = () => {
    return new Lock("user");
  };
}
