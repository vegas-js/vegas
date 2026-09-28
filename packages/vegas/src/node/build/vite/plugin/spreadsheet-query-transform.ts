import { type ESTree, type Plugin, parseSync, Visitor } from "vite";

import { collectStaticSpreadsheetQueryFieldIndexes } from "./spreadsheet-query-static-fields";

const SERVER_MODULE_ID = "@vegasjs/vegas/server";
const QUERY_FACTORY_EXPORT = "createSpreadsheetQuery";
const QUERY_FIELDS_FACTORY_EXPORT = "createSpreadsheetQueryFields";
const COLUMN_FACTORY_EXPORT = "createSpreadsheetColumn";
const SCHEMA_FACTORY_EXPORT = "createSpreadsheetSchema";
const TABLE_FACTORY_EXPORT = "createSpreadsheetTable";

const WHERE_METHOD_KINDS = new Map<string, string>([
  ["eq", "equal"],
  ["ne", "not-equal"],
  ["lt", "less-than"],
  ["lte", "less-than-or-equal"],
  ["gt", "greater-than"],
  ["gte", "greater-than-or-equal"],
]);

interface ImportedBindings {
  readonly queryFactory?: string;
  readonly queryFieldsFactory?: string;
  readonly columnFactory?: string;
  readonly schemaFactory?: string;
  readonly tableFactory?: string;
}

interface ParsedQuery {
  readonly fieldsName: string;
  readonly fieldIndexes?: ReadonlyMap<string, number>;
  readonly where?: string;
  readonly orderBy: readonly string[];
  readonly limit?: string;
  readonly stage: "where" | "order" | "limit";
}

interface Replacement {
  readonly start: number;
  readonly end: number;
  readonly code: string;
}

function getImportedName(specifier: ESTree.ImportSpecifier): string | undefined {
  if (specifier.imported.type === "Identifier") {
    return specifier.imported.name;
  }

  if (specifier.imported.type === "Literal" && typeof specifier.imported.value === "string") {
    return specifier.imported.value;
  }

  return undefined;
}

function collectImportedBindings(program: ESTree.Program): ImportedBindings {
  let queryFactory: string | undefined;
  let queryFieldsFactory: string | undefined;
  let columnFactory: string | undefined;
  let schemaFactory: string | undefined;
  let tableFactory: string | undefined;

  for (const statement of program.body) {
    if (
      statement.type !== "ImportDeclaration" ||
      statement.source.value !== SERVER_MODULE_ID ||
      statement.importKind === "type"
    ) {
      continue;
    }

    for (const specifier of statement.specifiers) {
      if (specifier.type !== "ImportSpecifier" || specifier.importKind === "type") {
        continue;
      }

      const importedName = getImportedName(specifier);

      if (importedName === QUERY_FACTORY_EXPORT) {
        queryFactory = specifier.local.name;
      }

      if (importedName === QUERY_FIELDS_FACTORY_EXPORT) {
        queryFieldsFactory = specifier.local.name;
      }

      if (importedName === COLUMN_FACTORY_EXPORT) {
        columnFactory = specifier.local.name;
      }

      if (importedName === SCHEMA_FACTORY_EXPORT) {
        schemaFactory = specifier.local.name;
      }

      if (importedName === TABLE_FACTORY_EXPORT) {
        tableFactory = specifier.local.name;
      }
    }
  }

  return {
    ...(queryFactory === undefined ? {} : { queryFactory }),
    ...(queryFieldsFactory === undefined ? {} : { queryFieldsFactory }),
    ...(columnFactory === undefined ? {} : { columnFactory }),
    ...(schemaFactory === undefined ? {} : { schemaFactory }),
    ...(tableFactory === undefined ? {} : { tableFactory }),
  };
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

function getStaticMemberName(node: ESTree.MemberExpression): string | undefined {
  if (!node.computed && node.property.type === "Identifier") {
    return node.property.name;
  }

  return undefined;
}

function isImportedFactoryCall(
  node: ESTree.Expression | null,
  localName: string | undefined,
): boolean {
  return (
    localName !== undefined &&
    node?.type === "CallExpression" &&
    node.callee.type === "Identifier" &&
    node.callee.name === localName
  );
}

function collectModuleConstants(program: ESTree.Program): ReadonlySet<string> {
  const constants = new Set<string>();

  for (const statement of program.body) {
    if (statement.type !== "VariableDeclaration" || statement.kind !== "const") {
      continue;
    }

    for (const declaration of statement.declarations) {
      if (declaration.id.type === "Identifier") {
        constants.add(declaration.id.name);
      }
    }
  }

  return constants;
}

function collectModuleTables(
  program: ESTree.Program,
  tableFactory: string | undefined,
): ReadonlySet<string> {
  const tables = new Set<string>();

  if (tableFactory === undefined) {
    return tables;
  }

  for (const statement of program.body) {
    if (statement.type !== "VariableDeclaration" || statement.kind !== "const") {
      continue;
    }

    for (const declaration of statement.declarations) {
      if (
        declaration.id.type === "Identifier" &&
        isImportedFactoryCall(declaration.init, tableFactory)
      ) {
        tables.add(declaration.id.name);
      }
    }
  }

  return tables;
}

function collectBlockBindings(body: readonly ESTree.Statement[]): ReadonlySet<string> {
  const bindings = new Set<string>();

  for (const statement of body) {
    if (statement.type === "VariableDeclaration") {
      for (const declaration of statement.declarations) {
        if (declaration.id.type === "Identifier") {
          bindings.add(declaration.id.name);
        }
      }
      continue;
    }

    if (
      (statement.type === "FunctionDeclaration" || statement.type === "ClassDeclaration") &&
      statement.id
    ) {
      bindings.add(statement.id.name);
    }
  }

  return bindings;
}

function isAstRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

function collectVarBindings(body: unknown): Set<string> {
  const bindings = new Set<string>();

  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item);
      }

      return;
    }

    if (!isAstRecord(value)) {
      return;
    }

    if (
      value.type === "FunctionDeclaration" ||
      value.type === "FunctionExpression" ||
      value.type === "ArrowFunctionExpression"
    ) {
      return;
    }

    if (value.type === "VariableDeclaration" && value.kind === "var") {
      const declarations = value.declarations;

      if (Array.isArray(declarations)) {
        for (const declaration of declarations) {
          if (!isAstRecord(declaration)) {
            continue;
          }

          const id = declaration.id;

          if (isAstRecord(id) && id.type === "Identifier" && typeof id.name === "string") {
            bindings.add(id.name);
          }
        }
      }
    }

    for (const [key, child] of Object.entries(value)) {
      if (key === "loc" || key === "start" || key === "end") {
        continue;
      }

      visit(child);
    }
  };

  visit(body);

  return bindings;
}

function parseWhereSelector(
  code: string,
  node: ESTree.Expression,
  fieldsName: string,
  fieldIndexes: ReadonlyMap<string, number> | undefined,
): string | undefined {
  if (
    node.type !== "ArrowFunctionExpression" ||
    node.async ||
    node.params.length !== 1 ||
    node.params[0]?.type !== "Identifier" ||
    node.body.type === "BlockStatement"
  ) {
    return undefined;
  }

  const parameterName = node.params[0].name;
  const body = node.body;

  if (
    body.type !== "CallExpression" ||
    body.callee.type !== "MemberExpression" ||
    body.callee.object.type !== "MemberExpression" ||
    body.callee.object.object.type !== "Identifier" ||
    body.callee.object.object.name !== parameterName
  ) {
    return undefined;
  }

  const fieldName = getStaticMemberName(body.callee.object);
  const methodName = getStaticMemberName(body.callee);
  const kind = methodName === undefined ? undefined : WHERE_METHOD_KINDS.get(methodName);

  if (fieldName === undefined || kind === undefined || body.arguments.length !== 1) {
    return undefined;
  }

  const value = getCallArgument(body, 0);

  if (value === undefined) {
    return undefined;
  }

  const valueCode = code.slice(value.start, value.end);
  const fieldIndex = fieldIndexes?.get(fieldName);

  if (fieldIndex !== undefined) {
    return `{kind:${JSON.stringify(kind)},column:${fieldIndex},value:(${valueCode})}`;
  }

  return `${fieldsName}.${fieldName}.${methodName}(${valueCode})`;
}

function parseOrderSelector(
  node: ESTree.Expression,
  fieldsName: string,
  fieldIndexes: ReadonlyMap<string, number> | undefined,
): string | undefined {
  if (
    node.type !== "ArrowFunctionExpression" ||
    node.async ||
    node.params.length !== 1 ||
    node.params[0]?.type !== "Identifier" ||
    node.body.type === "BlockStatement"
  ) {
    return undefined;
  }

  const parameterName = node.params[0].name;
  const body = node.body;

  if (
    body.type !== "CallExpression" ||
    body.arguments.length !== 0 ||
    body.callee.type !== "MemberExpression" ||
    body.callee.object.type !== "MemberExpression" ||
    body.callee.object.object.type !== "Identifier" ||
    body.callee.object.object.name !== parameterName
  ) {
    return undefined;
  }

  const fieldName = getStaticMemberName(body.callee.object);
  const methodName = getStaticMemberName(body.callee);

  if (fieldName === undefined || (methodName !== "asc" && methodName !== "desc")) {
    return undefined;
  }

  const fieldIndex = fieldIndexes?.get(fieldName);

  if (fieldIndex !== undefined) {
    return `{column:${fieldIndex},direction:${JSON.stringify(methodName)}}`;
  }

  return `${fieldsName}.${fieldName}.${methodName}()`;
}

function parseQueryChain(
  code: string,
  node: ESTree.Expression,
  queryFactory: string,
  moduleConstants: ReadonlySet<string>,
  staticFieldIndexes: ReadonlyMap<string, ReadonlyMap<string, number>>,
  isShadowed: (name: string) => boolean,
): ParsedQuery | undefined {
  if (
    node.type === "CallExpression" &&
    node.callee.type === "Identifier" &&
    node.callee.name === queryFactory &&
    !isShadowed(queryFactory) &&
    node.arguments.length === 1
  ) {
    const fields = getCallArgument(node, 0);

    if (
      fields?.type !== "Identifier" ||
      !moduleConstants.has(fields.name) ||
      isShadowed(fields.name)
    ) {
      return undefined;
    }

    const fieldIndexes = staticFieldIndexes.get(fields.name);

    return {
      fieldsName: fields.name,
      ...(fieldIndexes === undefined ? {} : { fieldIndexes }),
      orderBy: [],
      stage: "where",
    };
  }

  if (
    node.type !== "CallExpression" ||
    node.callee.type !== "MemberExpression" ||
    node.callee.object.type === "Super"
  ) {
    return undefined;
  }

  const methodName = getStaticMemberName(node.callee);

  if (methodName === undefined) {
    return undefined;
  }

  const base = parseQueryChain(
    code,
    node.callee.object,
    queryFactory,
    moduleConstants,
    staticFieldIndexes,
    isShadowed,
  );

  if (base === undefined) {
    return undefined;
  }

  if (methodName === "where") {
    if (base.stage !== "where" || node.arguments.length !== 1) {
      return undefined;
    }

    const selector = getCallArgument(node, 0);

    if (selector === undefined) {
      return undefined;
    }

    const expression = parseWhereSelector(code, selector, base.fieldsName, base.fieldIndexes);

    if (expression === undefined) {
      return undefined;
    }

    return {
      ...base,
      where:
        base.where === undefined
          ? expression
          : `{kind:"and",expressions:[${base.where},${expression}]}`,
    };
  }

  if (methodName === "orderBy") {
    if (base.stage === "limit" || node.arguments.length !== 1) {
      return undefined;
    }

    const selector = getCallArgument(node, 0);

    if (selector === undefined) {
      return undefined;
    }

    const order = parseOrderSelector(selector, base.fieldsName, base.fieldIndexes);

    if (order === undefined) {
      return undefined;
    }

    return {
      ...base,
      orderBy: [...base.orderBy, order],
      stage: "order",
    };
  }

  if (methodName === "limit") {
    if (base.stage === "limit" || node.arguments.length !== 1) {
      return undefined;
    }

    const limit = getCallArgument(node, 0);

    if (limit === undefined) {
      return undefined;
    }

    return {
      ...base,
      limit: code.slice(limit.start, limit.end),
      stage: "limit",
    };
  }

  return undefined;
}

function createPlanCode(query: ParsedQuery): string {
  const properties: string[] = [];

  if (query.where !== undefined) {
    properties.push(`where:${query.where}`);
  }

  properties.push(`orderBy:[${query.orderBy.join(",")}]`);

  if (query.limit !== undefined) {
    properties.push(`limit:(${query.limit})`);
  }

  return `{${properties.join(",")}}`;
}

function applyReplacements(code: string, replacements: readonly Replacement[]): string {
  const ordered = [...replacements].sort((left, right) => left.start - right.start);
  const nonOverlapping: Replacement[] = [];

  for (const replacement of ordered) {
    const previous = nonOverlapping.at(-1);

    if (previous && replacement.start < previous.end) {
      continue;
    }

    nonOverlapping.push(replacement);
  }

  let transformed = code;

  for (const replacement of nonOverlapping.toReversed()) {
    transformed =
      transformed.slice(0, replacement.start) +
      replacement.code +
      transformed.slice(replacement.end);
  }

  return transformed;
}

export function transformSpreadsheetQueryPlans(code: string, id: string): string | null {
  if (!code.includes(SERVER_MODULE_ID) || !code.includes(QUERY_FACTORY_EXPORT)) {
    return null;
  }

  const filename = id.replace(/[?#].*$/, "");
  const { program } = parseSync(filename, code);
  const imports = collectImportedBindings(program);
  const queryFactory = imports.queryFactory;
  const tableFactory = imports.tableFactory;

  if (queryFactory === undefined || tableFactory === undefined) {
    return null;
  }

  const moduleConstants = collectModuleConstants(program);
  const staticFieldIndexes = collectStaticSpreadsheetQueryFieldIndexes(
    program,
    imports.queryFieldsFactory,
    imports.columnFactory,
    imports.schemaFactory,
  );
  const moduleTables = collectModuleTables(program, tableFactory);

  if (moduleTables.size === 0) {
    return null;
  }

  const replacements: Replacement[] = [];
  const scopeStack: ReadonlySet<string>[] = [];

  const isShadowed = (name: string): boolean => scopeStack.some((bindings) => bindings.has(name));

  const visitor = new Visitor({
    BlockStatement(node) {
      scopeStack.push(collectBlockBindings(node.body));
    },
    "BlockStatement:exit"() {
      scopeStack.pop();
    },
    FunctionDeclaration(node) {
      const bindings = collectVarBindings(node.body);

      for (const param of node.params) {
        if (param.type === "Identifier") {
          bindings.add(param.name);
        }
      }

      scopeStack.push(bindings);
    },
    "FunctionDeclaration:exit"() {
      scopeStack.pop();
    },
    FunctionExpression(node) {
      const bindings = collectVarBindings(node.body);

      for (const param of node.params) {
        if (param.type === "Identifier") {
          bindings.add(param.name);
        }
      }

      scopeStack.push(bindings);
    },
    "FunctionExpression:exit"() {
      scopeStack.pop();
    },
    ArrowFunctionExpression(node) {
      const bindings =
        node.body.type === "BlockStatement" ? collectVarBindings(node.body) : new Set<string>();

      for (const param of node.params) {
        if (param.type === "Identifier") {
          bindings.add(param.name);
        }
      }

      scopeStack.push(bindings);
    },
    "ArrowFunctionExpression:exit"() {
      scopeStack.pop();
    },
    CallExpression(node) {
      if (
        node.callee.type !== "MemberExpression" ||
        getStaticMemberName(node.callee) !== "execute" ||
        node.callee.object.type !== "Identifier" ||
        !moduleTables.has(node.callee.object.name) ||
        isShadowed(node.callee.object.name) ||
        node.arguments.length !== 1
      ) {
        return;
      }

      const queryArgument = getCallArgument(node, 0);

      if (queryArgument === undefined) {
        return;
      }

      const query = parseQueryChain(
        code,
        queryArgument,
        queryFactory,
        moduleConstants,
        staticFieldIndexes,
        isShadowed,
      );

      if (query === undefined) {
        return;
      }

      replacements.push({
        start: queryArgument.start,
        end: queryArgument.end,
        code: createPlanCode(query),
      });
    },
  });

  visitor.visit(program);

  if (replacements.length === 0) {
    return null;
  }

  return applyReplacements(code, replacements);
}

export function spreadsheetQueryTransform(): Plugin {
  return {
    name: "vite-plugin-spreadsheet-query-transform",

    applyToEnvironment(environment) {
      return environment.name === "server";
    },

    transform(code, id) {
      const transformed = transformSpreadsheetQueryPlans(code, id);

      if (transformed === null) {
        return null;
      }

      return {
        code: transformed,
        map: null,
      };
    },
  };
}
