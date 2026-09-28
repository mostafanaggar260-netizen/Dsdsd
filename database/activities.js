// Community "فعاليات" (events/activities) — separate from Discord's own
// native Scheduled Events feature. This tracks the fun announcement
// embed, RSVP button, attendee list, and reminder pings.
const { loadJSON, saveJSON } = require('./db');

const FILE = 'activities.json';

const TYPE_PRESETS = {
  gaming: { emoji: '🎮', label: 'ليلة قيمنق', color: 0x5865f2 },
  movie: { emoji: '🎬', label: 'ليلة أفلام', color: 0xe91e63 },
  giveaway: { emoji: '🎁', label: 'قيف اواي', color: 0xffd700 },
  voice: { emoji: '🎙️', label: 'جلسة صوتية', color: 0x57f287 },
  other: { emoji: '✨', label: 'فعالية', color: 0x5865f2 },
};

function readStore() {
  return loadJSON(FILE, { nextId: 1, activities: [] });
}

function writeStore(store) {
  saveJSON(FILE, store);
}

function createActivity({ title, description, type, hostId, startTime, announceChannelId, voiceChannelId, discordEventId }) {
  const store = readStore();
  const activity = {
    id: store.nextId++,
    title,
    description,
    type,
    hostId,
    startTime, // ms epoch
    announceChannelId,
    voiceChannelId: voiceChannelId ?? null,
    discordEventId: discordEventId ?? null,
    messageId: null,
    attendees: [],
    notified10: false,
    notifiedStart: false,
    cancelled: false,
    createdAt: Date.now(),
  };
  store.activities.push(activity);
  writeStore(store);
  return activity;
}

function setMessageId(activityId, messageId) {
  const store = readStore();
  const activity = store.activities.find((a) => a.id === activityId);
  if (!activity) return null;
  activity.messageId = messageId;
  writeStore(store);
  return activity;
}

function getActivity(activityId) {
  return readStore().activities.find((a) => a.id === activityId) || null;
}

function getActivityByMessage(messageId) {
  return readStore().activities.find((a) => a.messageId === messageId) || null;
}

function toggleAttendee(activityId, userId) {
  const store = readStore();
  const activity = store.activities.find((a) => a.id === activityId);
  if (!activity) return null;
  const idx = activity.attendees.indexOf(userId);
  if (idx === -1) activity.attendees.push(userId);
  else activity.attendees.splice(idx, 1);
  writeStore(store);
  return activity;
}

function cancelActivity(activityId) {
  const store = readStore();
  const activity = store.activities.find((a) => a.id === activityId);
  if (!activity) return null;
  activity.cancelled = true;
  writeStore(store);
  return activity;
}

function listUpcoming() {
  return readStore()
    .activities.filter((a) => !a.cancelled && a.startTime > Date.now())
    .sort((a, b) => a.startTime - b.startTime);
}

function listPendingReminders() {
  return readStore().activities.filter((a) => !a.cancelled);
}

function markNotified(activityId, field) {
  const store = readStore();
  const activity = store.activities.find((a) => a.id === activityId);
  if (!activity) return;
  activity[field] = true;
  writeStore(store);
}

module.exports = {
  TYPE_PRESETS,
  createActivity,
  setMessageId,
  getActivity,
  getActivityByMessage,
  toggleAttendee,
  cancelActivity,
  listUpcoming,
  listPendingReminders,
  markNotified,
};
