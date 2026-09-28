const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const env = require('../config/env');

// الدالة اللي بتبعت الإشعار
async function notifySupportJoin(member, channel) {
  if (!env.SUPPORT_NOTIFY_CHANNEL_ID) return;
  const notifyChannel = member.guild.channels.cache.get(env.SUPPORT_NOTIFY_CHANNEL_ID);
  if (!notifyChannel) return;

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('🔔 طلب دعم فني جديد')
    .setDescription(`العضو ${member.toString()} دخل روم الدعم الصوتي.\nمحتاج حد من الفريق يسحبه.`)
    .setThumbnail(member.user.displayAvatarURL())
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`support_pull_${member.id}`)
      .setLabel('سحب العضو لرومي')
      .setStyle(ButtonStyle.Success)
      .setEmoji('🚀')
  );

  await notifyChannel.send({ content: env.SUPPORT_NOTIFY_ROLE_ID ? `<@&${env.SUPPORT_NOTIFY_ROLE_ID}>` : '', embeds: [embed], components: [row] });
}

// الدالة اللي بتتعامل مع الزر
async function handleSupportPull(interaction) {
  const memberId = interaction.customId.replace('support_pull_', '');
  
  // 1. نتأكد إن اللي داس على الزر معاه الرول المطلوب
  if (env.SUPPORT_NOTIFY_ROLE_ID && !interaction.member.roles.cache.has(env.SUPPORT_NOTIFY_ROLE_ID)) {
    return interaction.reply({ content: '❌ مش معاك الرول المسموح له بالسحب.', ephemeral: true });
  }

  // 2. نتأكد إن اللي داس على الزر قاعد في روم صوتي أصلاً
  const staffChannel = interaction.member.voice.channel;
  if (!staffChannel) {
    return interaction.reply({ content: '❌ لازم تكون قاعد في روم صوتي الأول عشان تسحب العضو ليك.', ephemeral: true });
  }

  const guild = interaction.guild;
  const targetMember = await guild.members.fetch(memberId).catch(() => null);

  // 3. نتأكد إن العضو لسه موجود في السيرفر
  if (!targetMember) {
    return interaction.reply({ content: '❌ العضو مش موجود في السيرفر.', ephemeral: true });
  }

  // 4. نتأكد إن العضو لسه قاعد في روم الدعم الأصلي
  if (!targetMember.voice.channel || targetMember.voice.channelId !== env.SUPPORT_VOICE_CHANNEL_ID) {
    return interaction.reply({ content: '❌ العضو مش في روم الدعم الأصلي، يمكن حد سحبه بالفعل أو خرج.', ephemeral: true });
  }

  // 5. نتأكد إن العضو مش قاعد معاك في نفس الروم
  if (targetMember.voice.channelId === staffChannel.id) {
    return interaction.reply({ content: '⚠️ العضو معاك في نفس الروم بالفعل.', ephemeral: true });
  }

  // 6. سحب العضو لروم الشخص اللي داس على الزر
  try {
    await targetMember.voice.setChannel(staffChannel.id, `تم السحب بواسطة ${interaction.user.tag}`);
  } catch (err) {
    console.error('Failed to pull member:', err);
    return interaction.reply({ content: '❌ فشل سحب العضو. تأكد إن للبوت صلاحية Move Members.', ephemeral: true });
  }

  // 7. نعدل الرسالة عشان نبين إنه تم السحب
  const updatedEmbed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle('✅ تم السحب بنجاح')
    .setDescription(`تم سحب ${targetMember.toString()} إلى روم **${staffChannel.name}** بواسطة ${interaction.user.toString()}.`)
    .setTimestamp();

  await interaction.update({ embeds: [updatedEmbed], components: [] });
}

module.exports = { notifySupportJoin, handleSupportPull };
