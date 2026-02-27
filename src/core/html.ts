import { defaultTreeAdapter, DefaultTreeAdapterTypes, html, serialize, Token } from "parse5";

export class HTML {
  readonly #document: DefaultTreeAdapterTypes.Document;
  readonly #head: DefaultTreeAdapterTypes.Element;
  readonly #body: DefaultTreeAdapterTypes.Element;

  constructor() {
    this.#document = defaultTreeAdapter.createDocument();
    defaultTreeAdapter.setDocumentType(this.#document, "html", "", "");

    const documentRoot = defaultTreeAdapter.createElement("html", html.NS.HTML, []);
    defaultTreeAdapter.appendChild(this.#document, documentRoot);

    this.#head = defaultTreeAdapter.createElement("head", html.NS.HTML, []);
    this.#body = defaultTreeAdapter.createElement("body", html.NS.HTML, []);
    defaultTreeAdapter.appendChild(documentRoot, this.#head);
    defaultTreeAdapter.appendChild(documentRoot, this.#body);
  }

  #append(
    target: DefaultTreeAdapterTypes.Element,
    tagName: string,
    attrsOrContent?: Token.Attribute[] | string,
    attrs?: Token.Attribute[],
  ): void {
    const elementAttrs = attrs ?? (Array.isArray(attrsOrContent) ? attrsOrContent : []);
    const element = defaultTreeAdapter.createElement(tagName, html.NS.HTML, elementAttrs);

    if (typeof attrsOrContent === "string") {
      defaultTreeAdapter.insertText(element, attrsOrContent);
    }
    defaultTreeAdapter.appendChild(target, element);
  }

  appendToHead(tagName: string, attrs?: Token.Attribute[]): void;
  appendToHead(tagName: string, content?: string, attrs?: Token.Attribute[]): void;
  appendToHead(
    tagName: string,
    attrsOrContent?: Token.Attribute[] | string,
    attrs?: Token.Attribute[],
  ): void {
    this.#append(this.#head, tagName, attrsOrContent, attrs);
  }

  appendToBody(tagName: string, attrs?: Token.Attribute[]): void;
  appendToBody(tagName: string, content?: string, attrs?: Token.Attribute[]): void;
  appendToBody(
    tagName: string,
    attrsOrContent?: Token.Attribute[] | string,
    attrs?: Token.Attribute[],
  ): void {
    this.#append(this.#body, tagName, attrsOrContent, attrs);
  }

  toString(): string {
    return serialize(this.#document);
  }
}
