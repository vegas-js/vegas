export function isTrustedMessageSource(
  event: Pick<MessageEvent, "origin" | "source">,
  expectedOrigin: string,
  expectedSource: MessageEventSource,
): boolean {
  return event.origin === expectedOrigin && event.source === expectedSource;
}
