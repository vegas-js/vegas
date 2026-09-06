export function captureReferenceHtmlTemplateObjectBinding() {
  const globals = globalThis as unknown as Record<string, any>;

  const template = globals.HtmlService.createTemplate("<p><?= referenceValue ?></p>");

  template.referenceValue = "vegas-reference";

  const descriptor = Object.getOwnPropertyDescriptor(template, "referenceValue");

  if (!descriptor) {
    throw new Error("Expected HtmlTemplate binding property");
  }

  return {
    bindingIsOwnProperty: Object.prototype.hasOwnProperty.call(template, "referenceValue"),

    bindingValue: template.referenceValue,

    descriptor: {
      configurable: descriptor.configurable ?? false,
      enumerable: descriptor.enumerable ?? false,
      writable: "writable" in descriptor ? (descriptor.writable ?? false) : null,
      getter: typeof descriptor.get === "function",
      setter: typeof descriptor.set === "function",
    },

    ownPropertyNames: Object.getOwnPropertyNames(template).sort(),
  };
}
