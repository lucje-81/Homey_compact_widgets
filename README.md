# Compact Widgets – Homey App

Small, configurable dashboard widgets for Homey Pro. The default dashboard widgets show one value per (large) tile;
this app puts **several gauges in one widget**, so a full energy dashboard fits on one screen.

## Gauges widget (v0.1)

- Several gauges in one widget, for **any device** in your Homey (Growatt, P1 meter, EV charger, thermostats, …)
- Per item a **display**: gauge, **horizontal bar** (full width, title and value above the bar) or **vertical bar** (in the grid, like a gauge); mix them in one panel
- **Gauges per row**: automatic (as many as fit), or fixed 1, 2, 3, 4 or 6
- **Size**: small, medium or large
- Per gauge: device and value, title, minimum and maximum, unit, decimals and colour scale
  - green → red (consumption), red → green (battery level), grey → yellow (solar), blue → red (temperature), neutral
  - **from 0 (+/−)** for signed values such as grid import/export or battery charge/discharge
- Values update live; the widget height follows its content, so there is no empty space
- After **Save** in the settings, open widgets reload their panel immediately
- Numbers use the language of your Homey (e.g. `0,6 A` in Dutch)
- Follows Homey's light and dark theme

On a tablet with 4 dashboard columns, six gauges take about the height of one standard gauge widget.

## Lights and switches widget (v0.4)

- Choose your devices directly in the widget settings (Homey's own device picker; every device that can switch on/off)
- Compact tiles: icon, name and state (`On · 60 %`); icon and background follow the actual light colour or warm/cold white; a thin bar shows the brightness
- **Tap** a tile to switch on/off
- **Sliders button** (or **long press** on the tile) opens the controls below the tile, showing only what the light supports:
  brightness, warm ↔ cold white, colour and saturation, plus quick presets (warm/neutral/cold white and 8 colours)
- Tiles per row: automatic or 1–4; size small/medium/large. Narrow tiles put the name over the full width (two lines), tiles stay at least 44 px high for touch
- Sliders send while dragging (max. ~3 times per second) and always the final value; echoes from the device are ignored briefly so sliders do not jump back

## Climate, covers and gates widget (v0.5–0.6)

- Thermostats: current temperature large, target and mode below; orange when heating, blue when cooling (mode `cool`)
- Tap a thermostat to open **− / +** buttons (in the device's own step, min and max) and the available modes; the new target is sent 0.7 s after the last tap
- Window coverings: state (`Open 60 %`, `Closed`, going up/down) with a thin position bar; tap for **▲ ■ ▼** and a position slider (only what the device supports)
- Garage doors and gates (v0.6): `garagedoor_closed` (Open / Close buttons), impulse relays with a `button` capability (Operate button), relays with on/off, and a contact sensor (`alarm_contact`) for the state. Gates always open a panel first, so a single accidental tap never moves a gate
- Icons drawn to show the actual state (closed, half open, open): sectional door, up-and-over (tilt) door, roller door, swing gate with two leaves, sliding gate, roller shutter, awning, thermostat, switch
- The icon is guessed from the device class and name (e.g. "kantelpoort", "schuifpoort", "tuinpoort"); change it in the panel under **Icon** (long press on a tile also opens the panel). The choice is stored in the app, so every dashboard shows the same icon
- Plain on/off devices can be added too and are switched with a tap

## Flows widget (v0.5)

- Up to 8 buttons, each starting a flow or advanced flow (only flows that can be started, i.e. with the "This flow is started" card)
- Choose them in the widget settings by typing part of the name
- Tap: spinner while starting, green ✓ when done, red ✗ on error

## How to use

1. Install the app (see below).
2. Homey app → **Settings → Apps → Compact Widgets → Configure**.
3. Click **New panel**, add gauges, choose device and value. Sensible defaults are filled in (range, unit, colours); the preview shows the result live. Click **Save**.
4. Edit a dashboard → add widget → **Compact Widgets → Gauges** → choose the panel, gauges per row and size.

You can use the same panel in several widgets (e.g. 2 per row on a tablet, 3 per row on a phone).

## Permission

The app uses the `homey:manager:api` permission to read the values of devices from other apps and, in the Lights and switches and Climate widgets, to control them (on/off, dim, light colour/temperature/mode, target temperature, thermostat mode, window coverings, garage doors and button presses), and to start the flows you put on the Flows widget.

## Installation

```bash
npm install -g homey
git clone https://github.com/lucje-81/Homey_compact_widgets.git
cd Homey_compact_widgets
npm install
homey login
homey app install
```

To update later: `git pull`, then `homey app install`.

## Files

- `app.js`: live subscriptions to the device values used in panels (via `homey-api`), pushes changes to the widgets
- `widgets/gauges/`: the gauges widget (`public/index.html`, `public/gauge.js`)
- `widgets/controls/`, `widgets/climate/`, `widgets/flows/`: lights and switches, climate and covers, flow buttons
- `settings/index.html`: panel editor with live preview
- `settings/gauge.js`: copy of `widgets/gauges/public/gauge.js` (`npm run sync-gauge` after changing the renderer)

## Planned

- Ideas welcome

## License

MIT – see [LICENSE](LICENSE).
