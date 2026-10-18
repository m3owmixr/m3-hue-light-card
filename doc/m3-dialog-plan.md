# Scene Dialog M3 Restyle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the expanded scene dialog to match the M3 collapsed card: a harmonized surface with a soft top glow, two rows of see-through scene tiles with page dots, full-width light rows with M3 switches.

**Architecture:** The color decisions are pure functions in a new `DialogTint` class (unit-tested). Page-dot maths go in `PageDotsMath`, drawn by a small `m3-page-dots` element. `dialog.ts` keeps its structure (header, two-row scene scroller, lights section, light detail overlay), but swaps its heading gradient for a glow layer, sets the dialog surface through `--ha-dialog-surface-background`, and uses the M3 switch. The tile files are restyled in place; class and file names stay (upstream-merge rule in `CLAUDE.md`).

**Tech Stack:** TypeScript, Lit 3, rollup, jest (ts-jest, jsdom), Home Assistant `ha-dialog` (WebAwesome-based, HA 2026.x).

**Spec:** `doc/m3-dialog-spec.md` (read it first; it's the source of truth for every value below).

## Global Constraints

- Branch `m3-restyle`. Commit after every task, messages per `COMMIT.md` (`type(scope): summary`), ending with the `Co-Authored-By` line from the session's attribution rule.
- Leave `Consts.Dev = true` and `rollup.config.mjs` `var dev = true` as they are.
- Every new custom element name is `<base> + Consts.ElementPostfix`.
- Don't rename `HueLikeLightCard*` / `hue-like-light-card.ts` or the `HueDialog*` classes and files.
- Theme colors come from `--md-sys-*` tokens with HA fallbacks (reuse `Consts.TintSurfaceCss`, `Consts.TintOnSurfaceCss`, add siblings as needed). No hardcoded hex for theme colors.
- No `backdrop-filter` anywhere in the dialog.
- New UI strings go in `src/localize/languages/en_us.json`.
- American spelling in comments and docs.
- Revert unrelated `package-lock.json` churn.
- Every task ends with `npm run lint && npx tsc --noEmit && npm test` green.

## Review Focus

1. **Light theme:** the glow must not flip the text color or look washed out on a light surface. Pinned by the light-surface cases in Task 1's `never flips the foreground` test, and checked by eye in Task 7.
2. **Lights without brightness (on/off only) or unavailable:** the row status reads "On" or "Unavailable" (not "100%" or "Off"), and the switch is disabled when unavailable. Pinned by Task 6's `statusText` tests.
3. **Theme without Material You tokens** (`getTintSurface` returns null): no crash, base is the plain theme surface, glow uses the raw colors. Pinned by Task 1's `null surface` test.
4. **Zero scenes, or scenes that fit on one page:** no dots (and no "My scenes" heading for zero). Pinned by Task 2's `pageCount` tests.
5. **Single-light card:** the Lights section is hidden, and tapping the header title still opens the color wheel. Pinned by Task 6's `showsLightsSection` test, and checked by hand in Task 6.

---

### Task 1: DialogTint color maths

**Files:**
- Create: `src/core/dialog-tint.ts`
- Modify: `src/types/consts.ts` (new constants after `HarmonizedTintAmountMin`)
- Modify: `src/core/view-utils.ts` (`calculateBackAndForeground` gains a `tintScale` parameter)
- Test: `tests/dialog-tint.test.ts`
- Also commit: `doc/m3-dialog-spec.md`, `doc/m3-dialog-plan.md`

**Interfaces:**
- Produces:
  - `Consts.DialogBaseTintFactor = 0.4` (dialog base tint = card amount × 0.4, so 6–18%)
  - `Consts.DialogGlowMix = 0.7` (harmonized glow color = 70% light color mixed into the surface)
  - `Consts.DialogGlowOpacityMin = 0.25`, `Consts.DialogGlowOpacity = 0.6` (glow opacity range, dimmest to brightest, dark theme)
  - `Consts.DialogGlowLightThemeFactor = 0.6` (light theme glow opacity multiplier)
  - `Consts.DialogGlowFullFactor = 1.2`, `Consts.DialogGlowOpacityMax = 0.75` (`tint: full` boost and hard cap)
  - `ViewUtils.calculateBackAndForeground(ctrl, offBackground, assumeShadow = true, defaultColor = offBackground, tintSurface = null, tintScale = 1)`: the mix amount becomes `harmonizedTintAmount(brightness) * tintScale`.
  - `DialogTint.baseAmount(brightness: number): number`
  - `DialogTint.isLightSurface(surface: Color): boolean`: `surface.getLuminance() > 127.5` (`getLuminance()` is 0–255)
  - `DialogTint.glowOpacity(brightness: number, tint: TintType, surface: Color | null): number`: 0 is never returned for an on light; `surface == null` is treated as dark and `full`.
  - `DialogTint.glowBackground(lights: Background, surface: Color | null, tint: TintType): Background`: harmonized with a surface → `lights.mixInto(surface, Consts.DialogGlowMix)`; otherwise `lights` unchanged.
  - `DialogTint.peakColor(light: Color, surface: Color, brightness: number, tint: TintType): Color`: the color where the glow is strongest: `base.mix(glowColor, glowOpacity)`, where `base = surface.mix(light, baseAmount)`.

- [ ] **Step 1: Write the failing tests** in `tests/dialog-tint.test.ts` (style as in `tests/m3-tint.test.ts`):
  - `baseAmount`: `baseAmount(0)` ≈ `0.15 * 0.4`, `baseAmount(100)` ≈ `0.45 * 0.4` (`toBeCloseTo`), clamps below 0 and above 100.
  - `glowOpacity`: dark surface `#2c2831` harmonized gives `0.25` at brightness 0 and `0.6` at 100. Light surface `#f3edf7` gives `0.6 × 0.6 = 0.36` at 100. `full` on a dark surface at 100 gives `min(0.6 × 1.2, 0.75) = 0.72`. Never above `0.75` for any input.
  - `null surface`: `glowOpacity(100, TintType.Harmonized, null)` equals the `full` value. `glowBackground(bg, null, TintType.Harmonized).toString()` equals `bg.toString()`.
  - `glowBackground`: harmonized on `#000000` with light `#ff0000` gives red channel `179` (0.7 × 255, rounded).
  - `never flips the foreground`: for each light in `#ffffff`, `#ff0000`, `#ffff00`, `#00ff00`, `#0000ff`, `#ff8800`, on surfaces `#2c2831` (dark) and `#f3edf7` (light), with both tints, at brightness 100:
    `base.getForeground(true, false, 0) === DialogTint.peakColor(light, surface, 100, tint).getForeground(true, false, 0)`.
    If this fails for some color, lower the opacity constants until it passes. **Don't change the test.**
  - `calculateBackAndForeground tintScale`: an existing on-light mock (see `tests/mockup-*.ts`) on surface `#000000` at `tintScale` 0.4 gives the same color as `surface.mix(light, harmonizedTintAmount(b) * 0.4)`.

- [ ] **Step 2: Run** `npx jest tests/dialog-tint.test.ts`. Expected: FAIL (`Cannot find module '../src/core/dialog-tint'`).

- [ ] **Step 3: Implement** the constants, the `tintScale` parameter and `DialogTint` (static methods, JSDoc in the style of `view-utils.ts`). The existing callers of `calculateBackAndForeground` must stay unchanged.

- [ ] **Step 4: Run** `npx jest tests/dialog-tint.test.ts tests/m3-tint.test.ts`. Expected: PASS. Then run the whole suite: `npm run lint && npx tsc --noEmit && npm test`.

- [ ] **Step 5: Commit**
```bash
git add src/core/dialog-tint.ts src/types/consts.ts src/core/view-utils.ts tests/dialog-tint.test.ts doc/m3-dialog-spec.md doc/m3-dialog-plan.md
git commit -m "feat(dialog): add DialogTint maths for the harmonized dialog surface and glow"
```

### Task 2: Page dots

**Files:**
- Create: `src/core/page-dots-math.ts`, `src/controls/m3-page-dots.ts`
- Modify: `src/localize/languages/en_us.json` (`"dialog.page": "Page %s"`)
- Test: `tests/page-dots.test.ts`

**Interfaces:**
- Produces:
  - `PageDotsMath.pageCount(scrollWidth: number, clientWidth: number): number`: `0` when `clientWidth <= 0` or the content fits (`scrollWidth <= clientWidth + 1`), else `Math.ceil(scrollWidth / clientWidth)`.
  - `PageDotsMath.currentPage(scrollLeft: number, scrollWidth: number, clientWidth: number): number`: 0-based; the last page when scrolled to the end (within 1px), else `Math.round(scrollLeft / clientWidth)`, clamped.
  - `PageDotsMath.pageScrollLeft(page: number, scrollWidth: number, clientWidth: number): number`: `page * clientWidth`, clamped to `[0, scrollWidth - clientWidth]`.
  - Element `M3PageDots`, `ElementName = 'm3-page-dots' + Consts.ElementPostfix`. Properties `count: number`, `current: number`, `labelFormat: string` (`"Page %s"`). It renders nothing when `count < 2`. Otherwise it renders `count` `<button>`s, each with `aria-label` from `labelFormat` (1-based) and `aria-current="true"` on the current one. Clicking fires `page-select` with `CustomEvent<{ page: number }>` (bubbles, composed). Styling: 6px dots in `--md-sys-color-on-surface-variant` at 50% opacity, the current one a 24×6px pill in `var(--m3-page-dots-active-color, <on-surface token>)`, 6px gap. Width transition 200ms, disabled under `prefers-reduced-motion: reduce`. Buttons have a 24px touch target and a visible `:focus-visible` ring.

- [ ] **Step 1: Write the failing tests** in `tests/page-dots.test.ts`:
  - `pageCount(500, 500) === 0`, `pageCount(501, 500) === 0`, `pageCount(1200, 500) === 3`, `pageCount(0, 0) === 0`.
  - `currentPage(0, 1200, 500) === 0`, `currentPage(480, 1200, 500) === 1`, `currentPage(700, 1200, 500) === 2` (at the end), `currentPage(-20, 1200, 500) === 0`.
  - `pageScrollLeft(1, 1200, 500) === 500`, `pageScrollLeft(2, 1200, 500) === 700`, `pageScrollLeft(-1, 1200, 500) === 0`.
  - Element (pattern from `tests/m3-switch.test.ts`): `count = 1` renders no buttons. `count = 4, current = 1` renders 4 buttons with `aria-label` `"Page 2"` and `aria-current="true"` on the second. Clicking the third fires `page-select` with `detail.page === 2`.

- [ ] **Step 2: Run** `npx jest tests/page-dots.test.ts`. Expected: FAIL (module not found).

- [ ] **Step 3: Implement** `PageDotsMath` and `M3PageDots` (Lit element in the style of `m3-switch.ts`).

- [ ] **Step 4: Run** `npx jest tests/page-dots.test.ts`. Expected: PASS. Then run the full check.

- [ ] **Step 5: Commit** `feat(dialog): add M3 page dots for the scene carousel`

### Task 3: `hueScreenBgColor` defaults to the theme surface

**Files:**
- Modify: `src/types/config.ts:122` (and the field and getter near `:320` / `:378`)
- Modify: `doc/configuration.md:44`
- Test: `tests/config-parse.test.ts`

**Interfaces:**
- Produces: `HueLikeLightCardConfig.wasHueScreenBgColorSet: boolean` (true only when the YAML sets `hueScreenBgColor`). `getHueScreenBgColor()` is unchanged. `Consts.DialogBgColor` is still the stored default, so old code paths don't break, but the dialog (Task 4) only uses it when `wasHueScreenBgColorSet` is true.

- [ ] **Step 1: Write the failing tests** in `tests/config-parse.test.ts`: a config without `hueScreenBgColor` gives `wasHueScreenBgColorSet === false`. With `hueScreenBgColor: '#123456'` it gives `true` and `getHueScreenBgColor().getBaseColor().toString()` contains `#123456` (match the format the existing color tests use).
- [ ] **Step 2: Run** `npx jest tests/config-parse.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the flag, following `wasOffColorSet`. In `doc/configuration.md`, change the default column to "theme surface" and the description to: "Background of the scene screen. When not set, the scene screen uses the theme surface (`--md-sys-color-surface-container-high`), tinted by the lights."
- [ ] **Step 4: Run** `npx jest tests/config-parse.test.ts`. Expected: PASS. Then run the full check.
- [ ] **Step 5: Commit** `feat(config): hueScreenBgColor defaults to the theme surface`

### Task 4: Dialog surface, glow and header

**Files:**
- Modify: `src/controls/dialog.ts` (styles at `:300-509`, `tryCreateBackdropAndLightDetail` at `:515`, `updateStylesInner` at `:583`, the header template at `:729-752`)
- Modify: `src/types/theme-helper.ts` (`setDialogThemeStyles`) if needed

**Interfaces:**
- Consumes: `DialogTint.*`, `ViewUtils.calculateBackAndForeground(..., tintSurface, tintScale)` (Task 1). `config.wasHueScreenBgColorSet` (Task 3). `ViewUtils.createM3Switch`, `ViewUtils.createSlider`.
- Produces (CSS custom properties set on the `HueDialog` host, used by Tasks 5 and 6):
  - `--hue-screen-background`: base surface (a color string, or `Consts.TintSurfaceCss` when off or when there's no surface)
  - `--hue-text-color`: foreground (a color, or `Consts.TintOnSurfaceCss`)
  - `--hue-glow-background`: `DialogTint.glowBackground(...).toString()`
  - `--hue-glow-opacity`: number, `0` when all lights are off

Behavior to implement (values from the spec):
- **Width and shape:** on `ha-dialog`, set `--ha-dialog-width-md: 560px`. Drop the `--mdc-dialog-min/max-width` 400/600 lines (HA 2026.x ignores them). Keep the small-screen full-screen block. Set `--ha-dialog-border-radius: var(--md-sys-shape-corner-extra-large, 28px)` unless `hueBorders` is true, in which case the existing 10px rule applies.
- **Surface:** `setDialogThemeStyles` keeps feeding `--ha-dialog-surface-background` from `var(--hue-screen-background, …)`. In `updateStylesInner`:
  - `wasHueScreenBgColorSet` → that color, with the foreground from `getForeground(Consts.DialogFgLightColor, Consts.DarkColor, +120)` as today.
  - Else, lights on and `ThemeHelper.getTintSurface(this)` not null → `calculateBackAndForeground(ctrl, null, false, defaultColorBg, surface, Consts.DialogBaseTintFactor)`. This applies to `tint: full` too (the spec says only the glow changes).
  - Else (off, or no surface) → `Consts.TintSurfaceCss` / `Consts.TintOnSurfaceCss`.
  - `wasOffColorSet` and off → `offColor` as the surface.
  - Recompute on every `updateStylesInner` call, not just `isFirst`, so the surface follows the lights.
- **Glow:** reuse the `#hue-backdrop` element. `background: var(--hue-glow-background)`, `opacity: var(--hue-glow-opacity)`, `transition: Consts.TransitionDefault`, `pointer-events: none`. Replace the linear mask with `radial-gradient(120% 60% at 50% 0%, #000 0%, rgba(0,0,0,.45) 45%, transparent 80%)`. Glow colors: `ctrl.getBackground()` (or the default color) passed through `DialogTint.glowBackground`. Opacity: `DialogTint.glowOpacity(ctrl.brightnessValue, config.tint, surface)` when on, `0` when off.
- **Header:**
  - `.hue-heading` loses its background, box-shadow and rounded bottom corners. It's transparent.
  - Title in headline-small (24px / 32px / 400) in `--hue-text-color`.
  - Replace `createSwitch` with `createM3Switch`. Map `.m3-switch.tinted` to the foreground the same way `hue-like-light-card.ts:314` does (copy those variable mappings).
  - The slider keeps its `.tinted` mapping, using `--hue-text-color`.
  - Delete the `.hue-heading ha-switch` rule.
- **Section headings** (`.header .title`): 12px / 16px / 500 / 0.5px tracking, `var(--md-sys-color-on-surface-variant, var(--secondary-text-color))`.
- **Light detail overlay:** `detailElement.style.height = '100%'` (was `calc(100% - 200px)`).
- **Remove** the `hueBorders` handling only if it's now dead. Otherwise keep it: `hueBorders: true` still sets `--ha-dialog-border-radius`.

- [ ] **Step 1: Implement** the above.
- [ ] **Step 2: Run** `npm run lint && npx tsc --noEmit && npm test`. Expected: green.
- [ ] **Step 3: Live check.** Make sure `npm start` is running and the `dist/` timestamp is fresh. Hard-refresh (⌘⇧R) `/dashboard-jedilounge/m3-dev` and open a dev card's dialog. Check, in dark theme:
  - the dialog is 560px wide on desktop and full-screen at phone width (devtools responsive mode)
  - there's no colored header block or shadow
  - the glow fades out around the middle of the scenes
  - the glow strength follows brightness, and it disappears when the light is off
  - the M3 switch toggles all the lights
  - `slider: wavy` cards show the wavy slider
- [ ] **Step 4: Commit** `feat(dialog): harmonized surface, top glow and M3 header`

### Task 5: Scene tiles and carousel

**Files:**
- Modify: `src/controls/dialog-tile.ts` (base style `:48-90`, `setupListeners` `:95`)
- Modify: `src/controls/dialog-scene-tile.ts` (click effect `:26-63`, render `:85-112`, styles `:114-196`)
- Modify: `src/controls/dialog.ts` (scene scroller template `:757-767`, scrollbar styles `:446-474`)
- Test: `tests/dialog-tile.test.ts`

**Interfaces:**
- Consumes: `M3PageDots`, `PageDotsMath` (Task 2). `--hue-text-color` (Task 4).
- Produces: keyboard activation on every `HueDialogTile`. Light rows in Task 6 inherit it.

Behavior to implement:
- **Keyboard** (base `HueDialogTile.setupListeners`): set `tabIndex = 0` and `role="button"` on `clickTarget`. On `keydown` Enter or Space, call `preventDefault()` and `tileClicked()`. Give it a visible `:focus-visible` outline (2px, the on-surface token, 2px offset).
- **Tile shape:** width 108px, padding 10px 10px 8px, radius 16px, `background: color-mix(in srgb, var(--md-sys-color-on-surface, var(--primary-text-color)) 9%, transparent)`. No box-shadow. Title 13px / 18px, 2-line clamp, on-surface color. Keep the `transform: scale(0.95)` press feedback.
- **Picture:** 88 × 64px, radius 12px, `background-size: cover`, no shadow. **Icon-only:** the same 88 × 64 box, `background: color-mix(in srgb, var(--hue-tile-accent-color, <secondary-container token>) 60%, transparent)`, icon in `--hue-tile-fg-color`.
- **Tap highlight:** replace the grow, fill and pop animation. The `_effectQueue` adds `clicked` at 0 ms and removes it after 3000 ms. `.scene.clicked`: `background: color-mix(in srgb, var(--hue-tile-accent-color, <primary token>) 38%, transparent)` with `box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--hue-tile-accent-color, <primary token>) 70%, transparent)`. Background fades over 600 ms, with no transition under `prefers-reduced-motion`. Delete the `pop-icon` / `pop-picture` keyframes and the `unclicked` / `stop-color-animate` classes.
- **Dialog scroller:**
  - Keep the two `.tiles` rows (odd and even split), with an 8px gap between rows and tiles.
  - The scroller runs to the right edge (keep the existing negative margin and padding trick).
  - Hide the native scrollbar (`scrollbar-width: none` plus the `::-webkit-scrollbar { display: none }` rules, replacing the current ones).
  - Hide the "My scenes" heading and the scroller entirely when there are no scenes.
- **Dots:**
  - Below the scroller, render `M3PageDots`, with `count` and `current` kept in dialog state.
  - Update them on the scroller's `scroll` event (rAF-throttled) and on resize (`ResizeObserver` on the scroller), using `PageDotsMath`.
  - On `page-select`, call `scroller.scrollTo({ left: pageScrollLeft(...), behavior: reducedMotion ? 'auto' : 'smooth' })`.
  - Set `--m3-page-dots-active-color: var(--hue-text-color)`.
  - `labelFormat` is `localize(hass, 'dialog.page')`.
  - Clean up the observer in `onDialogClose`.

- [ ] **Step 1: Write the failing test** `tests/dialog-tile.test.ts`. Define a minimal concrete `HueDialogTile` subclass in the test that renders `<div class="hue-tile">` and counts `tileClicked` calls (register it under a test-only element name). Check:
  - Enter and Space on `.hue-tile` call `tileClicked` once each.
  - Other keys don't.
  - The target has `tabindex="0"` and `role="button"`.
- [ ] **Step 2: Run** `npx jest tests/dialog-tile.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the keyboard handling, then the styles and the dialog wiring above.
- [ ] **Step 4: Run** `npx jest tests/dialog-tile.test.ts`, then the full check. Expected: green.
- [ ] **Step 5: Live check** on M3 Dev, on a card with many scene presets and on one with HA scenes. Check:
  - two rows, with the next tile peeking in at the right edge
  - the dots track a swipe or wheel scroll, and tapping a dot jumps to that page
  - a card whose scenes fit on one page shows no dots
  - icon-only HA scenes line up with picture tiles
  - a tap shows the see-through tint for about 3 s, then it fades
  - Tab reaches the tiles, and Enter activates a scene
- [ ] **Step 6: Commit** `feat(dialog): M3 scene tiles with two-row carousel and page dots`

### Task 6: Light rows, single-light cards, detail screen

**Files:**
- Modify: `src/controls/dialog-light-tile.ts` (whole file, restyled into a row; the class name stays `HueDialogLightTile`)
- Modify: `src/controls/dialog.ts` (`onLightSelected` `:100-136`, lights template `:769-787`, header title)
- Modify: `src/localize/languages/en_us.json` (`"dialog.light.on": "On"`, `"dialog.light.off": "Off"`, `"dialog.light.unavailable": "Unavailable"`)
- Test: `tests/dialog-light-row.test.ts`

**Interfaces:**
- Consumes: `--hue-text-color` (Task 4). Keyboard activation from the `HueDialogTile` base (Task 5). `ViewUtils.createM3Switch`.
- Produces:
  - `HueDialogLightTile.statusText(isOn: boolean, isUnavailable: boolean, supportsBrightness: boolean, brightness: number, labels: { on: string, off: string, unavailable: string }): string`. Returns: unavailable → `labels.unavailable`, off → `labels.off`, on with brightness → `` `${Math.round(brightness)}%` ``, on without brightness → `labels.on`.
  - `HueDialog.showsLightsSection(lightCount: number): boolean`, which returns `lightCount > 1`.
  - `HueDialog.openLightDetail(light: ILightContainer, tileElement?: HTMLElement): void`, the body of today's `show` path in `onLightSelected`, usable without a tile.
  - `ILightSelectedEventDetail` is unchanged.

Behavior to implement:
- **Row layout:** 64px tall, 16px side padding, 16px gap.
  - **Leading:** a 40px round badge with the 24px icon.
  - **Text:** title in body-large (16px / 24px), status in body-small (12px / 16px, on-surface-variant).
  - **Trailing:** `ViewUtils.createM3Switch(light, noop)`.
  - The tap area (`clickTarget`) is the leading badge and the text only, never the switch.
- **Grouping:**
  - The rows are stacked in a flex column with a 4px gap.
  - Radius 4px, with 16px on the first row's top corners and the last row's bottom corners (`:first-child` / `:last-child` on the host elements inside the column, styled from `dialog.ts`).
  - The lights scroller becomes a plain column, with no horizontal scroll and no `horizontalScroll()`.
- **Off row:** `color-mix(in srgb, <on-surface token> 7%, transparent)`.
- **Lit row:**
  - Background is the light's color at alpha 0.26. Use `ctrl.getBackground()`, or the default color, with `new Color(r, g, b, 0.26)` for a single color. For a gradient background, use its first color.
  - The badge uses the same color at alpha 0.55.
  - Text stays on-surface.
  - The switch uses its `.tinted` variant only if its contrast is fine on the row. Otherwise it stays untinted (M3 tokens). Decide by looking in Task 6's live check, and note the choice in the commit.
- **Remove** the selector border, `isSelected` / `isUnselected` styling and the old shadow and gradient code, and the dialog's `isSelected` / `isUnselected` bindings. The row toggles detail by firing `selected-change` as today.
- **Lights section:**
  - Rendered only when `showsLightsSection(ctrl.getLights().length)`.
  - The section heading and the rows get `detail-hide`, so they hide while the detail screen is open (spec).
  - Remove the `.detail-active .tile-scroller.light-tiles` small-screen rule and the `tileScrollTo` call for lights.
- **Single-light cards:** the header title element (`.main-title`) gets `role="button"` and `tabindex="0"`, plus click, Enter and Space handlers that call `openLightDetail(ctrl.getLights()[0])`. Only add these when `!showsLightsSection(...)`.

- [ ] **Step 1: Write the failing tests** in `tests/dialog-light-row.test.ts`:
  - `statusText(false, true, true, 50, L) === 'Unavailable'`
  - `statusText(false, false, true, 50, L) === 'Off'`
  - `statusText(true, false, true, 69.6, L) === '70%'`
  - `statusText(true, false, false, 100, L) === 'On'`
  - `HueDialog.showsLightsSection(1) === false`, `(2) === true`, `(0) === false`
- [ ] **Step 2: Run** `npx jest tests/dialog-light-row.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the above.
- [ ] **Step 4: Run** the new test, then the full check. Expected: green.
- [ ] **Step 5: Live check** on M3 Dev. Check:
  - a multi-light card (the user's "TV Scenes" setup: Floor Lamp and TV light) shows one row per light with its name and status
  - a row's switch toggles only that light
  - tapping the row opens the color wheel, the rows and scenes hide, and the wheel fills the dialog
  - back returns to the list
  - a single-light card has no Lights section, and tapping its title opens the color wheel
  - long names ellipsize
  - an unavailable light shows "Unavailable" with a disabled switch
  - the color wheel screen is still readable on the new surface in dark and light theme (fix colors or contrast only, no redesign)
- [ ] **Step 6: Commit** `feat(dialog): full-width M3 light rows, hidden for single-light cards`

### Task 7: Light theme pass, docs, wrap-up

**Files:**
- Modify (constants only, if needed): `src/types/consts.ts`
- Modify: `README.md` ("Coming next" section and the fork header), `doc/m3-design-spec.md:95-99` ("Out of scope": point to `m3-dialog-spec.md`), `doc/configuration.md` (scene screen description, if it mentions the old look)
- Obsidian note: `~/Claude/ClaudeBook/Claude Projects/Hue-Like Light Card Restyle.md`

- [ ] **Step 1: Light theme check.** Switch the HA profile to a light theme (Material You light). On M3 Dev, open a multi-light dialog with a pink, a yellow and a blue light at 30% and 100%. If the glow looks washed out or muddy, adjust only `DialogGlowLightThemeFactor` and the mask stops, and re-run `npx jest tests/dialog-tint.test.ts`. Take a dark and a light screenshot, and **show both to the user before going on** (spec requirement).
- [ ] **Step 2: Check `tint: full`** on one dev card: the glow is punchier and the text stays readable.
- [ ] **Step 3: Update the docs.**
  - **README:** remove "Scene screen restyle" from "Coming next", and add one line about the new scene screen.
  - **`m3-design-spec.md`:** in "Out of scope", replace the dialog bullet with "Light detail screen (color wheel) restyle, a later phase. The scene dialog is specified in `m3-dialog-spec.md`."
  - **New screenshots:** replacing `hue-screen2.png` / `hue-screen-detail-1.png` in `doc/configuration.md` waits for the user's screenshots. Leave a `TODO` line in the Obsidian note, not in the docs.
- [ ] **Step 4: Run** `npm run build && npm test`. Expected: green.
- [ ] **Step 5: Commit** `docs: describe the M3 scene screen`
- [ ] **Step 6: Obsidian note.** Tick step 7. Add a dated line naming the commits. Rewrite Current Status and Next Steps: release when the user is happy, then new screenshots, then 6b cleanup. Don't release: releasing is the user's call (`gh workflow run release.yml --ref main -f new_version=v2.2.0`).
