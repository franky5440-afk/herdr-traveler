#!/usr/bin/env node
// 把 codex／opencode builder 正在用的模型與 effort 寫進旅人卡片的快取。
// 由 launchd 每 60 秒跑一次；MOD 只讀快取，這裡不碰憑證、也不解析對話內容。
// 讀不到就寫 null，不猜。任何錯誤都安靜結束，不印東西。
import { execFile } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);

// 本機終端機代號：跟 scripts/traveler-statusline.mjs 寫檔名的規則一致，不收路徑字元。
const LOCAL_ID = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
// 只有這兩種 builder 有模型來源；claude-code 走 statusLine 自己寫。
const KINDS = new Set(["codex", "opencode"]);
// codex 的互動式 session 只認 pane 裡那一種 originator（白名單，完全相等）。
// plugin、codex exec 等其他來源即使在同一個目錄也不算 builder：顯示錯的模型比不顯示更糟。
const BUILDER_ORIGINATOR = "codex-tui";

// 跟 mods/traveler-agents/lib.js 的 cleanText 同一套規則：去掉控制字元與方向控制字元、
// 收斂空白、去頭尾，最多 40 字。
const clean = (value) => {
  if (typeof value !== "string") return null;
  const s = value.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/g, "").replace(/\s+/g, " ").trim();
  return s === "" ? null : [...s].slice(0, 40).join("");
};

// 讀不到就當作沒有：這裡的檔案可能被同時寫入或已刪除。
function readText(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

// builder 開 pane 時寫的 key=value 檔。只認 kind、pane、dir、started，
// 值是空字串或缺欄位一律當作這份狀態不能用。
export function parseBuilderState(text) {
  if (typeof text !== "string") return null;
  const fields = new Map();
  for (const raw of text.split("\n")) {
    const line = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
    const at = line.indexOf("=");
    if (at <= 0) continue; // 空行、沒有 =、= 開頭的行都不是欄位
    const key = line.slice(0, at).trim();
    if (fields.has(key)) continue; // 同一個鍵只認第一次，後面的不覆蓋
    fields.set(key, line.slice(at + 1).trim());
  }
  const kind = fields.get("kind");
  if (!KINDS.has(kind)) return null;
  const pane = fields.get("pane");
  if (typeof pane !== "string" || !LOCAL_ID.test(pane)) return null;
  const dir = fields.get("dir");
  // 相對路徑在 launchd 底下沒有意義，也對不上 rollout 的 cwd。
  if (typeof dir !== "string" || !dir.startsWith("/")) return null;
  const started = Date.parse(fields.get("started") ?? "");
  if (!Number.isFinite(started) || started <= 0) return null;
  return { kind, pane, dir, started: Math.floor(started / 1000) };
}

// codex 的 rollout：只讀 session_meta（第一筆）與 turn_context，其他行是對話內容，直接跳過。
// 對不上目錄、開始時間或互動式 session 就不是這個 builder 的檔案。
export function codexFromRollout(text, dir, startedAt) {
  if (typeof text !== "string" || text === "") return null;
  let meta = null;
  let model = null;
  let effort = null;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (line === "" || line[0] !== "{") continue; // 壞行跳過，不讓它擋掉後面的行
    let record;
    try {
      record = JSON.parse(line);
    } catch {
      continue;
    }
    const payload = record?.payload;
    if (payload === null || typeof payload !== "object" || Array.isArray(payload)) continue;
    if (record.type === "session_meta") {
      if (meta === null) meta = payload;
      continue;
    }
    if (record.type === "turn_context") {
      // 使用者中途換模型時以最後一筆為準；缺欄位就是 null。
      model = clean(payload.model);
      effort = clean(payload.effort);
    }
  }
  if (meta === null || meta.cwd !== dir) return null;
  // 白名單：originator 必須完全等於 codex-tui（大小寫、前後都不放寬）。
  if (meta.originator !== BUILDER_ORIGINATOR) return null;
  const at = Date.parse(meta.timestamp);
  if (!Number.isFinite(at) || at < startedAt * 1000) return null;
  return { model, effort, startedAt: at / 1000 };
}

// opencode 的 session_v2 row：只認這個目錄、builder 開始之後、沒有 parent 的主 session。
function opencodeModel(text) {
  if (typeof text !== "string") return null;
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (data === null || typeof data !== "object" || Array.isArray(data)) return null;
  const model = clean(data.id);
  if (model === null) return null;
  // variant 就是 effort；default 等於「沒選過」，寫 null，不要當成 effort 名字。
  const variant = clean(data.variant);
  return { model, effort: variant === "default" ? null : variant };
}

export function opencodeFromRows(rows, dir, startedAt) {
  if (!Array.isArray(rows)) return null;
  let best = null;
  for (const row of rows) {
    if (row === null || typeof row !== "object") continue;
    if (row.directory !== dir) continue;
    if (row.parent_id !== null && row.parent_id !== undefined) continue;
    const at = row.time_updated;
    if (typeof at !== "number" || !Number.isFinite(at) || at < startedAt * 1000) continue;
    const found = opencodeModel(row.model);
    if (found === null) continue; // 這筆讀不出模型就跳過，別蓋掉讀得到的
    if (best === null || at > best.at) best = { at, model: found.model, effort: found.effort };
  }
  return best === null ? null : { model: best.model, effort: best.effort };
}

// $CODEX_HOME/sessions/YYYY/MM/DD/rollout-*.jsonl：只收檔名對得上的檔案與最後修改時間。
function listRollouts(codexHome) {
  const out = [];
  const walk = (dir, depth) => {
    if (depth > 4) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(path, depth + 1);
        continue;
      }
      if (!entry.isFile() || !entry.name.startsWith("rollout-") || !entry.name.endsWith(".jsonl")) continue;
      try {
        out.push({ path, mtime: Math.floor(statSync(path).mtimeMs / 1000) });
      } catch {
        // 讀不到的檔案就跳過
      }
    }
  };
  walk(join(codexHome, "sessions"), 0);
  return out;
}

// opencode 的資料庫：唯讀開啟，只查 session_v2 的四個欄位。
async function readOpencodeRows(path) {
  let DatabaseSync;
  try {
    ({ DatabaseSync } = await import("node:sqlite"));
  } catch {
    return [];
  }
  let db;
  try {
    db = new DatabaseSync(path, { readOnly: true });
    return db.prepare("SELECT directory, parent_id, model, time_updated FROM session_v2").all();
  } catch {
    return [];
  } finally {
    try {
      db?.close();
    } catch {
      // 關不掉就算了
    }
  }
}

const cacheBody = (now, found) => ({
  updatedAt: now,
  contextRemainingPct: null,
  fiveHourRemainingPct: null,
  sessionName: null,
  model: found?.model ?? null,
  effort: found?.effort ?? null,
});

// 主流程：看 Herdr 說哪些 builder 還活著，把模型寫進快取，回傳寫了哪些。
export async function collect(options = {}) {
  const { stateDir, cacheDir, codexHome, opencodeDb, live, now } = options;
  const written = [];
  if (typeof stateDir !== "string" || typeof cacheDir !== "string" || !Array.isArray(live)) return written;
  const updatedAt = typeof now === "number" && Number.isFinite(now) ? now : Math.floor(Date.now() / 1000);

  // 只認活著、種類對得上、狀態檔自己說得清楚的那幾台。
  const builders = [];
  const seen = new Set();
  for (const terminal of live) {
    if (terminal === null || typeof terminal !== "object") continue;
    const { address, agent } = terminal;
    if (typeof address !== "string" || !LOCAL_ID.test(address)) continue;
    if (!KINDS.has(agent)) continue;
    if (seen.has(address)) continue;
    seen.add(address);
    const state = parseBuilderState(readText(join(stateDir, address)));
    if (state === null || state.kind !== agent || state.pane !== address) continue;
    builders.push({ address, kind: agent, dir: state.dir, started: state.started });
  }
  if (builders.length === 0) return written;

  // 同一個目錄同時有兩台同種 builder：分不出哪份 session 是哪一台，兩台都寫 null。
  const same = new Map();
  for (const b of builders) {
    const key = `${b.kind}\n${b.dir}`;
    same.set(key, (same.get(key) ?? 0) + 1);
  }

  const rollouts = builders.some((b) => b.kind === "codex") && typeof codexHome === "string"
    ? listRollouts(codexHome)
    : [];
  const ocRows = builders.some((b) => b.kind === "opencode") && typeof opencodeDb === "string"
    ? await readOpencodeRows(opencodeDb)
    : [];

  for (const b of builders) {
    let found = null;
    if (same.get(`${b.kind}\n${b.dir}`) === 1) {
      if (b.kind === "codex") {
        // 候選檔案要新到 builder 開始之後；多筆都對得上時取 session 開始時間最新的那筆。
        for (const file of rollouts) {
          if (file.mtime < b.started) continue;
          const parsed = codexFromRollout(readText(file.path), b.dir, b.started);
          if (parsed !== null && (found === null || parsed.startedAt > found.startedAt)) found = parsed;
        }
      } else {
        found = opencodeFromRows(ocRows, b.dir, b.started);
      }
    }
    try {
      mkdirSync(cacheDir, { recursive: true });
      const tmp = join(cacheDir, `.${b.address}.${process.pid}.tmp`);
      writeFileSync(tmp, JSON.stringify(cacheBody(updatedAt, found)), { mode: 0o600 });
      renameSync(tmp, join(cacheDir, `${b.address}.json`));
      written.push(b.address);
    } catch {
      // 寫不進去就跳過這一台，不要讓它擋住其他台。
    }
  }
  return written;
}

// Herdr 的 terminal 清單；問不到就整輪不做，免得把還活著的 builder 蓋成 null。
async function liveTerminals(hc) {
  try {
    const { stdout } = await run(hc, ["ls", "--json"], { timeout: 10000, maxBuffer: 8 * 1024 * 1024 });
    const terminals = JSON.parse(stdout)?.terminals;
    if (!Array.isArray(terminals)) return null;
    return terminals
      .filter((t) => t !== null && typeof t === "object" && typeof t.address === "string" && typeof t.agent === "string")
      .map((t) => ({ address: t.address, agent: t.agent }));
  } catch {
    return null;
  }
}

async function main() {
  // node:sqlite 還是實驗功能，載入時會印警告；launchd 每 60 秒一次會把 log 洗掉。
  process.removeAllListeners("warning");
  process.on("warning", () => {});

  const home = homedir();
  const live = await liveTerminals(join(home, ".local/bin/hc"));
  if (live === null) return;
  await collect({
    stateDir: join(home, ".cache/builder-state"),
    cacheDir: process.env.TRAVELER_CACHE_DIR || join(home, ".config/herdr-app/data/traveler/sessions"),
    codexHome: process.env.CODEX_HOME || join(home, ".codex"),
    opencodeDb: join(home, ".local/share/opencode/opencode.db"),
    live,
    now: Math.floor(Date.now() / 1000),
  });
}

// 只有直接執行才跑；被 import 時不能有副作用。
function isMain() {
  if (typeof process.argv[1] !== "string") return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isMain()) {
  main().catch(() => {
    // 安靜結束：這是每 60 秒跑一次的排程，不該吵到任何人。
  });
}
