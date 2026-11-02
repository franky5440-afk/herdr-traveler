#!/usr/bin/env node
// Claude Code statusLine: writes this session's context and 5-hour quota to a
// cache file for the traveler mod. Prints nothing. Reads no credentials.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const pct = (v) => (typeof v === "number" && v >= 0 && v <= 100 ? v : null);

function main() {
  const id = process.env.HC_TERMINAL_ID ?? "";
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(id)) return;

  let raw;
  try {
    raw = JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return;
  }

  const context = pct(raw?.context_window?.remaining_percentage);
  const used = pct(raw?.rate_limits?.five_hour?.used_percentage);
  const data = {
    updatedAt: Math.floor(Date.now() / 1000),
    contextRemainingPct: context === null ? null : Math.round(context),
    fiveHourRemainingPct: used === null ? null : Math.round(100 - used),
  };

  const dir = process.env.TRAVELER_CACHE_DIR
    || join(homedir(), ".config/herdr-app/data/traveler/sessions");
  mkdirSync(dir, { recursive: true });
  const tmp = join(dir, `.${id}.${process.pid}.tmp`);
  writeFileSync(tmp, JSON.stringify(data), { mode: 0o600 });
  renameSync(tmp, join(dir, `${id}.json`));
}

try {
  main();
} catch {
  // A status line must never disturb the session.
}
