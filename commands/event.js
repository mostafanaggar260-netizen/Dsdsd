const fs = require('fs');
const path = require('path');
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
const events = require('../database/events');
const eventSettings = require('../database/eventSettings');
const {
  buildControlPanelEmbed,
  buildControlPanelButtons,
  buildJoinPanelEmbed,
  buildJoinPanelButtons,
  buildLeaderboardEmbed,
  isEventStaff,
  joinEvent,
  leaveEvent,
} = require('../handlers/eventButtons');

const DATA_DIR = path.join(__dirname, '..', 'data');

async function downloadSeparatorImage(attachment) {
  const res = await fetch(attachment.url);
  const buffer = Buffer.from(await res.arrayBuffer());
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const ext = path.extname(attachment.name || '') || '.png';
  const filePath = path.join(DATA_DIR, `event-separator${ext}`);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('event_config')
      .setDescription('اضبط إعدادات فعاليات السؤال والجواب (رول الفريق، رول الفعالية، صورة الفاصل)')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addRoleOption((opt) => opt.setName('team_role').setDescription('رول فريق الفعاليات (بيدوهم اكسيز على لوحة التحكم)'))
      .addRoleOption((opt) => opt.setName('participant_role').setDescription('رول "فعاليه" اللي بياخده اللي يدخل الفعالية'))
      .addAttachmentOption((opt) => opt.setName('separator_image').setDescription('صورة تتبعت عادي بدل خط الفاصل بعد كل راوند')),
    async execute(interaction) {
      const teamRole = interaction.options.getRole('team_role');
      const participantRole = interaction.options.getRole('participant_role');
      const separatorImage = interaction.options.getAttachment('separator_image');

      if (!teamRole && !participantRole && !separatorImage) {
        const settings = await eventSettings.getSettings();
        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle('⚙️ إعدادات الفعاليات الحالية')
          .setDescription(
            [
              `🛡️ رول فريق الفعاليات: ${settings.teamRoleId ? `<@&${settings.teamRoleId}>` : 'مش متظبط'}`,
              `🎉 رول الفعالية: ${settings.participantRoleId ? `<@&${settings.participantRoleId}>` : 'مش متظبط'}`,
              `🖼️ صورة الفاصل: ${settings.separatorImagePath ? 'متظبطة ✅' : 'مش متظبطة (هيستخدم خط عادي)'}`,
            ].join('\n')
          );
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });

      if (teamRole) await eventSettings.setTeamRole(teamRole.id);
      if (participantRole) await eventSettings.setParticipantRole(participantRole.id);

      const lines = [];
      if (teamRole) lines.push(`🛡️ رول فريق الفعاليات بقى ${teamRole.toString()}`);
      if (participantRole) lines.push(`🎉 رول الفعالية بقى ${participantRole.toString()}`);

      if (separatorImage) {
        try {
          const filePath = await downloadSeparatorImage(separatorImage);
          await eventSettings.setSeparatorImagePath(filePath);
          lines.push('🖼️ اتحطت صورة الفاصل الجديدة');
        } catch (err) {
          console.error('Failed to download separator image:', err);
          lines.push('⚠️ فشلت في تنزيل صورة الفاصل، جرب تاني.');
        }
      }

      return interaction.editReply({ content: `✅ تم التحديث:\n${lines.join('\n')}` });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('event_start')
      .setDescription('بدء فعالية جديدة (سؤال وجواب في الـ stage)')
      .addChannelOption((opt) =>
        opt
          .setName('stage_channel')
          .setDescription('شات الـ stage اللي هيتفتح للإجابات')
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      )
      .addChannelOption((opt) =>
        opt
          .setName('announce_channel')
          .setDescription('قناة الأخبار اللي هيتنزل فيها اسم الفايز')
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      )
      .addChannelOption((opt) =>
        opt
          .setName('join_channel')
          .setDescription('القناة اللي هينزل فيها زرار الدخول/الخروج (افتراضيًا نفس شات الفعالية)')
          .addChannelTypes(ChannelType.GuildText)
      ),
    async execute(interaction) {
      if (!(await isEventStaff(interaction))) {
        return interaction.reply({ content: '❌ الأمر ده مخصص لفريق إدارة الفعاليات فقط.', ephemeral: true });
      }
      if (await events.isActive()) {
        return interaction.reply({ content: '⚠️ يوجد فعالية نشطة بالفعل. أنهِها أولاً بـ `/event_end`.', ephemeral: true });
      }

      const settings = await eventSettings.getSettings();
      if (!settings.teamRoleId || !settings.participantRoleId) {
        return interaction.reply({
          content: '❌ محتاج تظبط رول فريق الفعاليات ورول الفعالية الأول بـ `/event_config`.',
          ephemeral: true,
        });
      }

      const stageChannel = interaction.options.getChannel('stage_channel', true);
      const announceChannel = interaction.options.getChannel('announce_channel', true);
      const joinChannel = interaction.options.getChannel('join_channel') ?? stageChannel;

      await interaction.deferReply({ ephemeral: true });

      const guild = interaction.guild;

      await stageChannel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false }, { reason: 'بدء فعالية' }).catch(() => {});
      await stageChannel.permissionOverwrites.edit(settings.teamRoleId, { SendMessages: true }, { reason: 'بدء فعالية' }).catch(() => {});
      await stageChannel.permissionOverwrites.edit(settings.participantRoleId, { SendMessages: false }, { reason: 'بدء فعالية' }).catch(() => {});

      const state = await events.startEvent({
        guildId: guild.id,
        stageChannelId: stageChannel.id,
        announceChannelId: announceChannel.id,
        teamRoleId: settings.teamRoleId,
        participantRoleId: settings.participantRoleId,
        startedBy: interaction.user.id,
      });

      const panelMsg = await interaction.channel.send({
        embeds: [buildControlPanelEmbed(state)],
        components: [buildControlPanelButtons(false)],
      });
      await events.setControlMessage(interaction.channelId, panelMsg.id);

      const joinMsg = await joinChannel.send({
        content: '@everyone',
        embeds: [buildJoinPanelEmbed()],
        components: [buildJoinPanelButtons()],
      });
      await events.setJoinMessage(joinChannel.id, joinMsg.id);

      return interaction.editReply({
        content: `✅ بدأت الفعالية!\nشات الفعالية: ${stageChannel.toString()}\nزرار الدخول: ${joinChannel.toString()}`,
      });
    },
  },
  {
    data: new SlashCommandBuilder().setName('event_leaderboard').setDescription('عرض ترتيب الفعالية الحالية'),
    async execute(interaction) {
      const leaderboard = await events.getLeaderboardSorted();
      if (leaderboard.length === 0) {
        return interaction.reply({ content: '📭 لا توجد نقاط مسجلة بعد.', ephemeral: true });
      }
      return interaction.reply({ embeds: [buildLeaderboardEmbed(leaderboard)] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('event_end').setDescription('إنهاء الفعالية الحالية'),
    async execute(interaction) {
      if (!(await isEventStaff(interaction))) {
        return interaction.reply({ content: '❌ الأمر ده مخصص لفريق إدارة الفعاليات فقط.', ephemeral: true });
      }
      if (!(await events.isActive())) {
        return interaction.reply({ content: '❌ لا توجد فعالية نشطة حالياً.', ephemeral: true });
      }
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('event_end_confirm').setLabel('🏁 إنهاء الفعالية').setStyle(ButtonStyle.Danger)
      );
      return interaction.reply({ content: 'اضغط للتأكيد وإنهاء الفعالية نهائيًا:', components: [row] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('event_participants').setDescription('عرض قائمة المشتركين في الفعالية الحالية'),
    async execute(interaction) {
      if (!(await events.isActive())) {
        return interaction.reply({ content: '❌ لا توجد فعالية نشطة حالياً.', ephemeral: true });
      }
      const participants = await events.getAllParticipants();
      const ids = Object.keys(participants);
      if (ids.length === 0) {
        return interaction.reply({ content: '📭 لا يوجد مشتركين مسجلين لسه.', ephemeral: true });
      }
      const list = ids.map((id, i) => `**${i + 1}.** <@${id}>`).join('\n');
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`👥 المشتركين في الفعالية (${ids.length})`)
        .setDescription(list);
      return interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('event_add')
      .setDescription('ضيف شخص للفعالية يدويًا (فريق الفعاليات فقط)')
      .addUserOption((opt) => opt.setName('member').setDescription('الشخص اللي عايز تضيفه للفعالية').setRequired(true)),
    async execute(interaction) {
      if (!(await isEventStaff(interaction))) {
        return interaction.reply({ content: '❌ الأمر ده مخصص لفريق إدارة الفعاليات فقط.', ephemeral: true });
      }
      if (!(await events.isActive())) {
        return interaction.reply({ content: '❌ لا توجد فعالية نشطة حالياً.', ephemeral: true });
      }
      const targetUser = interaction.options.getUser('member', true);
      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (!targetMember) {
        return interaction.reply({ content: '❌ مش لاقي الشخص ده في السيرفر.', ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });
      const result = await joinEvent({ guild: interaction.guild, member: targetMember });

      if (result.ok && result.rulesEmbed) {
        await targetMember.send({ embeds: [result.rulesEmbed] }).catch(() => {});
      }

      return interaction.editReply({
        content: result.ok ? `✅ اتضاف ${targetMember.toString()} للفعالية.` : result.message,
      });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('event_kick')
      .setDescription('اطرد شخص من الفعالية (فريق الفعاليات فقط)')
      .addUserOption((opt) => opt.setName('member').setDescription('الشخص اللي عايز تطرده من الفعالية').setRequired(true)),
    async execute(interaction) {
      if (!(await isEventStaff(interaction))) {
        return interaction.reply({ content: '❌ الأمر ده مخصص لفريق إدارة الفعاليات فقط.', ephemeral: true });
      }
      if (!(await events.isActive())) {
        return interaction.reply({ content: '❌ لا توجد فعالية نشطة حالياً.', ephemeral: true });
      }
      const targetUser = interaction.options.getUser('member', true);
      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (!targetMember) {
        return interaction.reply({ content: '❌ مش لاقي الشخص ده في السيرفر.', ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });
      const result = await leaveEvent({ guild: interaction.guild, member: targetMember });

      if (result.ok) {
        await targetMember.send('🚫 اتطردت من الفعالية من قبل فريق الإدارة، وترجعتلك رولاتك القديمة.').catch(() => {});
      }

      return interaction.editReply({
        content: result.ok ? `✅ اتطرد ${targetMember.toString()} من الفعالية.` : result.message,
      });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('event_addpoint')
      .setDescription('ضيف نقاط لشخص يدويًا (فريق الفعاليات فقط)')
      .addUserOption((opt) => opt.setName('member').setDescription('الشخص اللي عايز تضيفله نقاط').setRequired(true))
      .addIntegerOption((opt) => opt.setName('amount').setDescription('عدد النقاط (افتراضيًا 1)').setMinValue(1)),
    async execute(interaction) {
      if (!(await isEventStaff(interaction))) {
        return interaction.reply({ content: '❌ الأمر ده مخصص لفريق إدارة الفعاليات فقط.', ephemeral: true });
      }
      const targetUser = interaction.options.getUser('member', true);
      const amount = interaction.options.getInteger('amount') ?? 1;

      const entry = await events.adjustPoints(targetUser.id, targetUser.tag, amount);
      return interaction.reply({
        content: `✅ اتضاف ${amount} نقطة لـ ${targetUser.toString()}. رصيده دلوقتي: ${entry.points} نقطة.`,
      });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('event_removepoint')
      .setDescription('شيل نقاط من شخص يدويًا (فريق الفعاليات فقط)')
      .addUserOption((opt) => opt.setName('member').setDescription('الشخص اللي عايز تشيله نقاط').setRequired(true))
      .addIntegerOption((opt) => opt.setName('amount').setDescription('عدد النقاط (افتراضيًا 1)').setMinValue(1)),
    async execute(interaction) {
      if (!(await isEventStaff(interaction))) {
        return interaction.reply({ content: '❌ الأمر ده مخصص لفريق إدارة الفعاليات فقط.', ephemeral: true });
      }
      const targetUser = interaction.options.getUser('member', true);
      const amount = interaction.options.getInteger('amount') ?? 1;

      const entry = await events.adjustPoints(targetUser.id, targetUser.tag, -amount);
      return interaction.reply({
        content: `✅ اتشال ${amount} نقطة من ${targetUser.toString()}. رصيده دلوقتي: ${entry.points} نقطة.`,
      });
    },
  },
];
