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
          kind: "method",
          name: "toString",
          value: () => name,
        },
        {
          kind: "method",
          name: "deleteAllProperties",
          value: () => {
            implementation.deleteAllProperties();
            return value;
          },
        },
        {
          kind: "method",
          name: "deleteProperty",
          value: (key: string) => {
            implementation.deleteProperty(key);
            return value;
          },
        },
        {
          kind: "method",
          name: "getKeys",
          value: () => implementation.getKeys(),
        },
        {
          kind: "method",
          name: "getProperties",
          value: () => implementation.getProperties(),
        },
        {
          kind: "method",
          name: "getProperty",
          value: (key: string) => implementation.getProperty(key),
        },
        {
          kind: "method",
          name: "setProperties",
          value: (properties: Record<string, string>, deleteAllOthers: boolean = false) => {
            implementation.setProperties(properties, deleteAllOthers);
            return value;
          },
        },
        {
          kind: "method",
          name: "setProperty",
          value: (key: string, propertyValue: string) => {
            implementation.setProperty(key, propertyValue);
            return value;
          },
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
          kind: "method",
          name: "toString",
          value: () => "PropertiesService",
        },
        {
          kind: "method",
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
          kind: "method",
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
          kind: "method",
          name: "getUserProperties",
          value: () =>
            createProperties(RuntimeScope.USER, "UserProperties", propertiesService, createObject),
        },
      ],
    },
    createObject,
  );
}
