const { loadJSON, saveJSON } = require('./db');
const env = require('../config/env');
const FILE = 'trusted-owners.json';

async function readStore() { return await loadJSON(FILE, { trustedIds: [] }); }
async function writeStore(store) { await saveJSON(FILE, store); }

async function isTrusted(userId) {
  if (env.OWNER_ID && userId === env.OWNER_ID) return true;
  const store = await readStore(); return store.trustedIds.includes(userId);
}

async function isRealOwner(userId) { return !!env.OWNER_ID && userId === env.OWNER_ID; }

async function addTrusted(userId) {
  const store = await readStore();
  if (!store.trustedIds.includes(userId)) { store.trustedIds.push(userId); await writeStore(store); }
  return store.trustedIds;
}

async function removeTrusted(userId) {
  const store = await readStore(); store.trustedIds = store.trustedIds.filter((id) => id !== userId);
  await writeStore(store); return store.trustedIds;
}

async function listTrusted() { const store = await readStore(); return store.trustedIds; }

module.exports = { isTrusted, isRealOwner, addTrusted, removeTrusted, listTrusted };
