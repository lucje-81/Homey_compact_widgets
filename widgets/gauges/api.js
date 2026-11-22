'use strict';

module.exports = {
  async getPanel({ homey, query }) {
    return homey.app.getPanelData(query.id);
  },
};
