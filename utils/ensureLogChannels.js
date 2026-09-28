// On startup (and via the admin /setup_role_logs command), makes sure the
// "role added" / "role removed" log channels exist — creating them itself
// if they don't, instead of requiring you to make them by hand and paste
// IDs into .env.
//
// Priority order per channel:
//   1. The ID already in .env, if that channel still exists.
//   2. An ID this same function created on a previous run (remembered in
//      data/auto-log-channels.json), if that channel still exists.
//   3. Otherwise, create a brand new channel and remember its ID.
const { ChannelType, OverwriteType, PermissionFlagsBits } = require('discord.js');
const env = require('../config/env');
const { getStoredChannelId, setStoredChannelId } = require('../database/logChannels');

const CHANNELS_TO_ENSURE = [
  { envKey: 'LOG_ROLE_ADD_CHANNEL_ID', storeKey: 'roleAdd', name: 'role-add-logs' },
  { envKey: 'LOG_ROLE_REMOVE_CHANNEL_ID', storeKey: 'roleRemove', name: 'role-remove-logs' },
];

async function ensureLogChannels(client, guildOverride) {
  const guild = guildOverride || client.guilds.cache.first();
  if (!guild) return [];

  // Staff role gets to see the log channels; @everyone is denied.
  const staffRoleId = env.TICKET_SUPPORT_ROLE_ID || '';
  const results = [];

  for (const { envKey, storeKey, name } of CHANNELS_TO_ENSURE) {
    let existing = env[envKey] ? guild.channels.cache.get(env[envKey]) : null;

    if (!existing) {
      const storedId = getStoredChannelId(storeKey);
      existing = storedId ? guild.channels.cache.get(storedId) : null;
    }

    if (existing) {
      env[envKey] = existing.id; // keep the rest of the bot in sync
      setStoredChannelId(storeKey, existing.id);
      results.push({ name, channel: existing, created: false });
      continue;
    }

    try {
      const created = await guild.channels.create({
        name,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          { id: guild.id, deny: [PermissionFlagsBits.ViewChannel], type: OverwriteType.Role },
          ...(staffRoleId
            ? [
                {
                  id: staffRoleId,
                  allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
                  type: OverwriteType.Role,
                },
              ]
            : []),
        ],
      });
      env[envKey] = created.id;
      setStoredChannelId(storeKey, created.id);
      console.log(`✅ Auto-created log channel #${name} (${created.id})`);
      results.push({ name, channel: created, created: true });
    } catch (err) {
      console.error(`Failed to auto-create log channel #${name}:`, err);
      results.push({ name, channel: null, created: false, error: err });
    }
  }

  return results;
}

module.exports = { ensureLogChannels };
