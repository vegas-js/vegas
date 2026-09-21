import type * as z from "zod";

import type { UserConfig } from "../../shared/config";
import { userConfigSchema } from "./config-schema";

export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(`Invalid Vegas config: ${message}`);
    this.name = "ConfigValidationError";
  }
}

function formatPath(path: PropertyKey[]): string {
  let formatted = "";

  for (const segment of path) {
    if (typeof segment === "number") {
      formatted += `[${segment}]`;
    } else {
      formatted += formatted.length === 0 ? String(segment) : `.${String(segment)}`;
    }
  }

  return formatted;
}

function formatExpectedType(expected: string): string {
  switch (expected) {
    case "array":
      return "an array";
    case "object":
      return "an object";
    default:
      return `a ${expected}`;
  }
}

function formatIssue(issue: z.core.$ZodIssue): string {
  if (issue.code === "unrecognized_keys") {
    const path = formatPath(issue.path);
    const key = issue.keys[0];
    const option = path.length === 0 ? String(key) : `${path}.${String(key)}`;

    return `unknown option "${option}".`;
  }

  const path = formatPath(issue.path) || "config";

  if (issue.code === "invalid_type") {
    return `"${path}" must be ${formatExpectedType(issue.expected)}.`;
  }

  if (issue.code === "invalid_value") {
    return `"${path}" must be one of ${issue.values
      .map((value) => JSON.stringify(value))
      .join(", ")}.`;
  }

  if (issue.code === "custom") {
    return `"${path}" ${issue.message}`;
  }

  return issue.message;
}

export function validateUserConfig(value: unknown): UserConfig {
  const result = userConfigSchema.safeParse(value);

  if (!result.success) {
    throw new ConfigValidationError(formatIssue(result.error.issues[0]));
  }

  return value as UserConfig;
}
