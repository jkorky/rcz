import axios from "axios";

export function buildPageUrl(baseUrl: string, pageNumber: number): string {
  const url = new URL(baseUrl);
  url.pathname = url.pathname.replace(/\/page-\d+\/?$/, "/");
  if (pageNumber > 1) {
    url.pathname = `${url.pathname.replace(/\/$/, "")}/page-${pageNumber}`;
  }
  return url.toString();
}

export async function fetchHtml(url: string): Promise<string> {
  const response = await axios.get<string>(url, {
    timeout: 30000,
    headers: {
      "User-Agent": "forum-scraper-bot/1.0",
      "Accept-Language": "de-DE,de;q=0.9,en;q=0.8"
    }
  });
  return response.data;
}
