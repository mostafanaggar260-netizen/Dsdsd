const { Events } = require('discord.js');
const { logVoiceStateChange } = require('../handlers/logs');
const env = require('../config/env');
const { notifySupportJoin } = require('../handlers/supportVoice');

module.exports = function registerVoiceStateUpdate(client) {
  client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    // لوج تغيير الحالة الصوتية القديم
    await logVoiceStateChange(client, oldState, newState);

    // مراقبة دخول العضو لروم الدعم الصوتي
    if (
      env.SUPPORT_VOICE_CHANNEL_ID &&
      newState.channelId === env.SUPPORT_VOICE_CHANNEL_ID &&
      oldState.channelId !== env.SUPPORT_VOICE_CHANNEL_ID &&
      newState.member
    ) {
      await notifySupportJoin(newState.member, newState.channel);
    }
  });
};
