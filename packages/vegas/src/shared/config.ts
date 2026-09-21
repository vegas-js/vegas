import type { PluginOption } from "vite";

export type BaseConfig = {
  /**
   * Project root directory. Can be an absolute path, or a path relative to the current working directory.
   * @default process.cwd()
   */
  root?: string;
  /**
   * Frontend source directory. Both absolute and relative paths are resolved starting from the project root directory.
   * @default 'src/client'
   */
  clientDir?: string;
  /**
   * GAS source directory. Both absolute and relative paths are resolved starting from the project root directory.
   * @default 'src/server' for SPA projects, 'src' for script projects
   */
  serverDir?: string;
  /**
   * Local runtime data source directory. Both absolute and relative paths are resolved starting from the project root directory.
   * @default 'runtime'
   */
  runtimeDataDir?: string;
  /**
   * Array of vite plugins to use. (passthrough)
   */
  plugins?: PluginOption[];
  /**
   * Whether your application is a Single Page Application (SPA), or Plain script.
   * @default 'spa'
   */
  appType?: "spa" | "script";
};

export type DevServerConfig = {
  /**
   * Host name or IP address used by the local development and preview servers.
   * Set to true to listen on all addresses.
   * @default 'localhost'
   */
  host?: string | boolean;
  /**
   * Preferred local server port. If the port is already in use, Vegas may use the next available port.
   * @default 5173
   */
  port?: number;
  /**
   * Open the local web app in the browser when the server starts.
   * @default false
   */
  open?: boolean;
};

export type OutputConfig = {
  /**
   * Production build output directory.
   * @default 'dist'
   */
  dir?: string;

  /**
   * Allow the production output directory to be outside the project root.
   * The project root itself and its ancestors are never allowed.
   * @default false
   */
  allowOutsideRoot?: boolean;
};

export type AppsScriptConfig = {
  /**
   * Apps Script project ID used as the push target.
   */
  scriptId?: string;

  /**
   * Apps Script manifest configuration written to appsscript.json.
   */
  manifest?: AppsScriptManifest;
};

type AppsScriptEnabledAdvancedService = {
  serviceId?: string;
  userSymbol?: string;
  version?: string;
};

type AppsScriptLibrary = {
  developmentMode?: boolean;
  libraryId?: string;
  userSymbol?: string;
  version?: string;
};

type AppsScriptDependencies = {
  enabledAdvancedServices?: AppsScriptEnabledAdvancedService[];
  libraries?: AppsScriptLibrary[];
};

type AppsScriptWebApp = {
  access?: "MYSELF" | "DOMAIN" | "ANYONE" | "ANYONE_ANONYMOUS";
  executeAs?: "USER_ACCESSING" | "USER_DEPLOYING";
};

export type AppsScriptManifest = {
  dependencies?: AppsScriptDependencies;
  exceptionLogging?: "NONE" | "STACKDRIVER";
  oauthScopes?: string[];
  runtimeVersion?: "STABLE" | "V8" | "DEPRECATED_ES5";
  timeZone?: string;
  webapp?: AppsScriptWebApp;
};

export type UserConfig = BaseConfig & {
  /**
   * Local server configuration used by `serve` and `preview`.
   */
  devServer?: DevServerConfig;

  output?: OutputConfig;

  /**
   * Apps Script project and manifest configuration.
   */
  appsScript?: AppsScriptConfig;
};
