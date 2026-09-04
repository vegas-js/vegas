const HTTP_ECHO_BASE_URL = "https://httpbingo.org";

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, stableValue(nestedValue)]),
    );
  }

  return value;
}

function describeOwnProperty(value: Record<string, any>, name: string) {
  const hasOwn = Object.prototype.hasOwnProperty.call(value, name);

  if (!hasOwn) {
    return {
      hasOwn: false,
      type: null,
      isNull: null,
      isUndefined: null,
      value: null,
    };
  }

  const propertyValue = value[name];

  return {
    hasOwn: true,
    type: typeof propertyValue,
    isNull: propertyValue === null,
    isUndefined: propertyValue === undefined,
    value: propertyValue === undefined ? null : stableValue(propertyValue),
  };
}

function describeRequestHeaders(request: Record<string, any>) {
  const described = describeOwnProperty(request, "headers");

  if (
    !described.hasOwn ||
    described.value === null ||
    typeof described.value !== "object" ||
    Array.isArray(described.value)
  ) {
    return described;
  }

  const headers = {
    ...(described.value as Record<string, unknown>),
  };

  for (const name of Object.keys(headers)) {
    if (name.toLowerCase() === "x-forwarded-for") {
      delete headers[name];
    }
  }

  return {
    ...described,
    value: stableValue(headers),
  };
}

function describeRequest(request: Record<string, any>) {
  return {
    ownPropertyNames: Object.getOwnPropertyNames(request).sort(),

    url: describeOwnProperty(request, "url"),
    method: describeOwnProperty(request, "method"),
    contentType: describeOwnProperty(request, "contentType"),
    headers: describeRequestHeaders(request),
    payload: describeOwnProperty(request, "payload"),

    followRedirects: describeOwnProperty(request, "followRedirects"),

    muteHttpExceptions: describeOwnProperty(request, "muteHttpExceptions"),

    validateHttpsCertificates: describeOwnProperty(request, "validateHttpsCertificates"),

    useIntranet: describeOwnProperty(request, "useIntranet"),

    escaping: describeOwnProperty(request, "escaping"),
  };
}

function findHeader(headers: Record<string, any> | null | undefined, expectedName: string) {
  if (!headers) {
    return null;
  }

  const expectedLowerCase = expectedName.toLowerCase();

  for (const [name, value] of Object.entries(headers)) {
    if (name.toLowerCase() === expectedLowerCase) {
      return {
        name,
        type: typeof value,
        value: stableValue(value),
      };
    }
  }

  return null;
}

function getHeaderValue(headers: Record<string, any> | null | undefined, expectedName: string) {
  return findHeader(headers, expectedName)?.value ?? null;
}

function getMediaType(value: unknown) {
  const headerValue = Array.isArray(value) ? value[0] : value;

  if (typeof headerValue !== "string") {
    return null;
  }

  return headerValue.split(";", 1)[0].trim().toLowerCase();
}

function captureEchoResponse(response: any) {
  const body = JSON.parse(response.getContentText());

  const headers =
    body !== null &&
    typeof body === "object" &&
    body.headers !== null &&
    typeof body.headers === "object"
      ? body.headers
      : {};

  return {
    responseCode: response.getResponseCode(),
    method: body.method ?? null,
    data: body.data ?? null,
    form: stableValue(body.form ?? null),

    contentType: getMediaType(getHeaderValue(headers, "Content-Type")),

    vegasHeader: getHeaderValue(headers, "X-Vegas-Header"),
  };
}

function captureFetchOutcome(fn: () => any) {
  try {
    const response = fn();

    return {
      threw: false,
      responseCode: response.getResponseCode(),
      errorName: null,
      errorMessage: null,
    };
  } catch (error) {
    const candidate = error as {
      name?: unknown;
      message?: unknown;
    } | null;

    return {
      threw: true,
      responseCode: null,
      errorName: typeof candidate?.name === "string" ? candidate.name : typeof error,
      errorMessage: typeof candidate?.message === "string" ? candidate.message : String(error),
    };
  }
}

function captureFetchAllOutcome(fn: () => any[]) {
  try {
    const responses = fn();

    return {
      threw: false,
      isArray: Array.isArray(responses),
      responseCodes: responses.map((response) => response.getResponseCode()),
      errorName: null,
      errorMessage: null,
    };
  } catch (error) {
    const candidate = error as {
      name?: unknown;
      message?: unknown;
    } | null;

    return {
      threw: true,
      isArray: null,
      responseCodes: null,
      errorName: typeof candidate?.name === "string" ? candidate.name : typeof error,
      errorMessage: typeof candidate?.message === "string" ? candidate.message : String(error),
    };
  }
}

export function captureReferenceUrlFetchGetRequestSemantics() {
  const globals = globalThis as unknown as Record<string, any>;
  const app = globals.UrlFetchApp;

  const url = "https://example.com/";

  return {
    defaults: describeRequest(app.getRequest(url)),

    explicitFalse: describeRequest(
      app.getRequest(url, {
        followRedirects: false,
        muteHttpExceptions: false,
        validateHttpsCertificates: false,
        useIntranet: false,
        escaping: false,
      }),
    ),

    explicitTrue: describeRequest(
      app.getRequest(url, {
        followRedirects: true,
        muteHttpExceptions: true,
        validateHttpsCertificates: true,
        useIntranet: true,
        escaping: true,
      }),
    ),

    stringPayload: describeRequest(
      app.getRequest(url, {
        method: "post",
        contentType: "text/plain",
        headers: {
          "X-Vegas-Header": "alpha",
        },
        payload: "hello",
      }),
    ),

    objectPayload: describeRequest(
      app.getRequest(url, {
        method: "post",
        payload: {
          alpha: "one",
          beta: "two",
        },
      }),
    ),
  };
}

export function captureReferenceUrlFetchTransportSemantics() {
  const globals = globalThis as unknown as Record<string, any>;
  const app = globals.UrlFetchApp;

  const echoUrl = `${HTTP_ECHO_BASE_URL}/anything`;

  const defaultGet = captureEchoResponse(app.fetch(echoUrl));

  const stringPost = captureEchoResponse(
    app.fetch(echoUrl, {
      method: "post",
      contentType: "text/plain",
      headers: {
        "X-Vegas-Header": "alpha",
      },
      payload: "hello",
    }),
  );

  const objectPost = captureEchoResponse(
    app.fetch(echoUrl, {
      method: "post",
      payload: {
        alpha: "one",
        beta: "two",
      },
    }),
  );

  const redirectUrl = `${HTTP_ECHO_BASE_URL}/redirect/1`;

  const redirectDefault = captureFetchOutcome(() => app.fetch(redirectUrl));

  const redirectDisabled = captureFetchOutcome(() =>
    app.fetch(redirectUrl, {
      followRedirects: false,
    }),
  );

  const notFoundUrl = `${HTTP_ECHO_BASE_URL}/status/404`;

  const httpErrorDefault = captureFetchOutcome(() => app.fetch(notFoundUrl));

  const httpErrorMuted = captureFetchOutcome(() =>
    app.fetch(notFoundUrl, {
      muteHttpExceptions: true,
    }),
  );

  const fetchAllOrdered = app
    .fetchAll([
      echoUrl,
      {
        url: echoUrl,
        method: "post",
        contentType: "text/plain",
        headers: {
          "X-Vegas-Header": "beta",
        },
        payload: "world",
      },
    ])
    .map((response: any) => captureEchoResponse(response));

  const fetchAllHttpErrorDefault = captureFetchAllOutcome(() => app.fetchAll([notFoundUrl]));

  const fetchAllHttpErrorMuted = captureFetchAllOutcome(() =>
    app.fetchAll([
      {
        url: notFoundUrl,
        muteHttpExceptions: true,
      },
    ]),
  );

  const fetchAllRedirectDisabled = captureFetchAllOutcome(() =>
    app.fetchAll([
      {
        url: redirectUrl,
        followRedirects: false,
      },
    ]),
  );

  return {
    defaultGet,
    stringPost,
    objectPost,
    redirectDefault,
    redirectDisabled,
    httpErrorDefault,
    httpErrorMuted,
    fetchAllOrdered,
    fetchAllHttpErrorDefault,
    fetchAllHttpErrorMuted,
    fetchAllRedirectDisabled,
  };
}

export function captureReferenceHttpResponseSemantics() {
  const globals = globalThis as unknown as Record<string, any>;
  const app = globals.UrlFetchApp;

  /*
   * UTF-8 bytes for "café":
   *
   * 63 61 66 c3 a9
   *
   * This deliberately includes bytes above 0x7f so the GAS Byte
   * representation is observable.
   */
  const binaryResponse = app.fetch(`${HTTP_ECHO_BASE_URL}/base64/Y2Fmw6k=`);

  const binaryBlob = binaryResponse.getBlob();

  const headerResponse = app.fetch(
    `${HTTP_ECHO_BASE_URL}/response-headers` +
      "?Content-Type=text%2Fplain%3B%20charset%3DUTF-8" +
      "&X-Vegas-Header=alpha",
  );

  const headers = headerResponse.getHeaders();
  const headerBlob = headerResponse.getBlob();

  return {
    binaryResponse: {
      responseCode: binaryResponse.getResponseCode(),

      content: binaryResponse.getContent(),

      contentTextDefault: binaryResponse.getContentText(),

      contentTextLatin1: binaryResponse.getContentText("ISO-8859-1"),

      blob: {
        stringify: String(binaryBlob),
        bytes: binaryBlob.getBytes(),
        name: binaryBlob.getName(),
      },
    },

    headerResponse: {
      responseCode: headerResponse.getResponseCode(),

      contentTypeHeader: findHeader(headers, "Content-Type"),

      vegasHeader: findHeader(headers, "X-Vegas-Header"),

      blob: {
        stringify: String(headerBlob),
        contentType: headerBlob.getContentType(),
        name: headerBlob.getName(),
      },
    },
  };
}
