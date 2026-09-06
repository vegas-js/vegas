const RSA_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIICeAIBADANBgkqhkiG9w0BAQEFAASCAmIwggJeAgEAAoGBAN47s5YcpJF2Vvzu
b3mVdwoVf5wwTsNg+1gA0UGlb8al7dpW183VmlxjwC0sZJNtddC5q8COOfDvOqhY
fjKj+I7ePZ83wMGAwX3FaDrsUm0lJmuqCtfLBl4p/xdlEO8XdGxepnSWX50htHdw
QYDxevSQGfrmrjE1VTzMPGZTdUCpAgMBAAECgYEAuObzhPJP+rd7qPa5yW+Sm9FH
W6zV27nVZmNHuFbtqVpljES1SY1v4W8ddnh5NjDc1c2mGZA8pTpmk6sNVRUYuDkA
8aOQkaEcREj5Luape7Eoso1e+Z6syzzIKO4yQS8FNHXcoVOGHoUoMmhpsYzm1G9w
vPl8NZgcVdl+M7DWgAECQQD3lTC2q7RNo0t4k5uo/b0UpeRJM2kXVycjuynQiuN8
5pZoj2kZSPcoOy169LOyC8Nwy5cem9gyi0TWe3tjP9kRAkEA5cniUGVT4JLnTvIb
NRgh0TuNvBoalNsv6yHMRfk0Asl2b2ZCjIcW5elnU4P3W5BjMjYkyQFM5Y8pSOO1
1bguGQJBAMCqYNZGmHEyejDC7Yd8rf+7eQNd9pIrSFIN/GRFMPKpnrKPp4H9vhiY
tLPSaWRMszK7vEYdkQkER/WA8mwx64ECQANZNMYNI/LC0UISPxk/98Yvwvn5u2dt
5j3b6Tkfz4U24FXxPIkFsuy4wPuzkZgw+3EQ3upa7X7u3iAkyVKK84kCQQDXdQCd
3A2j3jTbMgr5JGs8qx8OI+vDP7iIlV3ps0YQ4jQ/ZG5Np+Pcx/QLOleoqeQUdP+j
WDYYWeQKiijlJ14h
-----END PRIVATE KEY-----`;

function describeError(error: unknown) {
  const candidate = error as {
    name?: unknown;
    message?: unknown;
  } | null;

  return {
    errorName: typeof candidate?.name === "string" ? candidate.name : typeof error,

    errorMessage: typeof candidate?.message === "string" ? candidate.message : String(error),
  };
}

function captureEncodedBytes(utilities: any, fn: () => unknown) {
  try {
    const value = fn();

    const isArray = Array.isArray(value);

    return {
      threw: false,

      isArray,

      length: isArray ? value.length : null,

      base64: isArray ? utilities.base64Encode(value) : null,

      errorName: null,
      errorMessage: null,
    };
  } catch (error) {
    return {
      threw: true,

      isArray: null,

      length: null,

      base64: null,

      ...describeError(error),
    };
  }
}

export function captureReferenceUtilitiesCryptoSemantics() {
  const globals = globalThis as unknown as Record<string, any>;

  const utilities = globals.Utilities;

  const value = "café";
  const hmacKey = "clé";

  const hmacDefault = captureEncodedBytes(utilities, () =>
    utilities.computeHmacSignature(utilities.MacAlgorithm.HMAC_SHA_256, value, hmacKey),
  );

  const hmacUtf8 = captureEncodedBytes(utilities, () =>
    utilities.computeHmacSignature(
      utilities.MacAlgorithm.HMAC_SHA_256,
      value,
      hmacKey,
      utilities.Charset.UTF_8,
    ),
  );

  const hmacUsAscii = captureEncodedBytes(utilities, () =>
    utilities.computeHmacSignature(
      utilities.MacAlgorithm.HMAC_SHA_256,
      value,
      hmacKey,
      utilities.Charset.US_ASCII,
    ),
  );

  const hmacShortcutDefault = captureEncodedBytes(utilities, () =>
    utilities.computeHmacSha256Signature(value, hmacKey),
  );

  const hmacShortcutUsAscii = captureEncodedBytes(utilities, () =>
    utilities.computeHmacSha256Signature(value, hmacKey, utilities.Charset.US_ASCII),
  );

  const rsaSha1Generic = captureEncodedBytes(utilities, () =>
    utilities.computeRsaSignature(utilities.RsaAlgorithm.RSA_SHA_1, value, RSA_PRIVATE_KEY),
  );

  const rsaSha1Shortcut = captureEncodedBytes(utilities, () =>
    utilities.computeRsaSha1Signature(value, RSA_PRIVATE_KEY),
  );

  const rsaSha256Default = captureEncodedBytes(utilities, () =>
    utilities.computeRsaSignature(utilities.RsaAlgorithm.RSA_SHA_256, value, RSA_PRIVATE_KEY),
  );

  const rsaSha256Utf8 = captureEncodedBytes(utilities, () =>
    utilities.computeRsaSignature(
      utilities.RsaAlgorithm.RSA_SHA_256,
      value,
      RSA_PRIVATE_KEY,
      utilities.Charset.UTF_8,
    ),
  );

  const rsaSha256UsAscii = captureEncodedBytes(utilities, () =>
    utilities.computeRsaSignature(
      utilities.RsaAlgorithm.RSA_SHA_256,
      value,
      RSA_PRIVATE_KEY,
      utilities.Charset.US_ASCII,
    ),
  );

  const rsaSha256Shortcut = captureEncodedBytes(utilities, () =>
    utilities.computeRsaSha256Signature(value, RSA_PRIVATE_KEY),
  );

  const rsaSha256ShortcutUsAscii = captureEncodedBytes(utilities, () =>
    utilities.computeRsaSha256Signature(value, RSA_PRIVATE_KEY, utilities.Charset.US_ASCII),
  );

  return {
    hmacSha256: {
      generic: {
        default: hmacDefault,
        utf8: hmacUtf8,
        usAscii: hmacUsAscii,

        defaultEqualsUtf8: hmacDefault.base64 === hmacUtf8.base64,

        defaultEqualsUsAscii: hmacDefault.base64 === hmacUsAscii.base64,
      },

      shortcut: {
        default: hmacShortcutDefault,

        usAscii: hmacShortcutUsAscii,

        defaultMatchesGeneric: hmacShortcutDefault.base64 === hmacDefault.base64,

        usAsciiMatchesGeneric: hmacShortcutUsAscii.base64 === hmacUsAscii.base64,
      },
    },

    rsaSha1: {
      generic: rsaSha1Generic,

      shortcut: rsaSha1Shortcut,

      shortcutMatchesGeneric: rsaSha1Shortcut.base64 === rsaSha1Generic.base64,
    },

    rsaSha256: {
      generic: {
        default: rsaSha256Default,

        utf8: rsaSha256Utf8,

        usAscii: rsaSha256UsAscii,

        defaultEqualsUtf8: rsaSha256Default.base64 === rsaSha256Utf8.base64,

        defaultEqualsUsAscii: rsaSha256Default.base64 === rsaSha256UsAscii.base64,
      },

      shortcut: {
        default: rsaSha256Shortcut,

        usAscii: rsaSha256ShortcutUsAscii,

        defaultMatchesGeneric: rsaSha256Shortcut.base64 === rsaSha256Default.base64,

        usAsciiMatchesGeneric: rsaSha256ShortcutUsAscii.base64 === rsaSha256UsAscii.base64,
      },
    },
  };
}
