import type { ESTree } from "vite";

function isAstRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

function collectModuleInitializers(program: ESTree.Program): ReadonlyMap<string, unknown> {
  const initializers = new Map<string, unknown>();

  for (const statement of program.body) {
    if (statement.type !== "VariableDeclaration" || statement.kind !== "const") {
      continue;
    }

    for (const declaration of statement.declarations) {
      if (declaration.id.type === "Identifier" && declaration.init !== null) {
        initializers.set(declaration.id.name, declaration.init);
      }
    }
  }

  return initializers;
}

function getStaticColumnIndex(
  node: unknown,
  columnFactory: string | undefined,
): number | undefined {
  if (columnFactory === undefined || !isAstRecord(node) || node.type !== "CallExpression") {
    return undefined;
  }

  const callee = node.callee;
  const arguments_ = node.arguments;

  if (
    !isAstRecord(callee) ||
    callee.type !== "Identifier" ||
    callee.name !== columnFactory ||
    !Array.isArray(arguments_) ||
    arguments_.length !== 3
  ) {
    return undefined;
  }

  const [name, index, getValue] = arguments_;

  if (
    !isAstRecord(name) ||
    name.type !== "Literal" ||
    typeof name.value !== "string" ||
    name.value.length === 0 ||
    !isAstRecord(index) ||
    index.type !== "Literal" ||
    typeof index.value !== "number" ||
    !Number.isInteger(index.value) ||
    index.value < 0 ||
    !isAstRecord(getValue) ||
    (getValue.type !== "ArrowFunctionExpression" && getValue.type !== "FunctionExpression")
  ) {
    return undefined;
  }

  return index.value;
}

function collectStaticColumnIndexes(
  program: ESTree.Program,
  columnFactory: string | undefined,
): ReadonlyMap<string, number> {
  const indexes = new Map<string, number>();

  for (const statement of program.body) {
    if (statement.type !== "VariableDeclaration" || statement.kind !== "const") {
      continue;
    }

    for (const declaration of statement.declarations) {
      if (declaration.id.type !== "Identifier") {
        continue;
      }

      const index = getStaticColumnIndex(declaration.init, columnFactory);

      if (index !== undefined) {
        indexes.set(declaration.id.name, index);
      }
    }
  }

  return indexes;
}

function getStaticPropertyName(property: unknown): string | undefined {
  if (
    !isAstRecord(property) ||
    property.type !== "Property" ||
    property.computed === true ||
    property.method === true ||
    (property.kind !== undefined && property.kind !== "init")
  ) {
    return undefined;
  }

  const key = property.key;

  if (!isAstRecord(key)) {
    return undefined;
  }

  if (key.type === "Identifier" && typeof key.name === "string") {
    return key.name;
  }

  if (key.type === "Literal" && typeof key.value === "string") {
    return key.value;
  }

  return undefined;
}

function getStaticPropertyValueName(property: unknown): string | undefined {
  if (!isAstRecord(property)) {
    return undefined;
  }

  const value = property.value;

  if (isAstRecord(value) && value.type === "Identifier" && typeof value.name === "string") {
    return value.name;
  }

  return undefined;
}

function resolveStaticFieldIndexes(
  node: unknown,
  moduleInitializers: ReadonlyMap<string, unknown>,
  columnIndexes: ReadonlyMap<string, number>,
  resolving: ReadonlySet<string> = new Set(),
): ReadonlyMap<string, number> | undefined {
  if (!isAstRecord(node)) {
    return undefined;
  }

  if (node.type === "Identifier" && typeof node.name === "string") {
    if (resolving.has(node.name)) {
      return undefined;
    }

    const initializer = moduleInitializers.get(node.name);

    if (initializer === undefined) {
      return undefined;
    }

    const nextResolving = new Set(resolving);
    nextResolving.add(node.name);

    return resolveStaticFieldIndexes(initializer, moduleInitializers, columnIndexes, nextResolving);
  }

  if (node.type !== "ObjectExpression" || !Array.isArray(node.properties)) {
    return undefined;
  }

  const fieldIndexes = new Map<string, number>();

  for (const property of node.properties) {
    const fieldName = getStaticPropertyName(property);
    const columnName = getStaticPropertyValueName(property);

    if (fieldName === undefined || columnName === undefined) {
      return undefined;
    }

    const index = columnIndexes.get(columnName);

    if (index === undefined) {
      return undefined;
    }

    fieldIndexes.set(fieldName, index);
  }

  return fieldIndexes;
}

function getCallArgument(
  node: ESTree.CallExpression,
  index: number,
): ESTree.Expression | undefined {
  const argument = node.arguments[index];

  if (argument === undefined || argument.type === "SpreadElement") {
    return undefined;
  }

  return argument;
}

export function collectStaticSpreadsheetQueryFieldIndexes(
  program: ESTree.Program,
  queryFieldsFactory: string | undefined,
  columnFactory: string | undefined,
): ReadonlyMap<string, ReadonlyMap<string, number>> {
  const fields = new Map<string, ReadonlyMap<string, number>>();

  if (queryFieldsFactory === undefined || columnFactory === undefined) {
    return fields;
  }

  const moduleInitializers = collectModuleInitializers(program);
  const columnIndexes = collectStaticColumnIndexes(program, columnFactory);

  for (const statement of program.body) {
    if (statement.type !== "VariableDeclaration" || statement.kind !== "const") {
      continue;
    }

    for (const declaration of statement.declarations) {
      if (
        declaration.id.type !== "Identifier" ||
        declaration.init?.type !== "CallExpression" ||
        declaration.init.callee.type !== "Identifier" ||
        declaration.init.callee.name !== queryFieldsFactory ||
        declaration.init.arguments.length !== 1
      ) {
        continue;
      }

      const columns = getCallArgument(declaration.init, 0);

      if (columns === undefined) {
        continue;
      }

      const indexes = resolveStaticFieldIndexes(columns, moduleInitializers, columnIndexes);

      if (indexes !== undefined) {
        fields.set(declaration.id.name, indexes);
      }
    }
  }

  return fields;
}
