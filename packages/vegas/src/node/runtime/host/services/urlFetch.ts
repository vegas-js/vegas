import type {
  RuntimeFetchRequest,
  RuntimeFetchResponse,
  RuntimeServiceImplementation,
} from "../../protocol";

export interface Fetcher {
  fetch(request: RuntimeFetchRequest): Promise<RuntimeFetchResponse>;
}

export class UrlFetchHandler implements RuntimeServiceImplementation<"UrlFetch"> {
  readonly #fetcher: Fetcher;

  constructor(fetcher: Fetcher) {
    this.#fetcher = fetcher;
  }

  fetch(request: RuntimeFetchRequest) {
    return this.#fetcher.fetch(request);
  }
  fetchAll(requests: RuntimeFetchRequest[]) {
    return Promise.all(requests.map((request) => this.#fetcher.fetch(request)));
  }
}
