const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { ensureLogChannels } = require('../utils/ensureLogChannels');

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('setup_role_logs')
      .setDescription('Create the role-add/role-remove log channels (Admin only)')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
      await interaction.deferReply({ ephemeral: true });

      const results = await ensureLogChannels(interaction.client, interaction.guild);
      const anyCreated = results.some((r) => r.created);
      const allAlreadyExisted = results.length > 0 && results.every((r) => r.channel && !r.created);

      const lines = results.map((r) => {
        if (!r.channel) return `❌ فشل إنشاء #${r.name}`;
        return `${r.created ? '🆕 تم الإنشاء الآن:' : '✅ موجودة بالفعل:'} ${r.channel.toString()}`;
      });

      const embed = new EmbedBuilder()
        .setColor(anyCreated ? 0x57f287 : 0x5865f2)
        .setTitle(anyCreated ? '🆕 تم إعداد قنوات السجلات' : 'ℹ️ قنوات السجلات معدّة بالفعل')
        .setDescription(
          lines.join('\n') + (allAlreadyExisted ? '\n\n⚠️ تم إعدادها مسبقاً — لن يتم إنشاء قنوات مكررة.' : '')
        );

      return interaction.editReply({ embeds: [embed] });
    },
  },
];
