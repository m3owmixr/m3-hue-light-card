# M3 Hue Light Card: design spec (color wheel screen)

Status: **agreed 2026-10-21** (pending user read-through). Step 8 of the fork plan, listed in the README under "Coming next". Scope: the light detail screen that opens from the scene dialog (`src/controls/light-detail.ts` and the controls it hosts: `color-temp-picker.ts`, `color-temp-picker.marker.ts`, `color-temp-mode-selector.ts`, `brightness-rollup.ts`). The collapsed card is covered by `m3-design-spec.md` and the scene dialog by `m3-dialog-spec.md`. Their principles apply here too.

## Why

The scene dialog is now Material 3, but the color wheel screen inside it is still the upstream design: a chevron back button, a grey gradient brightness pill, a round pill mode selector with picture swatches, and heavily shadowed markers. Next to the restyled scene screen it looks out of place.

It also **lost a feature in step 7**. `m3-dialog-spec.md` hid the light rows while the detail screen is open and expected people to switch lights by tapping markers on the wheel. In practice, lights that are off only show as a small dark dot in the middle of the wheel, so there is no visible way to pick an off light or turn it on from this screen. Before step 7 a strip of light tiles under the wheel did that job. The user wants that ability back.

User's words: bring back adjusting multiple lights, and swap anything that doesn't fit M3 for M3 tokens.

## Goals

- **Bring back a light picker** on the wheel screen: a row of compact M3 tiles, one per light, each with its own switch.
- Restyle every control on the screen with M3 shapes and tokens: back button, title, mode toggle, brightness control, wheel markers.
- Follow the fork's color rule: on the light-tinted surface, controls are drawn in the computed **text color**, never a fixed accent, so they never clash with the light color and always stay readable.
- Work in light and dark theme, with `tint: harmonized` and `tint: full`.

## Non-goals

- The plain on/off screen for lights with no color or brightness (`createSwitchDetail`, the big vertical switch): **kept as it is** (user decision).
- The wheel itself (the color and temperature gradients, the picking math, marker merging logic).
- The scene dialog's layout, the collapsed card, new config options.

## Anti-goals (this fails even if it works)

- The wheel gets noticeably smaller to make room for the picker. The user rejected full-width rows (option B) for exactly this reason.
- A control drawn in a fixed theme accent clashes with a strongly colored light (for example a lavender pill on a red `tint: full` surface).
- Text, icons or markers become hard to read on any light color, in either theme.
- Switching lights, merging markers or dragging on the wheel gets slower or less reliable than today.
- A single-light card loses access to the wheel, or a multi-light card can't reach a light that is off.

## Reference

- Mockups made in the brainstorming session on 2026-10-21 (local `.superpowers/brainstorm/`, git-excluded): `light-picker.html` (user chose **C, compact tiles**), `mode-toggle.html` (user chose **2, text color**), `markers-v2.html` (user chose **A, refined pin**). The mockups use emoji and approximate colors; they show layout and shape, not exact values.
- The user's reference for the mode toggle: an M3 Expressive connected toggle. A dark, fully rounded track with a lighter, fully rounded pill behind the selected option ("Color Mode" with a palette icon, "Temperature Mode" with a thermometer). Text isn't needed here; the style is the point.
- Screenshots of the current M3 version (one marker, no light strip) and of the pre-step-7 version (tile strip under the wheel) were shared in the session.

## Layout

Top to bottom, inside the dialog's content area (the detail screen still overlays the scene content, which hides behind it as now):

1. **Top bar:** back button, then the title.
2. **Wheel**, centered, as large as the remaining height allows (as now).
3. **Control row:** the mode toggle on the left, the brightness slider filling the rest, the brightness percentage at the end.
4. **Lights:** a "Lights" heading and the tile row (multi-light cards only).

| Element | Spec |
|---|---|
| Back button | M3 standard **arrow_back** icon (user choice), replacing the chevron. HA's `ha-icon-button-arrow-prev` gives this, mirrored for RTL. 40px icon button with an M3 state layer, in the text color. |
| Title | The selected light's name: entity `title` from `entities` config, else its friendly name (the same source as the light rows). When markers are merged, the merged lights' names joined with ", " (for example "Floor Lamp, TV Light"), cut off with an ellipsis. M3 **title-large** (22px / 28px), text color, one line. **No switch in the top bar**: the tiles carry one per light. |
| Spacing | 16px side padding, matching the scene screen's content. 16px between the wheel and the control row, 16px above the Lights heading. |

### Height (user decision: grow when needed)

The detail screen overlays the scene content and has no height of its own, and the wheel is sized from the space left (`getPickerSize`). On a phone the dialog is full-screen, so there's room. On a computer, a dialog with few scenes and few lights would squeeze the wheel once the top bar, control row and tile row are added.

- **When the wheel screen opens and the dialog is too short, the dialog grows taller to fit**, with a smooth transition (off with `prefers-reduced-motion`), and **shrinks back when the screen closes**. Dialogs that are already tall enough don't change size.
- "Tall enough" means the wheel gets **today's size**: the size it has now for the same dialog width, up to the existing 400px cap. That is the reference for the anti-goal "the wheel gets noticeably smaller".
- The dialog never grows beyond the viewport. If the viewport is too short (a small laptop window), the wheel shrinks as today, rather than the screen scrolling.

## Light tiles (the restored picker)

- **Shown only when the card has more than one light**, the same rule as the scene screen's Lights section (`HueDialog.showsLightsSection`). A single-light card shows the wheel without the row.
- **One horizontal row** that scrolls sideways, with the `horizontalScroll` directive for mouse wheels and no visible scrollbar. The row runs to the right edge so the next tile peeks in.
- **Tile:** about **88×104px**, 16px corner radius, 8px gaps.
  - Top: the light's icon (24px).
  - Middle: the light's name, label-large-ish 13px, up to two lines, centered, ellipsis.
  - Bottom: an **M3 switch** for that light only (`M3Switch`, a compact size that fits the tile).
  - Background: **off** tiles use on-surface at a low opacity (about 7–10%), like the scene screen's see-through tiles. **Lit** tiles get a see-through tint of the light's own harmonized color (about 25%), exactly like the scene screen's lit light rows.
- **Selected tile:** a stronger fill of that light's own harmonized color with a 2px outline in a lighter tone of it, so selected stands out from merely lit.
- **Colors inside a tile:** the tile's own background differs from the dialog surface, so its icon and name use a foreground **computed against that tile's background** (the same contrast helper the card uses for its own tint), not the screen text color. The tile switch follows the scene screen's light rows (step 7): the light's own color with a contrasting handle.
- **Tapping a tile** (outside its switch) makes it the light being adjusted: the title changes, its marker becomes the active pin, and the toggle and slider show its state. Tapping the switch only turns that light on or off.
- **Selection stays in sync with the wheel**: tapping a marker on the wheel selects its tile, and the row scrolls to show it. When markers are merged (several lights adjusted together), **every merged light's tile is selected**.
- **Picking a light that is off:** it becomes selected and its marker appears at the center of the wheel in the off style (Home Assistant doesn't report an off light's last color, so there is no "last color" to show). The slider is disabled (as on the card) until the light is on. Turning it on happens from the tile's switch, or by moving its marker (as today).
- **Mixed light types:** the tile row stays visible whatever kind of light is selected, so every tile can always be reached. The wheel's area keeps its size so the layout doesn't jump: for a **brightness-only** light it's left empty or shows the light's icon (builder's choice), and for an **on/off-only** light the existing big switch sits in that area. Tapping any tile selects that light.
- Tiles are keyboard reachable with a visible focus ring. The switch keeps its own focus.

## Mode toggle (color / temperature)

An **M3 Expressive connected toggle** (user choice), replacing the round pill with picture swatches:

- **Track:** fully rounded, 48px tall, 4px inner padding, a darker tone than the surface (on-surface at low opacity over the surface, or the theme's surface-container-highest; it must read as a recessed track in both themes).
- **Options:** two icon-only buttons about 52px wide, **palette** (`mdi:palette`) for color and **thermometer** (`mdi:thermometer`) for temperature. Each needs an accessible label (localized "Color" / "Temperature").
- **Selected option:** a fully rounded pill filling that button, in the **screen's text color** (user choice, option 2), with the icon drawn in a contrasting color on top (the surface color, or a dark tone of the light color). Unselected icons are drawn in the text color with no pill.
- The pill slides or cross-fades between options (short M3 motion, off with `prefers-reduced-motion`).
- **Only one mode available** (light supports only color or only temperature): show just that option, or hide the toggle. Builder's choice, as long as the slider then fills the row.
- The selector's existing `'brightness'` mode (used for brightness-only lights) keeps working; see below.

## Brightness

- The card's flat **M3 slider** (`M3Slider`, as built by `ViewUtils.createSlider`) replaces the grey gradient rollup. It controls the selected light (or the merged group). Drawn tinted in the text color when the light is on, M3 tokens when off, exactly as on the card.
- The percentage ("80%") sits at the end of the row in body-medium, on-surface-variant.
- **`slider: wavy` applies here too**, so the screen matches the card and the scene header.
- **`slider: none` does not hide it here.** This screen is where a single light's brightness gets fine-tuned, and today's rollup is always shown too. On a `slider: none` card the flat variant is used. (Update the README's "No slider" sentence, which says the scene screen hides its slider: make it say the color wheel screen still has one.)
- `allowZero` behaves as on the card.
- **Brightness-only lights** (no color, no temperature): there is no wheel today; the rollup grows to full size instead. Keep that idea with the new controls: hide the wheel and the mode toggle, and give the slider the full width of the control row. The space the wheel used is left to the builder (see below).

## Wheel markers (user choice A, refined pin)

Restyle the existing marker SVG in `color-temp-picker.marker.ts`; the drag, merge and active logic stays.

- **Selected light:** keeps the Hue **teardrop pin** with the light's icon in white. The heavy white outline and heavy shadow become a **ring in the screen's text color** (about 3px) and a light M3 shadow (around elevation 1–2).
- **Other lights:** ringed circles (about 28px) in the light's color with the same text-color ring and light shadow, now **showing the light's icon** (in a contrasting tone), so lights can be told apart without selecting them.
- **Off lights: no marker on the wheel unless selected.** Today every off light sits as a black dot stacked at the wheel's center (off lights have no color, and off markers never merge), which is the "stray dot" the user saw. The tiles now handle off lights, so their markers are hidden. A selected off light's marker is a **hollow pin** (user decision, 2026-10-21, after trying a theme-outline grey): filled with the surface color, with the ring and icon in the text color, M3's unselected look. Unavailable lights get a dim filled pin (outline-variant fill, surface-colored icon), so the two states differ. No hardcoded black or grey.
- **Merged markers** keep today's behavior (dragging one marker onto another adjusts both together). A merged marker keeps showing the count of lights, not an icon.
- The ring color comes from the same text color as the other controls, so it contrasts with the surface around the wheel.

## Tokens and colors

- Text color: the computed foreground already used by the scene screen (`--hue-heading-text-color` / `--hue-text-color`, with `Consts.TintOnSurfaceCss` when nothing is lit). Every control on this screen that isn't a light's own color uses it.
- Surfaces and outlines: `--md-sys-*` tokens with HA fallbacks, as elsewhere in the fork (principle 3 of `m3-design-spec.md`). No hardcoded hex values for theme colors.
- Remove the screen's reliance on `--hue-screen-back-button-color` (default white). If it's set in someone's theme, honoring it as an override is fine.
- Light theme: check every element, especially the toggle track and the pin ring, on a light surface.

## Single-light cards

No tile row, and no switch on this screen (user agreed, 2026-10-21). The light is turned on and off from the scene screen's header switch, behind the back arrow. While it's off, the wheel screen can still turn it on by moving its marker, as today.

## Behavior kept as is

- Opening from a light row or the header title, closing with the back button and browser history (`HueHistoryStep`).
- Marker merging and unmerging, `lightcontainer-change`, the temperature range per light.
- The plain on/off screen for lights without color or brightness.

## Docs and release

- README: remove the "Coming next" entry and the "color wheel screen is unchanged so far" line in Credits; add the wheel screen to the Features list.
- `doc/configuration.md`: replace `hue-screen-detail-1.png` with a new screenshot (the user captures it; capture the dialog without the dashboard behind it).
- Release as **v2.3.0** (a visible feature). Release notes mention the restored light tiles.

## Calls made by Claude (not explicitly decided by the user)

- The tile row only shows on multi-light cards (same rule as the scene screen).
- No switch in the top bar; the title is the selected light's name in title-large.
- The selected tile is filled with the light's color and outlined; merged lights select several tiles. Lit tiles get a light tint like the scene screen's rows.
- Tile contents use a foreground computed against the tile's own fill; the tile switch matches the scene screen's light rows.
- Picking an off light selects it, shows its marker at the wheel center in the off style, and disables the slider until it's on.
- Off lights have no marker on the wheel unless selected (removes the stack of black dots in the center).
- The tile row stays for every light type; the wheel's area keeps its size, holding the big switch for on/off-only lights.
- `slider: none` doesn't hide the slider on this screen.
- A merged selection's title lists the names, comma-separated.
- The grown dialog is capped at the viewport height; past that the wheel shrinks rather than the screen scrolling.
- The toggle's icons (palette, thermometer) and its accessible labels.
- `slider: wavy` and `allowZero` apply on this screen.
- Brightness-only lights: wheel and toggle hidden, slider full width.
- Other lights' markers show their icon.
- The spec lives in `doc/` next to the other specs (repo convention), not `docs/superpowers/specs/`.
- Version v2.3.0.

## Left to the builder

- Whether the tiles reuse `HueDialogLightTile` (now a row), get a `variant`, or become a new element (named with `Consts.ElementPostfix`).
- Whether the tile row lives inside `HueLightDetail` or in the dialog, as long as it sits under the wheel and the wheel keeps its size.
- How the mode toggle is built (rewrite `HueColorTempModeSelector` or a new element), as long as its `mode`, `showColor`, `showTemp` and `colorPicker` behavior stays.
- Whether a single-mode light shows one toggle option or none.
- What fills the wheel's space for brightness-only lights (empty or the light's icon), as long as it looks intentional and the layout doesn't jump.
- Exact opacities, shadow values and motion timing within the ranges above.
- Tests for new pure logic (for example tile/marker selection sync), following `tests/` conventions.
