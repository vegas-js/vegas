import type { CreateGasObject } from "../../globals/object";
import { createGasServiceObject } from "../../globals/serviceObject";
import type { RuntimeServicePort } from "../../protocol";
import { RuntimeScope } from "../../scope";
import { Properties } from "./Properties";

function createProperties(
  scope: RuntimeScope,
  name: string,
  propertiesService: RuntimeServicePort<"Properties">,
  createObject?: CreateGasObject,
) {
  const implementation = new Properties(scope, propertiesService);

  let value: Record<string, unknown>;

  value = createGasServiceObject(
    {
      entries: [
        {
          name: "toString",
          value: () => name,
          writable: true,
        },
        {
          name: "deleteAllProperties",
          value: () => {
            implementation.deleteAllProperties();
            return value;
          },
          writable: true,
        },
        {
          name: "deleteProperty",
          value: (key: string) => {
            implementation.deleteProperty(key);
            return value;
          },
          writable: true,
        },
        {
          name: "getKeys",
          value: () => implementation.getKeys(),
          writable: true,
        },
        {
          name: "getProperties",
          value: () => implementation.getProperties(),
          writable: true,
        },
        {
          name: "getProperty",
          value: (key: string) => implementation.getProperty(key),
          writable: true,
        },
        {
          name: "setProperties",
          value: (properties: Record<string, string>, deleteAllOthers: boolean = false) => {
            implementation.setProperties(properties, deleteAllOthers);
            return value;
          },
          writable: true,
        },
        {
          name: "setProperty",
          value: (key: string, propertyValue: string) => {
            implementation.setProperty(key, propertyValue);
            return value;
          },
          writable: true,
        },
      ],
    },
    createObject,
  );

  return value;
}

export interface CreatePropertiesServiceOptions {
  documentPropertiesAvailable: boolean;
  createObject?: CreateGasObject;
}

export function createPropertiesService(
  propertiesService: RuntimeServicePort<"Properties">,
  options: CreatePropertiesServiceOptions,
) {
  const { documentPropertiesAvailable, createObject } = options;

  return createGasServiceObject(
    {
      entries: [
        {
          writable: true,
          name: "toString",
          value: () => "PropertiesService",
        },
        {
          writable: true,
          name: "getDocumentProperties",
          value: () => {
            if (!documentPropertiesAvailable) {
              return null;
            }

            return createProperties(
              RuntimeScope.DOCUMENT,
              "DocumentProperties",
              propertiesService,
              createObject,
            );
          },
        },
        {
          writable: true,
          name: "getScriptProperties",
          value: () =>
            createProperties(
              RuntimeScope.SCRIPT,
              "ScriptProperties",
              propertiesService,
              createObject,
            ),
        },
        {
          writable: true,
          name: "getUserProperties",
          value: () =>
            createProperties(RuntimeScope.USER, "UserProperties", propertiesService, createObject),
        },
      ],
    },
    createObject,
  );
}
