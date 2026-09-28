const fs = require('fs');
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits,
  AttachmentBuilder,
} = require('discord.js');
const events = require('../database/events');
const eventSettings = require('../database/eventSettings');
const { parseAnswers, isCorrectAnswer } = require('../utils/answerMatch');
const { containsProfanity } = require('../utils/profanityFilter');

const TEXT_SEPARATOR = '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬';

async function sendSeparator(channel) {
  const { separatorImagePath } = await eventSettings.getSettings();
  if (separatorImagePath && fs.existsSync(separatorImagePath)) {
    const attachment = new AttachmentBuilder(separatorImagePath);
    await channel.send({ files: [attachment] }).catch(() => {});
  } else {
    await channel.send(TEXT_SEPARATOR).catch(() => {});
  }
}

async function isEventStaff(interaction) {
  if (interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return true;
  const state = await events.getState();
  const teamRoleId = state.active ? state.teamRoleId : (await eventSettings.getSettings()).teamRoleId;
  if (!teamRoleId) return false;
  return interaction.member?.roles?.cache?.has(teamRoleId) ?? false;
}

function buildControlPanelEmbed(state) {
  const status = state.paused ? '⏸️ استراحة' : state.roundActive ? '🟢 راوند مفتوح' : '🔒 في انتظار الراوند التالي';
  const participantsCount = Object.keys(state.participants ?? {}).length;
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('🎉 لوحة تحكم الفعالية')
    .setDescription(
      `الحالة الحالية: **${status}**\nشات الفعالية: <#${state.stageChannelId}>\n👥 عدد المسجلين: ${participantsCount}`
    )
    .setTimestamp();
}

function buildControlPanelButtons(paused) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('event_start_round').setLabel('🆕 بدء راوند جديد').setStyle(ButtonStyle.Primary),
    paused
      ? new ButtonBuilder().setCustomId('event_break_toggle').setLabel('▶️ استكمال المسابقة').setStyle(ButtonStyle.Success)
      : new ButtonBuilder().setCustomId('event_break_toggle').setLabel('⏸️ استراحة').setStyle(ButtonStyle.Secondary)
  );
}

function buildJoinPanelEmbed() {
  return new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle('🎉 سجّل دخولك في الفعالية')
    .setDescription(
      [
        'دوس على **دخول** عشان تشارك في الفعالية.',
        'هيتشال منك رولاتك الحالية مؤقتًا وتاخد رول **فعاليه** بدالها،',
        'وهترجعلك رولاتك تاني زي ما كانت لما تخرج أو لما الفعالية تخلص.',
        '',
        'تقدر تخرج في أي وقت بالدوس على **خروج** أو بكتابة `/خروج`.',
      ].join('\n')
    );
}

function buildJoinPanelButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('event_join').setLabel('✅ دخول').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('event_leave').setLabel('🚪 خروج').setStyle(ButtonStyle.Danger)
  );
}

function buildRoundModal() {
  const input = new TextInputBuilder()
    .setCustomId('answers')
    .setLabel('الإجابات المقبولة (كل إجابة في سطر)')
    .setPlaceholder('مان يونايتد\nمانشستر يونايتد\nman united\nmanchester united')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(4000);
  return new ModalBuilder()
    .setCustomId('event_round_modal')
    .setTitle('بدء راوند جديد')
    .addComponents(new ActionRowBuilder().addComponents(input));
}

function buildLeaderboardEmbed(leaderboard, title = '📊 الترتيب الحالي | Current Leaderboard') {
  const lines = leaderboard.length
    ? leaderboard.map((e, i) => `**#${i + 1}** <@${e.userId}> — ${e.points} نقطة`).join('\n')
    : 'لا توجد نقاط بعد.';
  return new EmbedBuilder().setColor(0xfee75c).setTitle(title).setDescription(lines).setTimestamp();
}

function buildWinnerEmbed(user) {
  return new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle('🏆 إجابة صحيحة! | Correct answer!')
    .setDescription(`${user.toString()} جاوب صح الأول! (+1 نقطة)\n${user.toString()} answered first! (+1 point)`)
    .setTimestamp();
}

function buildRulesEmbed(state) {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('📜 قوانين الفعالية')
    .setDescription(
      [
        '🚫 ممنوع الشتايم أو الألفاظ الخارجة في شات الفعالية نهائيًا.',
        '🏆 أول واحد يكتب الإجابة الصح في الشات ياخد النقطة.',
        `🚪 لو حبيت تخرج من الفعالية في أي وقت، اكتب \`/خروج\` أو دوس زرار "خروج"، وهترجعلك رولاتك القديمة زي ما كانت.`,
        `💬 شات الفعالية: <#${state.stageChannelId}>`,
        'بالتوفيق! 🎉',
      ].join('\n')
    );
}

async function lockStageChannel(channel, participantRoleId) {
  const target = (participantRoleId && channel.guild.roles.cache.get(participantRoleId)) || channel.guild.roles.everyone;
  await channel.permissionOverwrites.edit(target, { SendMessages: false }).catch(() => {});
}

async function unlockStageChannel(channel, participantRoleId) {
  const target = (participantRoleId && channel.guild.roles.cache.get(participantRoleId)) || channel.guild.roles.everyone;
  await channel.permissionOverwrites.edit(target, { SendMessages: true }).catch(() => {});
}

async function joinEvent({ guild, member }) {
  const state = await events.getState();
  if (!state.active) return { ok: false, message: '❌ لا توجد فعالية نشطة حالياً.' };

  if (state.teamRoleId && member.roles.cache.has(state.teamRoleId)) {
    return { ok: false, message: '❌ أنت من فريق الفعالية، مش محتاج تسجل دخول.' };
  }
  if (await events.isParticipant(member.id)) {
    return { ok: false, message: '⚠️ انت مسجل بالفعل في الفعالية.' };
  }
  if (!state.participantRoleId) {
    return { ok: false, message: '❌ رول الفعالية مش متظبط، كلم فريق الفعالية.' };
  }
  const participantRole = guild.roles.cache.get(state.participantRoleId);
  if (!participantRole) {
    return { ok: false, message: '❌ متلاقيش رول الفعالية، اتشال يمكن.' };
  }

  const botHighest = guild.members.me.roles.highest;
  const removableRoles = member.roles.cache.filter(
    (role) => role.id !== guild.id && !role.managed && role.position < botHighest.position
  );
  const savedRoleIds = [...removableRoles.keys()];

  try {
    if (savedRoleIds.length > 0) {
      await member.roles.remove(savedRoleIds, 'دخول الفعالية - حفظ الرولات مؤقتًا');
    }
    await member.roles.add(participantRole, 'دخول الفعالية');
  } catch (err) {
    console.error('Failed to swap roles on join for', member.id, err);
    return { ok: false, message: '❌ حصل خطأ وأنا بحاول أعدل رولاتك، جرب تاني.' };
  }

  await events.addParticipant(member.id, { tag: member.user.tag, savedRoleIds });

  return {
    ok: true,
    message: '✅ اتسجلت في الفعالية! اقرأ قوانين الفعالية تحت 👇',
    rulesEmbed: buildRulesEmbed(state),
  };
}

async function leaveEvent({ guild, member }) {
  const state = await events.getState();
  if (!state.active) return { ok: false, message: '❌ لا توجد فعالية نشطة حالياً.' };

  const entry = await events.removeParticipant(member.id);
  if (!entry) {
    return { ok: false, message: '⚠️ انت مش مسجل في الفعالية أصلاً.' };
  }

  try {
    if (state.participantRoleId) {
      await member.roles.remove(state.participantRoleId, 'خروج من الفعالية').catch(() => {});
    }
    const rolesToRestore = (entry.savedRoleIds ?? []).filter((id) => guild.roles.cache.has(id));
    if (rolesToRestore.length > 0) {
      await member.roles.add(rolesToRestore, 'خروج من الفعالية - استرجاع الرولات').catch(() => {});
    }
  } catch (err) {
    console.error('Failed to restore roles on leave for', member.id, err);
  }

  return { ok: true, message: '✅ خرجت من الفعالية، رجعتلك رولاتك القديمة.' };
}

async function handleEventButton(interaction) {
  if (interaction.customId === 'event_join') {
    const result = await joinEvent({ guild: interaction.guild, member: interaction.member });
    return interaction.reply({
      content: result.message,
      embeds: result.rulesEmbed ? [result.rulesEmbed] : [],
      ephemeral: true,
    });
  }

  if (interaction.customId === 'event_leave') {
    const result = await leaveEvent({ guild: interaction.guild, member: interaction.member });
    return interaction.reply({ content: result.message, ephemeral: true });
  }

  const state = await events.getState();
  if (!state.active) {
    return interaction.reply({ content: '❌ لا توجد فعالية نشطة حالياً.', ephemeral: true });
  }
  if (!(await isEventStaff(interaction))) {
    return interaction.reply({ content: '❌ هذا الزر مخصص لفريق إدارة الفعالية فقط.', ephemeral: true });
  }

  if (interaction.customId === 'event_start_round') {
    return interaction.showModal(buildRoundModal());
  }

  if (interaction.customId === 'event_break_toggle') {
    const stageChannel = interaction.guild.channels.cache.get(state.stageChannelId);
    if (!state.paused) {
      if (stageChannel) await lockStageChannel(stageChannel, state.participantRoleId);
      await events.closeRound();
      const newState = await events.setPaused(true);
      return interaction.update({ embeds: [buildControlPanelEmbed(newState)], components: [buildControlPanelButtons(true)] });
    } else {
      const newState = await events.setPaused(false);
      return interaction.update({ embeds: [buildControlPanelEmbed(newState)], components: [buildControlPanelButtons(false)] });
    }
  }

  if (interaction.customId === 'event_end_confirm') {
    return await finishEvent(interaction);
  }
}

async function handleEventModalSubmit(interaction) {
  if (interaction.customId !== 'event_round_modal') return;

  const state = await events.getState();
  if (!state.active) {
    return interaction.reply({ content: '❌ لا توجد فعالية نشطة حالياً.', ephemeral: true });
  }
  if (!(await isEventStaff(interaction))) {
    return interaction.reply({ content: '❌ هذا الإجراء مخصص لفريق إدارة الفعالية فقط.', ephemeral: true });
  }

  const answersRaw = interaction.fields.getTextInputValue('answers');
  const answers = parseAnswers(answersRaw);
  if (answers.length === 0) {
    return interaction.reply({ content: '❌ محتاج إجابة واحدة على الأقل (كل إجابة في سطر).', ephemeral: true });
  }

  const stageChannel = interaction.guild.channels.cache.get(state.stageChannelId);
  if (!stageChannel) {
    return interaction.reply({ content: '❌ متلاقيش شات الفعالية، اتشال يمكن.', ephemeral: true });
  }

  await unlockStageChannel(stageChannel, state.participantRoleId);
  await events.openRound(answers);

  await stageChannel.send(
    '🎤 **السؤال جاهز! اكتبوا إجابتكم الآن**\n' + '🎤 **The question is ready! Type your answer now**'
  );

  return interaction.reply({ content: `✅ اتفتح الراوند بـ ${answers.length} صيغة إجابة مقبولة.`, ephemeral: true });
}

async function handleEventMessage(message) {
  if (message.author.bot) return;
  const state = await events.getState();
  if (!state.active) return;
  if (message.channelId !== state.stageChannelId) return;

  if (containsProfanity(message.content)) {
    await message.delete().catch(() => {});
    const warning = await message.channel
      .send(`🚫 ${message.author.toString()} ممنوع الشتايم في شات الفعالية.`)
      .catch(() => null);
    if (warning) setTimeout(() => warning.delete().catch(() => {}), 5000);
    return;
  }

  if (!state.roundActive || state.paused) return;
  if (!isCorrectAnswer(message.content, state.currentAnswers)) return;

  await events.closeRound();
  await lockStageChannel(message.channel, state.participantRoleId);
  await events.addPoint(message.author.id, message.author.tag);
  const leaderboard = await events.getLeaderboardSorted();

  await message.channel.send({ embeds: [buildWinnerEmbed(message.author)] });
  await message.channel.send({ embeds: [buildLeaderboardEmbed(leaderboard)] });
  await sendSeparator(message.channel);
}

async function finishEvent(interaction) {
  const state = await events.getState();
  if (!state.active) {
    return interaction.reply({ content: '❌ لا توجد فعالية نشطة حالياً.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  const finalState = await events.endEvent();
  const guild = interaction.guild;

  const stageChannel = guild.channels.cache.get(finalState.stageChannelId);
  if (stageChannel) {
    await stageChannel.permissionOverwrites.delete(guild.roles.everyone).catch(() => {});
    if (finalState.teamRoleId) await stageChannel.permissionOverwrites.delete(finalState.teamRoleId).catch(() => {});
    if (finalState.participantRoleId) await stageChannel.permissionOverwrites.delete(finalState.participantRoleId).catch(() => {});
  }

  const participantRole = finalState.participantRoleId ? guild.roles.cache.get(finalState.participantRoleId) : null;
  for (const [userId, entry] of Object.entries(finalState.participants ?? {})) {
    try {
      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) continue;
      if (participantRole) await member.roles.remove(participantRole, 'انتهاء الفعالية').catch(() => {});
      const rolesToRestore = (entry.savedRoleIds ?? []).filter((id) => guild.roles.cache.has(id));
      if (rolesToRestore.length > 0) {
        await member.roles.add(rolesToRestore, 'انتهاء الفعالية - استرجاع الرولات').catch(() => {});
      }
    } catch (err) {
      console.error('Failed to restore role/perms for', userId, err);
    }
  }

  if (finalState.joinChannelId && finalState.joinMessageId) {
    const joinChannel = guild.channels.cache.get(finalState.joinChannelId);
    const joinMessage = joinChannel ? await joinChannel.messages.fetch(finalState.joinMessageId).catch(() => null) : null;
    if (joinMessage) await joinMessage.edit({ components: [] }).catch(() => {});
  }

  const leaderboard = [...finalState.leaderboard].sort((a, b) => b.points - a.points);
  const winner = leaderboard[0] || null;

  const announceChannel = finalState.announceChannelId ? guild.channels.cache.get(finalState.announceChannelId) : null;
  if (announceChannel) {
    const winnerLine = winner
      ? `🏆 الفائز بالفعالية: <@${winner.userId}> بـ ${winner.points} نقطة!\n🏆 Event winner: <@${winner.userId}> with ${winner.points} points!`
      : 'انتهت الفعالية من غير أي إجابات صح.';
    await announceChannel.send({
      embeds: [new EmbedBuilder().setColor(0xf1c40f).setTitle('🎉 انتهت الفعالية!').setDescription(winnerLine), buildLeaderboardEmbed(leaderboard, '📊 الترتيب النهائي | Final Leaderboard')],
    });
  }

  return interaction.editReply({ content: '✅ اتقفلت الفعالية، اترجعت رولات كل اللي اشتركوا، واتبعت النتيجة في قناة الأخبار.' });
}

module.exports = {
  isEventStaff,
  buildControlPanelEmbed,
  buildControlPanelButtons,
  buildJoinPanelEmbed,
  buildJoinPanelButtons,
  buildLeaderboardEmbed,
  joinEvent,
  leaveEvent,
  handleEventButton,
  handleEventModalSubmit,
  handleEventMessage,
};
