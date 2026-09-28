const { loadJSON, saveJSON } = require('./db');
const FILE = 'auto-log-channels.json';

async function readStore() { return await loadJSON(FILE, {}); }
async function getStoredChannelId(key) { const store = await readStore(); return store[key] || null; }
async function setStoredChannelId(key, channelId) { const store = await readStore(); store[key] = channelId; await saveJSON(FILE, store); }

module.exports = { getStoredChannelId, setStoredChannelId };
