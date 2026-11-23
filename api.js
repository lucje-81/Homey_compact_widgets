'use strict';

module.exports = {
  // Used by the settings page (panel editor)
  async getDevices({ homey }) {
    return homey.app.getDevices();
  },

  async getIconDevices({ homey }) {
    return homey.app.getIconDevices();
  },

  // Called by the Flow Mover app (app-to-app API) to take over the settings of another Homey
  async importSettings({ homey, body }) {
    return homey.app.importSettings(body);
  },

  async getInfo({ homey }) {
    return { language: homey.app.getLanguage() };
  },
};
