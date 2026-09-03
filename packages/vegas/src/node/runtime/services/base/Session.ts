import type { RuntimeServicePort } from "../../protocol";
import type { CreateUser } from "./User";
import { User } from "./User";

// https://developers.google.com/apps-script/reference/base/session
export class Session implements GoogleAppsScript.Base.Session {
  #service: RuntimeServicePort<"Session">;
  #createUser: CreateUser;

  constructor(
    service: RuntimeServicePort<"Session">,
    createUser: CreateUser = (email) => new User(email),
  ) {
    this.#service = service;
    this.#createUser = createUser;
  }

  getActiveUser = () => {
    const email = this.#service.getActiveUser();
    return this.#createUser(email);
  };
  getActiveUserLocale = () => {
    return this.#service.getActiveUserLocale();
  };
  getEffectiveUser = () => {
    const email = this.#service.getEffectiveUser();
    return this.#createUser(email);
  };
  getScriptTimeZone = () => {
    return this.#service.getScriptTimeZone();
  };
  getTemporaryActiveUserKey = () => {
    return this.#service.getTemporaryActiveUserKey();
  };
  /** @deprecated DO NOT USE */
  getTimeZone = () => {
    return this.getScriptTimeZone();
  };
  /** @deprecated DO NOT USE */
  getUser = () => {
    return this.getActiveUser();
  };
}
