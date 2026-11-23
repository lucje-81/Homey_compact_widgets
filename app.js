'use strict';

const Homey = require('homey');
const { HomeyAPI } = require('homey-api');

const PANELS_KEY = 'panels';
// Capabilities the control widgets show; SETTABLE ones can be changed from a widget
const CONTROL_CAPABILITIES = [
  'onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature', 'light_mode',
  'target_temperature', 'measure_temperature', 'thermostat_mode',
  'windowcoverings_set', 'windowcoverings_state',
  'garagedoor_closed', 'alarm_contact',
];
const READ_ONLY = ['measure_temperature', 'alarm_contact'];
// Capabilities without a value (a press, e.g. an impulse relay for a gate): only reported as present
const ACTION_CAPABILITIES = ['button'];
const SETTABLE = [...CONTROL_CAPABILITIES.filter((c) => !READ_ONLY.includes(c)), ...ACTION_CAPABILITIES];
const ICONS_KEY = 'icons';
const ICON_CHOICES = ['auto', 'thermostat', 'shutter', 'awning', 'sectional', 'tilt', 'roller', 'swing', 'sliding', 'power'];
const FLOW_SLOTS = ['flow1', 'flow2', 'flow3', 'flow4', 'flow5', 'flow6', 'flow7', 'flow8'];
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
    this.controlKeys = new Set(); // capabilities used by "Lights and switches" widgets

    this.api = await HomeyAPI.createAppAPI({ homey: this.homey });

    this.homey.settings.on('set', (key) => {
      if (key === ICONS_KEY) this.homey.api.realtime('icons', this.homey.settings.get(ICONS_KEY) || {});
      if (key !== PANELS_KEY) return;
      // subscribe to new values first, then tell open widgets to reload their panel
      this.queueSync().then(() => this.homey.api.realtime('panels', { updated: Date.now() }));
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

    const flowsWidget = this.homey.dashboards.getWidget('flows');
    for (const slot of FLOW_SLOTS) {
      flowsWidget.registerSettingAutocompleteListener(slot, async (query) => this.getFlowList(query));
    }

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
    const wanted = new Set(this.controlKeys);
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
    return { ...panel, values, language: this.homey.i18n.getLanguage() };
  }

  /** State of the devices of a "Lights and switches" widget; subscribes to their values. */
  async getControlState(ids) {
    const devices = [];
    let added = false;
    for (const id of ids) {
      try {
        const device = await this.api.devices.getDevice({ id });
        const caps = {};
        const options = {};
        for (const capId of CONTROL_CAPABILITIES) {
          const capability = device.capabilitiesObj && device.capabilitiesObj[capId];
          if (!capability) continue;
          const key = `${id}|${capId}`;
          if (!this.controlKeys.has(key)) {
            this.controlKeys.add(key);
            added = true;
          }
          caps[capId] = key in this.values ? this.values[key] : capability.value;
          if (capId === 'dim') options.dim = { min: capability.min ?? 0, max: capability.max ?? 1 };
          if (capId === 'target_temperature') {
            options.target_temperature = {
              min: capability.min ?? 5, max: capability.max ?? 30, step: capability.step || 0.5, units: capability.units || '°C',
            };
          }
          if (capId === 'thermostat_mode' && Array.isArray(capability.values)) {
            options.thermostat_mode = capability.values.map((v) => ({ id: v.id, title: v.title || v.id }));
          }
        }
        for (const capId of ACTION_CAPABILITIES) {
          if (device.capabilitiesObj && device.capabilitiesObj[capId]) caps[capId] = null;
        }
        devices.push({
          id, name: device.name, class: device.class, virtualClass: device.virtualClass || null, caps, options,
          available: device.available !== false,
        });
      } catch (err) {
        devices.push({ id, name: '?', missing: true, caps: {} });
      }
    }
    if (added) await this.queueSync();
    return { devices, language: this.homey.i18n.getLanguage(), icons: this.homey.settings.get(ICONS_KEY) || {} };
  }

  /** Icon chosen for a device in a widget (stored app-wide, so every dashboard shows the same icon). */
  async setIcon({ deviceId, icon }) {
    if (!deviceId || !ICON_CHOICES.includes(icon)) throw new Error('Not allowed');
    const icons = { ...(this.homey.settings.get(ICONS_KEY) || {}) };
    if (icon === 'auto') delete icons[deviceId];
    else icons[deviceId] = icon;
    this.homey.settings.set(ICONS_KEY, icons);
    return icons;
  }

  /** Set one capability of a device (only the capabilities the widget offers). */
  async setControlValue({ deviceId, capability, value }) {
    if (!deviceId || !SETTABLE.includes(capability)) throw new Error('Not allowed');
    await this.api.devices.setCapabilityValue({ deviceId, capabilityId: capability, value });
    return true;
  }

  /** Triggerable flows and advanced flows for the Flows widget autocomplete. */
  async getFlowList(query) {
    const q = String(query || '').toLowerCase();
    const [flows, advanced] = await Promise.all([
      this.api.flow.getFlows().catch(() => ({})),
      this.api.flow.getAdvancedFlows().catch(() => ({})),
    ]);
    const list = [];
    for (const f of Object.values(flows)) {
      if (f.triggerable) list.push({ id: `f:${f.id}`, name: f.name, description: this.homey.__('flow') });
    }
    for (const f of Object.values(advanced)) {
      if (f.triggerable) list.push({ id: `a:${f.id}`, name: f.name, description: this.homey.__('advancedFlow') });
    }
    return list
      .filter((f) => f.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 50);
  }

  /** Start a flow chosen in a Flows widget ("f:<id>" or "a:<id>"). */
  async runFlow(id) {
    const [kind, flowId] = String(id || '').split(':');
    if (!flowId) throw new Error('Unknown flow');
    if (kind === 'a') await this.api.flow.triggerAdvancedFlow({ id: flowId });
    else await this.api.flow.triggerFlow({ id: flowId });
    return true;
  }

  getLanguage() {
    return this.homey.i18n.getLanguage();
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
