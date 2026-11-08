# Traveler 旅人

[English](README.md) · **繁體中文** · [日本語](README.ja.md)

把 Herdr 視窗變成像素 RPG。Agent 是隊伍成員，Machine 是建築，側欄是一整幅黃昏小鎮。

![Traveler](preview.png)

![八位隊員工作、休息、叫你的樣子](docs/sprites.gif)

## 功能

- **隊伍卡片：** 每個 agent 是會動的全身像素角色，依狀態工作、休息或揮手叫你，並顯示 HP（剩餘 context）、SP（5 小時額度剩餘）和 Claude Code 的 session 名稱。
- **一眼分出是誰：** 每張卡片有程式標籤（Claude 金色，Codex、OpenCode 紫色），加上它用的模型與 effort，例如 `Opus 5.5 · high`。
- **建築：** 每台 Machine 的 Space 配皇宮、豪宅、教會或圓形鬥技場。
- **Git 一眼看：** 未 commit 的檔案、未 push 的 commit、沒接遠端的 repo，加總 Space 內每個終端機的資料夾。
- **頭像分頁：** 每個分頁都顯示 agent 的臉。
- **收件匣面板：** 和 Files、Changes 並列，列出丟進資料夾的檔案，點一下開啟；按右鍵可以複製到桌面或丟到垃圾桶（僅支援 macOS）。

## 安裝

在 Herdr 裡跟 agent 說：

> Add the layout from https://github.com/franky5440-afk/herdr-traveler. Read RECIPE.md first.

或在 repo 資料夾手動安裝：

```sh
H=~/.config/herdr-app
cp layouts/traveler.* "$H/layouts/"
cp themes/traveler-dusk.json "$H/themes/"
cp -R mods/* "$H/mods/"
herdr-app do layout.switch '{"name":"traveler"}'
```

名稱撞到時不要覆蓋自己的檔案，先改名。

更新時：上面的步驟會蓋掉 `mods/traveler-agents/jobs.json` 和 `mods/traveler-spaces/places.json`，請先備份這兩個檔案，裝完再放回去。也可以用下面這行更新 mods，不碰這兩個檔：

```sh
H=~/.config/herdr-app
rsync -a --exclude jobs.json --exclude places.json mods/ "$H/mods/"
```

## 自訂

- **頭像：** 改 `mods/traveler-agents/jobs.json`，分頁和卡片共用這一份。分頁名稱對應 `warrior`、`merchant`、`thief`、`cleric`、`scholar`、`hunter`、`apothecary`、`dancer`；沒列到的會自動配還沒被用掉的角色，八位用完才會重複。
- **建築：** 改 `mods/traveler-spaces/places.json`，例如 `{"My Mac": "palace"}`。可選 `palace`、`mansion`、`church`、`colosseum`。
- **換圖：** prompt 在 [docs/ART-PROMPTS.md](docs/ART-PROMPTS.md)。
- **每台機器頭像一致：** 頭像由分頁名稱和該機器的 `jobs.json` 決定，把同一份 `jobs.json` 複製到每台機器就好。
- **音效：** 這個版面不附音效，請用自己的。把 MP3 放到 `~/.config/herdr-app/sounds/`，再把下面這段加進 `~/.config/herdr-app/settings.json`，其他設定保留。`done` 在 agent 完成時播放，`blocked` 在它需要你時播放。到 Settings > Alerts 按 Play 試聽。音效屬於個人設定，換版面後還在；請使用你有權使用的檔案。

  ```json
  "sounds": { "enabled": true, "done": "sounds/done.mp3", "blocked": "sounds/blocked.mp3" }
  ```

## HP 和 SP（選用，Claude Code）

複製腳本，再設成 Claude Code 的 status line：

```sh
mkdir -p ~/.config/herdr-app/data/traveler
cp scripts/traveler-statusline.mjs ~/.config/herdr-app/data/traveler/statusline.mjs
```

```json
{ "statusLine": { "type": "command", "command": "node ~/.config/herdr-app/data/traveler/statusline.mjs", "refreshInterval": 60 } }
```

加進 `~/.claude/settings.json`。原本已有 status line 的話會被取代。腳本只存數字、session 名稱（用 `/rename` 取的）、模型名稱與 effort；沒裝時 HP、SP 顯示 `—`。其他機器上的 agent，要在那台也裝這個腳本；卡片每分鐘透過 Herdr 的連線讀一次。

## Codex 與 OpenCode 的模型與 effort（選用，請先看警告）

Claude Code 的卡片由上面的 status line 腳本取得模型與 effort。Codex 和 OpenCode 沒有 status line，所以由 `scripts/traveler-builder-models.mjs` 每分鐘查一次。沒裝的話，這兩種卡片只顯示標籤。

> [!WARNING]
> **安裝前請先讀過這支腳本。** 為了找出模型，它會讀存有你完整對話的檔案（Codex 的 `~/.codex/sessions/**/rollout-*.jsonl`），以及 OpenCode 的資料庫（`~/.local/share/opencode/opencode.db`），這個資料庫裡也存著你的服務商憑證。它只留兩個字串：模型名稱與 effort。Codex 只解析 `session_meta` 與 `turn_context` 兩種行；OpenCode 資料庫以唯讀開啟，只查 `session_v2` 表。它只執行 `~/.local/bin/hc ls --json`，不連網，只寫 `~/.config/herdr-app/data/traveler/sessions/<終端機代號>.json`。覺得權限太大就跳過這一節。

它要知道哪個終端機在哪個資料夾跑哪種 agent，所以請用一支小的啟動腳本開 Codex 或 OpenCode，先寫一份 `~/.cache/builder-state/<終端機代號>`：

```sh
#!/bin/sh
# my-codex <folder>   (for OpenCode: kind=opencode and exec opencode)
d=$(cd "${1:-.}" && pwd -P); id=$HC_TERMINAL_ID
mkdir -p ~/.cache/builder-state
printf 'kind=codex\npane=%s\ndir=%s\nstarted=%s\n' "$id" "$d" "$(date +%Y-%m-%dT%H:%M:%S%z)" > ~/.cache/builder-state/"$id"
cd "$d" && exec codex
```

再安裝腳本，用 launchd 每分鐘跑一次（macOS；`node:sqlite` 需要 Node 22.13 以上）：

```sh
cp scripts/traveler-builder-models.mjs ~/.config/herdr-app/data/traveler/builder-models.mjs
NODE=$(command -v node)
cat > ~/Library/LaunchAgents/dev.herdr-traveler.builder-models.plist <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>dev.herdr-traveler.builder-models</string>
  <key>ProgramArguments</key><array>
    <string>$NODE</string><string>--no-warnings</string>
    <string>$HOME/.config/herdr-app/data/traveler/builder-models.mjs</string>
  </array>
  <key>StartInterval</key><integer>60</integer>
  <key>RunAtLoad</key><true/>
</dict></plist>
EOF
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/dev.herdr-traveler.builder-models.plist
```

限制：Codex 只認從那個終端機互動開的 session（`originator` 是 `codex-tui`），而且資料夾要完全相同。同一個資料夾同時開兩個同種 agent 分不出來，兩張卡都不顯示模型。OpenCode 的 `default` effort 視為沒有 effort。

## 解除安裝

```sh
H=~/.config/herdr-app
herdr-app do layout.switch '{"name":"main"}'
rm -rf "$H"/mods/traveler-agents "$H"/mods/traveler-chrome "$H"/mods/traveler-spaces "$H"/mods/traveler-tabs "$H"/mods/inbox
rm -rf "$H"/data/traveler-agents "$H"/data/traveler-chrome "$H"/data/traveler-spaces "$H"/data/traveler-tabs "$H"/data/traveler "$H"/data/inbox
rm -f "$H"/layouts/traveler.json "$H"/layouts/traveler.png "$H"/layouts/.state/traveler.json "$H"/themes/traveler-dusk.json
launchctl bootout gui/$(id -u)/dev.herdr-traveler.builder-models 2>/dev/null
rm -f ~/Library/LaunchAgents/dev.herdr-traveler.builder-models.plist
```

收件匣資料夾裡的檔案也會一起刪掉，要留的請先搬走。Herdr 自己的 `seen.json` 會留下 MOD 名稱，不影響使用。

## 它會在你的電腦上做什麼

- `traveler-spaces` 會自動在每個終端機所在的資料夾跑 `git`，並跑 `hc machine ls`。已連線的遠端機器，Herdr 會在那台執行。
- `inbox` 會跑 `mkdir`、`find`、`stat`、`open`、`cp`（複製到桌面，不覆蓋）、`trash`（丟到垃圾桶）。
- 所有 MOD 都不會自己開網路連線，也不讀憑證。
- 選用的 `traveler-builder-models.mjs` 在 Herdr 外執行，會照上面說的讀 Codex 對話檔與 OpenCode 資料庫，並執行 `hc ls --json`。
- **不要在不信任的 repo 裡開終端機。** `git status` 可能執行該 repo 自己 `.git/config` 裡的 filter，例如下載的壓縮檔裡帶有 `.git`。藏在 clone 裡的 bare repo 已被擋下。

## 授權與圖片

程式碼採 Apache 2.0，見 [LICENSE](LICENSE) 與 [NOTICE](NOTICE)。`traveler-spaces`、`traveler-tabs`、`traveler-chrome` 是修改過的 Herdr 自帶 MOD。

圖片由 Meta AI 生成，**不在** Apache 授權範圍內，見 [ART-NOTICE.md](ART-NOTICE.md)。角色都是原創設計。本專案與 Herdr 及任何遊戲公司無關。
