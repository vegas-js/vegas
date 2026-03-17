import { ServeContext } from "../context";

export class UrlFetchAppHandler {
  async fetch(_ctx: ServeContext, payload: { url: string; init: RequestInit }) {
    const response = await fetch(payload.url, payload.init);
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    return {
      headers,
      content: Array.from(await response.bytes()),
      responseCode: response.status,
    };
  }
}
