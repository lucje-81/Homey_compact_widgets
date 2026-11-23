'use strict';

module.exports = {
  async getState({ homey, query }) {
    const ids = String(query.ids || '').split(',').filter(Boolean);
    return homey.app.getControlState(ids);
  },

  async setValue({ homey, body }) {
    return homey.app.setControlValue(body || {});
  },
};
