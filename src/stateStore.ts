import fs from "fs/promises";
import path from "path";
import type { State } from "./types";

const STATE_FILE = path.join(process.cwd(), "state.json");

export async function readState(): Promise<State> {
  try {
    const raw = await fs.readFile(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw) as State;
    return {
      lastSeenPostId: parsed.lastSeenPostId ?? null,
      lastSeenPage: parsed.lastSeenPage ?? null
    };
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return { lastSeenPostId: null, lastSeenPage: null };
    }
    throw error;
  }
}

export async function writeState(lastSeenPostId: number, lastSeenPage: number): Promise<void> {
  await fs.writeFile(STATE_FILE, JSON.stringify({ lastSeenPostId, lastSeenPage }), "utf8");
}
