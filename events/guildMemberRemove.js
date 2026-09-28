const { Events } = require('discord.js');
const { logMemberLeave, logMemberUpdate } = require('../handlers/logs');

module.exports = function registerMemberEvents(client) {
  client.on(Events.GuildMemberRemove, async (member) => {
    await logMemberLeave(client, member);
  });

  client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    await logMemberUpdate(client, oldMember, newMember);
  });
};
