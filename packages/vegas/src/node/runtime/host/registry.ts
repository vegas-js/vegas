import type { RuntimeServiceRegistry } from "../protocol";
import {
  CacheHandler,
  HtmlHandler,
  PropertiesHandler,
  RangeHandler,
  SessionHandler,
  SheetHandler,
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
import { SpreadsheetAppHandler } from "./services/spreadsheetApp";

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
    SpreadsheetApp: new SpreadsheetAppHandler(dependencies.spreadsheetStore),
    Sheet: new SheetHandler(dependencies.spreadsheetStore),
    Range: new RangeHandler(dependencies.spreadsheetStore),
    UrlFetch: new UrlFetchHandler(dependencies.fetcher),
    Html: new HtmlHandler(dependencies.htmlResourceResolver),
    Session: new SessionHandler(dependencies.sessionEnvironment),
    Cache: new CacheHandler(dependencies.cacheStore, dependencies.clock),
    Properties: new PropertiesHandler(dependencies.propertiesStore),
  };
}
