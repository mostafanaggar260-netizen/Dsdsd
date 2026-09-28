const { Events } = require('discord.js');
const { logMessageDelete, logMessageEdit } = require('../handlers/logs');
const tickets = require('../database/tickets');
const transcript = require('../utils/transcript');
const { handleEventMessage } = require('../handlers/eventButtons');

module.exports = function registerMessageEvents(client) {
  client.on(Events.MessageDelete, async (message) => {
    await logMessageDelete(client, message);
  });

  client.on(Events.MessageUpdate, async (oldMsg, newMsg) => {
    await logMessageEdit(client, oldMsg, newMsg);
  });

  // Every message sent inside an open ticket channel gets appended to
  // that ticket's transcript .txt file (see utils/transcript.js).
  client.on(Events.MessageCreate, async (message) => {
    if (!message.guild) return;

    const ticket = tickets.getTicketByChannel(message.channelId);
    if (ticket && ticket.status === 'open') {
      transcript.appendMessage(message.channelId, {
        authorTag: message.author.tag,
        content: message.content,
        attachments: [...message.attachments.values()].map((a) => a.url),
      });
    }

    await handleEventMessage(message).catch((err) => console.error('Event message handler error:', err));
  });
};
