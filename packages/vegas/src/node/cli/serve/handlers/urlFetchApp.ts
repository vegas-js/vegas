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
  async fetchAll(
    _ctx: ServeContext,
    payload: { fetchRequests: { url: string; init?: RequestInit }[] },
  ) {
    const responses = await Promise.all(
      payload.fetchRequests.map((fetchRequest) => {
        return fetch(fetchRequest.url, fetchRequest.init);
      }),
    );

    return await Promise.all(
      responses.map(async (response) => {
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });
        return {
          headers,
          content: Array.from(await response.bytes()),
          responseCode: response.status,
        };
      }),
    );
  }
}
