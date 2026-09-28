const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = [
  {
    data: new SlashCommandBuilder().setName('ping').setDescription('Check bot latency'),
    async execute(interaction) {
      const sent = await interaction.reply({ content: '🏓 جاري القياس...', fetchReply: true });
      const latency = sent.createdTimestamp - interaction.createdTimestamp;
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('🏓 Pong!')
        .addFields({ name: 'البوت', value: `${latency}ms`, inline: true }, { name: 'API', value: `${interaction.client.ws.ping}ms`, inline: true });
      return interaction.editReply({ content: '', embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('time')
      .setDescription('Show current time for a timezone')
      .addStringOption((opt) => opt.setName('timezone').setDescription('Timezone (e.g. Asia/Riyadh)').setRequired(false)),
    async execute(interaction) {
      const tz = interaction.options.getString('timezone') ?? 'Asia/Riyadh';
      let timeStr;
      try {
        timeStr = new Date().toLocaleString('ar-EG', { timeZone: tz, dateStyle: 'full', timeStyle: 'medium' });
      } catch {
        return interaction.reply({ content: `❌ التايم زون غير صحيح: \`${tz}\``, ephemeral: true });
      }
      const embed = new EmbedBuilder().setColor(0x5865f2).setTitle('🕐 الوقت الحالي').addFields({ name: `التوقيت (${tz})`, value: timeStr }).setTimestamp();
      return interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('userinfo')
      .setDescription('Show account info and roles')
      .addUserOption((opt) => opt.setName('user').setDescription('The user to look up')),
    async execute(interaction) {
      const user = interaction.options.getUser('user') ?? interaction.user;
      const member = interaction.guild?.members.cache.get(user.id);
      const roles = member?.roles.cache.filter((r) => r.id !== interaction.guildId).map((r) => r.toString()).join(', ') || 'لا يوجد';
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`👤 معلومات ${user.username}`)
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: '🆔 ID', value: user.id, inline: true },
          { name: '📅 إنشاء الحساب', value: user.createdAt.toLocaleDateString('ar-EG'), inline: true },
          { name: '📥 انضم للسيرفر', value: member?.joinedAt?.toLocaleDateString('ar-EG') ?? 'غير معروف', inline: true },
          { name: '🎭 الرتب', value: roles }
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('serverinfo').setDescription('Show server stats'),
    async execute(interaction) {
      const guild = interaction.guild;
      if (!guild) return interaction.reply({ content: '❌ لا يمكن استخدام هذا الأمر هنا.', ephemeral: true });
      await guild.fetch();
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`📊 معلومات ${guild.name}`)
        .setThumbnail(guild.iconURL())
        .addFields(
          { name: '🆔 ID', value: guild.id, inline: true },
          { name: '👑 المالك', value: `<@${guild.ownerId}>`, inline: true },
          { name: '👥 الأعضاء', value: guild.memberCount.toString(), inline: true },
          { name: '💬 القنوات', value: guild.channels.cache.size.toString(), inline: true },
          { name: '🎭 الرتب', value: guild.roles.cache.size.toString(), inline: true },
          { name: '📅 تأسيس السيرفر', value: guild.createdAt.toLocaleDateString('ar-EG'), inline: true }
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('avatar')
      .setDescription("Display a user's avatar")
      .addUserOption((opt) => opt.setName('user').setDescription('The user')),
    async execute(interaction) {
      const user = interaction.options.getUser('user') ?? interaction.user;
      const embed = new EmbedBuilder().setColor(0x5865f2).setTitle(`🖼️ أفاتار ${user.username}`).setImage(user.displayAvatarURL({ size: 512 })).setTimestamp();
      return interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('help').setDescription('Show all bot commands'),
    async execute(interaction) {
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('📖 Bot Commands')
        .setDescription("Here's everything this bot can do:")
        .addFields(
          {
            name: '🔨 Moderation',
            value: ['`/ban @user [reason]`', '`/kick @user [reason]`', '`/timeout @user minutes [reason]`', '`/untimeout @user`', '`/clear amount`'].join('\n'),
          },
          { name: '🎫 Tickets', value: '`/setup_tickets` — Post the ticket panel (Admin only)\n`/tickets` — List open tickets (Admin only)' },
          { name: '👑 Trusted Access', value: '`/trust add/remove/list` — Manage trusted users (Owner only)\n`/grant-owner [@user]` — Give the owner role to yourself or someone else (Trusted only)' },
          { name: '🎉 فعاليات', value: '`/event-create` — Create an event with RSVP + reminders\n`/event-list` — Show upcoming events\n`/event-cancel id` — Cancel an event' },
          { name: '🏘️ Community Role', value: '`/give-community-role` — Backfill the community role to all existing members (Admin only)' },
          {
            name: '🔧 Utility',
            value: ['`/time [timezone]`', '`/userinfo [@user]`', '`/serverinfo`', '`/avatar [@user]`', '`/ping`', '`/help`'].join('\n'),
          }
        );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    },
  },
];
