// A "trusted owners" list, separate from the main OWNER_ID in .env.
// You (OWNER_ID) can add/remove people here. Anyone on this list can
// run the privileged commands in commands/owner.js.
const { loadJSON, saveJSON } = require('./db');
const env = require('../config/env');

const FILE = 'trusted-owners.json';

function readStore() {
  return loadJSON(FILE, { trustedIds: [] });
}

function writeStore(store) {
  saveJSON(FILE, store);
}

// The real OWNER_ID from .env is always trusted, even if not in the list.
function isTrusted(userId) {
  if (env.OWNER_ID && userId === env.OWNER_ID) return true;
  return readStore().trustedIds.includes(userId);
}

function isRealOwner(userId) {
  return !!env.OWNER_ID && userId === env.OWNER_ID;
}

function addTrusted(userId) {
  const store = readStore();
  if (!store.trustedIds.includes(userId)) {
    store.trustedIds.push(userId);
    writeStore(store);
  }
  return store.trustedIds;
}

function removeTrusted(userId) {
  const store = readStore();
  store.trustedIds = store.trustedIds.filter((id) => id !== userId);
  writeStore(store);
  return store.trustedIds;
}

function listTrusted() {
  return readStore().trustedIds;
}

module.exports = { isTrusted, isRealOwner, addTrusted, removeTrusted, listTrusted };
