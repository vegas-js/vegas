export interface TemplateDefinition {
  readonly id: string;
  readonly label: string;
  readonly color: "blue" | "cyan" | "green" | "magenta" | "red" | "yellow";
  readonly directory: string;
}

export const templates = [
  {
    id: "vanilla",
    label: "Vanilla",
    color: "yellow",
    directory: "template-vanilla",
  },
  {
    id: "vue",
    label: "Vue",
    color: "green",
    directory: "template-vue",
  },
  {
    id: "react",
    label: "React",
    color: "cyan",
    directory: "template-react",
  },
  {
    id: "preact",
    label: "Preact",
    color: "magenta",
    directory: "template-preact",
  },
  {
    id: "svelte",
    label: "Svelte",
    color: "red",
    directory: "template-svelte",
  },
  {
    id: "solid",
    label: "Solid",
    color: "blue",
    directory: "template-solid",
  },
] as const satisfies readonly TemplateDefinition[];

export function resolveTemplate(id: string): TemplateDefinition {
  const template = templates.find((template) => template.id === id);

  if (template === undefined) {
    throw new Error(`Unknown create-vegas template "${id}".`);
  }

  return template;
}
