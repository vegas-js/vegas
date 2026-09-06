export function captureReferenceHttpResponseObjectIdentity() {
  const globals = globalThis as unknown as Record<string, any>;

  const url = "https://example.com/";

  const responseA = globals.UrlFetchApp.fetch(url);

  const responseB = globals.UrlFetchApp.fetch(url);

  const fetchAllResponses = globals.UrlFetchApp.fetchAll([url, url]);

  const contentA = responseA.getContent();

  const contentB = responseA.getContent();

  const headersA = responseA.getHeaders();

  const headersB = responseA.getHeaders();

  const blobA = responseA.getBlob();

  const blobB = responseA.getBlob();

  return {
    fetchRepeatedSameObject: responseA === responseB,

    fetchAllIsArray: Array.isArray(fetchAllResponses),

    fetchAllResponsesSameObject: fetchAllResponses[0] === fetchAllResponses[1],

    fetchResponseSameAsFetchAllResponse: responseA === fetchAllResponses[0],

    getContentIsArray: Array.isArray(contentA),

    getContentRepeatedSameArray: contentA === contentB,

    getContentPrototypeIsArrayPrototype: Object.getPrototypeOf(contentA) === Array.prototype,

    getHeadersRepeatedSameObject: headersA === headersB,

    getHeadersObjectTag: Object.prototype.toString.call(headersA),

    getHeadersPrototypeIsObjectPrototype: Object.getPrototypeOf(headersA) === Object.prototype,

    getBlobRepeatedSameObject: blobA === blobB,

    getBlobStringify: String(blobA),

    getBlobObjectTag: Object.prototype.toString.call(blobA),

    getBlobPrototypeIsObjectPrototype: Object.getPrototypeOf(blobA) === Object.prototype,

    getBlobHasGetBlob: "getBlob" in blobA,
  };
}
