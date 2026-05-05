import axios from "axios";
import type { Comment } from "./types";

async function sendTelegramMessage(token: string, chatId: string, text: string): Promise<void> {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  await axios.post(url, {
    chat_id: chatId,
    text,
    disable_web_page_preview: true
  });
}

function formatMessage(comment: Comment, index: number, total: number): string {
  const snippet = comment.text.length > 500 ? `${comment.text.slice(0, 497)}...` : comment.text;
  return `New forum comment (${index + 1}/${total})\n\n${snippet}\n\n${comment.link}`;
}

export async function sendNewCommentNotifications(
  comments: Comment[],
  token: string,
  chatId: string
): Promise<void> {
  for (let i = 0; i < comments.length; i += 1) {
    const comment = comments[i];
    const message = formatMessage(comment, i, comments.length);
    await sendTelegramMessage(token, chatId, message);
  }
}

export async function sendOperationalAlert(
  token: string,
  chatId: string,
  text: string
): Promise<void> {
  await sendTelegramMessage(token, chatId, text);
}
