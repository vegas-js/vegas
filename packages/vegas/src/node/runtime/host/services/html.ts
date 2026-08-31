import type { RuntimeServiceImplementation } from "../../protocol";

export interface HtmlResourceResolver {
  resolve(filename: string): string;
}

export class HtmlHandler implements RuntimeServiceImplementation<"Html"> {
  readonly #resolver: HtmlResourceResolver;

  constructor(resolver: HtmlResourceResolver) {
    this.#resolver = resolver;
  }

  getFileContent(filename: string) {
    return this.#resolver.resolve(filename);
  }
}
