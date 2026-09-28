const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { buildTicketPanelEmbed, buildTicketPanelButtons } = require('../handlers/ticketButtons');
const ticketsDb = require('../database/tickets');

const APPLY_ROLE_LABELS = {
  editor: 'تقديم علي ايدتور',
  admin: 'تقديم علي اداره',
  events: 'تقديم علي فريق الفعاليات',
  dev: 'تقديم علي فريق التطوير',
};

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('setup_tickets')
      .setDescription('Post the ticket panel in this channel (Admin only)')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
      await interaction.reply({ content: '✅ تم نشر لوحة التذاكر!', ephemeral: true });
      await interaction.channel.send({ embeds: [buildTicketPanelEmbed()], components: [buildTicketPanelButtons()] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('tickets')
      .setDescription('List currently open tickets (Admin only)')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
      const open = await ticketsDb.listOpenTickets();
      if (open.length === 0) {
        return interaction.reply({ content: '📭 لا توجد تذاكر مفتوحة حالياً.', ephemeral: true });
      }
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`🎫 التذاكر المفتوحة (${open.length})`)
        .setDescription(
          open
            .map((t) => {
              const typeLabel = t.type === 'support' ? '🔧 دعم فني' : `🏆 ${APPLY_ROLE_LABELS[t.applyRole] || 'تقديم'}`;
              return `**#${t.id}** — <#${t.channelId}> — ${t.openerTag} — ${typeLabel}${t.claimedBy ? ' — ✅ مستلمة' : ''}`;
            })
            .join('\n')
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed], ephemeral: true });
    },
  },
];
