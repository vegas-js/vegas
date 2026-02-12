/// <reference types="vite/client" />
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

type GASFunction<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? (...args: A) => Promise<Awaited<R>>
    : never;
};
declare global {
  namespace google {
    namespace script {
      const run: any;
    }
  }
}

interface GASHandler<T> {
  withSuccessHandler(callback: (result: T) => void): GASClient<T>;
  withFailureHandler(callback: (error: any) => void): GASClient<T>;
}

type GASClient<T> = GASHandler<T> & GASFunction<T>;

export function createGASClient<T extends object>() {
  const handler: ProxyHandler<object> = {
    get(_, property) {
      return (...args: any[]) =>
        new Promise((resolve, reject) => {
          google.script.run
            .withSuccessHandler(resolve)
            .withFailureHandler(reject)
            [property](...args);
        });
    },
  };
  return new Proxy({}, handler) as GASClient<T>;
}

export type UserConfig = BaseConfig & { output?: OutputConfig; gas?: GASManifest };

export type ResolvedUserConfig = Required<BaseConfig> & {
  output: Required<OutputConfig>;
  gas: GASManifest;
};

export function defineConfig(config: UserConfig): UserConfig {
  return config;
}
