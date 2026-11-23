'use strict';

module.exports = {
  async runFlow({ homey, body }) {
    return homey.app.runFlow(body && body.id);
  },
};
