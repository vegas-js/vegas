import type { CreateGasObject } from "../../globals/object";
import { createGasServiceObject } from "../../globals/serviceObject";

export interface BlobFacadeFactory {
  create(implementation: GoogleAppsScript.Base.Blob): GoogleAppsScript.Base.Blob;

  unwrap(blobSource: GoogleAppsScript.Base.BlobSource): GoogleAppsScript.Base.BlobSource;
}

export function createBlobFacadeFactory(createObject?: CreateGasObject): BlobFacadeFactory {
  const blobSources = new WeakMap<object, GoogleAppsScript.Base.BlobSource>();

  const create = (implementation: GoogleAppsScript.Base.Blob): GoogleAppsScript.Base.Blob => {
    let value: Record<string, unknown>;

    value = createGasServiceObject(
      {
        entries: [
          {
            name: "toString",
            value: () => "Blob",
            writable: true,
          },
          {
            name: "copyBlob",
            value: () => create(implementation.copyBlob()),
            writable: true,
          },
          {
            name: "getAllBlobs",
            value: () => implementation.getAllBlobs().map((blob) => create(blob)),
            writable: true,
          },
          {
            name: "getAs",
            value: (contentType: string) => create(implementation.getAs(contentType)),
            writable: true,
          },
          {
            name: "getBytes",
            value: () => implementation.getBytes(),
            writable: true,
          },
          {
            name: "getContentType",
            value: () => implementation.getContentType(),
            writable: true,
          },
          {
            name: "getDataAsString",
            value: (charset?: string) =>
              charset === undefined
                ? implementation.getDataAsString()
                : implementation.getDataAsString(charset),
            writable: true,
          },
          {
            name: "getName",
            value: () => implementation.getName(),
            writable: true,
          },
          {
            name: "isGoogleType",
            value: () => implementation.isGoogleType(),
            writable: true,
          },
          {
            name: "setBytes",
            value: (data: GoogleAppsScript.Byte[]) => {
              implementation.setBytes(data);
              return value;
            },
            writable: true,
          },
          {
            name: "setContentType",
            value: (contentType: string) => {
              implementation.setContentType(contentType);
              return value;
            },
            writable: true,
          },
          {
            name: "setContentTypeFromExtension",
            value: () => {
              implementation.setContentTypeFromExtension();
              return value;
            },
            writable: true,
          },
          {
            name: "setDataFromString",
            value: (string: string, charset?: string) => {
              if (charset === undefined) {
                implementation.setDataFromString(string);
              } else {
                implementation.setDataFromString(string, charset);
              }
              return value;
            },
            writable: true,
          },
          {
            name: "setName",
            value: (name: string) => {
              implementation.setName(name);
              return value;
            },
            writable: true,
          },
        ],
      },
      createObject,
    );

    /*
     * A GAS Blob does not expose BlobSource#getBlob() to JavaScript.
     * Keep BlobSource adaptation private to the runtime instead of adding
     * an extra property to the GAS-visible facade.
     */
    blobSources.set(value, {
      getAs: (contentType: string) => implementation.getAs(contentType),
      getBlob: () => implementation,
    });

    return value as unknown as GoogleAppsScript.Base.Blob;
  };

  const unwrap = (
    blobSource: GoogleAppsScript.Base.BlobSource,
  ): GoogleAppsScript.Base.BlobSource => {
    if (
      blobSource !== null &&
      (typeof blobSource === "object" || typeof blobSource === "function")
    ) {
      return blobSources.get(blobSource as object) ?? blobSource;
    }

    return blobSource;
  };

  return {
    create,
    unwrap,
  };
}
