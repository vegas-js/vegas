import type { RuntimeBackend, SpreadsheetStore } from "../../../runtime";
import { createContentResponseHttpHandler } from "../content-response/content-response-http-handler";
import { ContentResponseRegistry } from "../content-response/content-response-registry";
import { createHostHttpHandler } from "../host/host-http-handler";
import { registerHostWebSocketHandlers } from "../host/host-websocket";
import { createLocalSpreadsheetHttpHandler } from "../local-spreadsheet/local-spreadsheet-http-handler";
import type { LocalSpreadsheetUrlConfiguration } from "../local-spreadsheet/local-spreadsheet-url";
import { createIdleWebAppBuildBarrier } from "../shared/build-barrier";
import { WebAppSessionRegistry } from "../shared/session-registry";
import { createUserContentHttpHandler } from "../user-content/user-content-http-handler";
import { startEphemeralWebAppServerPair, type WebAppServerPair } from "./server-pair";

export interface EphemeralWebAppApplicationOptions {
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
  const builds = createIdleWebAppBuildBarrier();
  const sessions = new WebAppSessionRegistry();
  const contentResponses = new ContentResponseRegistry();

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

    const contentResponseHandler = createContentResponseHttpHandler({
      responses: contentResponses,
    });
    pair.userContent.server.middlewares.stack.unshift({
      route: "",
      handle: contentResponseHandler,
    });

    const hostHandler = createHostHttpHandler({
      server: pair.host.server,
      builds,
      contentResponses,
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
