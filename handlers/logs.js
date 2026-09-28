// All "post an embed into a log channel" helpers live here.
const { EmbedBuilder } = require('discord.js');
const env = require('../config/env');

function getLogChannel(client, channelId, label) {
  if (!channelId) {
    console.warn(`⚠️ Log skipped (${label || 'unknown'}): no channel ID configured.`);
    return null;
  }
  const ch = client.channels.cache.get(channelId);
  if (!ch || !ch.isTextBased() || ch.isDMBased()) {
    console.warn(`⚠️ Log skipped (${label || 'unknown'}): channel ${channelId} not found or not text-based.`);
    return null;
  }
  return ch;
}

async function sendLog(ch, embed, files) {
  if (!ch) return;
  await ch.send({ embeds: [embed], files }).catch((err) => console.error('Failed to send log embed:', err));
}

async function logModeration(client, opts) {
  const embed = new EmbedBuilder()
    .setColor(opts.color)
    .setTitle(opts.action)
    .setThumbnail(opts.target.displayAvatarURL())
    .addFields(
      { name: '👤 العضو', value: `${opts.target.tag}\n\`${opts.target.id}\``, inline: true },
      { name: '🛡️ المشرف', value: opts.moderator.tag, inline: true },
      { name: '📝 السبب', value: opts.reason ?? 'لا يوجد سبب' },
      ...(opts.extra ?? [])
    )
    .setTimestamp();
  await sendLog(getLogChannel(client, env.LOG_MODERATION_CHANNEL_ID), embed);
}

async function logMessageDelete(client, message) {
  if (!message.author || message.author.bot) return;
  const embed = new EmbedBuilder()
    .setColor(0xff4444)
    .setTitle('🗑️ رسالة محذوفة')
    .addFields(
      { name: '👤 المرسل', value: `${message.author.tag} (\`${message.author.id}\`)`, inline: true },
      { name: '📢 القناة', value: `<#${message.channelId}>`, inline: true },
      { name: '💬 المحتوى', value: message.content?.slice(0, 1024) || '*(لا يوجد نص)*' }
    )
    .setTimestamp();
  await sendLog(getLogChannel(client, env.LOG_MESSAGE_CHANNEL_ID), embed);
}

async function logMessageEdit(client, oldMsg, newMsg) {
  if (!newMsg.author || newMsg.author.bot || oldMsg.content === newMsg.content) return;
  const embed = new EmbedBuilder()
    .setColor(0xffa500)
    .setTitle('✏️ رسالة معدّلة')
    .setURL(newMsg.url)
    .addFields(
      { name: '👤 المرسل', value: `${newMsg.author.tag}`, inline: true },
      { name: '📢 القناة', value: `<#${newMsg.channelId}>`, inline: true },
      { name: '📝 قبل', value: oldMsg.content?.slice(0, 512) || '*(غير معروف)*' },
      { name: '📝 بعد', value: newMsg.content?.slice(0, 512) || '*(لا يوجد نص)*' }
    )
    .setTimestamp();
  await sendLog(getLogChannel(client, env.LOG_MESSAGE_CHANNEL_ID), embed);
}

async function logMemberJoin(client, member) {
  const embed = new EmbedBuilder()
    .setColor(0x00cc44)
    .setTitle('📥 عضو انضم للسيرفر')
    .setThumbnail(member.user.displayAvatarURL())
    .addFields(
      { name: '👤 العضو', value: `${member.user.tag} (\`${member.user.id}\`)` },
      { name: '📅 تاريخ إنشاء الحساب', value: member.user.createdAt.toLocaleDateString('ar-EG') }
    )
    .setTimestamp();
  await sendLog(getLogChannel(client, env.LOG_MEMBER_CHANNEL_ID), embed);
}

async function logMemberLeave(client, member) {
  const embed = new EmbedBuilder()
    .setColor(0xff4444)
    .setTitle('📤 عضو غادر السيرفر')
    .setThumbnail(member.user?.displayAvatarURL() ?? null)
    .addFields(
      { name: '👤 العضو', value: member.user ? `${member.user.tag} (\`${member.user.id}\`)` : `\`${member.id}\`` },
      { name: '📅 تاريخ الانضمام', value: member.joinedAt?.toLocaleDateString('ar-EG') ?? 'غير معروف' }
    )
    .setTimestamp();
  await sendLog(getLogChannel(client, env.LOG_MEMBER_CHANNEL_ID), embed);
}

async function logMemberUpdate(client, oldMember, newMember) {
  if (oldMember.nickname === newMember.nickname) return;
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('✏️ تغيير النيك نيم')
    .setThumbnail(newMember.user.displayAvatarURL())
    .addFields(
      { name: '👤 العضو', value: `${newMember.user.tag}`, inline: true },
      { name: '📝 قبل', value: oldMember.nickname ?? oldMember.user?.username ?? 'غير معروف', inline: true },
      { name: '📝 بعد', value: newMember.nickname ?? newMember.user.username, inline: true }
    )
    .setTimestamp();
  await sendLog(getLogChannel(client, env.LOG_MEMBER_CHANNEL_ID), embed);
}

async function logChannelCreate(client, channel) {
  const embed = new EmbedBuilder()
    .setColor(0x00cc44)
    .setTitle('📌 تم إنشاء قناة')
    .addFields(
      { name: '📢 القناة', value: `${channel} (\`${channel.name}\`)`, inline: true },
      { name: '🔑 النوع', value: String(channel.type), inline: true }
    )
    .setTimestamp();
  await sendLog(getLogChannel(client, env.LOG_CHANNEL_ROLE_CHANNEL_ID), embed);
}

async function logChannelDelete(client, channel) {
  const embed = new EmbedBuilder()
    .setColor(0xff4444)
    .setTitle('🗑️ تم حذف قناة')
    .addFields(
      { name: '📢 الاسم', value: channel.name, inline: true },
      { name: '🔑 النوع', value: String(channel.type), inline: true }
    )
    .setTimestamp();
  await sendLog(getLogChannel(client, env.LOG_CHANNEL_ROLE_CHANNEL_ID), embed);
}

async function logChannelUpdate(client, oldCh, newCh) {
  // Reordering ANY channel in a category shifts the position of every
  // other channel in it, firing a ChannelUpdate for all of them even
  // though only one channel actually moved. Only log real renames.
  if (oldCh.name === newCh.name) return;
  const embed = new EmbedBuilder()
    .setColor(0xffa500)
    .setTitle('🔧 تم تعديل قناة')
    .addFields(
      { name: '📢 القناة', value: `${newCh}`, inline: true },
      { name: '📝 قبل', value: oldCh.name, inline: true },
      { name: '📝 بعد', value: newCh.name, inline: true }
    )
    .setTimestamp();
  await sendLog(getLogChannel(client, env.LOG_CHANNEL_ROLE_CHANNEL_ID), embed);
}

async function logRoleCreate(client, role) {
  const embed = new EmbedBuilder()
    .setColor(role.color || 0x00cc44)
    .setTitle('🎭 تم إنشاء رتبة')
    .addFields(
      { name: '🎭 الرتبة', value: `${role} (\`${role.name}\`)`, inline: true },
      { name: '🎨 اللون', value: role.hexColor, inline: true }
    )
    .setTimestamp();
  await sendLog(getLogChannel(client, env.LOG_CHANNEL_ROLE_CHANNEL_ID), embed);
}

async function logRoleDelete(client, role) {
  const embed = new EmbedBuilder()
    .setColor(0xff4444)
    .setTitle('🗑️ تم حذف رتبة')
    .addFields(
      { name: '🎭 الاسم', value: role.name, inline: true },
      { name: '🎨 اللون', value: role.hexColor, inline: true }
    )
    .setTimestamp();
  await sendLog(getLogChannel(client, env.LOG_CHANNEL_ROLE_CHANNEL_ID), embed);
}

async function logRoleUpdate(client, oldRole, newRole) {
  if (oldRole.name === newRole.name && oldRole.hexColor === newRole.hexColor) return;
  const embed = new EmbedBuilder()
    .setColor(newRole.color || 0xffa500)
    .setTitle('🔧 تم تعديل رتبة')
    .addFields(
      { name: '🎭 الرتبة', value: `${newRole}`, inline: true },
      { name: '📝 قبل', value: oldRole.name, inline: true },
      { name: '📝 بعد', value: newRole.name, inline: true },
      { name: '🎨 اللون قبل', value: oldRole.hexColor, inline: true },
      { name: '🎨 اللون بعد', value: newRole.hexColor, inline: true }
    )
    .setTimestamp();
  await sendLog(getLogChannel(client, env.LOG_CHANNEL_ROLE_CHANNEL_ID), embed);
}

async function logTicketOpen(client, user, type, channelName, ticketNumber, applyRoleLabel) {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`🎫 تم فتح تذكرة${ticketNumber ? ` #${ticketNumber}` : ''}`)
    .setThumbnail(user.displayAvatarURL())
    .addFields(
      { name: '👤 العضو', value: `${user.tag} (\`${user.id}\`)`, inline: true },
      { name: '🔖 النوع', value: type === 'support' ? '🔧 دعم فني' : `🏆 ${applyRoleLabel || 'تقديم على رتبة'}`, inline: true },
      { name: '📢 القناة', value: channelName }
    )
    .setTimestamp();
  await sendLog(getLogChannel(client, env.LOG_TICKET_CHANNEL_ID), embed);
}

// files: optional array of attachment paths (used to attach the transcript .txt)
async function logTicketClose(client, openerTag, openerId, channelName, closedBy, files) {
  const embed = new EmbedBuilder()
    .setColor(0xff4444)
    .setTitle('🔒 تم إغلاق تذكرة')
    .addFields(
      { name: '👤 صاحب التذكرة', value: `${openerTag} (\`${openerId}\`)`, inline: true },
      { name: '🛡️ أُغلقت بواسطة', value: closedBy.tag, inline: true },
      { name: '📢 اسم القناة', value: channelName }
    )
    .setTimestamp();
  await sendLog(getLogChannel(client, env.LOG_TICKET_CHANNEL_ID), embed, files);
}

// A role was ADDED to a member (e.g. staff gave someone a role). Goes to
// its own log channel, green, and names who did it when known.
async function logMemberRoleAdd(client, member, role, executor) {
  const embed = new EmbedBuilder()
    .setColor(0x00cc44)
    .setTitle('➕ تمت إضافة رتبة لعضو')
    .setThumbnail(member.user.displayAvatarURL())
    .addFields(
      { name: '👤 العضو', value: `${member.user.tag} (\`${member.user.id}\`)`, inline: true },
      { name: '🎭 الرتبة', value: `${role}`, inline: true },
      { name: '🛡️ بواسطة', value: executor ? `${executor.tag} (\`${executor.id}\`)` : 'غير معروف' }
    )
    .setTimestamp();
  await sendLog(getLogChannel(client, env.LOG_ROLE_ADD_CHANNEL_ID, 'role add'), embed);
}

// A role was REMOVED from a member. Goes to its own log channel, red.
async function logMemberRoleRemove(client, member, role, executor) {
  const embed = new EmbedBuilder()
    .setColor(0xff4444)
    .setTitle('➖ تمت إزالة رتبة من عضو')
    .setThumbnail(member.user.displayAvatarURL())
    .addFields(
      { name: '👤 العضو', value: `${member.user.tag} (\`${member.user.id}\`)`, inline: true },
      { name: '🎭 الرتبة', value: `${role}`, inline: true },
      { name: '🛡️ بواسطة', value: executor ? `${executor.tag} (\`${executor.id}\`)` : 'غير معروف' }
    )
    .setTimestamp();
  await sendLog(getLogChannel(client, env.LOG_ROLE_REMOVE_CHANNEL_ID, 'role remove'), embed);
}

async function logVoiceStateChange(client, oldState, newState) {
  const ch = getLogChannel(client, env.LOG_VOICE_CHANNEL_ID);
  if (!ch) return;
  const member = newState.member ?? oldState.member;
  if (!member || member.user.bot) return;
  const joined = !oldState.channelId && !!newState.channelId;
  const left = !!oldState.channelId && !newState.channelId;
  const moved = !!oldState.channelId && !!newState.channelId && oldState.channelId !== newState.channelId;
  if (!joined && !left && !moved) return;
  const embed = new EmbedBuilder()
    .setColor(joined ? 0x00cc44 : left ? 0xff4444 : 0xffa500)
    .setTitle(joined ? '🔊 انضم لقناة صوتية' : left ? '🔇 غادر قناة صوتية' : '↔️ انتقل بين قنوات صوتية')
    .addFields(
      { name: '👤 العضو', value: `${member.user.tag}`, inline: true },
      ...(joined
        ? [{ name: '🔊 القناة', value: `<#${newState.channelId}>`, inline: true }]
        : left
        ? [{ name: '🔊 القناة', value: `<#${oldState.channelId}>`, inline: true }]
        : [
            { name: '🔊 من', value: `<#${oldState.channelId}>`, inline: true },
            { name: '🔊 إلى', value: `<#${newState.channelId}>`, inline: true },
          ])
    )
    .setTimestamp();
  await sendLog(ch, embed);
}

module.exports = {
  logModeration,
  logMessageDelete,
  logMessageEdit,
  logMemberJoin,
  logMemberLeave,
  logMemberUpdate,
  logChannelCreate,
  logChannelDelete,
  logChannelUpdate,
  logRoleCreate,
  logRoleDelete,
  logRoleUpdate,
  logTicketOpen,
  logTicketClose,
  logMemberRoleAdd,
  logMemberRoleRemove,
  logVoiceStateChange,
};
