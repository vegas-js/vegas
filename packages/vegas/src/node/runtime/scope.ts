export const RuntimeScope = {
  DOCUMENT: "document",
  SCRIPT: "script",
  USER: "user",
} as const;

export type RuntimeScope = (typeof RuntimeScope)[keyof typeof RuntimeScope];
