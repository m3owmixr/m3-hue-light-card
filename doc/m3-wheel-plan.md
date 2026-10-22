# Color Wheel Screen M3 Restyle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the light detail (color wheel) screen to M3 and bring back a light picker: compact light tiles under the wheel, an M3 connected mode toggle, the flat M3 brightness slider, refined pin markers, and a dialog that grows to fit the wheel when needed.

**Architecture:** Layout and selection decisions are pure functions in a new `LightDetailLayout` class (unit-tested). A new `hue-light-detail-tile` element draws one compact tile. `HueColorTempModeSelector` keeps its API but renders an M3 connected toggle. `HueLightDetail` gets a new render (top bar, fixed-size wheel area, control row, tile row) and replaces the brightness rollup with `M3Slider`. Marker styling changes in `color-temp-picker.marker.ts` only; drag and merge logic stays. `dialog.ts` passes config to the detail screen and grows its content when the detail screen needs more height.

**Tech Stack:** TypeScript, Lit 3, rollup, jest (ts-jest, jsdom), Home Assistant `ha-dialog` (WebAwesome-based, HA 2026.x).

**Spec:** `doc/m3-wheel-spec.md` (read it first; it's the source of truth for every value below).

## Global Constraints

- Branch `m3-restyle`. Commit after every task, messages per `COMMIT.md` (`type(scope): summary`), ending with the `Co-Authored-By` line from the session's attribution rule.
- Leave `Consts.Dev = true` and `rollup.config.mjs` `var dev = true` as they are.
- Every new custom element name is `<base> + Consts.ElementPostfix`.
- Don't rename `HueLightDetail`, `HueColorTempModeSelector`, `HueColorTempPicker*` or their files (upstream-merge rule in `CLAUDE.md`).
- Controls on the screen that aren't a light's own color use the dialog's text color: `var(--hue-text-color, ${Consts.TintOnSurfaceCss})`. `--hue-text-color` is set on the `HueDialog` host and inherits into the detail element. No hardcoded hex for theme colors; no fixed theme accent (`--md-sys-color-primary`) on this screen.
- Respect `prefers-reduced-motion` for every new transition.
- New UI strings go in `src/localize/languages/en_us.json`.
- American spelling in comments and docs.
- Revert unrelated `package-lock.json` churn.
- Every task ends with `npm run lint && npx tsc --noEmit && npm test` green.

## Review Focus

1. **Mixed light types on one card** (color, brightness-only and on/off-only lights): tapping through the tiles must never make the layout jump, and every tile must stay reachable. Pinned by Task 1's `detailKind` and `wheelAreaSize` tests, and checked by hand in Task 6.
2. **Selecting a light that's off:** its marker appears at the wheel center, other off lights stay hidden, and the slider is disabled. Pinned by Task 1's `markerVisible` tests and Task 4's "off light selected" check.
3. **Merged markers:** every merged light's tile shows as selected and the title lists the names. Pinned by Task 1's `title` and `isSelected` tests.
4. **Unavailable light:** its tile still selects, its switch is disabled, and it gets no lit tint. Pinned by Task 2's `tileColors` unavailable test.
5. **Short viewport on desktop** (small laptop window): the dialog grows only up to the viewport, then the wheel shrinks; no scrolling. Pinned by Task 1's `contentMinHeight` cap test.

---

### Task 1: `LightDetailLayout` pure logic

**Files:**
- Create: `src/core/light-detail-layout.ts`
- Test: `tests/light-detail-layout.test.ts`
- Also commit: `doc/m3-wheel-plan.md`

**Interfaces:**
- Produces (all `public static` on `LightDetailLayout`):
  - Constants: `sidePadding = 16`, `topBarHeight = 56`, `gap = 16`, `controlRowHeight = 48`, `headingHeight = 32`, `tileRowHeight = 104`, `wheelMax = 400` (the existing `HueColorTempPicker.maxWidth`), `wheelMargin = 60` (today's `colorPickerMarginTop + colorPickerMarginBottom`), `viewportMargin = 48`.
  - `type DetailKind = 'wheel' | 'brightness' | 'switch'`
  - `detailKind(features: { isEmpty(): boolean, isOnlyBrightness(): boolean }): DetailKind`: `isEmpty()` → `'switch'`, `isOnlyBrightness()` → `'brightness'`, else `'wheel'`.
  - `targetWheelSize(width: number): number`: today's size for that width: `Math.max(0, Math.min(wheelMax, width - wheelMargin))`.
  - `chromeHeight(hasTiles: boolean): number`: `topBarHeight + gap + gap + controlRowHeight + gap` plus `headingHeight + tileRowHeight + gap` when `hasTiles`.
  - `requiredHeight(width: number, hasTiles: boolean): number`: `targetWheelSize(width) + chromeHeight(hasTiles)`.
  - `wheelAreaSize(width: number, height: number, hasTiles: boolean): number`: `Math.max(0, Math.min(targetWheelSize(width), height - chromeHeight(hasTiles)))`. The same value whatever `DetailKind` is selected (no layout jump).
  - `contentMinHeight(required: number, surfaceHeight: number, contentHeight: number, viewportHeight: number): number | null`: the content min-height that makes the surface `required` tall, capped so the surface stays within `viewportHeight - viewportMargin`; `null` when the surface is already tall enough.
  - `markerVisible(isOn: boolean, isSelected: boolean): boolean`: `isOn || isSelected`.
  - `title(names: string[]): string`: `names.join(', ')`.
  - `isSelected(entityId: string, selectedIds: string[]): boolean`

- [ ] **Step 1: Write the failing tests** in `tests/light-detail-layout.test.ts` (style as in `tests/page-dots.test.ts`):
  - `detailKind`: an empty-features stub → `'switch'`; only-brightness → `'brightness'`; color → `'wheel'`.
  - `targetWheelSize(512)` → `400`; `targetWheelSize(360)` → `300`; `targetWheelSize(40)` → `0`.
  - `chromeHeight(false)` → `152`; `chromeHeight(true)` → `304`.
  - `requiredHeight(512, true)` → `704`.
  - `wheelAreaSize(512, 900, true)` → `400`; `wheelAreaSize(512, 600, true)` → `296`; `wheelAreaSize(512, 200, true)` → `0`.
  - `contentMinHeight(704, 500, 300, 1000)` → `504` (content grows by 204); `contentMinHeight(704, 800, 600, 1000)` → `null`; capped: `contentMinHeight(704, 500, 300, 600)` → `352` (surface 552 = 600 − 48).
  - `markerVisible`: `(true, false)` → true, `(false, true)` → true, `(false, false)` → false.
  - `title(['Floor Lamp', 'TV Light'])` → `'Floor Lamp, TV Light'`; `title(['Floor Lamp'])` → `'Floor Lamp'`.
  - `isSelected('light.a', ['light.a', 'light.b'])` → true; `isSelected('light.c', ['light.a'])` → false.

- [ ] **Step 2: Run** `npx jest tests/light-detail-layout.test.ts`. Expected: FAIL, cannot find module `../src/core/light-detail-layout`.

- [ ] **Step 3: Implement `LightDetailLayout`** in `src/core/light-detail-layout.ts` with the interfaces above. `contentMinHeight`: `target = Math.min(required, viewportHeight - viewportMargin)`; return `null` if `surfaceHeight >= target`, else `contentHeight + (target - surfaceHeight)`.

- [ ] **Step 4: Run** `npx jest tests/light-detail-layout.test.ts`. Expected: PASS. Then `npm run lint && npx tsc --noEmit && npm test`.

- [ ] **Step 5: Commit** `feat(detail): layout and selection logic for the M3 wheel screen` (include `doc/m3-wheel-plan.md`).

---

### Task 2: Light detail tile element

**Files:**
- Create: `src/controls/light-detail-tile.ts`
- Test: `tests/light-detail-tile.test.ts`

**Interfaces:**
- Consumes: `HueDialogLightTile.switchColors(light: Color)`, `HueDialogTile` base (`_hass`, `clickTarget`, `tileClicked`, keyboard handling) from `src/controls/dialog-tile.ts`, `HueLikeLightCardEntityConfig.getTitle`.
- Produces:
  - `HueLightDetailTile extends HueDialogTile`, `ElementName = HueDialogTile.ElementName + '-detail'`.
  - Properties: `lightContainer: ISingleLightContainer | null`, `entityConfig: HueLikeLightCardEntityConfig | null`, `defaultColor: Color | null`, `selected: boolean` (reflected attribute).
  - Event `tile-select` with `detail: { lightContainer: ISingleLightContainer }`, fired on tap or Enter/Space on the tile outside the switch.
  - `static tileColors(light: Color | null, isOn: boolean, isUnavailable: boolean, selected: boolean): { background: string | null, outline: string | null, foreground: string | null }`
    - unavailable or off, not selected → all `null` (CSS defaults: on-surface at 8%, text color).
    - unavailable or off, selected → `background: null`, `outline` = text-color CSS `var(--hue-text-color, …)`, `foreground: null`.
    - lit, not selected → `background` = light at alpha `0.26` (same as `HueDialogLightTile.rowTintAlpha`), `outline: null`, `foreground: null`.
    - lit, selected → `background` = light opaque, `outline` = `light.mix(Consts.LightColor, 0.45)`, `foreground` = `light.getForeground(Consts.LightColor, Consts.DarkColor, 0)`.
  - Sizes as `private static readonly`: `tileWidth = 88`, `tileHeight = 104`, radius 16, icon 24px, name 13px/16px two lines with ellipsis.

- [ ] **Step 1: Write the failing tests** in `tests/light-detail-tile.test.ts`:
  - `tileColors(null, false, false, false)` → all `null`.
  - `tileColors(new Color('#3050c0'), true, false, false).background` → `'rgba(48,80,192,0.26)'` (match `Color.toString()` format used in `dialog-light-row.test.ts`), `outline` null.
  - `tileColors(new Color('#3050c0'), true, false, true)`: `background` `'rgb(48,80,192)'`, `outline` not null, `foreground` equals `Consts.LightColor.toString()`.
  - `tileColors(new Color('#ffe9a0'), true, false, true).foreground` equals `Consts.DarkColor.toString()`.
  - unavailable: `tileColors(new Color('#3050c0'), true, true, false)` → `background` null (no lit tint).
  - off and selected: `outline` contains `--hue-text-color`, `background` null.

- [ ] **Step 2: Run** `npx jest tests/light-detail-tile.test.ts`. Expected: FAIL (module not found).

- [ ] **Step 3: Implement `HueLightDetailTile`** in `src/controls/light-detail-tile.ts`, modeled on `HueDialogLightTile`: register on the light's property changes in `updated`, apply `tileColors` to `--hue-detail-tile-background`, `--hue-detail-tile-outline` (2px inset box-shadow), `--hue-detail-tile-foreground`. The bottom `m3-switch` uses `HueDialogLightTile.switchColors` when lit (exactly like the light rows), is disabled when unavailable, and stops click propagation so it never selects. Title from `entityConfig.getTitle(light).resolveToString(this._hass)` else `light.getTitle().resolveToString(null)`; icon from `entityConfig?.icon ?? light.getIcon() ?? IconHelper.getIcon(1)`.

- [ ] **Step 4: Run** the tests. Expected: PASS. Then `npm run lint && npx tsc --noEmit && npm test`.

- [ ] **Step 5: Commit** `feat(detail): compact M3 light tile for the wheel screen`.

---

### Task 3: Mode toggle as an M3 connected toggle

**Files:**
- Modify: `src/controls/color-temp-mode-selector.ts` (render and styles; keep `mode`, `showColor`, `showTemp`, `colorPicker`, `selectPossibleMode`, `totalHeight`)
- Modify: `src/localize/languages/en_us.json`: add `dialog.detail.color` = "Color", `dialog.detail.temp` = "Temperature"
- Test: `tests/mode-selector.test.ts`

**Interfaces:**
- Produces:
  - New property `labels: { color: string, temp: string }` (default `{ color: 'Color', temp: 'Temperature' }`), set by `HueLightDetail` from `localize`.
  - `static shouldRender(mode: HueColorTempModeSelectorMode, showColor: boolean, showTemp: boolean): boolean`: `false` when `mode == 'brightness'` or fewer than two of `showColor`/`showTemp` are true (spec: a single-mode light hides the toggle and the slider takes the row).
  - `totalHeight` becomes `48` (the track height).
  - Markup: a `div.track` (`role="group"`) with one `button.option` per mode, `aria-pressed`, `aria-label` from `labels`, holding `ha-icon` `mdi:palette` / `mdi:thermometer` at 22px.

- [ ] **Step 1: Write the failing tests** in `tests/mode-selector.test.ts`:
  - `shouldRender('color', true, true)` → true; `('brightness', true, true)` → false; `('color', true, false)` → false; `('temp', false, true)` → false.
  - jsdom: create the element, append to `document.body`, `await el.updateComplete`; there are 2 `button.option`; the color one has `aria-pressed="true"`; clicking the temp button sets `el.mode` to `'temp'`.

- [ ] **Step 2: Run** `npx jest tests/mode-selector.test.ts`. Expected: FAIL (`shouldRender` undefined, no `button.option`).

- [ ] **Step 3: Implement** the toggle. Track: 48px tall, 4px padding, fully rounded, `color-mix(in srgb, var(--hue-text-color, ${Consts.TintOnSurfaceCss}) 12%, transparent)` (darker recessed track on dark surfaces, slightly darker on light ones; check both themes in Task 6). Each option 52×40px, fully rounded. Selected: background `var(--hue-text-color, …)`, icon color `var(--hue-detail-on-text-color, ${Consts.TintSurfaceCss})` (the surface color, so it contrasts with the pill). Unselected: transparent, icon in the text color, M3 state layer on hover/focus (8%/10% of the text color). The pill moves with a 200ms `background-color` transition (none under `prefers-reduced-motion`). Remove the `ControlResources` swatch images and `Consts.HueShadow` from this file. Also fix `unregisterColorPickerEvent`, which calls `addEventListener` instead of `removeEventListener`.

- [ ] **Step 4: Run** the tests. Expected: PASS. Then `npm run lint && npx tsc --noEmit && npm test`.

- [ ] **Step 5: Commit** `feat(detail): M3 connected toggle for color and temperature mode`.

---

### Task 4: Refined pin markers and hidden off markers

**Files:**
- Modify: `src/controls/color-temp-picker.marker.ts` (paths, sizes, styles, icon visibility, new `hidden` state)
- Modify: `src/controls/color-temp-picker.ts` (the `dot-shadow` / `active-shadow` SVG filters; skip hidden markers in `canBeMarkerMerged` and `searchMergeMarkerTarget`)
- Modify: `src/controls/light-detail.ts` (`LightMarkerManager.applyState` sets `hidden`)
- Test: `tests/color-temp-picker.test.ts` (extend)

**Interfaces:**
- Consumes: `LightDetailLayout.markerVisible(isOn, isSelected)` (Task 1).
- Produces:
  - `HueColorTempPickerMarker.hidden: boolean` (getter/setter, re-renders; adds class `hidden` → `display: none` on `.gm`).
  - Non-active marker: a 28px circle (`markerNonActivePath` radius 14, `markerNonActivePathSize = { width: 28, height: 28 }`) with the icon shown at 16px, centered. Active pin path and size unchanged.
  - Ring: `stroke: var(--hue-text-color, ${Consts.TintOnSurfaceCss}); stroke-width: 3px; paint-order: stroke` on `.marker` (active and non-active). Remove `.marker-outline` (the white outline path) from `drawMarker`.
  - Shadow: both filters become one M3 elevation-1 drop shadow: `<feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.3">`. Keep the filter ids.
  - Icon fill on non-active markers: the same `getForeground(LightColor, DarkColor, offset)` rule as active ones (already in `renderColor`). Multi-marker count text scales to the 28px circle when not active.
  - `LightMarkerManager.applyState`: `marker.hidden = !LightDetailLayout.markerVisible(light.isOn(), marker.isActive || isSelectedInDetail)`, where `isSelectedInDetail` comes from a new `LightMarkerManager.setSelected(entityIds: string[])` that `HueLightDetail` calls whenever its `lightContainer` changes. Off markers are drawn with the existing light-off color (`MarkerOffColor`), at the position `applyState` leaves them (the wheel center for a light that's never reported a color).

- [ ] **Step 1: Write the failing tests** in `tests/color-temp-picker.test.ts`. jsdom has no SVG geometry, and marker rendering calls `getBBox()`, so stub it for this describe block: `beforeAll(() => { (SVGElement.prototype as any).getBBox = () => ({ x: 0, y: 0, width: 0, height: 0 }); })` (the marker then uses its fallback sizes).
  - A marker created with `picker.addMarker('light.a', false)` has `hidden === false`; after `marker.hidden = true`, `marker.render().classList.contains('hidden')` is true.
  - Merge: two markers added with `addMarker(name, false)` start at the same default position and mode, so `picker.searchMergeMarkerTarget(a)` returns `b`; after `b.hidden = true` it returns `undefined`.

- [ ] **Step 2: Run** `npx jest tests/color-temp-picker.test.ts`. Expected: FAIL (`hidden` doesn't exist).

- [ ] **Step 3: Implement** the marker changes listed under Interfaces.

- [ ] **Step 4: Run** the tests. Expected: PASS. Then `npm run lint && npx tsc --noEmit && npm test`.

- [ ] **Step 5: Check by eye** with `npm start` on the M3 Dev view (a multi-light card, both themes): the selected pin has a text-color ring and a light shadow; other lit lights are ringed circles with their icon; no black dots in the center for off lights; dragging one marker onto another still merges and shows the count.

- [ ] **Step 6: Commit** `feat(detail): refined pin markers, hide off lights until selected`.

---

### Task 5: New wheel screen layout, slider and tiles

**Files:**
- Modify: `src/controls/light-detail.ts` (render, styles, sizing, selection)
- Modify: `src/core/view-utils.ts` (`createSlider` gains `alwaysShow`)
- Modify: `src/controls/dialog.ts` (pass `config`, `entitiesConfig`, `hass` to the detail element; keep `lightcontainer-change`)
- Modify: `src/localize/languages/en_us.json`: `dialog.detail.back` = "Back"
- Delete: `src/controls/brightness-rollup.ts` (no other users)
- Test: `tests/view-utils-slider.test.ts`

**Interfaces:**
- Consumes: `LightDetailLayout` (Task 1), `HueLightDetailTile` and its `tile-select` event (Task 2), `HueColorTempModeSelector.labels` / `shouldRender` (Task 3), `LightMarkerManager.setSelected` (Task 4).
- Produces:
  - `ViewUtils.createSlider(ctrl, config, onChange, alwaysShow = false)`: with `alwaysShow`, `SliderType.None` doesn't return `nothing` (the flat variant is used). Brightness support is still required.
  - `HueLightDetail` new properties: `config: HueLikeLightCardConfig | null`, `entitiesConfig: HueLikeLightCardEntityConfigCollection | null`, `hass: HomeAssistant | null`.
  - `HueLightDetail.selectLight(light: ISingleLightContainer): void`: sets `lightContainer`, activates its marker if it has one (`activate`), scrolls its tile into view (`scrollIntoView({ block: 'nearest', inline: 'nearest' })`) and fires `lightcontainer-change`.
  - `HueLightDetail.requiredHeight(): number`: `LightDetailLayout.requiredHeight(this.clientWidth, hasTiles)`, used by the dialog in Task 6.

- [ ] **Step 1: Write the failing test** in `tests/view-utils-slider.test.ts`: with a `HueLikeLightCardConfig` parsed from `{ entity: 'light.a', slider: 'none' }` (built as in `tests/config-parse.test.ts`) and a brightness-capable controller stub, `createSlider(ctrl, config, noop)` is `nothing` and `createSlider(ctrl, config, noop, true)` is not `nothing`.

- [ ] **Step 2: Run** `npx jest tests/view-utils-slider.test.ts`. Expected: FAIL (the fourth argument is ignored).

- [ ] **Step 3: Implement `alwaysShow`** in `ViewUtils.createSlider`, then run the test. Expected: PASS.

- [ ] **Step 4: Rebuild `HueLightDetail.render()`** per the spec's Layout section, top to bottom:
  - **Top bar** (56px): `ha-icon-button-arrow-prev` (label from `dialog.detail.back`, color `var(--hue-text-color, …)`, `--mdc-icon-button-size: 40px`), then the title: `LightDetailLayout.title(...)` of the selected lights' names (entity config title, else friendly name), M3 title-large (22px/28px), one line, ellipsis.
  - **Wheel area:** a square of `LightDetailLayout.wheelAreaSize(clientWidth, clientHeight, hasTiles)` px, centered. Holds the color picker for `'wheel'`, the existing big switch (`createSwitchDetail`, unchanged) for `'switch'`, and the light's icon at 64px in on-surface-variant for `'brightness'`. Replace `getPickerSize`, `updateColorPickerSize`, `updateBigSwitchSize` and `updateBrightnessRollupSize` with one `updateSizes()` that sizes the area (the picker fills it; the big switch keeps its current proportions, width a third of the area, min 60px). Call it on `show()` and from a `ResizeObserver` on the element (guard `typeof ResizeObserver` for jsdom).
  - **Control row** (48px, gap 12px): the mode selector (rendered only when `HueColorTempModeSelector.shouldRender(...)`), `ViewUtils.createSlider(selected, this.config, noop, true)` filling the rest, and the percentage (`Math.round(brightnessValue)%`, body-medium, on-surface-variant, right-aligned, 40px). Wire the slider's change to the selected container exactly as the rollup was (`brightnessValueChanged`). Hidden entirely for `'switch'`.
  - **Lights** (only when `HueDialog.showsLightsSection(lights.length)`): the "Lights" heading (existing `dialog.lights`, label-medium, on-surface-variant) and a `.tiles` row of `HueLightDetailTile`, one per `areaController.getLights()`, `selected` = `LightDetailLayout.isSelected(id, selectedIds)`, `@tile-select` → `selectLight`. Horizontal scroll with the `horizontalScroll` directive, scrollbar hidden, 16px left padding, running to the right edge.
  - Stop using `--hue-screen-back-button-color` except as an override: `color: var(--hue-screen-back-button-color, var(--hue-text-color, …))`.
  - Remove all `HueBrightnessRollup` code and delete `src/controls/brightness-rollup.ts`.

- [ ] **Step 5: Keep selection in sync.** In `onLightContainerChanged` (and in `setLightContainerFromPicker`), call `this._lightMarkerManager.setSelected(selectedIds)` and `requestUpdate()` so tiles and title follow marker taps and merges. A tile tap on a `'brightness'` or `'switch'` light just sets `lightContainer` (it has no marker).

- [ ] **Step 6: Pass config from the dialog.** In `dialog.ts` `tryCreateBackdropAndLightDetail`, set `detailElement.config = this._config`, `detailElement.entitiesConfig = this._entitiesConfig`, and keep `detailElement.hass` updated where the dialog's `hass` changes.

- [ ] **Step 7: Run** `npm run lint && npx tsc --noEmit && npm test`. Expected: all green.

- [ ] **Step 8: Check by eye** (`npm start`, M3 Dev view, multi-light card and single-light card): the layout matches the spec; tapping tiles switches the title, marker, toggle and slider; tile switches only toggle; merging two markers selects both tiles and lists both names; an off light's tile shows its marker at the center and a disabled slider; a single-light card shows no tile row.

- [ ] **Step 9: Commit** `feat(detail): M3 wheel screen layout with light tiles and M3 slider`.

---

### Task 6: Dialog grows to fit, light theme pass, docs

**Files:**
- Modify: `src/controls/dialog.ts` (`.content` min-height while the detail screen is open)
- Modify: `README.md`, `doc/m3-design-spec.md` (status line only)
- Test: covered by Task 1's `contentMinHeight` tests; this task is wiring and checks by eye.

**Interfaces:**
- Consumes: `LightDetailLayout.contentMinHeight` (Task 1), `HueLightDetail.requiredHeight()` (Task 5).

- [ ] **Step 1: Grow the dialog.** In the detail element's `show` listener (`dialog.ts`, next to `toggleUnderDetailControls(true)`), read the `wa-dialog` surface height and the `.content` div's height, and set `.content` `style.minHeight` to `LightDetailLayout.contentMinHeight(detail.requiredHeight(), surfaceHeight, contentHeight, window.innerHeight)` px when it isn't `null`. On `hide`, clear it. Add `transition: min-height 250ms cubic-bezier(0.2, 0, 0, 1)` to `.content` (none under `prefers-reduced-motion`). Skip it in full-screen mode (`max-width: 450px` / `max-height: 500px` media query matches).

- [ ] **Step 2: Check by eye on desktop:** a card with two lights and no scenes grows smoothly when the wheel opens and shrinks back on Back; a card with many scenes doesn't change size; in a short browser window the dialog stops at the window height and the wheel is smaller, with no scrollbar.

- [ ] **Step 3: Light theme pass.** Switch HA to the light theme and check, on harmonized and `tint: full` cards: the toggle track reads as recessed, the selected pill and its icon contrast, the pin ring is visible against the wheel, tile names on selected tiles are readable on a pale and a saturated light. Fix only the values (opacities, mix amounts) that fail.

- [ ] **Step 4: Docs.**
  - README Features: add "**M3 color wheel screen.** Pick a light from the tiles under the wheel, switch between color and white temperature, and set brightness with the same slider as the card."
  - README: remove the "Coming next" section's color wheel entry (remove the section if it's empty), and change "The color wheel screen is unchanged so far." in Credits to nothing (delete the sentence).
  - README "No slider" section: replace "The scene screen hides its slider too." with "The scene screen hides its slider too; the color wheel screen keeps one so you can still fine-tune each light."
  - `doc/configuration.md`: leave `hue-screen-detail-1.png` until the user supplies a new screenshot.

- [ ] **Step 5: Run** `npm run build && npm test`. Expected: green.

- [ ] **Step 6: Commit** `feat(dialog): grow to fit the wheel screen; docs for the M3 wheel screen`.

- [ ] **Step 7: Hand over** for the user's live check on phone and desktop, both themes. Releasing v2.3.0 (`gh workflow run release.yml --ref main -f new_version=v2.3.0`, after fast-forwarding `main`) and the new `configuration.md` screenshot wait for the user.
