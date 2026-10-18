# M3 Hue Light Card: full configuration reference

This page lists every option. For installation and the most common setups, see the [README](../README.md).

- [Card options](#card-options)
- [Entities list](#entities-list)
- [Tap and hold actions](#tap-and-hold-actions)
- [Text templates](#text-templates)
- [Colors](#colors)
- [Icons](#icons)
- [Description](#description)
- [Scenes](#scenes)
- [Opening the scene screen from elsewhere (API)](#opening-the-scene-screen-from-elsewhere-api)
- [Styling with card-mod](#styling-with-card-mod)

## Card options

### Which lights

At least one of these is required. Only `light` entities (and `switch` entities) are used. Areas, floors and labels pick up the lights inside them.

| Option | Type | Description |
|---|---|---|
| `entity` | string | One light or switch, e.g. `light.office` |
| `entities` | list | Several lights or switches. Each item can be an entity ID or an [entity object](#entities-list). |
| `area` | string | Name or ID of an area, e.g. `Living room` or `living_room` |
| `floor` | string | Name or ID of a floor, e.g. `First floor` or `first_floor` |
| `label` | string | Name or ID of a label, e.g. `Kitchen - desk` or `kitchen_desk` |
| `groupEntity` | string | A light group entity for the same lights, e.g. `light.living_room_group`. When set, the card switches the group instead of each light one by one. Some integrations (like Hue) create a room entity for this, sometimes disabled by default. |

### Look

| Option | Type | Default | Description |
|---|---|---|---|
| `title` | [text template](#text-templates) | the lights' name | Card title |
| `description` | [text template](#text-templates) or `false` | [automatic](#description) | Line under the title. `%s` is replaced with the number of lights that are on, e.g. `'On: %s'`. Set to `false` to hide it. |
| `icon` | string | [automatic](#icons) | Card icon |
| `iconSize` | `big`, `original`, `small` or a number | `original` | See [Icons](#icons) |
| `tint` | `harmonized` or `full` | `harmonized` | `harmonized` blends the light color into your theme's surface color, and shows brightness by how strong the tint is. `full` uses the light's colors as they are, like the original Hue-Like card. |
| `slider` | `default`, `wavy` or `none` | `default` | `default` is the flat M3 slider. `wavy` draws the active part as a moving wave, in the M3 Expressive style; the wave stands still when the system's reduced-motion setting is on. `none` hides the brightness slider. |
| `showSwitch` | boolean | `true` | `false` hides the on/off switch, which gives the title more room. You can then use [tap actions](#tap-and-hold-actions) to turn the lights on and off. |
| `defaultColor` | [color](#colors) | `warm` | Color used for lights that don't report a color (white-only or switch entities) |
| `offColor` | [extended color](#colors) | theme surface (`harmonized`), `#666` (`full`) | Card color when all lights are off. Also used in the scene screen header. |
| `hueScreenBgColor` | [extended color](#colors) | theme surface | Background of the scene screen. When not set, the scene screen uses the theme surface (`--md-sys-color-surface-container-high`), tinted by the lights. |
| `theme` | theme name | your HA theme | Use a different installed theme for this card only |
| `offShadow` | boolean | `true` | `false` removes the inner shadow shown when all lights are off |
| `hueBorders` | boolean | `false` | `true` brings back the original Hue look: 10px corners and a drop shadow on the card and dialog. By default the card uses M3 28px corners and takes its shadow from your Home Assistant theme. |

### Behavior

| Option | Type | Default | Description |
|---|---|---|---|
| `allowZero` | boolean | `false` | Lets the slider go down to 0, which turns the lights off (and back on when you drag up) |
| `switchOnScene` | string | - | A scene entity, e.g. `scene.office_bright`. When set, turning the switch on activates this scene instead of just turning the lights on. |
| `scenes` | list, or `[]` | [detected automatically](#automatic-scene-detection) | Scenes shown in the scene screen. `[]` hides scenes. See [Scenes](#scenes). |
| `sceneOrder` | `default`, `name-asc` or `name-desc` | `default` | Order of automatically detected scenes |
| `sceneProvider` | `ha-scenes`, `scene-presets` or a list of both | `ha-scenes` | Where scenes come from. See [Scene sources](#scene-sources). |
| `apiId` | string | - | ID used to open this card's scene screen from elsewhere. See [API](#opening-the-scene-screen-from-elsewhere-api). |
| `isVisible` | boolean | `true` | `false` hides the card. Useful when you only want its scene screen through the API. |
| `card_mod` / `style` | | - | [card-mod](https://github.com/thomasloven/lovelace-card-mod) styling. See [Styling with card-mod](#styling-with-card-mod). |

**Older configs:** `slider: mushroom` still works and shows the M3 slider; you can remove it. The upstream options `disableOffShadow` and `resources` were removed before this fork and are ignored.

## Entities list

Each item in `entities` can be a plain entity ID or an object:

| Option | Type | Description |
|---|---|---|
| `entity` | string | Light or switch entity ID (required) |
| `title` | string | Name shown for this light in the scene screen |
| `icon` | string | Icon shown for this light in the scene screen |

```yaml
type: custom:m3-hue-light-card
title: Living room
entities:
  - light.sofa_lamp
  - entity: light.ceiling
    title: Ceiling
    icon: mdi:ceiling-light
```

## Tap and hold actions

By default, tapping the card opens the [scene screen](#scenes) and holding it opens Home Assistant's more-info dialog. You can set different actions for when the lights are off and on.

| Option | Default | When |
|---|---|---|
| `offClickAction` / `offClickData` | `hue-screen` | Tap while all lights are off |
| `onClickAction` / `onClickData` | `hue-screen` | Tap while any light is on |
| `offHoldAction` / `offHoldData` | `more-info` | Hold while all lights are off |
| `onHoldAction` / `onHoldData` | `more-info` | Hold while any light is on |

### Actions

| Action | Data | What it does |
|---|---|---|
| `default` | optional | Tap: `hue-screen`. Hold: `more-info`. |
| `none` | - | Nothing |
| `turn-on` | - | Turns all lights on |
| `turn-off` | - | Turns all lights off |
| `more-info` | optional `entity` | Opens the more-info dialog. Uses `groupEntity` if set, otherwise the first light that's on, otherwise the first light. With data, it can open any entity. |
| `scene` | required `scene` | Activates the scene |
| `hue-screen` | - | Opens the scene screen |

Example: tap toggles the lights, hold opens the scene screen.

```yaml
type: custom:m3-hue-light-card
entity: light.office
offClickAction: turn-on
onClickAction: turn-off
offHoldAction: hue-screen
onHoldAction: hue-screen
```

Action data can be given with or without its name:

```yaml
onClickAction: more-info
onClickData: media_player.television
```

```yaml
offClickAction: scene
offClickData:
  scene: scene.tv_citron
```

## Text templates

`title` and `description` can show entity states and attributes inside double curly brackets.

```yaml
type: custom:m3-hue-light-card
entity: light.tv_backlight
title: TV - {{ light.tv_backlight }}
```

```yaml
type: custom:m3-hue-light-card
entities:
  - light.kitchen_desk1
  - light.kitchen_desk2
title: Kitchen desk
description: 'On: %s ({{ light.kitchen_desk1.brightness }}, {{ light.kitchen_desk2.brightness }})'
```

If an attribute is missing or empty, the entity's state is shown instead.

## Colors

A **color** can be written as:

- hex: `'#fff'`, `'#ffffff'`, or with transparency `'#fffa'`, `'#ffffffaa'`
- `'rgb(255,255,255)'` or `'rgba(255,255,255,0.9)'`
- a web color name: `'red'`, `'salmon'`, `'DarkSeaGreen'`
- `'warm'` or `'cold'` (where it makes sense)

An **extended color** can also be `theme-color`, which uses the card background from your current Home Assistant theme.

## Icons

### Automatic icon

- If `label` is set and the label has an icon, that icon is used.
- With **one** light, the light's own icon is used, or `mdi:lightbulb` if it has none.
- With **two** lights: `mdi:lightbulb-multiple`.
- With **three or more**: `mdi:lightbulb-group`.

With [hass-hue-icons](https://github.com/arallsopp/hass-hue-icons) installed, the card uses Hue icons instead: `hue:bulb-classic` for one light without an icon, then `hue:bulb-group-classic`, `hue:bulb-group-classic-3` and `hue:bulb-group-classic-4` for two, three, and four or more lights.

### Icon size

`iconSize` takes `big` (2.0), `original` (1.42), `small` (1.0), or any number, where `1.0` is 24px. For example `0.5` is 12px and `2.0` is 48px.

## Description

When `description` isn't set, a card with a single light shows no description. A card with several lights picks one of these, in this order:

- no lights on
- all lights on
- one light on
- X of Y lights on

The text follows your Home Assistant language.

## Scenes

Tapping the card opens the **scene screen**. It shows scenes for the card's lights and lets you change each light's color, color temperature and brightness, like the Philips Hue app.

> The scene screen still has the original Hue-Like look. An M3 restyle is planned.

<p>
  <img alt="Scene screen" src="https://github.com/m3owmixr/m3-hue-light-card/raw/main/doc/hue-screen2.png" height="480" />
  <img alt="Light detail" src="https://github.com/m3owmixr/m3-hue-light-card/raw/main/doc/hue-screen-detail-1.png" height="480" />
</p>

### Choosing scenes

| Option | Type | Default | Description |
|---|---|---|---|
| `entity` | string | - | Scene entity ID, e.g. `scene.tv_orange` (required) |
| `title` | string | scene name | Text on the scene button. If the scene name starts with the card title, that part is removed. |
| `icon` | string | scene icon, or `mdi:palette` | Icon on the scene button. `''` shows no icon. |
| `color` | [color](#colors) | `darkgoldenrod` | Accent color of the scene button |
| `activation` | action name | `scene.turn_on` | The action called to activate the scene |
| `activationData` | object | - | Data for `activation`. `entity_id` is filled in with the scene automatically, unless you set it here. |

```yaml
type: custom:m3-hue-light-card
area: Living room
scenes:
  - scene.colors_bluered            # just the entity ID is fine
  - entity: scene.colors_cyan
    title: My favorite scene
    color: cyan
  - entity: scene.colors_blue_xmas
    icon: mdi:pine-tree
  - entity: scene.colors_white
    color: white
    icon: ''
```

Set both `icon` and `color` on each scene for the best look. Scene buttons also show the scene's `entity_picture` if it has one. You can set one with [customize](https://www.home-assistant.io/docs/configuration/customizing-devices/#manual-customization); [hue-scene-icons](https://github.com/mattmon/hue-scene-icons) has the original Hue images.

### Hue dynamic scenes

```yaml
scenes:
  - entity: scene.colors_tokyo
    title: Tokyo (dynamic)
    color: rgb(168, 25, 255)
    icon: mdi:home-city
    activation: hue.activate_scene
    activationData:
      dynamic: true
      brightness: 180
      speed: 40
```

### Automatic scene detection

When `scenes` isn't set, the card finds scenes from the areas its lights are in. All scenes from all those areas are shown, without duplicates. Icons come from Home Assistant. Colors can't be detected, so set scenes yourself for the best look.

`sceneOrder` sorts detected scenes:

- `default`: by the order of the lights' areas, then Home Assistant's order within each area
- `name-asc`: all scenes A to Z
- `name-desc`: all scenes Z to A

It doesn't apply to scenes you list yourself. Scenes fill two rows, column by column:

```
| 1 | 3 | 5 |
| 2 | 4 | … |
```

### Scene sources

`sceneProvider` chooses where scenes come from: Home Assistant scenes (`ha-scenes`), [Scene Presets](https://github.com/Hypfer/hass-scene_presets) (`scene-presets`), or both. With both, they're shown in the order you list them.

```yaml
sceneProvider:
  - ha-scenes
  - scene-presets
```

## Opening the scene screen from elsewhere (API)

Give a card an `apiId` to open its scene screen from another card, a link or JavaScript.

```yaml
type: custom:m3-hue-light-card
area: Living room
apiId: living_room
```

**From another card or a link:** add `#m3_hue_card:{apiId}_openHueScreen` to the dashboard URL. The card opens its scene screen and removes the hash from the URL.

```yaml
type: tile
entity: light.living_room
tap_action:
  action: navigate
  navigation_path: '#m3_hue_card:living_room_openHueScreen'
```

A full link looks like `https://<your-home-assistant>/lovelace/lights#m3_hue_card:living_room_openHueScreen`.

**From JavaScript:** cards with an `apiId` add functions to `window.m3_hue_card`, named `{apiId}_openHueScreen`.

```js
window.m3_hue_card.living_room_openHueScreen();
```

To use only the scene screen, hide the card with `isVisible: false`.

> The original card uses `hue_card` instead of `m3_hue_card`, so both cards can be installed side by side.

## Styling with card-mod

On a lit card, the slider and switch are drawn in the card's text color. You can override the slider colors with [card-mod](https://github.com/thomasloven/lovelace-card-mod):

```yaml
type: custom:m3-hue-light-card
entity: light.office
card_mod:
  style: |
    .brightness-slider {
      --m3-slider-active-color: white;
      --m3-slider-inactive-color: rgba(255, 255, 255, 0.24);
      --m3-slider-handle-color: white;
      --m3-slider-stop-color: rgba(255, 255, 255, 0.6);
    }
```
