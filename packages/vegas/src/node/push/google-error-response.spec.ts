import { describe, expect, test } from "vitest";

import { formatGoogleHttpError } from "./google-error-response";

describe("formatGoogleHttpError", () => {
  test("format OAuth error", () => {
    const response = new Response(null, {
      status: 400,
      statusText: "Bad Request",
    });

    expect(
      formatGoogleHttpError(
        response,
        JSON.stringify({
          error: "invalid_grant",
          error_description: "Token has been revoked.",
          ignored: "do not expose",
        }),
      ),
    ).toBe("400 Bad Request (invalid_grant: Token has been revoked.)");
  });

  test("format Google API error", () => {
    const response = new Response(null, {
      status: 403,
      statusText: "Forbidden",
    });

    expect(
      formatGoogleHttpError(
        response,
        JSON.stringify({
          error: {
            code: 403,
            status: "PERMISSION_DENIED",
            message: "Permission denied",
            details: [
              {
                ignored: "do not expose",
              },
            ],
          },
        }),
      ),
    ).toBe("403 Forbidden (PERMISSION_DENIED: Permission denied)");
  });

  test("fall back to response status for unknown body", () => {
    const response = new Response(null, {
      status: 502,
      statusText: "Bad Gateway",
    });

    expect(formatGoogleHttpError(response, "<html>proxy failure</html>")).toBe("502 Bad Gateway");
  });

  test("format status without status text", () => {
    const response = new Response(null, {
      status: 500,
    });

    expect(formatGoogleHttpError(response, "")).toBe("500");
  });
});
