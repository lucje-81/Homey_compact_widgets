'use strict';

module.exports = {
  // Used by the settings page (panel editor)
  async getDevices({ homey }) {
    return homey.app.getDevices();
  },
};
