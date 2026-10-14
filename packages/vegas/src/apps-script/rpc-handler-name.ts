/** Names reserved by JavaScript object/proxy behavior or the GAS RPC boundary. */
export type ReservedRpcHandlerName = "then" | "constructor" | "prototype" | "__proto__";

/** Keep handler registration and dispatch aligned with the client proxy. */
export function isPublicRpcHandlerName(name: unknown): name is string {
  return (
    typeof name === "string" &&
    !name.endsWith("_") &&
    name !== "then" &&
    name !== "constructor" &&
    name !== "prototype" &&
    name !== "__proto__"
  );
}
