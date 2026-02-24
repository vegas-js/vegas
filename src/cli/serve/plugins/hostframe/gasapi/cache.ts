// https://developers.google.com/apps-script/reference/cache/cache
export class GASCache implements GoogleAppsScript.Cache.Cache {
  readonly #cache: Record<string, { value: string; expired: Date }>;

  constructor() {
    this.#cache = {};
  }

  #removeExpired() {
    const now = new Date();
    Object.entries(this.#cache).forEach(([key, data]) => {
      if (data.expired <= now) {
        delete this.#cache[key];
      }
    });
  }

  get = (key: string) => {
    this.#removeExpired();
    return this.#cache[key].value ?? null;
  };
  getAll = (keys: string[]) => {
    this.#removeExpired();
    const obj: Record<string, string> = {};
    Object.entries(this.#cache).forEach(([key, data]) => {
      if (keys.includes(key)) {
        obj[key] = data.value;
      }
    });
    return obj;
  };
  put = (key: string, value: string, expirationInSeconds?: GoogleAppsScript.Integer) => {
    let durationSec = 600;
    if (expirationInSeconds) {
      durationSec = expirationInSeconds;
    }
    this.#cache[key] = {
      value,
      expired: new Date(),
    };
    this.#cache[key].expired.setSeconds(this.#cache[key].expired.getSeconds() + durationSec);
    const cachedLength = Object.keys(this.#cache).length;
    if (cachedLength > 1000) {
      const objArray: { expired: Date; key: string }[] = [];
      Object.entries(this.#cache).forEach(([key, data]) => {
        objArray.push({ expired: data.expired, key });
      });
      // desc sort
      objArray.sort((a, b) => b.expired.valueOf() - a.expired.valueOf());
      // remove cached value ( result 900 cache values )
      for (let i = 0; i < 100 + cachedLength - 1000; i++) {
        delete this.#cache[objArray[i].key];
      }
    }
  };
  putAll = (values: object, expirationInSeconds?: GoogleAppsScript.Integer) => {
    Object.entries(values).forEach(([key, value]) => {
      this.put(key, value, expirationInSeconds);
    });
  };
  remove = (key: string) => {
    delete this.#cache[key];
  };
  removeAll = (keys: string[]) => {
    keys.forEach((key) => {
      delete this.#cache[key];
    });
  };
}
