const { Events } = require('discord.js');
const { logChannelCreate, logChannelDelete, logChannelUpdate } = require('../handlers/logs');

module.exports = function registerChannelEvents(client) {
  client.on(Events.ChannelCreate, async (channel) => {
    if (channel.isDMBased()) return;
    await logChannelCreate(client, channel);
  });

  client.on(Events.ChannelDelete, async (channel) => {
    if (channel.isDMBased()) return;
    await logChannelDelete(client, channel);
  });

  client.on(Events.ChannelUpdate, async (oldChannel, newChannel) => {
    if (oldChannel.isDMBased() || newChannel.isDMBased()) return;
    await logChannelUpdate(client, oldChannel, newChannel);
  });
};
