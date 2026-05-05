# GitHub Actions Forum Scraper

TypeScript scraper that checks a forum topic for new comments and sends Telegram notifications.  
Runs automatically via GitHub Actions every 10 minutes and stores the latest seen post position in `state.json`.

## Project Structure

- `scraper.ts` - main scraper orchestrator
- `src/forumClient.ts` - HTTP fetching + page URL construction
- `src/forumParser.ts` - pagination/comment parsing from HTML
- `src/stateStore.ts` - `state.json` persistence
- `src/commentDelta.ts` - filters unseen comments from `lastSeenPostId`
- `src/telegramNotifier.ts` - Telegram message formatting/sending
- `src/scrapeRunner.ts` - page-range scraping orchestration
- `src/retryPolicy.ts` - retry wrapper for transient site/network failures
- `src/errorUtils.ts` - retryable/error-summary helpers
- `src/types.ts` - shared domain types
- `dist/` - compiled JavaScript output from TypeScript build
- `state.json` - persistent state (`{"lastSeenPostId": ...}`)
- `.scraper-paused.json` - pause control for scheduled runs
- `.github/workflows/scraper.yml` - scheduled and manual workflow
- `package.json` - dependencies and scripts

## How It Works

1. Reads `state.json` and uses `lastSeenPage` as preferred start page when available.
2. Fetches entry page (`lastSeenPage` URL or `FORUM_URL`) and detects current/last page from pagination.
3. Iterates page-by-page from current page to last page so no posts are skipped when multiple pages are added.
4. Extracts comments and stable numeric `postId` values (from `post-<id>` patterns).
5. On the first processed page, keeps only posts with `postId > lastSeenPostId`; on later pages includes all posts.
6. Sends Telegram notifications for new comments in chronological order.
7. Updates `state.json` with the newest processed post ID and final page.
8. On retryable site/network failures, retries up to 3 attempts with exponential backoff and jitter.
9. On terminal failure, sends Telegram error alert and sets pause flag for future scheduled runs.

## Architecture

- `scraper.ts` handles bootstrap and terminal failure alerting.
- `src/forumClient.ts` handles HTTP and page URL building.
- `src/forumParser.ts` contains forum HTML parsing logic.
- `src/commentDelta.ts` determines which comments are new.
- `src/stateStore.ts` persists/retrieves last processed ID.
- `src/telegramNotifier.ts` sends notifications to Telegram.
- `src/scrapeRunner.ts` runs the end-to-end scrape flow.
- `src/retryPolicy.ts` applies exponential-backoff retries for transient fetch failures.
- `src/errorUtils.ts` classifies retryable errors and builds concise error summaries.

## Telegram Bot Setup (BotFather)

1. Open Telegram and start a chat with [@BotFather](https://t.me/BotFather).
2. Run `/newbot`.
3. Follow prompts and choose:
   - Bot display name
   - Unique bot username ending with `bot`
4. Copy the bot token from BotFather.
5. Save it as GitHub secret `TELEGRAM_BOT_TOKEN`.

## Get Your Telegram Chat ID

Use one of these methods:

- **Direct chat with the bot**
  1. Open your bot chat and send any message (for example, `hello`).
  2. Open: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
  3. Find `message.chat.id` in the JSON response.

- **Group chat**
  1. Add your bot to a group and send a message in that group.
  2. Call `getUpdates` as above.
  3. Use the group `chat.id` (often negative, e.g. `-100...`).

Save this value as GitHub secret `TELEGRAM_CHAT_ID`.

## GitHub Secrets

In your repository, go to **Settings -> Secrets and variables -> Actions** and add:

- `TELEGRAM_BOT_TOKEN` - Bot token from BotFather
- `TELEGRAM_CHAT_ID` - Chat/group ID to receive notifications
- `FORUM_URL` - Forum topic URL (with or without page segment, both are supported)

## CSS Selectors You Must Adjust

Open `src/forumParser.ts` and review these clearly marked sections:

- Pagination selector in `getLastPageNumber()`:
  - currently uses `.pageNav-main .pageNav-page a[href]`
- Comment selector in `extractComments()`:
  - currently uses `article.message--post.js-post`

If your forum uses different HTML, update those selectors accordingly.

## Initial State File

`state.json` starts as:

```json
{"lastSeenPostId": null, "lastSeenPage": null}
```

The scraper keeps only latest values (`lastSeenPostId`, `lastSeenPage`), so the file does not grow over time.

## Workflow Triggers

- Automatic: every 10 minutes (`*/10 * * * *`)
- Manual: GitHub Actions `workflow_dispatch`

## Failure Handling and Pause

- Retry policy:
  - retryable: HTTP `429`, HTTP `5xx`, network timeout/reset/DNS errors
  - max attempts: `3`
  - delay between attempts: exponential backoff (`2s`, `4s`, `8s`...) with jitter (capped at `30s`)
- On terminal failure:
  - scraper sends an operational error message to Telegram
  - workflow sets `.scraper-paused.json` to paused and commits it
- While paused:
  - scheduled runs are skipped (workflow exits early)
- Manual resume:
  - run `workflow_dispatch`
  - if successful, workflow clears pause flag and commits it

## Local Run (Optional)

```bash
npm install
cp .env.example .env
# fill TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, FORUM_URL in .env
npm run build
node dist/scraper.js
```

## Notes

- The workflow commits `state.json` only if it changed.
- Ensure bot/chat permissions are correct (especially for groups).
