import { createGasEnum } from "../../globals/enum";
import type { CreateGasObject } from "../../globals/object";
import { createGasServiceObject } from "../../globals/serviceObject";
import type { CreateHtmlOutput, CreateHtmlTemplate } from "../../objects/types";
import type { RuntimeServicePort } from "../../protocol";
import { HtmlService } from "./HtmlService";

export function createHtmlService(
  createHtmlOutput: CreateHtmlOutput,
  createHtmlTemplate: CreateHtmlTemplate,
  service: RuntimeServicePort<"Html">,
  createObject?: CreateGasObject,
) {
  const sandboxMode = createGasEnum(
    {
      members: ["EMULATED", "IFRAME", "NATIVE"],
      representative: "EMULATED",
    },
    createObject,
  );

  const xFrameOptionsMode = createGasEnum(
    {
      members: ["ALLOWALL", "DEFAULT"],
      representative: "DEFAULT",
    },
    createObject,
  );

  const defaultXFrameOptionsMode =
    xFrameOptionsMode.DEFAULT as unknown as GoogleAppsScript.HTML.XFrameOptionsMode;

  const implementation = new HtmlService(
    createHtmlOutput,
    createHtmlTemplate,
    service,
    defaultXFrameOptionsMode,
  );

  return createGasServiceObject(
    {
      entries: [
        {
          kind: "method",
          name: "toString",
          value: () => "HtmlService",
        },
        {
          kind: "method",
          name: "createHtmlOutput",
          value: (htmlOrBlob?: unknown) => implementation.createHtmlOutput(htmlOrBlob as any),
        },
        {
          kind: "method",
          name: "createHtmlOutputFromFile",
          value: (filename: string) => implementation.createHtmlOutputFromFile(filename),
        },
        {
          kind: "method",
          name: "createTemplate",
          value: (htmlOrBlob: unknown) => implementation.createTemplate(htmlOrBlob as any),
        },
        {
          kind: "method",
          name: "createTemplateFromFile",
          value: (filename: string) => implementation.createTemplateFromFile(filename),
        },
        {
          kind: "method",
          name: "getUserAgent",
          value: () => implementation.getUserAgent(),
        },
        {
          kind: "property",
          name: "initTemplate",
          value: () => implementation.initTemplateExp(),
        },
        {
          kind: "property",
          name: "initTemplateExp",
          value: () => implementation.initTemplateExp(),
        },
        {
          kind: "property",
          name: "SandboxMode",
          value: sandboxMode,
        },
        {
          kind: "property",
          name: "XFrameOptionsMode",
          value: xFrameOptionsMode,
        },
      ],
    },
    createObject,
  );
}
