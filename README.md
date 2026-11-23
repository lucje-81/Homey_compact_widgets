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

## How to use

1. Install the app (see below).
2. Homey app → **Settings → Apps → Compact Widgets → Configure**.
3. Click **New panel**, add gauges, choose device and value. Sensible defaults are filled in (range, unit, colours); the preview shows the result live. Click **Save**.
4. Edit a dashboard → add widget → **Compact Widgets → Gauges** → choose the panel, gauges per row and size.

You can use the same panel in several widgets (e.g. 2 per row on a tablet, 3 per row on a phone).

## Permission

The app uses the `homey:manager:api` permission to read the values of devices from other apps. It only reads values; nothing is changed on your devices in this version.

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
- `widgets/gauges/`: the widget (`public/index.html`, `public/gauge.js`)
- `settings/index.html`: panel editor with live preview
- `settings/gauge.js`: copy of `widgets/gauges/public/gauge.js` (`npm run sync-gauge` after changing the renderer)

## Planned

- Compact tile/list widget mixing values and controls (on/off, dim, thermostat)

## License

MIT – see [LICENSE](LICENSE).
