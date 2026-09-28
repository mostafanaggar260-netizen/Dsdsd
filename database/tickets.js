const { loadJSON, saveJSON } = require('./db');
const FILE = 'tickets.json';

async function readStore() {
  return await loadJSON(FILE, { nextId: 1, tickets: [] });
}

async function writeStore(store) {
  await saveJSON(FILE, store);
}

async function peekNextTicketNumber() {
  const store = await readStore();
  return store.nextId;
}

async function createTicket({ channelId, channelName, openerId, openerTag, type, applyRole = null }) {
  const store = await readStore();
  const ticket = {
    id: store.nextId++,
    channelId,
    channelName,
    openerId,
    openerTag,
    type,
    applyRole,
    status: 'open',
    claimedBy: null,
    openedAt: Date.now(),
    closedAt: null,
    closedBy: null,
  };
  store.tickets.push(ticket);
  await writeStore(store);
  return ticket;
}

async function getTicketByChannel(channelId) {
  const store = await readStore();
  return store.tickets.find((t) => t.channelId === channelId) || null;
}

async function getOpenTicketByUser(userId) {
  const store = await readStore();
  return store.tickets.find((t) => t.openerId === userId && t.status === 'open') || null;
}

async function claimTicket(channelId, staffId) {
  const store = await readStore();
  const ticket = store.tickets.find((t) => t.channelId === channelId);
  if (!ticket) return null;
  ticket.claimedBy = staffId;
  await writeStore(store);
  return ticket;
}

async function closeTicket(channelId, closedById) {
  const store = await readStore();
  const ticket = store.tickets.find((t) => t.channelId === channelId);
  if (!ticket) return null;
  ticket.status = 'closed';
  ticket.closedAt = Date.now();
  ticket.closedBy = closedById;
  await writeStore(store);
  return ticket;
}

async function listOpenTickets() {
  const store = await readStore();
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
