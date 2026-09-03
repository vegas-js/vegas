export function captureReferenceBlobObjectIdentity() {
  const globals = globalThis as unknown as Record<string, any>;
  const utilities = globals.Utilities;

  const blobA = utilities.newBlob("vegas-reference", "text/plain", "reference.txt");
  const blobB = utilities.newBlob("vegas-reference", "text/plain", "reference.txt");

  const copyA = blobA.copyBlob();
  const copyB = blobA.copyBlob();

  return {
    newBlobRepeatedSameObject: blobA === blobB,

    copyBlobReturnsReceiver: copyA === blobA,
    copyBlobRepeatedSameObject: copyA === copyB,

    setNameReturnsReceiver: blobA.setName("reference-renamed.txt") === blobA,

    setContentTypeReturnsReceiver: blobA.setContentType("text/plain") === blobA,

    setBytesReturnsReceiver: blobA.setBytes([1, 2, 3]) === blobA,

    setDataFromStringReturnsReceiver: blobA.setDataFromString("vegas-reference") === blobA,

    setContentTypeFromExtensionReturnsReceiver: blobA.setContentTypeFromExtension() === blobA,

    getBlobAvailable: typeof blobA.getBlob === "function",

    getBlobReturnsReceiver: typeof blobA.getBlob === "function" ? blobA.getBlob() === blobA : null,
  };
}
