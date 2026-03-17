import { Scope } from "../../../worker";
import { ServeContext } from "../context";

export class CacheHandler {
  #getScopedCache(scope: Scope, ctx: ServeContext) {
    switch (scope) {
      case "document": {
        return ctx.store.cache.document;
      }
      case "script": {
        return ctx.store.cache.script;
      }
      case "user": {
        return ctx.store.cache.user;
      }
      default: {
        return null;
      }
    }
  }

  #deleteExpiredCache(
    cache: Record<
      string,
      {
        value: string;
        expired: number;
      }
    >,
  ) {
    const now = Date.now();
    Object.entries(cache).forEach(([key, data]) => {
      if (data.expired <= now) {
        delete cache[key];
      }
    });
  }

  #deleteOverflowCache(
    cache: Record<
      string,
      {
        value: string;
        expired: number;
      }
    >,
  ) {
    const cachedLength = Object.keys(cache).length;
    if (cachedLength > 1000) {
      const objArray: { expired: number; key: string }[] = [];
      Object.entries(cache).forEach(([key, data]) => {
        objArray.push({ expired: data.expired, key });
      });
      // asc sort
      objArray.sort((a, b) => a.expired - b.expired);
      // remove cached value ( result 900 cache values )
      for (let i = 0; i < 100 + cachedLength - 1000; i++) {
        delete cache[objArray[i].key];
      }
    }
  }
  get(ctx: ServeContext, payload: any) {
    const cache = this.#getScopedCache(payload.scope, ctx);

    if (cache) {
      this.#deleteExpiredCache(cache);
    }
    return cache ? cache[payload.key]?.value : null;
  }
  getAll(ctx: ServeContext, payload: any) {
    const cache = this.#getScopedCache(payload.scope, ctx);

    const obj: Record<string, string> = {};
    if (cache) {
      this.#deleteExpiredCache(cache);
      Object.entries(cache).forEach(([key, value]) => {
        if ((payload.keys as string[]).includes(key)) {
          obj[key] = value.value;
        }
      });
    }
    return obj;
  }
  put(ctx: ServeContext, payload: any) {
    const cache = this.#getScopedCache(payload.scope, ctx);

    if (cache) {
      const record = payload.record;
      cache[record.key] = { value: record.value, expired: record.expired };

      this.#deleteOverflowCache(cache);
    }
  }
  putAll(ctx: ServeContext, payload: any) {
    const cache = this.#getScopedCache(payload.scope, ctx);

    if (cache) {
      const expired = payload.record.expired;
      Object.entries(payload.record.values as Record<string, string>).forEach(([key, value]) => {
        cache[key] = { value, expired };
      });

      this.#deleteOverflowCache(cache);
    }
  }
  remove(ctx: ServeContext, payload: any) {
    const cache = this.#getScopedCache(payload.scope, ctx);

    if (cache) {
      delete cache[payload.key];
    }
  }
  removeAll(ctx: ServeContext, payload: any) {
    const cache = this.#getScopedCache(payload.scope, ctx);

    if (cache) {
      (payload.keys as string[]).forEach((key) => {
        delete cache[key];
      });
    }
  }
}
