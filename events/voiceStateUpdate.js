const { Events } = require('discord.js');
const { logVoiceStateChange } = require('../handlers/logs');

module.exports = function registerVoiceStateUpdate(client) {
  client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    await logVoiceStateChange(client, oldState, newState);
  });
};
