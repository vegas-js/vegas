import {
  defaultTreeAdapter,
  html as parse5Html,
  parse,
  serialize,
  type DefaultTreeAdapterTypes,
} from "parse5";
import type { Plugin, Rolldown } from "vite";

import type { BuildPlan } from "../../plan";
import { CLIENT_HTML_ENVIRONMENT_PATTERN, getClientHtmlEnvironmentIndex } from "../environment";

type ClientOutput = Rolldown.OutputAsset | Rolldown.OutputChunk;
type ClientOutputBundle = Readonly<Record<string, ClientOutput>>;
type ScriptletReplacement = readonly [placeholder: string, scriptlet: string];

const APPS_SCRIPT_SCRIPTLET_PATTERN = /<\?[\s\S]*?\?>/g;
const SCRIPTLET_PLACEHOLDER_PREFIX = "__vegas_apps_script_scriptlet_";

function protectAppsScriptScriptlets(html: string): {
  readonly html: string;
  readonly replacements: readonly ScriptletReplacement[];
} {
  const replacements: ScriptletReplacement[] = [];
  let nextIndex = 0;

  const protectedHtml = html.replace(APPS_SCRIPT_SCRIPTLET_PATTERN, (scriptlet) => {
    let placeholder: string;

    do {
      placeholder = `${SCRIPTLET_PLACEHOLDER_PREFIX}${nextIndex++}__`;
    } while (html.includes(placeholder));

    replacements.push([placeholder, scriptlet]);
    return placeholder;
  });

  return {
    html: protectedHtml,
    replacements,
  };
}

function restoreAppsScriptScriptlets(
  html: string,
  replacements: readonly ScriptletReplacement[],
): string {
  let restoredHtml = html;

  for (const [placeholder, scriptlet] of replacements) {
    const firstOccurrence = restoredHtml.indexOf(placeholder);

    if (
      firstOccurrence < 0 ||
      restoredHtml.indexOf(placeholder, firstOccurrence + placeholder.length) >= 0
    ) {
      throw new Error("Apps Script scriptlet was modified during client HTML processing.");
    }

    restoredHtml =
      restoredHtml.slice(0, firstOccurrence) +
      scriptlet +
      restoredHtml.slice(firstOccurrence + placeholder.length);
  }

  return restoredHtml;
}

function escapeInlineScript(code: string): string {
  return code.replace(/<\/script/gi, "<\\/script");
}

function escapeInlineStyle(code: string): string {
  return code.replace(/<\/style/gi, "<\\/style");
}

function readTextAsset(asset: Rolldown.OutputAsset, kind: string): string {
  if (typeof asset.source === "string") {
    return asset.source;
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(asset.source);
  } catch {
    throw new Error(`${kind} must be UTF-8: ${asset.fileName}`);
  }
}

function getAttribute(element: DefaultTreeAdapterTypes.Element, name: string): string | undefined {
  return defaultTreeAdapter.getAttrList(element).find((attribute) => attribute.name === name)
    ?.value;
}

function hasRel(element: DefaultTreeAdapterTypes.Element, expected: string): boolean {
  return (
    getAttribute(element, "rel")
      ?.split(/\s+/)
      .some((value) => value.toLowerCase() === expected) ?? false
  );
}

function referencesOutput(reference: string, fileName: string): boolean {
  const normalizedReference = reference.replace(/[?#].*$/, "").replaceAll("\\", "/");
  const normalizedFileName = fileName.replaceAll("\\", "/");

  if (/^(?:[a-z]+:)?\/\//i.test(normalizedReference) || normalizedReference.startsWith("data:")) {
    return false;
  }

  return (
    normalizedReference === normalizedFileName ||
    normalizedReference.endsWith(`/${normalizedFileName}`)
  );
}

function findOutput(bundle: ClientOutputBundle, reference: string): ClientOutput | undefined {
  return Object.values(bundle).find((output) => referencesOutput(reference, output.fileName));
}

function replaceElement(
  element: DefaultTreeAdapterTypes.Element,
  replacement: DefaultTreeAdapterTypes.Element,
): void {
  const parent = defaultTreeAdapter.getParentNode(element);

  if (!parent) {
    throw new Error(`Cannot replace detached HTML element: ${element.tagName}`);
  }

  defaultTreeAdapter.insertBefore(parent, replacement, element);
  defaultTreeAdapter.detachNode(element);
}

function inlineBundleReferences(
  parent: DefaultTreeAdapterTypes.ParentNode,
  bundle: ClientOutputBundle,
  inlinedOutputs: Set<string>,
): void {
  for (const child of defaultTreeAdapter.getChildNodes(parent).slice()) {
    if (!defaultTreeAdapter.isElementNode(child)) {
      continue;
    }

    if (child.tagName === "script") {
      const source = getAttribute(child, "src");
      const output = source ? findOutput(bundle, source) : undefined;

      if (output?.type === "chunk") {
        const attributes = defaultTreeAdapter
          .getAttrList(child)
          .filter(
            (attribute) =>
              attribute.name !== "src" &&
              attribute.name !== "crossorigin" &&
              attribute.name !== "integrity",
          );
        const script = defaultTreeAdapter.createElement("script", parse5Html.NS.HTML, attributes);

        defaultTreeAdapter.insertText(script, escapeInlineScript(output.code));
        replaceElement(child, script);
        inlinedOutputs.add(output.fileName);
        continue;
      }
    }

    if (child.tagName === "link" && hasRel(child, "stylesheet")) {
      const href = getAttribute(child, "href");
      const output = href ? findOutput(bundle, href) : undefined;

      if (output?.type === "asset" && output.fileName.toLowerCase().endsWith(".css")) {
        const attributes = defaultTreeAdapter
          .getAttrList(child)
          .filter(
            (attribute) =>
              attribute.name !== "href" &&
              attribute.name !== "rel" &&
              attribute.name !== "crossorigin" &&
              attribute.name !== "integrity",
          );
        const style = defaultTreeAdapter.createElement("style", parse5Html.NS.HTML, attributes);

        defaultTreeAdapter.insertText(
          style,
          escapeInlineStyle(readTextAsset(output, "Client CSS asset")),
        );
        replaceElement(child, style);
        inlinedOutputs.add(output.fileName);
        continue;
      }
    }

    inlineBundleReferences(child, bundle, inlinedOutputs);
  }
}

function removeInlinedModulePreloads(
  parent: DefaultTreeAdapterTypes.ParentNode,
  bundle: ClientOutputBundle,
  inlinedOutputs: ReadonlySet<string>,
): void {
  for (const child of defaultTreeAdapter.getChildNodes(parent).slice()) {
    if (!defaultTreeAdapter.isElementNode(child)) {
      continue;
    }

    if (child.tagName === "link" && hasRel(child, "modulepreload")) {
      const href = getAttribute(child, "href");
      const output = href ? findOutput(bundle, href) : undefined;

      if (output && inlinedOutputs.has(output.fileName)) {
        defaultTreeAdapter.detachNode(child);
        continue;
      }
    }

    removeInlinedModulePreloads(child, bundle, inlinedOutputs);
  }
}

function inlineHtmlOutputs(
  html: string,
  bundle: ClientOutputBundle,
): { readonly html: string; readonly inlinedOutputs: ReadonlySet<string> } {
  const document = parse(html);
  const inlinedOutputs = new Set<string>();

  inlineBundleReferences(document, bundle, inlinedOutputs);
  removeInlinedModulePreloads(document, bundle, inlinedOutputs);

  return {
    html: serialize(document),
    inlinedOutputs,
  };
}

export function inlineHtmlEntry(entries: BuildPlan["clientHtmlTargets"]): Plugin {
  const scriptletsBySourcePath = new Map<string, readonly ScriptletReplacement[]>();

  return {
    name: "vite-plugin-inline-html-entry",
    enforce: "post",

    applyToEnvironment(environment) {
      return CLIENT_HTML_ENVIRONMENT_PATTERN.test(environment.name);
    },

    transformIndexHtml: {
      order: "pre",
      handler(html, context) {
        const protectedHtml = protectAppsScriptScriptlets(html);

        scriptletsBySourcePath.set(context.filename, protectedHtml.replacements);

        return protectedHtml.html;
      },
    },

    generateBundle(_outputOptions, bundle) {
      const entryIndex = getClientHtmlEnvironmentIndex(this.environment.name);

      if (entryIndex === undefined) {
        return;
      }

      const entry = entries[entryIndex];

      if (!entry) {
        throw new Error(`Client HTML entry not found for environment: ${this.environment.name}`);
      }

      const htmlOutputs = Object.values(bundle).filter(
        (output): output is Rolldown.OutputAsset =>
          output.type === "asset" && output.fileName.toLowerCase().endsWith(".html"),
      );

      if (htmlOutputs.length !== 1) {
        throw new Error(
          `Client HTML environment "${this.environment.name}" must produce exactly one HTML asset; received ${htmlOutputs.length}.`,
        );
      }

      const [htmlOutput] = htmlOutputs;
      const result = inlineHtmlOutputs(readTextAsset(htmlOutput, "Client HTML asset"), bundle);
      const scriptletReplacements = scriptletsBySourcePath.get(entry.sourcePath) ?? [];
      const html = restoreAppsScriptScriptlets(result.html, scriptletReplacements);
      const unsupportedOutputs = Object.values(bundle).filter(
        (output) => output !== htmlOutput && !result.inlinedOutputs.has(output.fileName),
      );

      if (unsupportedOutputs.length > 0) {
        throw new Error(
          `Client HTML environment "${this.environment.name}" must produce a self-contained HTML artifact; unsupported output: ${unsupportedOutputs
            .map((output) => output.fileName)
            .sort()
            .join(", ")}.`,
        );
      }

      for (const key of Object.keys(bundle)) {
        delete bundle[key];
      }

      this.emitFile({
        originalFileName: entry.sourcePath,
        fileName: entry.htmlPath,
        type: "asset",
        source: html,
      });
    },
  };
}
