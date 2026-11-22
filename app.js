'use strict';

const Homey = require('homey');
const { HomeyAPI } = require('homey-api');

const PANELS_KEY = 'panels';
const FLUSH_MS = 300;

/**
 * Compact Widgets
 *
 * Panels (sets of gauges) are stored in the app settings by the settings page.
 * The app subscribes to every device capability used in a panel and pushes value
 * changes to all widgets with one realtime event ('values'), batched per 300 ms.
 */
class CompactWidgetsApp extends Homey.App {

  async onInit() {
    this.values = {}; // "deviceId|capabilityId" -> value
    this.instances = new Map(); // "deviceId|capabilityId" -> capability instance
    this.pending = {};
    this.flushTimer = null;
    this.syncing = Promise.resolve();

    this.api = await HomeyAPI.createAppAPI({ homey: this.homey });

    this.homey.settings.on('set', (key) => {
      if (key === PANELS_KEY) this.queueSync();
    });

    this.homey.dashboards.getWidget('gauges')
      .registerSettingAutocompleteListener('panel', async (query) => {
        const q = String(query || '').toLowerCase();
        return this.getPanels()
          .filter((p) => p.name.toLowerCase().includes(q))
          .map((p) => ({
            id: p.id,
            name: p.name,
            description: `${(p.gauges || []).length} ${this.homey.__('gauges')}`,
          }));
      });

    this.queueSync();
    this.log('Compact Widgets initialized');
  }

  getPanels() {
    const panels = this.homey.settings.get(PANELS_KEY);
    return Array.isArray(panels) ? panels : [];
  }

  static key(gauge) {
    return `${gauge.deviceId}|${gauge.capability}`;
  }

  /** Run subscription syncs one after the other. */
  queueSync() {
    this.syncing = this.syncing
      .then(() => this.syncSubscriptions())
      .catch((err) => this.error('sync failed', err));
    return this.syncing;
  }

  /** Subscribe to the capabilities used in the panels, unsubscribe from the rest. */
  async syncSubscriptions() {
    const wanted = new Set();
    for (const panel of this.getPanels()) {
      for (const gauge of panel.gauges || []) {
        if (gauge.deviceId && gauge.capability) wanted.add(CompactWidgetsApp.key(gauge));
      }
    }

    for (const [key, instance] of this.instances) {
      if (wanted.has(key)) continue;
      try {
        instance.destroy();
      } catch (err) {
        // already gone
      }
      this.instances.delete(key);
      delete this.values[key];
    }

    for (const key of wanted) {
      if (this.instances.has(key)) continue;
      const [deviceId, capabilityId] = key.split('|');
      try {
        const device = await this.api.devices.getDevice({ id: deviceId });
        const capability = device.capabilitiesObj && device.capabilitiesObj[capabilityId];
        this.values[key] = capability ? capability.value : null;
        const instance = device.makeCapabilityInstance(capabilityId, (value) => this.onValue(key, value));
        this.instances.set(key, instance);
      } catch (err) {
        this.error(`Could not subscribe to ${key}: ${err.message}`);
        this.values[key] = null;
      }
    }
  }

  onValue(key, value) {
    this.values[key] = value;
    this.pending[key] = value;
    if (this.flushTimer) return;
    this.flushTimer = this.homey.setTimeout(() => {
      this.flushTimer = null;
      const batch = this.pending;
      this.pending = {};
      this.homey.api.realtime('values', batch);
    }, FLUSH_MS);
  }

  /** Panel definition plus current values, for the widget. */
  async getPanelData(id) {
    const panel = this.getPanels().find((p) => p.id === id);
    if (!panel) return null;
    await this.syncing;
    const values = {};
    for (const gauge of panel.gauges || []) {
      const key = CompactWidgetsApp.key(gauge);
      values[key] = key in this.values ? this.values[key] : null;
    }
    return { ...panel, values };
  }

  /** Devices with numeric capabilities, for the panel editor. */
  async getDevices() {
    const [devices, zones] = await Promise.all([
      this.api.devices.getDevices(),
      this.api.zones.getZones().catch(() => ({})),
    ]);
    return Object.values(devices)
      .map((device) => ({
        id: device.id,
        name: device.name,
        zone: (zones[device.zone] && zones[device.zone].name) || '',
        capabilities: Object.values(device.capabilitiesObj || {})
          .filter((c) => c && c.type === 'number')
          .map((c) => ({
            id: c.id,
            title: c.title || c.id,
            units: c.units || '',
            value: c.value,
            min: c.min,
            max: c.max,
            decimals: c.decimals,
          })),
      }))
      .filter((d) => d.capabilities.length > 0)
      .sort((a, b) => (a.zone + a.name).localeCompare(b.zone + b.name));
  }

}

module.exports = CompactWidgetsApp;
