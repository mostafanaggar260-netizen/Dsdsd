const activities = require('../database/activities');

const CHECK_INTERVAL_MS = 60 * 1000;

module.exports = function registerActivityReminder(client) {
  setInterval(async () => {
    const now = Date.now();
    const pending = await activities.listPendingReminders();

    for (const activity of pending) {
      const channel = client.channels.cache.get(activity.announceChannelId);
      if (!channel) continue;

      const minutesLeft = (activity.startTime - now) / 60000;

      if (!activity.notified10 && minutesLeft <= 10 && minutesLeft > 0) {
        await activities.markNotified(activity.id, 'notified10');
        const preset = activities.TYPE_PRESETS[activity.type] ?? activities.TYPE_PRESETS.other;
        const mentions = activity.attendees.map((id) => `<@${id}>`).join(' ') || '';
        await channel
          .send(`⏰ **${preset.emoji} ${activity.title}** هتبدأ بعد 10 دقايق! ${mentions}`)
          .catch((err) => console.error('Failed to send 10-min reminder:', err));
      }

      if (!activity.notifiedStart && minutesLeft <= 0) {
        await activities.markNotified(activity.id, 'notifiedStart');
        const preset = activities.TYPE_PRESETS[activity.type] ?? activities.TYPE_PRESETS.other;
        const mentions = activity.attendees.map((id) => `<@${id}>`).join(' ') || '';
        await channel
          .send(`🔥 **${preset.emoji} ${activity.title}** بدأت دلوقتي! يلا بينا ${mentions}`)
          .catch((err) => console.error('Failed to send start reminder:', err));
      }
    }
  }, CHECK_INTERVAL_MS);
};
