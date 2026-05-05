import type { Comment } from "./types";

export function filterNewCommentsForPage(
  comments: Comment[],
  lastSeenPostId: number | null,
  isStartPage: boolean
): Comment[] {
  if (!comments.length) return [];
  if (lastSeenPostId === null) return [];
  if (!isStartPage) return comments;
  return comments.filter((comment) => comment.postId > lastSeenPostId);
}
