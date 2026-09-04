import vm from "node:vm";

const PARSE_ARGUMENTS_SCRIPT = new vm.Script(`
((serializedArguments) => JSON.parse(serializedArguments))
`);

type ScriptArgumentParser = (serializedArguments: string) => unknown;

export function projectScriptArguments(context: vm.Context, args: readonly unknown[]): unknown[] {
  const serializedArguments = JSON.stringify(args);

  if (serializedArguments === undefined) {
    throw new TypeError("Script arguments could not be serialized.");
  }

  const parseArguments = PARSE_ARGUMENTS_SCRIPT.runInContext(context) as ScriptArgumentParser;

  const projectedArguments = parseArguments(serializedArguments);

  if (!Array.isArray(projectedArguments)) {
    throw new TypeError("Projected script arguments must be an array.");
  }

  return projectedArguments;
}
