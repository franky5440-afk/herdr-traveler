# Traveler

[English](README.md) · [繁體中文](README.zh-TW.md) · **日本語**

Herdr のウィンドウをピクセル RPG に変えるレイアウトです。エージェントはパーティーの仲間に、マシンは建物に、サイドバーは夕暮れの町の一枚絵になります。

![Traveler](preview.png)

## 機能

- **パーティーカード:** エージェントごとに顔グラフィック、状態、HP(残りコンテキスト)、SP(5 時間枠の残量)を表示します。
- **建物:** マシンの Space ごとに宮殿、屋敷、教会、闘技場のいずれかを割り当てます。
- **Git の状況:** 未コミットのファイル、未プッシュのコミット、リモートのないリポジトリを、Space 内の全ターミナルのフォルダーについて集計します。
- **顔グラフィック付きタブ:** 各タブにエージェントの顔を表示します。
- **受信箱パネル:** Files、Changes と並び、フォルダーに入れたファイルを一覧にしてクリックで開きます(開くのは macOS のみ)。

## インストール

Herdr の中でエージェントに次のように頼みます。

> Add the layout from https://github.com/franky5440-afk/herdr-traveler. Read RECIPE.md first.

手動の場合は、リポジトリのフォルダーで実行します。

```sh
H=~/.config/herdr-app
cp layouts/traveler.* "$H/layouts/"
cp themes/traveler-dusk.json "$H/themes/"
cp -R mods/* "$H/mods/"
herdr-app do layout.switch '{"name":"traveler"}'
```

名前が重なる場合は、自分のファイルを上書きせず、先に名前を変更してください。

## カスタマイズ

- **顔グラフィック:** `mods/traveler-agents/jobs.json` を編集します。タブとカードで共通です。タブ名に `warrior`、`merchant`、`thief`、`cleric`、`scholar`、`hunter`、`apothecary`、`dancer` を対応させます。一覧にないタブには、名前から固定で割り当てます。
- **建物:** `mods/traveler-spaces/places.json` を編集します。例: `{"My Mac": "palace"}`。選択肢は `palace`、`mansion`、`church`、`colosseum` です。
- **新しい画像:** プロンプトは [docs/ART-PROMPTS.md](docs/ART-PROMPTS.md) にあります。
- **全マシンで同じ顔にする:** 顔グラフィックはタブ名とそのマシンの `jobs.json` で決まります。同じ `jobs.json` を各マシンにコピーしてください。

## HP と SP(任意、Claude Code)

スクリプトをコピーし、Claude Code のステータスラインに設定します。

```sh
mkdir -p ~/.config/herdr-app/data/traveler
cp scripts/traveler-statusline.mjs ~/.config/herdr-app/data/traveler/statusline.mjs
```

```json
{ "statusLine": { "type": "command", "command": "node ~/.config/herdr-app/data/traveler/statusline.mjs", "refreshInterval": 60 } }
```

これを `~/.claude/settings.json` に追加します。既存のステータスラインは置き換えられます。スクリプトが保存するのは数値だけです。設定しない場合、HP と SP は `—` と表示されます。

## アンインストール

```sh
H=~/.config/herdr-app
herdr-app do layout.switch '{"name":"main"}'
rm -rf "$H"/mods/traveler-agents "$H"/mods/traveler-chrome "$H"/mods/traveler-spaces "$H"/mods/traveler-tabs "$H"/mods/inbox
rm -rf "$H"/data/traveler-agents "$H"/data/traveler-chrome "$H"/data/traveler-spaces "$H"/data/traveler-tabs "$H"/data/traveler "$H"/data/inbox
rm -f "$H"/layouts/traveler.json "$H"/layouts/traveler.png "$H"/layouts/.state/traveler.json "$H"/themes/traveler-dusk.json
```

受信箱フォルダー内のファイルも削除されます。残したいものは先に移動してください。Herdr 自身の `seen.json` には MOD 名が残りますが、影響はありません。

## お使いのマシンで行うこと

- `traveler-spaces` はすべてのターミナルのフォルダーで `git` を自動実行し、`hc machine ls` も実行します。接続中のリモートマシンでは、Herdr がそのマシンで実行します。
- `inbox` は `mkdir`、`find`、`stat`、`open` を実行します。
- どの MOD も自らネットワーク接続を開かず、認証情報も読みません。
- **信頼できないリポジトリの中でターミナルを開かないでください。** `git status` は、そのリポジトリ自身の `.git/config` にあるフィルターを実行することがあります(`.git` を含むダウンロードしたアーカイブなど)。クローン内に隠された bare リポジトリはブロックされます。

## ライセンスと画像

コードは Apache 2.0 です。[LICENSE](LICENSE) と [NOTICE](NOTICE) をご覧ください。`traveler-spaces`、`traveler-tabs`、`traveler-chrome` は Herdr 標準 MOD の改変版です。

画像は Meta AI で生成したもので、Apache ライセンスの対象**外**です。[ART-NOTICE.md](ART-NOTICE.md) をご覧ください。キャラクターはすべてオリジナルです。本プロジェクトは Herdr やゲーム会社とは関係ありません。
