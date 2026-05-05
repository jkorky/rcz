import path from "path";
import dotenv from "dotenv";
import { sendOperationalAlert } from "./src/telegramNotifier";
import { isRetryableError, summarizeError } from "./src/errorUtils";
import { describeRetryPolicy } from "./src/retryPolicy";
import { runScraper } from "./src/scrapeRunner";

const DEFAULT_FORUM_URL = "https://www.example.com/forum/topic?page=1";

// Load local env file for development. GitHub Actions uses repository secrets.
dotenv.config({ path: path.join(process.cwd(), ".env") });

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function main(): Promise<void> {
  const token = requireEnv("TELEGRAM_BOT_TOKEN");
  const chatId = requireEnv("TELEGRAM_CHAT_ID");
  const baseUrl = requireEnv("FORUM_URL", DEFAULT_FORUM_URL);

  try {
    await runScraper(token, chatId, baseUrl);
  } catch (error: unknown) {
    const retryClass = isRetryableError(error) ? "retryable-site-error" : "non-retryable-error";
    const retryPolicy = describeRetryPolicy();
    const summary = summarizeError(error);
    try {
      await sendOperationalAlert(
        token,
        chatId,
        `Scraper failure (${retryClass})\n${summary}\n${retryPolicy}`
      );
    } catch (_) {
      // Ignore alerting failures; main error handling below still fails the run.
    }
    throw error;
  }
}

main().catch((error: unknown) => {
  const message = summarizeError(error);
  console.error("Scraper run failed:", message);
  process.exitCode = 1;
});
