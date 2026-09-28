const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const env = require('../config/env');
const owners = require('../database/owners');

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('trust')
      .setDescription('Manage who has trusted/owner-level bot access')
      .addSubcommand((sub) =>
        sub
          .setName('add')
          .setDescription('Give someone trusted access (owner only)')
          .addUserOption((opt) => opt.setName('user').setDescription('The user to trust').setRequired(true))
      )
      .addSubcommand((sub) =>
        sub
          .setName('remove')
          .setDescription('Remove someone from trusted access (owner only)')
          .addUserOption((opt) => opt.setName('user').setDescription('The user to remove').setRequired(true))
      )
      .addSubcommand((sub) => sub.setName('list').setDescription('List everyone with trusted access')),
    async execute(interaction) {
      const sub = interaction.options.getSubcommand();

      if (sub === 'list') {
        if (!(await owners.isTrusted(interaction.user.id))) {
          return interaction.reply({ content: '❌ ليس لديك صلاحية استخدام هذا الأمر.', ephemeral: true });
        }
        const ids = await owners.listTrusted();
        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle('👑 أصحاب الصلاحية الموثوقين')
          .setDescription(
            (env.OWNER_ID ? [`<@${env.OWNER_ID}> — المالك الأساسي`] : []).concat(
              ids.length ? ids.map((id) => `<@${id}>`) : ['لا يوجد أحد آخر']
            ).join('\n')
          );
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (!(await owners.isRealOwner(interaction.user.id))) {
        return interaction.reply({ content: '❌ هذا الأمر مخصص لصاحب البوت الأساسي فقط.', ephemeral: true });
      }

      const target = interaction.options.getUser('user', true);

      if (sub === 'add') {
        await owners.addTrusted(target.id);
        return interaction.reply({ content: `✅ تم منح ${target.tag} صلاحية موثوقة.`, ephemeral: true });
      }

      if (sub === 'remove') {
        await owners.removeTrusted(target.id);
        return interaction.reply({ content: `✅ تم إزالة ${target.tag} من قائمة الموثوقين.`, ephemeral: true });
      }
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('grant-owner')
      .setDescription('Grant the configured owner role to yourself or someone else (trusted only)')
      .addUserOption((opt) => opt.setName('user').setDescription('Who to grant it to (defaults to yourself)')),
    async execute(interaction) {
      if (!(await owners.isTrusted(interaction.user.id))) {
        return interaction.reply({ content: '❌ ليس لديك صلاحية استخدام هذا الأمر.', ephemeral: true });
      }

      if (!env.OWNER_ROLE_ID) {
        return interaction.reply({
          content: '❌ لم يتم إعداد OWNER_ROLE_ID في متغيرات البيئة (.env). أضِفه أولاً.',
          ephemeral: true,
        });
      }

      const target = interaction.options.getUser('user') ?? interaction.user;
      const member = interaction.guild?.members.cache.get(target.id) ?? (await interaction.guild?.members.fetch(target.id).catch(() => null));

      if (!member) {
        return interaction.reply({ content: '❌ العضو غير موجود في السيرفر.', ephemeral: true });
      }

      try {
        await member.roles.add(env.OWNER_ROLE_ID);
      } catch (err) {
        console.error('Failed to grant owner role:', err);
        return interaction.reply({
          content: '❌ فشل إعطاء الرتبة. تأكد أن رتبة البوت أعلى من رتبة OWNER_ROLE_ID في ترتيب الرتب.',
          ephemeral: true,
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0xffd700)
        .setTitle('👑 تم منح رتبة الأونر')
        .setDescription(`تم إعطاء <@&${env.OWNER_ROLE_ID}> لـ ${member.toString()}`)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    },
  },
];
