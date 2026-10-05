// Runtime feature modules cannot import parent directories directly. This boundary is the single
// declared dependency edge from the Content feature to shared Runtime core infrastructure.
export { createRuntimeEnum } from "../runtime-enum";
