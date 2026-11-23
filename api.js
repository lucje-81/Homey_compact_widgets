'use strict';

module.exports = {
  // Used by the settings page (panel editor)
  async getDevices({ homey }) {
    return homey.app.getDevices();
  },

  async getInfo({ homey }) {
    return { language: homey.app.getLanguage() };
  },
};
