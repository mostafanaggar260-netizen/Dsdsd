const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('join')
      .setDescription('يدخل البوت الروم الصوتي اللي انت فيه')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
      const voiceChannel = interaction.member.voice.channel;
      if (!voiceChannel) {
        return interaction.reply({ content: '❌ لازم تكون في روم صوتي الأول.', ephemeral: true });
      }

      try {
        joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: interaction.guild.id,
          adapterCreator: interaction.guild.voiceAdapterCreator,
          selfDeaf: false, // عشان يقدر يسمع لو حبيت تخليه يقرأ الشات
          selfMute: false, // عشان يشتغل الصوت
        });
        return interaction.reply({ content: `✅ دخلت روم ${voiceChannel.toString()}`, ephemeral: true });
      } catch (err) {
        console.error('Failed to join voice channel:', err);
        return interaction.reply({ content: '❌ حصل خطأ وأنا بحاول أدخل الروم.', ephemeral: true });
      }
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('leave')
      .setDescription('يخرج البوت من الروم الصوتي')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
      const connection = getVoiceConnection(interaction.guild.id);
      if (!connection) {
        return interaction.reply({ content: '❌ البوت مش في روم صوتي.', ephemeral: true });
      }
      connection.destroy();
      return interaction.reply({ content: '✅ خرجت من الروم الصوتي.', ephemeral: true });
    },
  },
];
