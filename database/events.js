// Stores the state of the current "stage event" (live Q&A during a Discord
// Stage: admin asks by voice, members race to type the answer in the stage
// chat) plus its leaderboard and its participants.
// Lives in data/eventState.json — same tiny JSON-file pattern as tickets.js.
const { loadJSON, saveJSON } = require('./db');

const FILE = 'eventState.json';

function emptyState() {
  return {
    active: false,
    guildId: null,
    controlChannelId: null, // where the control panel message was posted
    controlMessageId: null,
    joinChannelId: null, // where the public join/leave panel was posted
    joinMessageId: null,
    stageChannelId: null, // the stage text chat where answers are typed
    announceChannelId: null, // where the final winner gets announced
    teamRoleId: null, // snapshot of the event-team role at start time
    participantRoleId: null, // snapshot of the "فعاليه" role at start time
    // participants: { [userId]: { tag, savedRoleIds: [...], joinedAt } }
    // savedRoleIds are the roles the bot removed from them so it can give
    // everything back exactly as it was when they leave / the event ends.
    participants: {},
    paused: false,
    roundActive: false,
    currentAnswers: [], // normalized accepted answers for the currently open round
    leaderboard: [], // [{ userId, tag, points }]
    startedBy: null,
    startedAt: null,
  };
}

function readState() {
  return loadJSON(FILE, emptyState());
}

function writeState(state) {
  saveJSON(FILE, state);
}

function getState() {
  return readState();
}

function isActive() {
  return readState().active;
}

function startEvent({ guildId, stageChannelId, announceChannelId, teamRoleId, participantRoleId, startedBy }) {
  const state = emptyState();
  state.active = true;
  state.guildId = guildId;
  state.stageChannelId = stageChannelId;
  state.announceChannelId = announceChannelId;
  state.teamRoleId = teamRoleId ?? null;
  state.participantRoleId = participantRoleId ?? null;
  state.startedBy = startedBy;
  state.startedAt = Date.now();
  writeState(state);
  return state;
}

function setControlMessage(channelId, messageId) {
  const state = readState();
  state.controlChannelId = channelId;
  state.controlMessageId = messageId;
  writeState(state);
  return state;
}

function setJoinMessage(channelId, messageId) {
  const state = readState();
  state.joinChannelId = channelId;
  state.joinMessageId = messageId;
  writeState(state);
  return state;
}

// Resets to an empty (inactive) state and returns the final snapshot so the
// caller can still clean up (restore roles, announce the winner, etc.).
function endEvent() {
  const state = readState();
  writeState(emptyState());
  return state;
}

function setPaused(paused) {
  const state = readState();
  state.paused = paused;
  writeState(state);
  return state;
}

function openRound(answers) {
  const state = readState();
  state.roundActive = true;
  state.paused = false;
  state.currentAnswers = answers;
  writeState(state);
  return state;
}

function closeRound() {
  const state = readState();
  state.roundActive = false;
  state.currentAnswers = [];
  writeState(state);
  return state;
}

// delta can be positive (add) or negative (remove). Points never go below 0.
function adjustPoints(userId, tag, delta) {
  const state = readState();
  let entry = state.leaderboard.find((e) => e.userId === userId);
  if (!entry) {
    entry = { userId, tag, points: 0 };
    state.leaderboard.push(entry);
  }
  entry.tag = tag; // keep the display tag fresh
  entry.points = Math.max(0, entry.points + delta);
  writeState(state);
  return entry;
}

function addPoint(userId, tag) {
  adjustPoints(userId, tag, 1);
  return readState().leaderboard;
}

function getLeaderboardSorted() {
  const state = readState();
  return [...state.leaderboard].sort((a, b) => b.points - a.points);
}

// ── Participants (people who joined via the join button / أمر الدخول) ──
function isParticipant(userId) {
  return !!readState().participants[userId];
}

function getParticipant(userId) {
  return readState().participants[userId] ?? null;
}

function addParticipant(userId, { tag, savedRoleIds }) {
  const state = readState();
  state.participants[userId] = { tag, savedRoleIds, joinedAt: Date.now() };
  writeState(state);
  return state.participants[userId];
}

// Removes them from the participants list and returns what they had saved
// (so the caller can restore their roles), or null if they weren't in it.
function removeParticipant(userId) {
  const state = readState();
  const entry = state.participants[userId] ?? null;
  delete state.participants[userId];
  writeState(state);
  return entry;
}

function getAllParticipants() {
  return readState().participants;
}

module.exports = {
  getState,
  isActive,
  startEvent,
  setControlMessage,
  setJoinMessage,
  endEvent,
  setPaused,
  openRound,
  closeRound,
  addPoint,
  adjustPoints,
  getLeaderboardSorted,
  isParticipant,
  getParticipant,
  addParticipant,
  removeParticipant,
  getAllParticipants,
};
