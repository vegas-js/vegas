import { ServeContext } from "../context";

export class SessionHandler {
  getActiveUser(ctx: ServeContext) {
    const email =
      ctx.project.gas.webapp!.executeAs === "USER_ACCESSING"
        ? (ctx.mock["Session"]?.activeUserEmail ?? "active@gmail.com")
        : (ctx.mock["Session"]?.effectiveUserEmail ?? "effective@gmail.com");
    return email;
  }
  getActiveUserLocale(ctx: ServeContext) {
    const userLocale = ctx.mock["Session"]?.activeUserLocale ?? "en";
    return userLocale;
  }
  getEffectiveUser(ctx: ServeContext) {
    const email =
      ctx.project.gas.webapp!.executeAs === "USER_ACCESSING"
        ? (ctx.mock["Session"]?.activeUserEmail ?? "active@gmail.com")
        : (ctx.mock["Session"]?.effectiveUserEmail ?? "effective@gmail.com");
    return email;
  }
  getScriptTimeZone(ctx: ServeContext) {
    const timeZone = ctx.project.gas.timeZone ?? "UTC";
    return timeZone;
  }
  getTemporaryActiveUserKey(ctx: ServeContext) {
    const key =
      ctx.mock["Session"]?.temporaryActiveUserKey ??
      "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
    return key;
  }
}
