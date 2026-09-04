const HTML_ESCAPE_ENTITIES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&#34;",
  "'": "&#39;",
} as const;

type EscapableCharacter = keyof typeof HTML_ESCAPE_ENTITIES;

export function escapeHtml(value: unknown): string {
  return String(value).replace(
    /[&<>"']/g,
    (character) => HTML_ESCAPE_ENTITIES[character as EscapableCharacter],
  );
}
