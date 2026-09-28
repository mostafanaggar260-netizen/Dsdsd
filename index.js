// Entry point — this is the ONLY file Orihost's "Main file" setting
// needs to point at. Everything else is required in from here.
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const env = require('./config/env');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildModeration,
  ],
  partials: [Partials.GuildMember, Partials.Message, Partials.Reaction, Partials.User, Partials.Channel],
});

// ── Commands ────────────────────────────────────────────────
const moderationCommands = require('./commands/moderation');
const utilityCommands = require('./commands/utility');
const ticketCommands = require('./commands/tickets');
const ownerCommands = require('./commands/owner');
const activityCommands = require('./commands/activities');
const communityCommands = require('./commands/community');
const logsSetupCommands = require('./commands/logsSetup');
const eventCommands = require('./commands/event');

const allCommands = [
  ...moderationCommands,
  ...utilityCommands,
  ...ticketCommands,
  ...ownerCommands,
  ...activityCommands,
  ...communityCommands,
  ...logsSetupCommands,
  ...eventCommands,
];
const commands = new Collection();
for (const cmd of allCommands) {
  commands.set(cmd.data.name, cmd);
}

// ── Events ──────────────────────────────────────────────────
require('./events/ready')(client, allCommands);
require('./events/interactionCreate')(client, commands);
require('./events/guildMemberAdd')(client);
require('./events/guildMemberRemove')(client);
require('./events/messageEvents')(client);
require('./events/channelEvents')(client);
require('./events/roleEvents')(client);
require('./events/voiceStateUpdate')(client);
require('./events/reactionRoles').registerReactionRoles(client);
require('./events/activityReminder')(client);

client.login(env.TOKEN);
