const { loadJSON, saveJSON } = require('./db');
const FILE = 'eventState.json';

function emptyState() {
  return {
    active: false, guildId: null, controlChannelId: null, controlMessageId: null,
    joinChannelId: null, joinMessageId: null, stageChannelId: null, announceChannelId: null,
    teamRoleId: null, participantRoleId: null, participants: {}, paused: false,
    roundActive: false, currentAnswers: [], leaderboard: [], startedBy: null, startedAt: null,
  };
}

async function readState() { return await loadJSON(FILE, emptyState()); }
async function writeState(state) { await saveJSON(FILE, state); }

async function getState() { return await readState(); }
async function isActive() { const state = await readState(); return state.active; }

async function startEvent({ guildId, stageChannelId, announceChannelId, teamRoleId, participantRoleId, startedBy }) {
  const state = emptyState();
  state.active = true; state.guildId = guildId; state.stageChannelId = stageChannelId;
  state.announceChannelId = announceChannelId; state.teamRoleId = teamRoleId ?? null;
  state.participantRoleId = participantRoleId ?? null; state.startedBy = startedBy; state.startedAt = Date.now();
  await writeState(state);
  return state;
}

async function setControlMessage(channelId, messageId) {
  const state = await readState(); state.controlChannelId = channelId; state.controlMessageId = messageId;
  await writeState(state); return state;
}

async function setJoinMessage(channelId, messageId) {
  const state = await readState(); state.joinChannelId = channelId; state.joinMessageId = messageId;
  await writeState(state); return state;
}

async function endEvent() {
  const state = await readState(); await writeState(emptyState()); return state;
}

async function setPaused(paused) {
  const state = await readState(); state.paused = paused; await writeState(state); return state;
}

async function openRound(answers) {
  const state = await readState(); state.roundActive = true; state.paused = false;
  state.currentAnswers = answers; await writeState(state); return state;
}

async function closeRound() {
  const state = await readState(); state.roundActive = false; state.currentAnswers = [];
  await writeState(state); return state;
}

async function adjustPoints(userId, tag, delta) {
  const state = await readState();
  let entry = state.leaderboard.find((e) => e.userId === userId);
  if (!entry) { entry = { userId, tag, points: 0 }; state.leaderboard.push(entry); }
  entry.tag = tag; entry.points = Math.max(0, entry.points + delta);
  await writeState(state); return entry;
}

async function addPoint(userId, tag) { await adjustPoints(userId, tag, 1); return await readState().leaderboard; }
async function getLeaderboardSorted() { const state = await readState(); return [...state.leaderboard].sort((a, b) => b.points - a.points); }
async function isParticipant(userId) { const state = await readState(); return !!state.participants[userId]; }
async function getParticipant(userId) { const state = await readState(); return state.participants[userId] ?? null; }

async function addParticipant(userId, { tag, savedRoleIds }) {
  const state = await readState(); state.participants[userId] = { tag, savedRoleIds, joinedAt: Date.now() };
  await writeState(state); return state.participants[userId];
}

async function removeParticipant(userId) {
  const state = await readState(); const entry = state.participants[userId] ?? null;
  delete state.participants[userId]; await writeState(state); return entry;
}

async function getAllParticipants() { const state = await readState(); return state.participants; }

module.exports = {
  getState, isActive, startEvent, setControlMessage, setJoinMessage, endEvent, setPaused,
  openRound, closeRound, addPoint, adjustPoints, getLeaderboardSorted, isParticipant,
  getParticipant, addParticipant, removeParticipant, getAllParticipants,
};
