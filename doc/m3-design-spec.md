# M3 Hue Light Card: design spec (collapsed card)

Status: **agreed 2026-10-03** (decisions A–C below). Scope: the collapsed card only. The scene dialog stays as upstream for now.

## Principles

1. **Keep the Hue identity.** The card stays tinted by the light's colour(s), including the multi-light gradient. That tint is the card's "surface".
2. **Use M3 for structure.** Shape, spacing, type scale and control anatomy follow Material 3 / M3 Expressive.
3. **Use tokens with fallbacks.** Read the `--md-sys-*` variables that Material You Utilities provides, and fall back to HA theme variables when they're missing. Never hardcode hex values.
4. **Draw controls in the card's foreground colour.** On a tinted card, the controls use the colour already computed for readable text, not the theme accent. This removes the clash the card_mod experiments ran into.

## Container

| Property | On (tinted) | Off / unavailable |
|---|---|---|
| Background | Light-colour tint/gradient. Strength set by `tint` (decision C, see below) | `--md-sys-color-surface-container-high` → `--ha-card-background` |
| Foreground (text, icon, controls) | Existing contrast colour (`--hue-text-color`) | `--md-sys-color-on-surface` → `--primary-text-color` |
| Corner radius | `--md-sys-shape-corner-extra-large` → **28px** | same |
| Elevation | Theme default (`--ha-card-box-shadow`) | same |
| Padding | **16px** (M3 card padding; was 14px) | same |

`hueBorders` and `offShadow` stay available as options so existing configs still parse, but the new default look is M3.

## Header row

| Element | Spec |
|---|---|
| Icon | 24px glyph centred in a **40px** container (M3 list-item leading element). The container uses the foreground colour at 12% opacity as a tonal "state layer". |
| Title | M3 **title-medium**: 16px / 24px line height / weight 500 / tracking 0.15px |
| Description | M3 **body-medium**: 14px / 20px / weight 400, at 80% foreground opacity. Max 2 lines. |
| Toggle | **M3 switch** (decision B), see below |
| Spacing | 16px between icon and text, 12px between text and toggle |

## Switch (M3, decision B)

| Part | Off | On |
|---|---|---|
| Track | 52 × 32px, fully rounded. Transparent with a 2px outline in the foreground colour | Filled with the foreground colour |
| Handle | 16px circle, foreground colour | 24px circle in the card's background colour (inverse), optional check icon |
| Pressed | Handle grows to 28px | Handle grows to 28px |

When the card is off and untinted: on-track `--md-sys-color-primary`, on-handle `--md-sys-color-on-primary`, off-outline `--md-sys-color-outline`, off-handle `--md-sys-color-outline`. The switch is a small custom element (not `ha-switch`), so theme changes in HA can't restyle it unexpectedly. It has `role="switch"` and is keyboard operable.

## Tint (decision C)

New option `tint: harmonized | full`, default **`harmonized`**.
- `full` uses today's saturated Hue colours and gradient, unchanged.
- `harmonized` mixes each light colour into `--md-sys-color-surface-container-high` (starting point: 45% light colour, tune by eye). The mix happens **in JS with the card's existing `Color` classes**, not CSS `color-mix()`, so the readable-text colour is computed from the actual mixed colour.

## Brightness slider (M3 Expressive, XS size; decision A)

New option `slider_style: flat | wavy`, default **`flat`**.

Sources: Material Components Android `Slider.md` (M3 Expressive defaults) and m3-cards `m3-light-card` (wavy variant).

| Part | Flat (M3 spec) | Wavy (m3-light-card) |
|---|---|---|
| Active track | 16px tall, outer corner 8px, inside corner 2px | 6px stroke, sine wave: amplitude 3.5px, wavelength 24px, animated phase |
| Inactive track | 16px tall, same corners | 6px straight stroke, round caps |
| Handle | **4 × 44px** bar, 2px radius; narrows to 2px while dragging | 6 × 34px bar, 3px radius |
| Handle–track gap | 6px on each side | 6px on each side (12px total) |
| Stop indicator | 4px dot at the far end of the inactive track | none |
| Touch target | 48px tall row | 56px tall row |
| Keyboard | ←/→ ±5%, Shift ±1%, Home/End | same |

**Colours on a tinted card:** active track and handle use the foreground colour; the inactive track uses the foreground at 24%; the stop dot uses the foreground at 60%.
**Colours when off:** M3 defaults, i.e. active `--md-sys-color-primary`, inactive `--md-sys-color-surface-container-highest`.

**Behaviour carried over from m3-light-card:**
- Throttle `light.turn_on` to about 200ms while dragging.
- Update the UI optimistically.
- During a drag, redraw only the slider, not the whole card.
- Use `touch-action: none` so dragging doesn't scroll the page.
- Respect `prefers-reduced-motion`.

The new slider replaces `mushroom-slider` and removes the dependency on the mushroom package. `slider: mushroom`/`default` configs map to the new slider; `slider: none` still hides it.

## Size budget

16 (padding) + 40 (header) + 8 + 48 (slider row) + 4 ≈ **116px**, versus about 96px for the current card with the mushroom slider. If that's too tall, a `compact` option can shrink it (smaller row, flat XS slider, icon acts as the toggle).

## Decisions

- **A. Slider:** both styles via `slider_style`, `flat` by default.
- **B. Toggle:** M3 switch.
- **C. Tint:** `tint: harmonized | full`, `harmonized` by default.

## Out of scope for this pass

- Scene dialog / detail screen restyle (later phase)
- Colour-temperature row on the collapsed card
- Visual editor changes beyond new options
