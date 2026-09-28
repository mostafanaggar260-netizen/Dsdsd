const { loadJSON, saveJSON } = require('./db');
const FILE = 'activities.json';

const TYPE_PRESETS = {
  gaming: { emoji: '🎮', label: 'ليلة قيمنق', color: 0x5865f2 },
  movie: { emoji: '🎬', label: 'ليلة أفلام', color: 0xe91e63 },
  giveaway: { emoji: '🎁', label: 'قيف اواي', color: 0xffd700 },
  voice: { emoji: '🎙️', label: 'جلسة صوتية', color: 0x57f287 },
  other: { emoji: '✨', label: 'فعالية', color: 0x5865f2 },
};

async function readStore() { return await loadJSON(FILE, { nextId: 1, activities: [] }); }
async function writeStore(store) { await saveJSON(FILE, store); }

async function createActivity({ title, description, type, hostId, startTime, announceChannelId, voiceChannelId, discordEventId }) {
  const store = await readStore();
  const activity = {
    id: store.nextId++, title, description, type, hostId, startTime,
    announceChannelId, voiceChannelId: voiceChannelId ?? null, discordEventId: discordEventId ?? null,
    messageId: null, attendees: [], notified10: false, notifiedStart: false, cancelled: false, createdAt: Date.now(),
  };
  store.activities.push(activity); await writeStore(store); return activity;
}

async function setMessageId(activityId, messageId) {
  const store = await readStore(); const activity = store.activities.find((a) => a.id === activityId);
  if (!activity) return null; activity.messageId = messageId; await writeStore(store); return activity;
}

async function getActivity(activityId) { const store = await readStore(); return store.activities.find((a) => a.id === activityId) || null; }
async function getActivityByMessage(messageId) { const store = await readStore(); return store.activities.find((a) => a.messageId === messageId) || null; }

async function toggleAttendee(activityId, userId) {
  const store = await readStore(); const activity = store.activities.find((a) => a.id === activityId);
  if (!activity) return null; const idx = activity.attendees.indexOf(userId);
  if (idx === -1) activity.attendees.push(userId); else activity.attendees.splice(idx, 1);
  await writeStore(store); return activity;
}

async function cancelActivity(activityId) {
  const store = await readStore(); const activity = store.activities.find((a) => a.id === activityId);
  if (!activity) return null; activity.cancelled = true; await writeStore(store); return activity;
}

async function listUpcoming() {
  const store = await readStore();
  return store.activities.filter((a) => !a.cancelled && a.startTime > Date.now()).sort((a, b) => a.startTime - b.startTime);
}

async function listPendingReminders() { const store = await readStore(); return store.activities.filter((a) => !a.cancelled); }

async function markNotified(activityId, field) {
  const store = await readStore(); const activity = store.activities.find((a) => a.id === activityId);
  if (!activity) return; activity[field] = true; await writeStore(store);
}

module.exports = { TYPE_PRESETS, createActivity, setMessageId, getActivity, getActivityByMessage, toggleAttendee, cancelActivity, listUpcoming, listPendingReminders, markNotified };
