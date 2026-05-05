import crypto from "crypto";
import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import type { Element } from "domhandler";
import type { Comment } from "./types";

function shortHash(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function parsePostIdFromValue(value: string): number | null {
  const fromPostToken = value.match(/post-(\d+)/);
  if (fromPostToken) return Number(fromPostToken[1]);
  return null;
}

function parsePageNumberFromUrl(urlValue: string, baseUrl?: string): number | null {
  const canParse = baseUrl ? URL.canParse(urlValue, baseUrl) : URL.canParse(urlValue);
  if (!canParse) return null;

  const parsed = baseUrl ? new URL(urlValue, baseUrl) : new URL(urlValue);
  const pageFromPath = parsed.pathname.match(/\/page-(\d+)\/?$/);
  if (pageFromPath) return Number(pageFromPath[1]);
  const pageFromQuery = Number(parsed.searchParams.get("page"));
  if (Number.isInteger(pageFromQuery) && pageFromQuery > 0) return pageFromQuery;
  return null;
}

function getLastPageNumber($: CheerioAPI, currentUrl: string): number {
  const pageLinks = $(".pageNav-main .pageNav-page a[href]");
  const lastLinkHref = pageLinks.last().attr("href");
  const lastCandidate = lastLinkHref ? parsePageNumberFromUrl(lastLinkHref, currentUrl) : null;
  if (lastCandidate !== null) return lastCandidate;

  // Fallback for unusual forum markup where the last link is not parseable.
  let maxPage = 1;
  pageLinks.each((_, el: Element) => {
    const href = $(el).attr("href");
    if (!href) return;
    const candidate = parsePageNumberFromUrl(href, currentUrl);
    if (candidate !== null && candidate > maxPage) {
      maxPage = candidate;
    }
  });
  return maxPage;
}

function extractComments($: CheerioAPI, pageUrl: string): Comment[] {
  const comments: Comment[] = [];

  // IMPORTANT: Adjust this selector for your forum's comment/post elements.
  // For XenForo threads this is usually `article.message--post`.
  const commentSelector = "article.message--post.js-post";

  $(commentSelector).each((index: number, el: Element) => {
    const element = $(el);
    const text = normalizeText(
      element.find(".message-body .bbWrapper").text() || element.text()
    );
    if (!text) return;

    const relativeLink =
      element.find(".message-attribution a[href*='/post-']").first().attr("href") ||
      element.find("a[href*='/post-']").first().attr("href") ||
      "";
    const postId = relativeLink ? parsePostIdFromValue(relativeLink) : null;
    if (postId === null) {
      throw new Error("Could not extract numeric postId from comment link.");
    }

    const postNumberText = normalizeText(
      element
        .find(".message-attribution-opposite a[href*='/post-']")
        .filter((_, linkEl: Element) => /^#\d[\d.]*$/.test(normalizeText($(linkEl).text())))
        .first()
        .text()
    );

    const explicitId =
      postNumberText ||
      element.attr("data-content") ||
      element.find("span.u-anchorTarget[id^='post-']").attr("id") ||
      element.attr("id") ||
      element.attr("data-comment-id") ||
      element.attr("data-id");

    const id = explicitId || `${index}-${shortHash(text)}`;
    const link = relativeLink ? new URL(relativeLink, pageUrl).toString() : pageUrl;

    comments.push({ postId, id, text, link });
  });

  return comments;
}

export function parseLastPageNumber(html: string, currentUrl: string): number {
  const $ = cheerio.load(html);
  return getLastPageNumber($, currentUrl);
}

export function parseCurrentPageNumber(html: string, currentUrl: string): number {
  const $ = cheerio.load(html);
  const currentHref = $(".pageNav-page--current a[href]").first().attr("href");
  const currentFromNav = currentHref ? parsePageNumberFromUrl(currentHref, currentUrl) : null;
  if (currentFromNav !== null) return currentFromNav;

  const currentFromUrl = parsePageNumberFromUrl(currentUrl);
  return currentFromUrl ?? 1;
}

export function parseComments(html: string, pageUrl: string): Comment[] {
  const $ = cheerio.load(html);
  return extractComments($, pageUrl);
}
