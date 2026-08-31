import type { RuntimeServiceRegistry } from "../protocol";
import {
  CacheHandler,
  HtmlHandler,
  PropertiesHandler,
  RangeHandler,
  SessionHandler,
  UrlFetchHandler,
} from "./services";
import type {
  CacheStore,
  Clock,
  Fetcher,
  HtmlResourceResolver,
  PropertiesStore,
  SessionEnvironment,
  SpreadsheetStore,
} from "./services";

export type RuntimeHostDependencies = {
  spreadsheetStore: SpreadsheetStore;
  fetcher: Fetcher;
  htmlResourceResolver: HtmlResourceResolver;
  cacheStore: CacheStore;
  propertiesStore: PropertiesStore;
  sessionEnvironment: SessionEnvironment;
  clock: Clock;
};

export function createRuntimeServiceRegistry(
  dependencies: RuntimeHostDependencies,
): RuntimeServiceRegistry {
  return {
    Range: new RangeHandler(dependencies.spreadsheetStore),
    UrlFetch: new UrlFetchHandler(dependencies.fetcher),
    Html: new HtmlHandler(dependencies.htmlResourceResolver),
    Session: new SessionHandler(dependencies.sessionEnvironment),
    Cache: new CacheHandler(dependencies.cacheStore, dependencies.clock),
    Properties: new PropertiesHandler(dependencies.propertiesStore),
  };
}
