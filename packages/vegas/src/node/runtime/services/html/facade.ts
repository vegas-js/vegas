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
          name: "toString",
          value: () => "HtmlService",
          writable: true,
        },
        {
          name: "createHtmlOutput",
          value: (htmlOrBlob?: unknown) => implementation.createHtmlOutput(htmlOrBlob as any),
          writable: true,
        },
        {
          name: "createHtmlOutputFromFile",
          value: (filename: string) => implementation.createHtmlOutputFromFile(filename),
          writable: true,
        },
        {
          name: "createTemplate",
          value: (htmlOrBlob: unknown) => implementation.createTemplate(htmlOrBlob as any),
          writable: true,
        },
        {
          name: "createTemplateFromFile",
          value: (filename: string) => implementation.createTemplateFromFile(filename),
          writable: true,
        },
        {
          name: "getUserAgent",
          value: () => implementation.getUserAgent(),
          writable: true,
        },
        {
          name: "initTemplate",
          value: () => implementation.initTemplateExp(),
          writable: false,
        },
        {
          name: "initTemplateExp",
          value: () => implementation.initTemplateExp(),
          writable: false,
        },
        {
          name: "SandboxMode",
          value: sandboxMode,
          writable: false,
        },
        {
          name: "XFrameOptionsMode",
          value: xFrameOptionsMode,
          writable: false,
        },
      ],
    },
    createObject,
  );
}
