'use strict';

module.exports = {
  async getState({ homey, query }) {
    const ids = String(query.ids || '').split(',').filter(Boolean);
    return homey.app.getEnergyState(ids);
  },

  async getHistory({ homey, query }) {
    return homey.app.getHistory(String(query.device || ''), String(query.capability || ''));
  },

  async setFields({ homey, body }) {
    return homey.app.setEnergyFields(body || {});
  },
};
