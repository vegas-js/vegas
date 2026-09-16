type UnknownRecord = Record<string, unknown>;

const MAX_GOOGLE_ERROR_DETAIL_LENGTH = 500;

function objectValue(value: unknown): UnknownRecord | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  return value as UnknownRecord;
}

function normalizeDetail(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length === 0) {
    return undefined;
  }

  if (normalized.length <= MAX_GOOGLE_ERROR_DETAIL_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_GOOGLE_ERROR_DETAIL_LENGTH - 3)}...`;
}

function extractGoogleErrorDetail(content: string): string | undefined {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    return undefined;
  }

  const root = objectValue(parsed);

  if (!root) {
    return undefined;
  }

  if (typeof root.error === "string") {
    const error = normalizeDetail(root.error);
    const description = normalizeDetail(root.error_description);

    if (error && description) {
      return `${error}: ${description}`;
    }

    return error ?? description;
  }

  const error = objectValue(root.error);

  if (!error) {
    return undefined;
  }

  const status = normalizeDetail(error.status);
  const message = normalizeDetail(error.message);

  if (status && message) {
    return `${status}: ${message}`;
  }

  return message ?? status;
}

function formatResponseStatus(response: Response): string {
  if (response.statusText.length === 0) {
    return String(response.status);
  }

  return `${response.status} ${response.statusText}`;
}

export function formatGoogleHttpError(response: Response, responseBody: string): string {
  const status = formatResponseStatus(response);
  const detail = extractGoogleErrorDetail(responseBody);

  if (detail === undefined) {
    return status;
  }

  return `${status} (${detail})`;
}
