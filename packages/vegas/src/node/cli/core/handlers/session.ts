import type { RuntimeServiceImplementation } from "../../../runtime/protocol";
import type { ServeContext } from "../context";

export class SessionHandler implements RuntimeServiceImplementation<"Session"> {
  readonly #context: ServeContext;

  constructor(context: ServeContext) {
    this.#context = context;
  }

  getActiveUser() {
    const email =
      this.#context.config.gas.webapp!.executeAs === "USER_ACCESSING"
        ? (this.#context.mock["Session"]?.activeUserEmail ?? "active@gmail.com")
        : (this.#context.mock["Session"]?.effectiveUserEmail ?? "effective@gmail.com");
    return email;
  }
  getActiveUserLocale() {
    const userLocale = this.#context.mock["Session"]?.activeUserLocale ?? "en";
    return userLocale;
  }
  getEffectiveUser() {
    const email =
      this.#context.config.gas.webapp!.executeAs === "USER_ACCESSING"
        ? (this.#context.mock["Session"]?.activeUserEmail ?? "active@gmail.com")
        : (this.#context.mock["Session"]?.effectiveUserEmail ?? "effective@gmail.com");
    return email;
  }
  getScriptTimeZone() {
    const timeZone = this.#context.config.gas.timeZone ?? "UTC";
    return timeZone;
  }
  getTemporaryActiveUserKey() {
    const key =
      this.#context.mock["Session"]?.temporaryActiveUserKey ??
      "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
    return key;
  }
}
