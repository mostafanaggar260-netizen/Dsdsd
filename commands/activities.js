const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  GuildScheduledEventPrivacyLevel,
  GuildScheduledEventEntityType,
} = require('discord.js');
const activities = require('../database/activities');
const { buildActivityEmbed } = require('../handlers/activityButtons');

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('event-create')
      .setDescription('أنشئ فعالية حلوة فشخ 🎉')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
      .addStringOption((opt) => opt.setName('title').setDescription('اسم الفعالية').setRequired(true))
      .addIntegerOption((opt) =>
        opt.setName('in_minutes').setDescription('تبدأ بعد كام دقيقة من دلوقتي').setRequired(true).setMinValue(1)
      )
      .addStringOption((opt) =>
        opt
          .setName('type')
          .setDescription('نوع الفعالية')
          .setRequired(true)
          .addChoices(
            { name: '🎮 ليلة قيمنق', value: 'gaming' },
            { name: '🎬 ليلة أفلام', value: 'movie' },
            { name: '🎁 قيف اواي', value: 'giveaway' },
            { name: '🎙️ جلسة صوتية', value: 'voice' },
            { name: '✨ حاجة تانية', value: 'other' }
          )
      )
      .addStringOption((opt) => opt.setName('description').setDescription('وصف الفعالية').setRequired(true))
      .addChannelOption((opt) =>
        opt.setName('announce_channel').setDescription('القناة اللي هينزل فيها الإعلان').addChannelTypes(ChannelType.GuildText)
      )
      .addChannelOption((opt) =>
        opt
          .setName('voice_channel')
          .setDescription('روم الصوت (اختياري — بينشئ فعالية ديسكورد رسمية كمان)')
          .addChannelTypes(ChannelType.GuildVoice)
      ),
    async execute(interaction) {
      const title = interaction.options.getString('title', true);
      const type = interaction.options.getString('type', true);
      const description = interaction.options.getString('description', true);
      const minutesFromNow = interaction.options.getInteger('in_minutes', true);
      const announceChannel = interaction.options.getChannel('announce_channel') ?? interaction.channel;
      const voiceChannel = interaction.options.getChannel('voice_channel');

      const startTime = Date.now() + minutesFromNow * 60 * 1000;

      let discordEventId = null;
      if (voiceChannel) {
        try {
          const scheduledEvent = await interaction.guild.scheduledEvents.create({
            name: title,
            scheduledStartTime: new Date(startTime),
            privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
            entityType: GuildScheduledEventEntityType.Voice,
            channel: voiceChannel.id,
            description: `${description}\n\nالمنظم: <@${interaction.user.id}>`,
          });
          discordEventId = scheduledEvent.id;
        } catch (err) {
          console.error('Failed to create native scheduled event:', err);
        }
      }

      const activity = activities.createActivity({
        title,
        description,
        type,
        hostId: interaction.user.id,
        startTime,
        announceChannelId: announceChannel.id,
        voiceChannelId: voiceChannel?.id,
        discordEventId,
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`activity_rsvp_${activity.id}`).setLabel('أنا موجود ✅').setStyle(ButtonStyle.Success)
      );

      const message = await announceChannel.send({
        content: '@everyone',
        embeds: [buildActivityEmbed(activity)],
        components: [row],
      });

      activities.setMessageId(activity.id, message.id);

      return interaction.reply({
        content: `✅ تم إنشاء الفعالية في ${announceChannel.toString()}${discordEventId ? ' + فعالية ديسكورد رسمية' : ''}`,
        ephemeral: true,
      });
    },
  },
  {
    data: new SlashCommandBuilder().setName('event-list').setDescription('اعرض الفعاليات الجاية'),
    async execute(interaction) {
      const upcoming = activities.listUpcoming();
      if (upcoming.length === 0) {
        return interaction.reply({ content: '📭 مفيش فعاليات قادمة حالياً.', ephemeral: true });
      }
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('🗓️ الفعاليات القادمة')
        .setDescription(
          upcoming
            .map((a) => {
              const preset = activities.TYPE_PRESETS[a.type] ?? activities.TYPE_PRESETS.other;
              return `${preset.emoji} **${a.title}** — <t:${Math.floor(a.startTime / 1000)}:R> — 👥 ${a.attendees.length}`;
            })
            .join('\n')
        );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('event-cancel')
      .setDescription('ألغي فعالية (المنظم أو أدمن)')
      .addIntegerOption((opt) => opt.setName('id').setDescription('رقم الفعالية (شوفه من /event-list)').setRequired(true)),
    async execute(interaction) {
      const id = interaction.options.getInteger('id', true);
      const activity = activities.getActivity(id);
      if (!activity) return interaction.reply({ content: '❌ مفيش فعالية بهذا الرقم.', ephemeral: true });

      const isHost = activity.hostId === interaction.user.id;
      const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.ManageEvents);
      if (!isHost && !isAdmin) {
        return interaction.reply({ content: '❌ بس منظم الفعالية أو الأدمن يقدر يلغيها.', ephemeral: true });
      }

      activities.cancelActivity(id);

      if (activity.discordEventId) {
        await interaction.guild.scheduledEvents.delete(activity.discordEventId).catch(() => {});
      }

      const channel = interaction.guild.channels.cache.get(activity.announceChannelId);
      if (channel && activity.messageId) {
        const message = await channel.messages.fetch(activity.messageId).catch(() => null);
        if (message) {
          const updated = activities.getActivity(id);
          await message.edit({ embeds: [buildActivityEmbed(updated)], components: [] }).catch(() => {});
        }
      }

      return interaction.reply({ content: `✅ تم إلغاء الفعالية **${activity.title}**.`, ephemeral: true });
    },
  },
];
