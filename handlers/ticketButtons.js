const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelType,
  OverwriteType,
  AttachmentBuilder,
} = require('discord.js');
const env = require('../config/env');
const tickets = require('../database/tickets');
const transcript = require('../utils/transcript');
const { logTicketOpen, logTicketClose } = require('./logs');

const APPLY_ROLES = {
  editor: { label: 'تقديم علي ايدتور', emoji: '🖊️', slug: 'editor' },
  admin: { label: 'تقديم علي اداره', emoji: '🛡️', slug: 'admin' },
  events: { label: 'تقديم علي فريق الفعاليات', emoji: '🎉', slug: 'events' },
  dev: { label: 'تقديم علي فريق التطوير', emoji: '💻', slug: 'dev' },
};

function buildTicketPanelEmbed() {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`🎫 مركز الدعم والتقديم | سيرفر ${env.SERVER_BRAND_NAME}`)
    .setDescription(
      'مرحباً بك في نظام التذاكر. يرجى اختيار القسم المناسب لحاجتك من الأسفل.\n\n' +
        '📋 **أقسام التذاكر المتاحة:**\n\n' +
        '**🔧 الدعم الفني** — للمشاكل التقنية، الاستفسارات العامة، والمساعدة داخل السيرفر.\n\n' +
        '**🏆 التقديم على الرولات** — إذا كنت ترغب في الانضمام لطاقم الإدارة أو التقديم على رتبة خاصة.\n\n' +
        '⚠️ يرجى فتح تذكرة واحدة فقط للموضوع.'
    );
}

function buildTicketPanelButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_support').setLabel('دعم فني').setStyle(ButtonStyle.Primary).setEmoji('🔧'),
    new ButtonBuilder().setCustomId('ticket_apply').setLabel('تقديم علي رولات').setStyle(ButtonStyle.Success).setEmoji('🏆')
  );
}

function buildApplyRoleSelectRow() {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('ticket_apply_select')
    .setPlaceholder('اختر القسم الذي تريد التقديم عليه')
    .addOptions(
      Object.entries(APPLY_ROLES).map(([value, meta]) => ({
        label: meta.label,
        value,
        emoji: meta.emoji,
      }))
    );
  return new ActionRowBuilder().addComponents(menu);
}

function buildTicketChannelButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket_claim').setLabel('استلام تيكت').setStyle(ButtonStyle.Success).setEmoji('✅'),
      new ButtonBuilder().setCustomId('ticket_force_close').setLabel('اغلاق فوري').setStyle(ButtonStyle.Danger).setEmoji('🔒')
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket_request_close').setLabel('طلب اغلاق').setStyle(ButtonStyle.Secondary).setEmoji('📩')
    ),
  ];
}

async function handleTicketButton(interaction) {
  const { customId, client } = interaction;
  const guild = interaction.guild;
  if (!guild) return;

  const roleId = env.TICKET_SUPPORT_ROLE_ID ?? '';
  const isSupport = roleId !== '' && interaction.member?.roles?.cache?.has(roleId);

  if (customId === 'ticket_claim') {
    if (!isSupport) return interaction.reply({ content: '❌ هذا الزر مخصص لفريق الدعم فقط.', ephemeral: true });
    await tickets.claimTicket(interaction.channelId, interaction.user.id);
    transcript.appendSystemLine(interaction.channelId, `${interaction.user.tag} claimed this ticket`);
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(0x57f287).setDescription(`✅ تم **استلام التذكرة** من قبل ${interaction.user.toString()}`).setTimestamp()],
    });
  }

  if (customId === 'ticket_force_close') {
    if (!isSupport) return interaction.reply({ content: '❌ هذا الزر مخصص لفريق الدعم فقط.', ephemeral: true });
    return await closeTicketChannel(interaction, interaction.channel);
  }

  if (customId === 'ticket_request_close') {
    const ticket = await tickets.getTicketByChannel(interaction.channelId);
    if (!ticket || interaction.user.id !== ticket.openerId) {
      return interaction.reply({ content: '❌ فقط صاحب التذكرة يمكنه طلب الإغلاق.', ephemeral: true });
    }
    transcript.appendSystemLine(interaction.channelId, `${interaction.user.tag} requested this ticket be closed`);
    return interaction.reply({
      content: roleId ? `<@&${roleId}>` : '**فريق الدعم**',
      embeds: [new EmbedBuilder().setColor(0xff0000).setDescription(`📩 قام ${interaction.user.toString()} بطلب إغلاق هذه التذكرة.`).setTimestamp()],
    });
  }

  if (customId === 'ticket_support') {
    return await openTicket(interaction, { isSupportType: true, applyRole: null });
  }

  if (customId === 'ticket_apply') {
    const existing = await tickets.getOpenTicketByUser(interaction.user.id);
    if (existing) {
      const existingChannel = guild.channels.cache.get(existing.channelId);
      return interaction.reply({
        content: `❌ لديك تذكرة مفتوحة بالفعل: ${existingChannel ? existingChannel.toString() : existing.channelName}`,
        ephemeral: true,
      });
    }
    return interaction.reply({
      content: '📋 اختر القسم الذي تريد التقديم عليه:',
      components: [buildApplyRoleSelectRow()],
      ephemeral: true,
    });
  }
}

async function handleTicketApplySelect(interaction) {
  const applyRole = interaction.values[0];
  if (!APPLY_ROLES[applyRole]) {
    return interaction.reply({ content: '❌ خيار غير صالح.', ephemeral: true });
  }
  return await openTicket(interaction, { isSupportType: false, applyRole });
}

async function openTicket(interaction, { isSupportType, applyRole }) {
  const guild = interaction.guild;
  const client = interaction.client;
  const roleId = env.TICKET_SUPPORT_ROLE_ID ?? '';

  const existing = await tickets.getOpenTicketByUser(interaction.user.id);
  if (existing) {
    const existingChannel = guild.channels.cache.get(existing.channelId);
    const msg = `❌ لديك تذكرة مفتوحة بالفعل: ${existingChannel ? existingChannel.toString() : existing.channelName}`;
    return interaction.reply({ content: msg, ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  const applyMeta = applyRole ? APPLY_ROLES[applyRole] : null;
  const number = await tickets.peekNextTicketNumber();
  const namePart = isSupportType
    ? interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15)
    : applyMeta.slug;

  const categoryId = isSupportType ? env.SUPPORT_CATEGORY_ID ?? env.TICKET_CATEGORY_ID : env.APPLY_CATEGORY_ID ?? env.TICKET_CATEGORY_ID;

  const ticketChannel = await guild.channels.create({
    name: `${isSupportType ? 'support' : 'apply'}-${number}-${namePart}`,
    type: ChannelType.GuildText,
    topic: `ticket-${interaction.user.id}`,
    parent: categoryId || undefined,
    permissionOverwrites: [
      { id: guild.id, deny: ['ViewChannel'], type: OverwriteType.Role },
      {
        id: interaction.user.id,
        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
        type: OverwriteType.Member,
      },
      ...(roleId
        ? [
            {
              id: roleId,
              allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageMessages'],
              type: OverwriteType.Role,
            },
          ]
        : []),
    ],
  });

  const ticket = await tickets.createTicket({
    channelId: ticketChannel.id,
    channelName: ticketChannel.name,
    openerId: interaction.user.id,
    openerTag: interaction.user.tag,
    type: isSupportType ? 'support' : 'apply',
    applyRole,
  });

  transcript.startTranscript(
    ticketChannel.id,
    `Ticket transcript — #${ticket.id} — ${ticketChannel.name}\n` +
      `Opened by: ${interaction.user.tag} (${interaction.user.id})\n` +
      `Type: ${isSupportType ? 'support' : `apply (${applyMeta.label})`}\n` +
      `Opened at: ${new Date().toLocaleString('en-GB')}`
  );

  await ticketChannel.send({
    content: `${interaction.user.toString()}` + (roleId ? ` — <@&${roleId}>` : ''),
    embeds: [
      isSupportType
        ? new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle(`🌟 مرحباً بك في مركز الدعم الفني | تذكرة #${ticket.id}`)
            .setDescription('تم فتح تذكرتك بنجاح، يرجى شرح مشكلتك بالتفصيل مع إرفاق أي إثباتات.')
            .setThumbnail(interaction.user.displayAvatarURL())
            .setTimestamp()
        : new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle(`📋 ${applyMeta.label} | تذكرة #${ticket.id}`)
            .setDescription('يرجى تعبئة النموذج:\n• الاسم الحقيقي:\n• العمر:\n• البلد:\n• الرتبة المطلوبة:\n• ساعات التواجد يومياً:\n• خبرة سابقة؟\n• لماذا أنت المناسب؟')
            .setThumbnail(interaction.user.displayAvatarURL())
            .setTimestamp(),
    ],
    components: buildTicketChannelButtons(),
  });

  await logTicketOpen(client, interaction.user, isSupportType ? 'support' : 'apply', ticketChannel.name, ticket.id, applyMeta?.label);
  return interaction.editReply({ content: `✅ تم إنشاء تذكرتك: ${ticketChannel.toString()}` });
}

async function closeTicketChannel(interaction, channel) {
  const ticket = await tickets.getTicketByChannel(channel.id);
  const openerId = ticket?.openerId ?? '';
  const openerTag = ticket?.openerTag ?? `<@${openerId}>`;

  transcript.appendSystemLine(channel.id, `Ticket closed by ${interaction.user.tag}`);
  await tickets.closeTicket(channel.id, interaction.user.id);

  const transcriptFilePath = transcript.getTranscriptFile(channel.id);
  const files = transcriptFilePath ? [new AttachmentBuilder(transcriptFilePath, { name: `${channel.name}-transcript.txt` })] : undefined;

  await logTicketClose(interaction.client, openerTag, openerId, channel.name, interaction.user, files);

  await interaction.reply({ content: '🔒 جاري إغلاق التذكرة فوراً... (سيتم حفظ سجل المحادثة)' });
  setTimeout(async () => {
    try {
      await channel.delete();
    } catch (err) {
      console.error('Failed to delete ticket channel:', err);
    }
  }, 3000);
}

module.exports = {
  buildTicketPanelEmbed,
  buildTicketPanelButtons,
  buildTicketChannelButtons,
  buildApplyRoleSelectRow,
  handleTicketButton,
  handleTicketApplySelect,
};
