// 旅人 Agents 卡片：把 agents() 畫成職業肖像卡片，HP/SP 讀 statusLine 寫的快取。
// 只讀快取檔、不跑指令、不連網、不讀對話紀錄與憑證，沒有數字就不畫數字。
import { View, div, image, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { agents, appHome, readTextFile, run, setAgentOrder, spaces, theme, watchFolder } from "herdr";
import { assignJobs, cachePath, gauge, jobIn, parseCache, portraitPath, spritePath, tabNames } from "./lib.js";

const HOME = appHome();
const SESSIONS_DIR = `${HOME}/data/traveler/sessions`;
const JOBS_FILE = `${HOME}/mods/traveler-agents/jobs.json`;
const PIC = 72;
// Full-body sprites are 36x48 pixels at 4x: 72x96 points, two pixels per point on Retina.
const SPRITE_W = 72;
const SPRITE_H = 96;
const STATUS = { working: "Working", blocked: "Needs you", done: "Done", idle: "Idle" };

// 肖像：配到職業就畫肖像圖；沒配到退回程式圖示（單色用 svg、圖片用 image），都沒有就留空。
function portrait(a, assigned, t) {
  const job = jobIn(a.tab_name, assigned);
  const sprite = spritePath(job, a.status);
  if (sprite) return image(sprite).w(SPRITE_W).h(SPRITE_H).flex_none();
  const src = portraitPath(job);
  if (src) return image(src).w(PIC).h(PIC).flex_none();
  const p = a.program;
  if (!p?.icon) return div().w(PIC).h(PIC).flex_none();
  return p.tint
    ? svg(p.icon).size(PIC).flex_none().text_color(t.foreground)
    : image(p.icon).w(PIC).h(PIC).flex_none();
}

// 一條 HP/SP 條：pct 為 null 就不填色、只顯示「—」；過舊的數字旁加「舊」並轉暗。
function bar(label, g, color, t) {
  return h_flex()
    .w_full()
    .min_w(0)
    .h(14)
    .gap(6)
    .items_center()
    .child(div().w(20).flex_none().text_size(10).text_color(t.dim).child(label))
    .child(
      h_flex()
        .flex_1()
        .min_w(0)
        .h(6)
        .bg(t.raised)
        .when(g.pct !== null, (el) => el.child(div().h_full().w(`${g.pct}%`).bg(color))),
    )
    .child(
      div()
        .flex_none()
        .text_size(11)
        .text_color(g.stale ? t.dim : t.foreground)
        .child(g.stale ? `${g.text} old` : g.text),
    );
}

export default class Traveler extends View {
  init(_props, cx) {
    this.jobs = {};
    this.cache = {};
    this.seen = new Set();
    this.watching = false;
    this.loadJobs(cx);
    this.load(cx);
    this.watch(cx);
    // 資料是數字，最多 30 秒看一次就夠；也讓「舊」標記自己出現，順便重試監看。
    cx.timer.every(30000, (cx) => {
      this.load(cx);
      this.watch(cx);
    });
  }

  // 監看快取資料夾：有變更就重讀。資料夾不存在或不被允許時結束迴圈，
  // 交給上面的計時器每 30 秒重試，不會變成緊迴圈。
  watch(cx) {
    if (this.watching) return;
    this.watching = true;
    cx.spawn(async (cx) => {
      let quick = 0;
      for (;;) {
        let changed;
        const started = Date.now();
        try {
          changed = await watchFolder(SESSIONS_DIR);
        } catch {
          break;
        }
        // 立刻回來又沒有任何變更，代表監看沒真的生效，也別讓它空轉。
        quick = Date.now() - started < 500 && (changed ?? []).length === 0 ? quick + 1 : 0;
        if (quick >= 3) break;
        this.load(cx);
      }
      this.watching = false;
    });
  }

  loadJobs(cx) {
    cx.spawn(async (cx) => {
      const text = await readTextFile(JOBS_FILE).catch(() => null);
      let jobs = {};
      try {
        const parsed = JSON.parse(text);
        if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) jobs = parsed;
      } catch {
        jobs = {};
      }
      this.jobs = jobs;
      cx.notify();
    });
  }

  // 每個本機 agent 讀自己那份快取；遠端 agent 沒有本機檔案，畫面顯示「—」。
  load(cx) {
    const wanted = [];
    for (const a of agents()) {
      const path = cachePath(HOME, a.address);
      if (path === null) continue;
      this.seen.add(a.address);
      wanted.push({ address: a.address, path });
    }
    cx.spawn(async (cx) => {
      const next = {};
      for (const w of wanted) {
        const text = await readTextFile(w.path).catch(() => null);
        next[w.address] = parseCache(text);
      }
      this.cache = next;
      cx.notify();
    });
  }

  card(a, now, t) {
    const cache = this.cache[a.address] ?? null;
    const hp = gauge(cache ? cache.hp : null, cache ? cache.updatedAt : null, now);
    const sp = gauge(cache ? cache.sp : null, cache ? cache.updatedAt : null, now);
    // blocked 一眼看得出來：框線與狀態文字都用 t.blocked，蓋過 focused 的 t.accent。
    const frame = a.status === "blocked" ? t.blocked : a.focused ? t.accent : t.border;
    const statusColor = a.status === "blocked" ? t.blocked : t[a.status] ?? t.dim;
    return h_flex()
      .id(`traveler-${a.address}`)
      .w_full()
      .flex_none()
      .p(8)
      .gap(10)
      .items_center()
      .bg(`${t.surface}c8`)
      .border(1)
      .border_color(frame)
      .cursor_pointer()
      .hover((s) => s.bg(t.hover))
      .on_click(() => run("agent.focus", { terminal: a.address }))
      .child(portrait(a, this.assigned, t))
      .child(
        v_flex()
          .flex_1()
          .min_w(0)
          .gap(4)
          .child(
            h_flex()
              .w_full()
              .min_w(0)
              .gap(8)
              .items_center()
              .child(div().flex_1().min_w(0).truncate().font_semibold().child(a.tab_name || a.address))
              .child(div().flex_none().text_size(11).text_color(statusColor).child(STATUS[a.status] ?? a.status)),
          )
          // Session name (set with /rename) under the tab name; takes no row when unset.
          .when(Boolean(cache?.name), (el) =>
            el.child(div().w_full().min_w(0).truncate().text_size(11).text_color(t.dim).child(cache.name)),
          )
          .child(bar("HP", hp, t.accent, t))
          .child(bar("SP", sp, t.solid, t)),
      );
  }

  render(cx) {
    const t = theme();
    const list = agents();
    this.assigned = assignJobs(tabNames(spaces(), list), this.jobs);
    setAgentOrder(list.map((a) => a.address));
    // 剛出現的本機 agent 先補讀一次快取，不用等下一次計時器。
    if (list.some((a) => !this.seen.has(a.address) && cachePath(HOME, a.address) !== null)) this.load(cx);
    const now = Math.floor(Date.now() / 1000);
    return v_flex()
      .id("traveler")
      .size_full()
      .min_h(0)
      .text_color(t.foreground)
      .text_size(13)
      .child(
        v_flex()
          .flex_1()
          .min_h(0)
          .gap(6)
          .p(6)
          .overflow_y_scrollbar()
          .children(list.map((a) => this.card(a, now, t)))
          .when(list.length === 0, (el) =>
            el.child(div().p(8).text_size(12).text_color(t.dim).child("No agents")),
          ),
      );
  }
}
