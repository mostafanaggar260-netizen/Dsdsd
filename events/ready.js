const { setupReactionRoleMessage } = require('./reactionRoles');

module.exports = function registerReady(client, allCommands) {
  client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);

    try {
      await client.application.commands.set(allCommands.map((cmd) => cmd.data.toJSON()));
      console.log(`✅ Registered ${allCommands.length} slash commands.`);
    } catch (err) {
      console.error('Failed to register slash commands:', err);
    }

    await setupReactionRoleMessage(client);
  });
};
