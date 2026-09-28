// NOTE: the original single-file version registered a second
// "guildMemberAdd" listener *inside* the first one, so the anti-bot-kick
// logic was being attached again every single time a member joined
// (and it was duplicated a second time lower in the file too). That's a
// bug — it would eventually attach hundreds of duplicate listeners and
// spam duplicate audit-log checks. Here each listener is registered
// exactly once, at startup.
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const env = require('../config/env');
const { logMemberJoin } = require('../handlers/logs');

module.exports = function registerGuildMemberAdd(client) {
  // 1) Welcome message + auto community role
  client.on('guildMemberAdd', async (member) => {
    await logMemberJoin(client, member);

    if (env.COMMUNITY_ROLE_ID) {
      await member.roles.add(env.COMMUNITY_ROLE_ID).catch((err) => {
        console.error('Failed to add community role:', err);
      });
    }

    try {
      const channel = await member.guild.channels.fetch(env.WELCOME_CHANNEL_ID);
      if (!channel || !channel.isTextBased()) {
        console.error('⚠️ Welcome channel not found or is not a text channel.');
        return;
      }

      const createdAt = member.user.createdAt;
      const formattedDate = createdAt.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const formattedTime = createdAt.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      const embed = new EmbedBuilder()
        .setColor(0xf7a600)
        .setDescription(
          `🎉 **أهلاً بيك في ${env.SERVER_BRAND_NAME} اديتور**\n\n` +
            `👏 نورت السيرفر يا ${member}\n\n` +
            `📌 **معلومات الحساب**\n\n` +
            `👤 الاسم: ${member.user.username}\n\n` +
            `🆔 ID: ${member.id}\n\n` +
            `📅 تاريخ إنشاء الحساب:\n${formattedDate}\n${formattedTime}`
        )
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `نورت سيرفر ${env.SERVER_BRAND_NAME} ❤️` })
        .setTimestamp();

      const components = [];
      if (env.RULES_CHANNEL_ID) {
        const rulesButton = new ButtonBuilder()
          .setLabel('قوانين السيرفر')
          .setEmoji('📋')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/channels/${member.guild.id}/${env.RULES_CHANNEL_ID}`);

        components.push(new ActionRowBuilder().addComponents(rulesButton));
      }

      await channel.send({
        content: `${member}`,
        embeds: [embed],
        components,
      });
    } catch (err) {
      console.error('Error sending welcome message:', err);
    }
  });

  // 2) Auto-kick bots added by anyone other than the server owner
  client.on('guildMemberAdd', async (member) => {
    if (!member.user.bot) return;
    if (!env.OWNER_ID) return;

    try {
      const auditLogs = await member.guild.fetchAuditLogs({
        type: 28, // BOT_ADD
        limit: 5,
      });
      const entry = auditLogs.entries.find((e) => e.target?.id === member.id);
      const adderId = entry?.executor?.id;

      if (adderId && adderId !== env.OWNER_ID) {
        await member.kick('غير مصرح له بإضافة بوتات لهذا السيرفر.').catch(console.error);
        console.log(`🚫 Kicked unauthorized bot ${member.user.tag}, added by ${adderId}`);
      }
    } catch (err) {
      console.error('Error checking bot-add audit log:', err);
    }
  });
};
