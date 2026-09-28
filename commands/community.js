// Bulk-grants the community role (COMMUNITY_ROLE_ID) to every existing
// member who doesn't already have it. New joiners already get this role
// automatically via events/guildMemberAdd.js — this command is for
// backfilling everyone who joined before that was set up, or after a
// reset. Runs with a small delay between each member to stay well under
// Discord's rate limits, and shows live progress on large servers.
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const env = require('../config/env');

const DELAY_MS = 300; // gap between each role add, keeps us safely under rate limits
const PROGRESS_EVERY = 25; // how often to update the "in progress" message

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('give-community-role')
      .setDescription('Grant the community role to every existing member who is missing it')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
      .addBooleanOption((opt) => opt.setName('include_bots').setDescription('Also give the role to bot accounts (default: no)')),
    async execute(interaction) {
      if (!env.COMMUNITY_ROLE_ID) {
        return interaction.reply({ content: '❌ لم يتم إعداد COMMUNITY_ROLE_ID في متغيرات البيئة (.env).', ephemeral: true });
      }

      const includeBots = interaction.options.getBoolean('include_bots') ?? false;
      const role = interaction.guild.roles.cache.get(env.COMMUNITY_ROLE_ID);
      if (!role) {
        return interaction.reply({ content: '❌ الرتبة المحددة في COMMUNITY_ROLE_ID غير موجودة في السيرفر.', ephemeral: true });
      }

      const botMember = interaction.guild.members.me;
      if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles) || botMember.roles.highest.position <= role.position) {
        return interaction.reply({
          content: '❌ رتبة البوت لازم تكون أعلى من رتبة الكوميونيتي، وعنده صلاحية Manage Roles.',
          ephemeral: true,
        });
      }

      await interaction.deferReply();

      const allMembers = await interaction.guild.members.fetch();
      const targets = allMembers.filter((m) => (includeBots || !m.user.bot) && !m.roles.cache.has(role.id));

      if (targets.size === 0) {
        return interaction.editReply('✅ كل الأعضاء عندهم الرتبة بالفعل — مفيش حد محتاج يتضاف.');
      }

      let done = 0;
      let succeeded = 0;
      let failed = 0;

      for (const member of targets.values()) {
        try {
          await member.roles.add(role);
          succeeded++;
        } catch (err) {
          failed++;
          console.error(`Failed to add community role to ${member.user.tag}:`, err.message);
        }
        done++;

        if (done % PROGRESS_EVERY === 0) {
          await interaction
            .editReply(`⏳ جاري الإضافة... ${done}/${targets.size} (✅ ${succeeded} — ❌ ${failed})`)
            .catch(() => {});
        }

        await sleep(DELAY_MS);
      }

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('✅ تم الانتهاء من إعطاء رتبة الكوميونيتي')
        .addFields(
          { name: '🎭 الرتبة', value: role.toString(), inline: true },
          { name: '👥 تمت معالجتهم', value: `${targets.size}`, inline: true },
          { name: '✅ نجح', value: `${succeeded}`, inline: true },
          { name: '❌ فشل', value: `${failed}`, inline: true }
        )
        .setTimestamp();

      return interaction.editReply({ content: '', embeds: [embed] });
    },
  },
];
