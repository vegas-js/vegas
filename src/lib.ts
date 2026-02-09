import { PluginOption } from "vite";

type BaseConfig = {
  root?: string;
  webDir?: string;
  serverDir?: string;
  // gasMockDir?: string;
  plugins?: PluginOption[];
};
type OutputConfig = {
  dir?: string;
};

type GASEnabledAdvancedService = {
  serviceId?: string;
  userSymbol?: string;
  version?: string;
};

type GASLibrary = {
  developmentMode?: boolean;
  libraryId?: string;
  userSymbol?: string;
  version?: string;
};

type GASDependencies = {
  enabledAdvancedServices?: GASEnabledAdvancedService[];
  libraries?: GASLibrary[];
};

type GASWebapp = {
  access?: "MYSELF" | "DOMAIN" | "ANYONE" | "ANYONE_ANONYMOUS";
  executeAs?: "USER_ACCESSING" | "USER_DEPLOYING";
};

export type GASManifest = {
  dependencies?: GASDependencies;
  exceptionLogging?: "NONE" | "STACKDRIVER";
  oauthScopes?: string[];
  runtimeVersion?: "STABLE" | "V8" | "DEPRECATED_ES5";
  timeZone?: string;
  webapp?: GASWebapp;
};

export type UserConfig = BaseConfig & { output?: OutputConfig; gas?: GASManifest };

export type ResolvedUserConfig = Required<BaseConfig> & {
  output: Required<OutputConfig>;
  gas: GASManifest;
};

export function defineConfig(config: UserConfig): UserConfig {
  return config;
}
