const { EmbedBuilder } = require('discord.js');
const activities = require('../database/activities');

function buildActivityEmbed(activity) {
  const preset = activities.TYPE_PRESETS[activity.type] ?? activities.TYPE_PRESETS.other;
  const startUnix = Math.floor(activity.startTime / 1000);

  const attendeesText = activity.attendees.length
    ? activity.attendees.map((id) => `<@${id}>`).join('\n')
    : '_محدش سجل لسه، يلا كن أول واحد!_';

  return new EmbedBuilder()
    .setColor(activity.cancelled ? 0x555555 : preset.color)
    .setTitle(`${preset.emoji} ${activity.title}`)
    .setDescription(
      (activity.cancelled ? '⚠️ **تم إلغاء هذه الفعالية.**\n\n' : '') +
        `${activity.description}\n\n` +
        `🗓️ **الموعد:** <t:${startUnix}:F> (<t:${startUnix}:R>)\n` +
        (activity.voiceChannelId ? `🔊 **المكان:** <#${activity.voiceChannelId}>\n` : '') +
        `👤 **المنظم:** <@${activity.hostId}>`
    )
    .addFields({ name: `${preset.emoji} الحضور (${activity.attendees.length})`, value: attendeesText })
    .setFooter({ text: `فعالية #${activity.id} — ${preset.label}` })
    .setTimestamp(activity.startTime);
}

async function handleActivityButton(interaction) {
  const { customId } = interaction;
  if (!customId.startsWith('activity_rsvp_')) return;

  const activityId = Number(customId.replace('activity_rsvp_', ''));

  await interaction.deferUpdate().catch((err) => console.error('Failed to defer activity button:', err));

  const activity = await activities.getActivity(activityId);

  if (!activity) {
    return interaction.followUp({ content: '❌ هذه الفعالية لم تعد موجودة.', ephemeral: true }).catch(() => {});
  }
  if (activity.cancelled) {
    return interaction.followUp({ content: '⚠️ تم إلغاء هذه الفعالية.', ephemeral: true }).catch(() => {});
  }
  if (activity.startTime <= Date.now()) {
    return interaction.followUp({ content: '⏰ هذه الفعالية بدأت أو انتهت بالفعل.', ephemeral: true }).catch(() => {});
  }

  const updated = await activities.toggleAttendee(activityId, interaction.user.id);
  const joined = updated.attendees.includes(interaction.user.id);

  await interaction.editReply({ embeds: [buildActivityEmbed(updated)] }).catch((err) => console.error('Failed to edit activity embed:', err));
  return interaction.followUp({
    content: joined ? '✅ تم تسجيلك في الفعالية!' : '👋 تم إلغاء تسجيلك من الفعالية.',
    ephemeral: true,
  }).catch(() => {});
}

module.exports = { buildActivityEmbed, handleActivityButton };
