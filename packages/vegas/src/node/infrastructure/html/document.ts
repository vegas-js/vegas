import {
  defaultTreeAdapter,
  html as parse5Html,
  serialize,
  type DefaultTreeAdapterTypes,
  type Token,
} from "parse5";

export interface HtmlElementOptions {
  readonly text?: string;
  readonly attributes?: Readonly<Record<string, string>>;
}

export class HtmlDocument {
  readonly #document: DefaultTreeAdapterTypes.Document;
  readonly #head: DefaultTreeAdapterTypes.Element;
  readonly #body: DefaultTreeAdapterTypes.Element;

  constructor() {
    this.#document = defaultTreeAdapter.createDocument();
    defaultTreeAdapter.setDocumentType(this.#document, "html", "", "");

    const root = defaultTreeAdapter.createElement("html", parse5Html.NS.HTML, []);
    this.#head = defaultTreeAdapter.createElement("head", parse5Html.NS.HTML, []);
    this.#body = defaultTreeAdapter.createElement("body", parse5Html.NS.HTML, []);

    defaultTreeAdapter.appendChild(this.#document, root);
    defaultTreeAdapter.appendChild(root, this.#head);
    defaultTreeAdapter.appendChild(root, this.#body);
  }

  #append(
    target: DefaultTreeAdapterTypes.Element,
    tagName: string,
    options: HtmlElementOptions = {},
  ): void {
    const attributes: Token.Attribute[] = Object.entries(options.attributes ?? {}).map(
      ([name, value]) => ({
        name,
        value,
      }),
    );

    const element = defaultTreeAdapter.createElement(tagName, parse5Html.NS.HTML, attributes);

    if (options.text !== undefined) {
      defaultTreeAdapter.insertText(element, options.text);
    }

    defaultTreeAdapter.appendChild(target, element);
  }

  appendToHead(tagName: string, options?: HtmlElementOptions): void {
    this.#append(this.#head, tagName, options);
  }

  appendToBody(tagName: string, options?: HtmlElementOptions): void {
    this.#append(this.#body, tagName, options);
  }

  toString(): string {
    return serialize(this.#document);
  }
}
