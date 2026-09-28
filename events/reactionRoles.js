// TikTok / YouTube reaction-role message (unchanged behaviour from the
// original bot, just moved into its own file).
const fs = require('fs');
const path = require('path');
const env = require('../config/env');

const TIKTOK_EMOJI = { name: 'tik', id: '1531651151551004692' };
const YOUTUBE_EMOJI = { name: 'yt', id: '1531651947667390535' };
const ROLE_MESSAGE_FILE = path.join(__dirname, '..', 'reaction-role-message.json');

async function setupReactionRoleMessage(client) {
  if (!env.REACTION_ROLE_CHANNEL_ID) return;
  try {
    const channel = await client.channels.fetch(env.REACTION_ROLE_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) return;

    let saved = null;
    if (fs.existsSync(ROLE_MESSAGE_FILE)) {
      saved = JSON.parse(fs.readFileSync(ROLE_MESSAGE_FILE, 'utf8'));
    }

    if (saved && saved.messageId) {
      try {
        await channel.messages.fetch(saved.messageId);
        console.log('ℹ️ Reaction-role message already exists, skipping repost.');
        return;
      } catch {
        // message no longer exists, fall through and repost
      }
    }

    const message = await channel.send(
      `اختار المنصه البتنشر عليها:\n\n` +
        `Tiktok: <:${TIKTOK_EMOJI.name}:${TIKTOK_EMOJI.id}>\n\n` +
        `Youtube: <:${YOUTUBE_EMOJI.name}:${YOUTUBE_EMOJI.id}>`
    );

    await message.react(`${TIKTOK_EMOJI.name}:${TIKTOK_EMOJI.id}`);
    await message.react(`${YOUTUBE_EMOJI.name}:${YOUTUBE_EMOJI.id}`);

    fs.writeFileSync(ROLE_MESSAGE_FILE, JSON.stringify({ messageId: message.id }));
    console.log('✅ Reaction-role message posted.');
  } catch (err) {
    console.error('Error setting up reaction-role message:', err);
  }
}

function registerReactionRoles(client) {
  client.on('messageReactionAdd', (reaction, user) => {
    if (user.bot) return;
    handleReaction(reaction, user, true);
  });

  client.on('messageReactionRemove', (reaction, user) => {
    if (user.bot) return;
    handleReaction(reaction, user, false);
  });
}

async function handleReaction(reaction, user, added) {
  try {
    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch();

    let saved = null;
    if (fs.existsSync(ROLE_MESSAGE_FILE)) {
      saved = JSON.parse(fs.readFileSync(ROLE_MESSAGE_FILE, 'utf8'));
    }
    if (!saved || reaction.message.id !== saved.messageId) return;

    const emojiId = reaction.emoji.id;
    let roleId, otherRoleId, otherEmojiId;

    if (emojiId === TIKTOK_EMOJI.id) {
      roleId = env.TIKTOK_ROLE_ID;
      otherRoleId = env.YOUTUBE_ROLE_ID;
      otherEmojiId = YOUTUBE_EMOJI.id;
    } else if (emojiId === YOUTUBE_EMOJI.id) {
      roleId = env.YOUTUBE_ROLE_ID;
      otherRoleId = env.TIKTOK_ROLE_ID;
      otherEmojiId = TIKTOK_EMOJI.id;
    } else {
      return;
    }

    const guild = reaction.message.guild;
    const member = await guild.members.fetch(user.id);

    if (added) {
      if (roleId) await member.roles.add(roleId).catch(console.error);

      if (otherRoleId && member.roles.cache.has(otherRoleId)) {
        await member.roles.remove(otherRoleId).catch(console.error);
      }
      const otherReaction = reaction.message.reactions.cache.find((r) => r.emoji.id === otherEmojiId);
      if (otherReaction) {
        await otherReaction.users.remove(user.id).catch(() => {});
      }
    } else {
      if (roleId) await member.roles.remove(roleId).catch(console.error);
    }
  } catch (err) {
    console.error('Error handling reaction role:', err);
  }
}

module.exports = { setupReactionRoleMessage, registerReactionRoles };
