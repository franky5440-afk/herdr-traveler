#!/usr/bin/env node
// Claude Code statusLine: writes this session's context, 5-hour quota and session
// name to a cache file for the traveler mod. Prints nothing. Reads no credentials.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// Same rule as cleanName in mods/traveler-agents/lib.js.
const name = (v) => {
  if (typeof v !== "string") return null;
  const s = v.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/g, "").replace(/\s+/g, " ").trim();
  return s === "" ? null : [...s].slice(0, 80).join("");
};
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
    sessionName: name(raw?.session_name),
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
