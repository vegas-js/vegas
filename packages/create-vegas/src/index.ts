#!/usr/bin/env node
import * as prompts from "@clack/prompts";
import { cac } from "cac";

const frameworkOptions: {
  value: string;
  label?: string | undefined;
}[] = [{ label: "React", value: "react" }];

async function run() {
  const group = await prompts.group(
    {
      name: () =>
        prompts.text({
          message: "Project name:",
          placeholder: "vegas-project",
          defaultValue: "vegas-project",
        }),
      framework: () =>
        prompts.select({
          message: "Select a framework:",
          options: frameworkOptions,
        }),
      npmStartUp: () =>
        prompts.confirm({
          message: "Install with npm and start now?",
        }),
    },
    {
      onCancel: () => {
        prompts.cancel("Operation cancelled");
        process.exit(0);
      },
    },
  );

  console.log(group);
}

const cli = cac("create-vegas");

cli.command("[...option] [directory]").action(run);

cli.help((defaultHelpSections: { title?: string; body: string }[]) => {
  return defaultHelpSections
    .concat({
      title: "Available templates (only typescript)",
      body: frameworkOptions
        .map((option) => option.value.padStart(option.value.length + 2))
        .join("\n"),
    })
    .filter((section) => section.title?.match(/^(?!(Commands|For more info))/));
});
cli.parse();
