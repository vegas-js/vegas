function captureCall(fn: () => unknown) {
  try {
    return {
      threw: false,
      value: fn(),
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
      value: null,
      errorName: typeof candidate?.name === "string" ? candidate.name : typeof error,
      errorMessage: typeof candidate?.message === "string" ? candidate.message : String(error),
    };
  }
}

function describeBlob(blob: any) {
  return {
    stringify: String(blob),
    bytes: blob.getBytes(),
    contentType: blob.getContentType(),
    name: blob.getName(),
    dataAsString: blob.getDataAsString(),
  };
}

function describeBlobMetadata(blob: any) {
  const bytes = blob.getBytes();

  return {
    stringify: String(blob),
    contentType: blob.getContentType(),
    name: blob.getName(),
    hasBytes: bytes.length > 0,
  };
}

export function captureReferenceBlobSemantics() {
  const globals = globalThis as unknown as Record<string, any>;

  const utilities = globals.Utilities;

  const stringBlob = utilities.newBlob("café");

  const fullySpecifiedBlob = utilities.newBlob("café", "text/plain", "cafe.txt");

  const byteBlob = utilities.newBlob(
    [99, 97, 102, -61, -87],
    "application/octet-stream",
    "bytes.bin",
  );

  const sourceBytes = [1, 2, 3];

  const inputAliasingBlob = utilities.newBlob(sourceBytes);

  sourceBytes[0] = 9;

  const getBytesBlob = utilities.newBlob([1, 2, 3]);

  const bytesA = getBytesBlob.getBytes();
  const bytesB = getBytesBlob.getBytes();

  const repeatedGetBytesSameArray = bytesA === bytesB;

  bytesA[0] = 9;

  const copySource = utilities.newBlob("original", "text/plain", "original.txt");

  const copy = copySource.copyBlob();

  const copyBeforeMutation = describeBlob(copy);

  copy.setName("copy.bin").setContentType("application/octet-stream").setBytes([9, 8, 7]);

  const extensionBlob = utilities.newBlob("extension", "application/octet-stream", "note.txt");

  const extensionResult = extensionBlob.setContentTypeFromExtension();

  const mutationBlob = utilities.newBlob("initial");

  const setNameResult = mutationBlob.setName("renamed.txt");

  const setContentTypeResult = mutationBlob.setContentType("text/plain");

  const setBytesResult = mutationBlob.setBytes([99, 97, 102, -61, -87]);

  const setDataFromStringResult = mutationBlob.setDataFromString("updated");

  const latin1ReadBlob = utilities.newBlob([99, 97, 102, -61, -87]);

  const latin1WriteBlob = utilities.newBlob("");

  const latin1Write = captureCall(() => {
    latin1WriteBlob.setDataFromString("café", "ISO-8859-1");

    return describeBlob(latin1WriteBlob);
  });

  return {
    stringBlob: describeBlob(stringBlob),

    fullySpecifiedBlob: describeBlob(fullySpecifiedBlob),

    byteBlob: describeBlob(byteBlob),

    inputByteArrayAliasing: {
      sourceAfterMutation: sourceBytes,
      blobBytes: inputAliasingBlob.getBytes(),
    },

    getBytesAliasing: {
      repeatedSameArray: repeatedGetBytesSameArray,

      secondReadAfterFirstMutation: bytesB,

      blobBytesAfterReturnedArrayMutation: getBytesBlob.getBytes(),
    },

    copyBlob: {
      returnsReceiver: copy === copySource,

      beforeMutation: copyBeforeMutation,

      sourceAfterCopyMutation: describeBlob(copySource),

      copyAfterMutation: describeBlob(copy),
    },

    contentTypeFromExtension: {
      returnsReceiver: extensionResult === extensionBlob,

      blob: describeBlob(extensionBlob),
    },

    mutations: {
      setNameReturnsReceiver: setNameResult === mutationBlob,

      setContentTypeReturnsReceiver: setContentTypeResult === mutationBlob,

      setBytesReturnsReceiver: setBytesResult === mutationBlob,

      setDataFromStringReturnsReceiver: setDataFromStringResult === mutationBlob,

      finalBlob: describeBlob(mutationBlob),
    },

    charset: {
      utf8Bytes: stringBlob.getBytes(),

      latin1Read: captureCall(() => latin1ReadBlob.getDataAsString("ISO-8859-1")),

      latin1Write,
    },
  };
}

export function captureReferenceUtilitiesByteSemantics() {
  const globals = globalThis as unknown as Record<string, any>;

  const utilities = globals.Utilities;

  const digestAlgorithms = ["MD2", "MD5", "SHA_1", "SHA_256", "SHA_384", "SHA_512"];

  const macAlgorithms = ["HMAC_MD5", "HMAC_SHA_1", "HMAC_SHA_256", "HMAC_SHA_384", "HMAC_SHA_512"];

  return {
    base64: {
      stringDefault: utilities.base64Encode("café"),

      stringUtf8: utilities.base64Encode("café", utilities.Charset.UTF_8),

      stringUsAscii: captureCall(() => utilities.base64Encode("café", utilities.Charset.US_ASCII)),

      signedBytes: utilities.base64Encode([99, 97, 102, -61, -87]),

      decodeUtf8: utilities.base64Decode("Y2Fmw6k="),

      webSafe: utilities.base64EncodeWebSafe([-5, -1]),

      webSafeDecoded: utilities.base64DecodeWebSafe("-_8="),
    },

    digests: Object.fromEntries(
      digestAlgorithms.map((name) => [
        name,
        utilities.computeDigest(utilities.DigestAlgorithm[name], "Vegas"),
      ]),
    ),

    digestCharset: {
      utf8: utilities.computeDigest(utilities.DigestAlgorithm.MD5, "café", utilities.Charset.UTF_8),

      usAscii: captureCall(() =>
        utilities.computeDigest(utilities.DigestAlgorithm.MD5, "café", utilities.Charset.US_ASCII),
      ),
    },

    hmac: Object.fromEntries(
      macAlgorithms.map((name) => [
        name,
        utilities.computeHmacSignature(utilities.MacAlgorithm[name], "Vegas", "Key"),
      ]),
    ),

    hmacSha256Shortcut: utilities.computeHmacSha256Signature("Vegas", "Key"),
  };
}

export function captureReferenceUtilitiesCompressionSemantics() {
  const globals = globalThis as unknown as Record<string, any>;

  const utilities = globals.Utilities;

  const defaultSource = utilities.newBlob("café", "text/plain", "hello.txt");

  const sourceBefore = describeBlob(defaultSource);

  const gzipDefault = utilities.gzip(defaultSource);

  const sourceAfter = describeBlob(defaultSource);

  const ungzipDefault = utilities.ungzip(gzipDefault);

  const namedSource = utilities.newBlob("named", "text/plain", "named.txt");

  const gzipNamed = utilities.gzip(namedSource, "archive.gz");

  const ungzipNamed = utilities.ungzip(gzipNamed);

  return {
    defaultGzip: {
      returnsSource: gzipDefault === defaultSource,

      sourceBefore,
      sourceAfter,

      gzip: describeBlobMetadata(gzipDefault),

      ungzipReturnsGzip: ungzipDefault === gzipDefault,

      ungzip: describeBlob(ungzipDefault),
    },

    namedGzip: {
      returnsSource: gzipNamed === namedSource,

      sourceAfter: describeBlob(namedSource),

      gzip: describeBlobMetadata(gzipNamed),

      ungzipReturnsGzip: ungzipNamed === gzipNamed,

      ungzip: describeBlob(ungzipNamed),
    },
  };
}
