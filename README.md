# M3 Hue Light Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/integration) [![Tests](https://github.com/m3owmixr/m3-hue-light-card/actions/workflows/validation.yml/badge.svg)](https://github.com/m3owmixr/m3-hue-light-card/actions/workflows/validation.yml) ![Downloads](https://img.shields.io/github/downloads/m3owmixr/m3-hue-light-card/total.svg)

A Home Assistant light card that takes on the color of your lights, styled for Material 3 and Material You. It's a fork of [Hue-Like Light Card](https://github.com/Gh61/lovelace-hue-like-light-card) by Gh61.

<p>
  <img alt="Card in light mode" src="https://github.com/m3owmixr/m3-hue-light-card/raw/main/doc/m3-card-light.png" width="400" />
  <img alt="Card in dark mode" src="https://github.com/m3owmixr/m3-hue-light-card/raw/main/doc/m3-card-dark.png" width="400" />
</p>
<p>
  <img alt="Several lights in light mode" src="https://github.com/m3owmixr/m3-hue-light-card/raw/main/doc/m3-multi-light.png" width="400" />
  <img alt="Several lights in dark mode" src="https://github.com/m3owmixr/m3-hue-light-card/raw/main/doc/m3-multi-dark.png" width="400" />
</p>

## Features

- **Tinted by your lights.** The card takes on the color of its lights, blended with your theme. Several lights of different colors make a gradient.
- **Material 3 controls.** An M3 brightness slider (flat, or wavy with `slider: wavy`) and switch, drawn in the card's text color so they never clash with the light color.
- **Hue-style scene screen.** Tap the card to pick scenes and adjust each light, including [Scene Presets](https://github.com/Hypfer/hass-scene_presets) support.
- **One card, many lights.** Control a single light, a list, or a whole area, floor or label.
- **Works with your theme.** Uses [Material You](https://github.com/Nerwyn/material-you-utilities) colors when available, and standard Home Assistant theme colors otherwise. Light and dark mode are both supported.

## Installation

### HACS (recommended)

1. Open HACS.
2. Open the three-dot menu (top right) and choose **Custom repositories**.
3. Add `https://github.com/m3owmixr/m3-hue-light-card` with the type **Dashboard**.
4. Search for **M3 Hue Light Card** and download it.
5. Refresh your browser.

### Manual

1. Download `m3-hue-light-card.js` from the [latest release](https://github.com/m3owmixr/m3-hue-light-card/releases/latest).
2. Copy it to `/config/www/`, for example `/config/www/m3-hue-light-card.js`.
3. Add it under [Dashboard resources](https://my.home-assistant.io/redirect/lovelace_resources/) with the URL `/local/m3-hue-light-card.js` and the type **JavaScript module**.
4. Refresh your browser.

## Recommended setup

The card looks best with these two, both by Nerwyn:

- **[Material You Theme](https://github.com/Nerwyn/material-you-theme):** a Material 3 theme for Home Assistant
- **[Material You Utilities](https://github.com/Nerwyn/material-you-utilities):** creates Material 3 colors from a color you pick

With them, `tint: harmonized` blends your lights into the same Material colors as the rest of your dashboard. They're optional: without them, the card uses your current theme's colors.

## Quick start

Add a card in your dashboard, choose **Manual**, and paste one of these.

**One light**

```yaml
type: custom:m3-hue-light-card
entity: light.floor_lamp
```

**Several lights**

```yaml
type: custom:m3-hue-light-card
title: TV lights
entities:
  - light.tv_left
  - light.tv_right
```

**A whole area** (also works with `floor` or `label`)

```yaml
type: custom:m3-hue-light-card
area: Living room
icon: mdi:sofa
```

## Common options

| Option | Default | What it does |
|---|---|---|
| `entity` / `entities` | - | The light(s) to control. Switches work too. |
| `area` / `floor` / `label` | - | Control every light in an area, floor or label |
| `title` | the lights' name | Card title. Can include [entity states](https://github.com/m3owmixr/m3-hue-light-card/blob/main/doc/configuration.md#text-templates). |
| `description` | lights-on summary | Line under the title. `false` hides it. |
| `icon` | chosen automatically | Card icon |
| `tint` | `harmonized` | `harmonized` or `full`. See [Tint](#tint). |
| `slider` | `default` | `wavy` draws the active part as a moving wave; `none` hides the brightness slider |
| `showSwitch` | `true` | `false` hides the on/off switch |
| `allowZero` | `false` | `true` lets the slider turn the lights off at 0 |
| `switchOnScene` | - | Scene to activate when you switch the card on |
| `scenes` | detected automatically | Scenes shown in the scene screen. `[]` hides them. |

Every option, including tap and hold actions, colors and scene settings, is in the **[full configuration reference](https://github.com/m3owmixr/m3-hue-light-card/blob/main/doc/configuration.md)**.

## Tint

`tint` controls how strongly the light color shows on the card.

| `harmonized` (default) | `full` |
|---|---|
| <img alt="tint: harmonized" src="https://github.com/m3owmixr/m3-hue-light-card/raw/main/doc/m3-tint-harmonized.png" width="380" /> | <img alt="tint: full" src="https://github.com/m3owmixr/m3-hue-light-card/raw/main/doc/m3-tint-full.png" width="380" /> |
| Blends the light color into your theme's card color. Brighter lights give a stronger tint. When off, the card uses your theme's normal card color. | The light's colors as they are, like the original Hue-Like card. |

```yaml
type: custom:m3-hue-light-card
entity: light.floor_lamp
tint: full
```

## Scenes

Tap the card to open the scene screen, where you can pick a scene or change each light's color and brightness. The card finds scenes from the areas its lights are in, or you can list your own:

```yaml
type: custom:m3-hue-light-card
area: Living room
scenes:
  - scene.living_room_relax
  - entity: scene.living_room_movie
    title: Movie
    icon: mdi:movie
    color: purple
```

To use [Scene Presets](https://github.com/Hypfer/hass-scene_presets) as well, add `sceneProvider: [ha-scenes, scene-presets]`. See [Scenes](https://github.com/m3owmixr/m3-hue-light-card/blob/main/doc/configuration.md#scenes) in the reference for colors, ordering and dynamic Hue scenes.

> The scene screen still has the original Hue-Like look. An M3 restyle is coming.

## More examples

**No switch; tap to toggle, hold for scenes**

```yaml
type: custom:m3-hue-light-card
entity: light.tv_backlight
icon: mdi:television
showSwitch: false
offClickAction: turn-on
onClickAction: turn-off
offHoldAction: hue-screen
onHoldAction: hue-screen
```

**White-only light with a custom color**

```yaml
type: custom:m3-hue-light-card
entity: light.bathroom
defaultColor: 'rgb(230,230,255)'
```

**Turn a scene on with the switch**

```yaml
type: custom:m3-hue-light-card
area: Office
switchOnScene: scene.office_bright
```

**Open a card's scene screen from another card**

```yaml
# The M3 Hue Light Card
type: custom:m3-hue-light-card
area: Living room
apiId: living_room
```

```yaml
# Any other card
type: tile
entity: light.living_room
tap_action:
  action: navigate
  navigation_path: '#m3_hue_card:living_room_openHueScreen'
```

## Tips

- **Hue icons:** install [hass-hue-icons](https://github.com/arallsopp/hass-hue-icons) to use Philips Hue icons such as `icon: hue:bulb-classic`. The card also uses them automatically where it picks icons itself.
- **Coming from the original card:** change `type: custom:hue-like-light-card` to `type: custom:m3-hue-light-card`. Your other options keep working, and both cards can be installed at the same time. You can remove `slider: mushroom`; Mushroom is no longer needed.

## Coming next

- **M3 scene screen** to match the card

## Credits and license

This is a fork of [Hue-Like Light Card](https://github.com/Gh61/lovelace-hue-like-light-card) by **Gh61 (Tom Zenkner)**, which provides the light control, the scene screen and the multi-light support. The slider design was inspired by [M3 Cards](https://github.com/j0sp0r/m3-cards) by j0sp0r (MIT).

**What's different from the original:** M3 slider and switch, M3 shapes and type, `tint: harmonized`, Material You colors, and no Mushroom dependency. The scene screen is unchanged so far. Card and API names use `m3` (`custom:m3-hue-light-card`, `#m3_hue_card:`), so this card can be installed next to the original.

Licensed under LGPL-2.1, like the original. See [LICENSE](https://github.com/m3owmixr/m3-hue-light-card/blob/main/LICENSE) and [NOTICE](https://github.com/m3owmixr/m3-hue-light-card/blob/main/NOTICE).
