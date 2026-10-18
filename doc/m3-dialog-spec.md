# M3 Hue Light Card: design spec (scene dialog)

Status: **agreed 2026-10-17** (pending user read-through). Step 7 of the fork plan. Scope: the expanded scene dialog that opens when the card is tapped (`src/controls/dialog.ts` and the `dialog-*-tile.ts` files). The collapsed card is covered by `m3-design-spec.md`, and its principles apply here too.

## Why

The collapsed card now looks like Material 3, but the dialog it opens is still the upstream design: a header filled edge to edge with the raw light colors, a dark drop shadow, a second gradient behind the content, round scene pictures, square light tiles and HA's `ha-switch`. Next to the restyled cards it feels heavy and out of place. The goal is a dialog that clearly belongs to the same card: a calm M3 surface that still shows the light's color, as on the card.

## Goals

- Replace the heavy gradients with the **harmonized surface plus a soft glow** described below.
- Restyle scene tiles with M3 tokens: **see-through tiles**, rounded-rectangle pictures, **two rows** that scroll sideways, with **page dots** under them.
- Turn the Lights section into **full-width rows** (icon, name, status, M3 switch).
- Replace every `ha-switch` in the dialog with the fork's **M3 switch**.
- Use the same `tint: harmonized | full` and `slider: default | wavy` options as the card, so a card and its dialog always match.

## Non-goals

- **The light detail screen** (color wheel, color-temperature picker, `light-detail.ts`): not restyled in this step. It must still open, work and look acceptable on the new surface, but its own design is a later step.
- The visual editor, and new config options beyond what's needed here.
- Changes to the collapsed card.

## Anti-goals (this fails even if it works)

- The glow comes back as a heavy, saturated, edge-to-edge color wash.
- Text or controls become hard to read on any light color, in dark or light theme.
- Scrolling the scene rows stutters on a wall tablet or an older phone.
- A single-light card loses access to the color wheel.
- Existing YAML configs stop parsing or change behavior in surprising ways.

## Reference

- Mockups (user-generated, inspiration only, not to be copied exactly): local `mockups/` folder (not in git). Mockup 1 is the source for the see-through tiles and the two scene rows. Mockup 2 is the source for the light rows, the active-scene tint and the page dots. Both still show the old switches, which should be ignored.
- The agreed layout, mocked up in HTML on 2026-10-17, is summarized in the sections below.

## Container

| Property | Spec |
|---|---|
| Width | Max **560px** (M3 dialog max), min 400px. Full-screen on small screens, as now (`max-width: 450px` / `max-height: 500px`). |
| Corner radius | 28px (`--md-sys-shape-corner-extra-large`), except full-screen. `hueBorders: true` keeps working as it does on the card. |
| Base surface | `--md-sys-color-surface-container-high` with the light colors mixed in **more lightly than on the card** (a new dialog-only amount, roughly a third to half of the card's 15–45%, as a `Consts` value). The glow carries most of the color. Same mixing code as the card (`Color` / `Background`, `ViewUtils`). Lights off: the plain theme surface with no tint. With `tint: full`, the base stays as in harmonized and only the glow uses the raw colors. |
| Header | **No separate colored header block** and no drop shadow below it. The header (close, title, switch, slider) sits on the same surface as the content. The current `.hue-heading` background, shadow and rounded bottom corners go away. |
| Foreground | Computed against the base surface (as on the card). Cap the glow's peak strength so this color still has readable contrast where the glow is strongest (check with the existing contrast helpers). |

### Glow

- One soft, wide wash of the **harmonized** light color(s), coming from the **top** (behind the header), fading to nothing roughly **halfway down the scene rows**. No hard stops.
- **Strength follows brightness**, like the card's tint: faint when dim, stronger at full brightness. **No glow when all lights are off.**
- **Several lights on:** their harmonized colors blend across the glow, left to right (like the card's multi-light gradient), but softly.
- **`tint: full`:** the glow uses the raw light colors and is a bit stronger, for people who want the punchier original feel. Readability still applies.
- **Light theme:** tuned separately (gentler), since a saturated glow on a light surface looks washed out. **Show the user both themes before release.**
- Replaces the current `#hue-backdrop` element (masked `--hue-background` over the whole dialog surface).

## Header

| Element | Spec |
|---|---|
| Close | Existing icon button, in the foreground color. |
| Title | M3 **headline-small** (24px / 32px). Text from the card's `title` (as now). |
| Switch | **M3 switch** (`ViewUtils.createM3Switch`), tinted variant when lights are on (foreground color, as on the card). Turns all of the card's lights on or off. `switchOnScene` keeps working. |
| Slider | `ViewUtils.createSlider` with the card's config, so `slider: wavy` shows the wavy slider. Drawn in the foreground color (`.tinted`) when on, M3 tokens when off, as on the card. |

## Scenes

- **Heading:** "My scenes" (existing localized string) in M3 **label-medium**, `--md-sys-color-on-surface-variant`.
- **Two rows**, scrolling sideways together (the current odd/even split into two `.tiles` rows can stay). The user chose two rows because the scene_presets catalogue is large.
- The rows run to the dialog's right edge so the next tile peeks in, which shows they scroll.
- **Tiles:**
  - Rounded rectangle (16px radius), **see-through**: on-surface color at a low opacity (around 8–10%) over the glow and surface. **No `backdrop-filter` blur** (performance).
  - **Picture:** a rounded rectangle (12px radius, landscape, about 88×64 at the default size), replacing the round picture.
  - **Scenes without a picture** (plain HA scenes): their icon, centered on a tinted rounded rectangle the same size as a picture, so both kinds line up. The tint comes from the scene's accent color (existing `getTileAccentColor`) or a theme fallback.
  - **Name:** below the picture, body-medium-ish 13–14px, one or two lines, ellipsis.
- **Just-tapped scene:** a **see-through tint** (the scene's accent color, harmonized, at about 35–40% plus a thin outline of the same color), as in mockup 2. **Not** a solid fill (mockup 1). It shows for about **3 seconds after a tap, then fades**, replacing today's grow-and-fill tap animation (the existing `_effectQueue` clicked → unclicked sequence). **No lasting "active scene"** (user decision): neither HA scenes nor scene_presets record which scene is active, because `apply_preset` only sends `light.turn_on` with colors.
- **Page dots** (M3 carousel-style indicator) below the rows: one dot per "page" (visible width). The current page is a wider pill in the foreground color, the others are small dots in on-surface-variant. Tapping a dot scrolls to that page. Dots update as the user scrolls or swipes. No dots when everything fits on one page.
- Mouse-wheel horizontal scrolling (`horizontalScroll` directive) keeps working. The native scrollbar is hidden (the dots replace it).

## Lights

- **Heading:** "Lights" (existing string), M3 label-medium, on-surface-variant.
- **Hidden automatically when the card has only one light.** With one light, the header switch already does the same job (user decision). For two or more lights the section is always shown.
- **One full-width row per light**, stacked vertically, as an M3 list:
  - Height 64px, 16px side padding.
  - **Leading:** the light's icon in a 40px round tonal badge (as on the card).
  - **Text:** the light's name (entity `title` from `entities` config, else its friendly name), body-large. A second line in body-small shows the status ("70%" or "Off").
  - **Trailing:** M3 switch for this light only.
  - Rows are grouped: the outer corners are rounded (16px) and the corners between rows nearly square (4px), with 4px gaps.
- **Lit rows** get a see-through tint of that light's own harmonized color (about 25%), and the badge is stronger. Off rows use on-surface at a low opacity, like the scene tiles.
- **Tapping a row** (outside the switch) opens that light's detail screen, as tapping a tile does now. The switch only toggles the light.

## Light detail screen (kept, minimal changes)

- Opening and closing works as now.
- **While the detail screen is open, the light rows hide too** (user decision), so the detail screen gets the full content height (no more `calc(100% - 200px)` band and no pinned strip on small screens). To switch lights, tap that light's marker on the color wheel (already emits `lightcontainer-change`) or go back and tap another row. Selected and unselected row states aren't needed.
- **Single-light cards:** the Lights section is hidden, so **tapping the header title (or the icon area next to it) opens the detail screen** for that light. Without this, a single-light card would lose the color wheel.
- While the detail screen is open, the content behind it hides as now (`detail-hide`). Make sure the new surface and glow don't make the detail screen look broken. Fix colors or contrast only; no redesign.

## Tokens and fallbacks

Use `--md-sys-*` tokens with HA fallbacks, as on the card (principle 3 of `m3-design-spec.md`). Never hardcode hex values for theme colors. The existing `Consts.Theme*` variables can be reused.

Existing options that touch the dialog keep working:
- `hueScreenBgColor`: today it defaults to `#171717` (`Consts.DialogBgColor`), so every dialog is near-black, even in light theme. **The new default is the theme surface.** Add a "was it set" flag like `wasOffColorSet`. When set explicitly, it replaces the base surface (no harmonizing), and the glow still draws on top. Mention the new default in the release notes.
- `offColor`: when set, it's the dialog's off surface as well.
- `theme`: still applied to the dialog.

## Accessibility and behavior

- Light rows and scene tiles are keyboard reachable, with visible focus. Page dots are buttons with labels.
- Respect `prefers-reduced-motion` for the dot and scroll animations.
- No layout jump when a light turns on or off: the glow and tints change, the layout doesn't.

## Calls made by Claude (not explicitly decided by the user)

- 560px max width (M3 dialog standard).
- No blur on the see-through tiles.
- The header switch and slider are drawn in the foreground color, not the theme accent.
- The status line ("70%" / "Off") and the tonal icon badge on light rows.
- The grouped M3 list shape for the light rows.
- Rounded-rectangle (landscape) scene pictures.
- Tapping the header title opens the detail screen on single-light cards.
- The dialog's base tint is lighter than the card's, and the glow carries most of the color. `tint: full` changes only the glow.
- `hueScreenBgColor` now defaults to the theme surface instead of `#171717`.
- The spec file lives in `doc/` next to `m3-design-spec.md` (the repo's convention), not `docs/superpowers/specs/`.

## Left to the builder

- How the glow is drawn (a CSS gradient on the dialog surface or an element like today's backdrop), as long as it meets the spec above.
- How to compute "pages" for the dots, and the exact opacity values within the ranges given.
- Whether light rows reuse `HueDialogLightTile` or become a new element (it must follow the `Consts.ElementPostfix` naming).
- Tests for any new pure logic (for example page math), following `tests/` conventions.
