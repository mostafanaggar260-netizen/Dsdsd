// All ticket records live here (data/tickets.json). This survives bot
// restarts, unlike the old "check the channel topic" approach.
const { loadJSON, saveJSON } = require('./db');

const FILE = 'tickets.json';

function readStore() {
  return loadJSON(FILE, { nextId: 1, tickets: [] });
}

function writeStore(store) {
  saveJSON(FILE, store);
}

// Lets a caller preview the number the *next* ticket will get, before it
// actually exists (used to bake the number into the channel name at
// creation time). Does not consume/increment anything by itself.
function peekNextTicketNumber() {
  const store = readStore();
  return store.nextId;
}

function createTicket({ channelId, channelName, openerId, openerTag, type, applyRole = null }) {
  const store = readStore();
  const ticket = {
    id: store.nextId++,
    channelId,
    channelName,
    openerId,
    openerTag,
    type, // 'support' | 'apply'
    applyRole, // null | 'editor' | 'admin' | 'events' | 'dev'
    status: 'open', // 'open' | 'closed'
    claimedBy: null,
    openedAt: Date.now(),
    closedAt: null,
    closedBy: null,
  };
  store.tickets.push(ticket);
  writeStore(store);
  return ticket;
}

function getTicketByChannel(channelId) {
  const store = readStore();
  return store.tickets.find((t) => t.channelId === channelId) || null;
}

function getOpenTicketByUser(userId) {
  const store = readStore();
  return store.tickets.find((t) => t.openerId === userId && t.status === 'open') || null;
}

function claimTicket(channelId, staffId) {
  const store = readStore();
  const ticket = store.tickets.find((t) => t.channelId === channelId);
  if (!ticket) return null;
  ticket.claimedBy = staffId;
  writeStore(store);
  return ticket;
}

function closeTicket(channelId, closedById) {
  const store = readStore();
  const ticket = store.tickets.find((t) => t.channelId === channelId);
  if (!ticket) return null;
  ticket.status = 'closed';
  ticket.closedAt = Date.now();
  ticket.closedBy = closedById;
  writeStore(store);
  return ticket;
}

function listOpenTickets() {
  const store = readStore();
  return store.tickets.filter((t) => t.status === 'open');
}

module.exports = {
  peekNextTicketNumber,
  createTicket,
  getTicketByChannel,
  getOpenTicketByUser,
  claimTicket,
  closeTicket,
  listOpenTickets,
};
