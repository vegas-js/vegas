import { PluginOption } from "vite";

export type BaseConfig = {
  /**
   * Project root directory. Can be an absolute path, or a path relative from the location of the config file itself.
   * @default process.cwd()
   */
  root?: string;
  /**
   * Frontend source directory. Both absolute and relative paths are resolved starting from the project root directory.
   * @default 'src/web'
   */
  webDir?: string;
  /**
   * GAS source directory. Both absolute and relative paths are resolved starting from the project root directory.
   * @default 'src/server'
   */
  serverDir?: string;
  /**
   * GAS API mock source directory. Both absolute and relative paths are resolved starting from the project root directory.
   * @default 'mock'
   */
  // gasMockDir?: string;
  /**
   * Array of vite plugins to use. (passthrough)
   */
  plugins?: PluginOption[];
};

export type OutputConfig = {
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
