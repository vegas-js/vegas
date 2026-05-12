export class GASAPI {
  toString() {
    const props: Set<string> = new Set();
    const proto = Object.getPrototypeOf(this);
    const base = Object.getPrototypeOf(proto);
    Object.entries(Object.getOwnPropertyDescriptors(base)).forEach(([key]) => {
      if (key !== "constructor") {
        props.add(`${key}: [Function]`);
      }
    });
    Object.entries(Object.getOwnPropertyDescriptors(proto)).forEach(([key]) => {
      if (key !== "constructor") {
        props.add(`  ${key}: [Function]`);
      }
    });
    Object.entries(Object.getOwnPropertyDescriptors(this)).forEach(([key]) => {
      if (key !== "constructor") {
        const type =
          typeof (this as any)[key] === "function"
            ? "[Function]"
            : `{\n  ${Object.entries((this as any)[key])
                .map(([k, v]) => `  ${k}: ${String(v)}`)
                .join(",\n  ")} }`;
        props.add(`  ${key}: ${type}`);
      }
    });
    const obj = Array.from(props)
      .join(",\n")
      .replace(/^\{[^\w]*/, "{ ")
      .replace(/\n\}$/, " }");
    return `{ ${obj} }`;
  }
}
