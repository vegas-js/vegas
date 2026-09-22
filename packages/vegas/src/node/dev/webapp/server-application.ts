import type { RuntimeBackend, SpreadsheetStore } from "../../runtime";
import { BuildCoordinator } from "../build-coordinator";
import { createHostHttpHandler } from "./host-http-handler";
import { registerHostWebSocketHandlers } from "./host-websocket";
import { createLocalSpreadsheetHttpHandler } from "./local-spreadsheet-http-handler";
import type { LocalSpreadsheetUrlConfiguration } from "./local-spreadsheet-url";
import { startEphemeralWebAppServerPair, type WebAppServerPair } from "./server-pair";
import { WebAppSessionRegistry } from "./session-registry";
import { createUserContentHttpHandler } from "./user-content-http-handler";

interface EphemeralWebAppApplicationOptions {
  readonly root: string;
  readonly configFile: string | null;
  readonly runtime: RuntimeBackend;
  readonly getLocalSpreadsheetStore?: () => SpreadsheetStore;
  readonly localSpreadsheetUrls?: LocalSpreadsheetUrlConfiguration;
  readonly bridgeFilePath?: string;
}

interface EphemeralWebAppApplicationDependencies {
  readonly startServerPair?: typeof startEphemeralWebAppServerPair;
}

export async function startEphemeralWebAppApplication(
  options: EphemeralWebAppApplicationOptions,
  dependencies: EphemeralWebAppApplicationDependencies = {},
): Promise<WebAppServerPair> {
  const startServerPair = dependencies.startServerPair ?? startEphemeralWebAppServerPair;
  const pair = await startServerPair({
    root: options.root,
    configFile: options.configFile,
    mode: "development",
    bridgeFilePath: options.bridgeFilePath,
  });
  const builds = new BuildCoordinator();
  const sessions = new WebAppSessionRegistry();

  try {
    options.localSpreadsheetUrls?.setOrigin(pair.host.origin);

    registerHostWebSocketHandlers({
      server: pair.host.server,
      builds,
      sessions,
      runtime: options.runtime,
    });

    const userContentHandler = createUserContentHttpHandler({
      server: pair.userContent.server,
      builds,
      sessions,
      hostPort: pair.host.port,
    });
    pair.userContent.server.middlewares.stack.unshift({
      route: "",
      handle: userContentHandler,
    });

    const hostHandler = createHostHttpHandler({
      server: pair.host.server,
      builds,
      sessions,
      runtime: options.runtime,
      userContentPort: pair.userContent.port,
    });
    pair.host.server.middlewares.stack.unshift({
      route: "",
      handle: hostHandler,
    });

    if (options.getLocalSpreadsheetStore !== undefined) {
      const localSpreadsheetHandler = createLocalSpreadsheetHttpHandler({
        getSpreadsheetStore: options.getLocalSpreadsheetStore,
      });
      pair.host.server.middlewares.stack.unshift({
        route: "",
        handle: localSpreadsheetHandler,
      });
    }

    return pair;
  } catch (error) {
    try {
      await pair.dispose();
    } catch {
      // Preserve the wiring error that triggered cleanup.
    }

    throw error;
  }
}
