import http from "node:http";
import type { AddressInfo } from "node:net";

export interface GoogleOAuthLoopbackCallback {
  readonly code: string;
}

export interface GoogleOAuthLoopbackListener {
  readonly redirectUri: string;
  waitForCallback(): Promise<GoogleOAuthLoopbackCallback>;
  close(): Promise<void>;
}

function respond(response: http.ServerResponse, statusCode: number, message: string): void {
  response.writeHead(statusCode, {
    "Content-Type": "text/html; charset=utf-8",
  });

  response.end(`<!doctype html><html><body><p>${message}</p></body></html>`);
}

function closeServer(server: http.Server): Promise<void> {
  if (!server.listening) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

export async function startGoogleOAuthLoopbackListener(
  state: string,
): Promise<GoogleOAuthLoopbackListener> {
  if (state.trim().length === 0) {
    throw new Error("Google OAuth state is required.");
  }

  let settled = false;

  let resolveCallback: ((callback: GoogleOAuthLoopbackCallback) => void) | undefined;
  let rejectCallback: ((error: Error) => void) | undefined;

  const callback = new Promise<GoogleOAuthLoopbackCallback>((resolve, reject) => {
    resolveCallback = resolve;
    rejectCallback = reject;
  });

  // The OAuth redirect can arrive before the caller starts awaiting
  // waitForCallback(). Keep the promise rejection handled while
  // preserving the original promise result for the caller.
  void callback.catch(() => {});

  const server = http.createServer((request, response) => {
    if (request.method !== "GET" || request.url === undefined) {
      response.writeHead(404);
      response.end();
      return;
    }

    const url = new URL(request.url, "http://127.0.0.1");

    const isOAuthCallback =
      url.searchParams.has("code") ||
      url.searchParams.has("error") ||
      url.searchParams.has("state");

    if (!isOAuthCallback || settled) {
      response.writeHead(404);
      response.end();
      return;
    }

    const callbackState = url.searchParams.get("state");

    if (callbackState !== state) {
      settled = true;

      respond(response, 400, "Authorization could not be completed. Return to the terminal.");
      rejectCallback?.(new Error("Google OAuth state mismatch."));

      return;
    }

    const error = url.searchParams.get("error");

    if (error !== null) {
      settled = true;

      respond(response, 200, "Authorization was not completed. Return to the terminal.");
      rejectCallback?.(new Error(`Google OAuth authorization failed: ${error}`));

      return;
    }

    const code = url.searchParams.get("code");

    if (code === null || code.trim().length === 0) {
      settled = true;

      respond(response, 400, "Authorization could not be completed. Return to the terminal.");
      rejectCallback?.(new Error("Invalid Google OAuth callback."));

      return;
    }

    settled = true;

    respond(
      response,
      200,
      "Authorization complete. You can close this window and return to the terminal.",
    );

    resolveCallback?.({ code });
  });

  await new Promise<void>((resolve, reject) => {
    const handleError = (error: Error) => {
      reject(error);
    };

    server.once("error", handleError);

    server.listen(0, "127.0.0.1", () => {
      server.off("error", handleError);
      resolve();
    });
  });

  const address = server.address();
  if (address === null || typeof address === "string") {
    await closeServer(server);

    throw new Error("Failed to start Google OAuth loopback listener.");
  }

  const port = (address as AddressInfo).port;

  return {
    redirectUri: `http://127.0.0.1:${port}`,

    waitForCallback(): Promise<GoogleOAuthLoopbackCallback> {
      return callback;
    },

    close(): Promise<void> {
      return closeServer(server);
    },
  };
}
