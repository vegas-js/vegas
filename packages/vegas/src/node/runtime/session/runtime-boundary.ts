// Runtime feature modules cannot import parent directories directly. This boundary is the single
// declared dependency edge from the Session feature to shared Runtime core infrastructure.
export type { InvocationEnvironment } from "../invocation";
