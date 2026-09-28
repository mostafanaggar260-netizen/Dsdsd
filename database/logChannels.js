// Remembers channel IDs the bot auto-created for logging (data/auto-log-channels.json),
// so it reuses the same channel on every restart instead of creating a new one each time.
const { loadJSON, saveJSON } = require('./db');

const FILE = 'auto-log-channels.json';

function readStore() {
  return loadJSON(FILE, {});
}

function getStoredChannelId(key) {
  const store = readStore();
  return store[key] || null;
}

function setStoredChannelId(key, channelId) {
  const store = readStore();
  store[key] = channelId;
  saveJSON(FILE, store);
}

module.exports = { getStoredChannelId, setStoredChannelId };
