const { Events } = require('discord.js');
const { handleTicketButton, handleTicketApplySelect } = require('../handlers/ticketButtons');
const { handleActivityButton } = require('../handlers/activityButtons');
const { handleEventButton, handleEventModalSubmit } = require('../handlers/eventButtons');
const { handleSupportPull } = require('../handlers/supportVoice');

module.exports = function registerInteractionCreate(client, commands) {
  client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isChatInputCommand()) {
      const command = commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction);
      } catch (error) {
        console.error('Error executing command:', interaction.commandName, error);
        const errorMsg = { content: '❌ حدث خطأ أثناء تنفيذ الأمر.', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMsg).catch(() => {});
        } else {
          await interaction.reply(errorMsg).catch(() => {});
        }
      }
    }

    if (interaction.isButton()) {
      try {
        if (interaction.customId.startsWith('activity_rsvp_')) {
          await handleActivityButton(interaction);
        } else if (interaction.customId.startsWith('event_')) {
          await handleEventButton(interaction);
        } else if (interaction.customId.startsWith('support_pull_')) {
          await handleSupportPull(interaction);
        } else {
          await handleTicketButton(interaction);
        }
      } catch (error) {
        console.error('Button interaction error:', error);
      }
    }

    if (interaction.isStringSelectMenu()) {
      try {
        if (interaction.customId === 'ticket_apply_select') {
          await handleTicketApplySelect(interaction);
        }
      } catch (error) {
        console.error('Select menu interaction error:', error);
      }
    }

    if (interaction.isModalSubmit()) {
      try {
        if (interaction.customId === 'event_round_modal') {
          await handleEventModalSubmit(interaction);
        }
      } catch (error) {
        console.error('Modal submit interaction error:', error);
      }
    }
  });
};
