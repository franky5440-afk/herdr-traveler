# 旅人風格素材 prompt

用 Meta AI 生成。人物是原創設計。背景用純綠，生成後要自己去背。

## 授權

圖片不在 Apache 授權範圍內，見 `ART-NOTICE.md`。

## 規格

| 素材 | 比例 | 背景 | 檔名 |
|---|---|---|---|
| 人物 8 張 | 1:1 | 純綠，之後去背 | `art/<職業>.png` |
| 桌布 | 16:9 | 完整場景 | `art/wallpaper.png` |
| 建築頭像 4 張 | 1:1 | 純綠，之後去背 | `art/<建築>.png`（簡單版）、`art/<建築>2.png`（細緻版） |
| 右上圖示 | 1:1 | 純綠，之後去背 | `art/book.png`、`art/ship.png`、`art/portal.png` |

## 人物：通用段

每張都先貼這段，再接該職業的一行。

```
Pixel art character bust portrait, high resolution detailed 32-bit JRPG sprite style, hand-placed pixels, limited rich palette, soft dramatic rim light from upper left, warm gold highlights and deep indigo shadows, head and shoulders visible, three-quarter view facing right, centered, plain solid pure green background (#00FF00), no text, no logo, no border, no frame, no scenery. Medieval fantasy traveler.
```

## 人物：各職業

```
warrior: weathered middle-aged swordsman, short grey-streaked hair, scarred steel pauldrons over a worn crimson tabard, greatsword hilt behind the shoulder, steady calm expression.
merchant: cheerful young woman trader, auburn braid, feathered travel cap, teal coat with brass buttons, leather satchel strap, small brass scales in hand.
thief: lean silver-haired young man, sharp eyes, dark hooded cloak with violet lining, cloth scarf over the chin, small curved dagger held low.
cleric: gentle young woman priestess, long pale blonde hair, white and gold hooded robe, holding a slim silver staff with a lantern, serene expression.
scholar: tall bespectacled man in his thirties, neat dark hair, deep blue academic coat with gold trim, open old book in one hand, curious smile.
hunter: fierce young huntress, ash-blonde hair tied back, fur-trimmed green leather armor, longbow across the back, a feather charm, focused gaze.
apothecary: friendly young man healer, messy brown hair, cream shirt under an olive vest, belt of glass vials, mortar and pestle in hand.
dancer: elegant woman dancer, long black hair, crimson and gold silk veil, gold jewelry, poised confident look, one hand raised gracefully.
```

## 桌布

```
Wide 16:9 pixel art landscape in the style of a modern HD-2D JRPG background: a quiet medieval fantasy town at dusk on a cliff, stone bridge and distant castle spires, warm lantern windows, drifting embers, deep indigo sky fading to amber at the horizon, shallow depth of field with blurred foreground foliage, soft bloom on the lights, tilt-shift diorama feel, low contrast and dark overall so text stays readable on top, no characters, no text, no logo, no border.
```

## 建築頭像：通用段

畫面上是 72px 的小圖，要一眼認得出輪廓。每張都先貼這段，再接該建築的一行。

```
Pixel art game icon of a single building, 32-bit JRPG style, visible square pixels, limited palette, warm gold highlights and deep indigo shadows, bold simple silhouette, large and centered, filling most of the frame, few details, plain solid pure green background (#00FF00), no ground, no scenery, no characters, no text, no border. Medieval fantasy.
```

## 建築頭像：各建築

```
palace: royal palace with one tall central golden dome and two slim towers, white walls, blue roofs.
mansion: wide noble manor house with a steep dark red roof, two chimneys, cream walls, glowing yellow windows.
church: stone church with one tall pointed bell tower, a round rose window, grey walls, dark blue roof.
colosseum: round stone colosseum arena seen from slightly above, tall curved wall with rows of dark arches, sandy tan color.
```

## 右上圖示

不用貼通用段，整段直接用。changes 兩個版本擇一。

```
files: Pixel art game icon of one closed thick old book, deep blue leather cover with a gold corner trim, bold simple silhouette, large and centered, few details, visible square pixels, plain solid pure green background (#00FF00), no text, no border.

changes（船）: Pixel art game icon of one small wooden sailing ship seen from the side, single white sail, brown hull, bold simple silhouette, large and centered, few details, visible square pixels, no water, plain solid pure green background (#00FF00), no text, no border.

changes（傳送點）: Pixel art game icon of one round magic portal, glowing violet and blue swirl inside a gold stone ring, bold simple silhouette, large and centered, few details, visible square pixels, plain solid pure green background (#00FF00), no text, no border.
```

## 調整方式

- 人物太像真人插畫：開頭補 `strictly pixel art, visible square pixels, no smooth shading`。
- 背景不是純綠：補 `flat single color background, no gradient, no shadow on background`。
- 八張畫風不一致：用最滿意的一張當參考圖，在同一個對話裡接著生成。
- 桌布太亮：補 `darker, night tones, muted highlights`。
