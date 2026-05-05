import { buildPageUrl } from "./forumClient";
import { parseCurrentPageNumber, parseLastPageNumber, parseComments } from "./forumParser";
import { readState, writeState } from "./stateStore";
import { filterNewCommentsForPage } from "./commentDelta";
import { sendNewCommentNotifications } from "./telegramNotifier";
import { fetchWithRetry } from "./retryPolicy";
import type { Comment } from "./types";

export async function runScraper(token: string, chatId: string, baseUrl: string): Promise<void> {
  const state = await readState();
  const entryUrl =
    state.lastSeenPage !== null ? buildPageUrl(baseUrl, state.lastSeenPage) : baseUrl;

  const entryHtml = await fetchWithRetry(entryUrl);
  const currentPageNumber = parseCurrentPageNumber(entryHtml, entryUrl);
  const lastPageNumber = parseLastPageNumber(entryHtml, entryUrl);
  if (currentPageNumber > lastPageNumber) {
    throw new Error(
      `Invalid pagination state: currentPage (${currentPageNumber}) is greater than lastPage (${lastPageNumber}).`
    );
  }
  const pageComments: Comment[] = [];
  let newestSeenComment: Comment | null = null;

  for (let page = currentPageNumber; page <= lastPageNumber; page += 1) {
    const pageUrl = buildPageUrl(baseUrl, page);
    const html = page === currentPageNumber ? entryHtml : await fetchWithRetry(pageUrl);
    const comments = parseComments(html, pageUrl);
    if (comments.length > 0) {
      newestSeenComment = comments[comments.length - 1];
    }

    const newComments = filterNewCommentsForPage(
      comments,
      state.lastSeenPostId,
      page === currentPageNumber
    );
    pageComments.push(...newComments);
  }

  if (newestSeenComment === null) {
    throw new Error("No comments extracted while processing page range. Check forum selectors in src/forumParser.ts.");
  }

  if (state.lastSeenPostId === null) {
    await writeState(newestSeenComment.postId, lastPageNumber);
    return;
  }

  if (pageComments.length > 0) {
    await sendNewCommentNotifications(pageComments, token, chatId);
    await writeState(pageComments[pageComments.length - 1].postId, lastPageNumber);
    return;
  }

  await writeState(state.lastSeenPostId, lastPageNumber);
}
