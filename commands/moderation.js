const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { logModeration } = require('../handlers/logs');

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('ban')
      .setDescription('Ban a member from the server')
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
      .addUserOption((opt) => opt.setName('user').setDescription('The user to ban').setRequired(true))
      .addStringOption((opt) => opt.setName('reason').setDescription('Reason for the ban')),
    async execute(interaction) {
      const user = interaction.options.getUser('user', true);
      const reason = interaction.options.getString('reason') ?? 'لا يوجد سبب';
      const member = interaction.guild?.members.cache.get(user.id);
      if (!member) return interaction.reply({ content: '❌ العضو غير موجود في السيرفر.', ephemeral: true });
      if (!member.bannable) return interaction.reply({ content: '❌ لا يمكنني باند هذا العضو.', ephemeral: true });
      await member.ban({ reason });
      await logModeration(interaction.client, { action: '🔨 باند — Ban', color: 0xff0000, target: user, moderator: interaction.user, reason });
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('🔨 تم الباند')
        .addFields({ name: 'العضو', value: `${user.tag}`, inline: true }, { name: 'السبب', value: reason, inline: true })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('kick')
      .setDescription('Kick a member from the server')
      .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
      .addUserOption((opt) => opt.setName('user').setDescription('The user to kick').setRequired(true))
      .addStringOption((opt) => opt.setName('reason').setDescription('Reason for the kick')),
    async execute(interaction) {
      const user = interaction.options.getUser('user', true);
      const reason = interaction.options.getString('reason') ?? 'لا يوجد سبب';
      const member = interaction.guild?.members.cache.get(user.id);
      if (!member) return interaction.reply({ content: '❌ العضو غير موجود.', ephemeral: true });
      if (!member.kickable) return interaction.reply({ content: '❌ لا يمكنني كيك هذا العضو.', ephemeral: true });
      await member.kick(reason);
      await logModeration(interaction.client, { action: '👢 كيك — Kick', color: 0xff6600, target: user, moderator: interaction.user, reason });
      const embed = new EmbedBuilder()
        .setColor(0xff6600)
        .setTitle('👢 تم الكيك')
        .addFields({ name: 'العضو', value: `${user.tag}`, inline: true }, { name: 'السبب', value: reason, inline: true })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('timeout')
      .setDescription('Temporarily mute a member')
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption((opt) => opt.setName('user').setDescription('The user to timeout').setRequired(true))
      .addIntegerOption((opt) =>
        opt.setName('minutes').setDescription('Duration in minutes').setRequired(true).setMinValue(1).setMaxValue(40320)
      )
      .addStringOption((opt) => opt.setName('reason').setDescription('Reason for the timeout')),
    async execute(interaction) {
      const user = interaction.options.getUser('user', true);
      const minutes = interaction.options.getInteger('minutes', true);
      const reason = interaction.options.getString('reason') ?? 'لا يوجد سبب';
      const member = interaction.guild?.members.cache.get(user.id);
      if (!member) return interaction.reply({ content: '❌ العضو غير موجود.', ephemeral: true });
      if (!member.moderatable) return interaction.reply({ content: '❌ لا يمكنني تطبيق التايم اوت على هذا العضو.', ephemeral: true });
      await member.timeout(minutes * 60 * 1000, reason);
      await logModeration(interaction.client, {
        action: '⏰ تايم اوت — Timeout',
        color: 0xffa500,
        target: user,
        moderator: interaction.user,
        reason,
        extra: [{ name: '⏱️ المدة', value: `${minutes} دقيقة` }],
      });
      const embed = new EmbedBuilder()
        .setColor(0xffa500)
        .setTitle('⏰ تم التايم اوت')
        .addFields(
          { name: 'العضو', value: `${user.tag}`, inline: true },
          { name: 'المدة', value: `${minutes} دقيقة`, inline: true },
          { name: 'السبب', value: reason }
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('untimeout')
      .setDescription('Remove a timeout from a member')
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption((opt) => opt.setName('user').setDescription('The user to untimeout').setRequired(true)),
    async execute(interaction) {
      const user = interaction.options.getUser('user', true);
      const member = interaction.guild?.members.cache.get(user.id);
      if (!member) return interaction.reply({ content: '❌ العضو غير موجود.', ephemeral: true });
      await member.timeout(null);
      await logModeration(interaction.client, { action: '✅ رفع تايم اوت — Untimeout', color: 0x00ff00, target: user, moderator: interaction.user });
      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('✅ تم رفع التايم اوت')
        .setDescription(`تم رفع التايم اوت عن **${user.tag}**`)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('clear')
      .setDescription('Delete messages from a channel')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
      .addIntegerOption((opt) =>
        opt.setName('amount').setDescription('Number of messages to delete (1-100)').setRequired(true).setMinValue(1).setMaxValue(100)
      ),
    async execute(interaction) {
      const amount = interaction.options.getInteger('amount', true);
      const channel = interaction.channel;
      if (!channel || !channel.isTextBased() || channel.isDMBased()) {
        return interaction.reply({ content: '❌ لا يمكن استخدام هذا الأمر هنا.', ephemeral: true });
      }
      await interaction.deferReply({ ephemeral: true });
      const deleted = await channel.bulkDelete(amount, true);
      await logModeration(interaction.client, {
        action: '🧹 حذف رسائل — Clear',
        color: 0xffa500,
        target: interaction.user,
        moderator: interaction.user,
        extra: [
          { name: '📢 القناة', value: `<#${channel.id}>`, inline: true },
          { name: '🗑️ العدد المحذوف', value: `${deleted.size} رسالة`, inline: true },
        ],
      });
      return interaction.editReply({ content: `✅ تم حذف **${deleted.size}** رسالة.` });
    },
  },
];
