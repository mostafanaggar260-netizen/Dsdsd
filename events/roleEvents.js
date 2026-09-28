const { Events, AuditLogEvent } = require('discord.js');
const {
  logRoleCreate,
  logRoleDelete,
  logRoleUpdate,
  logMemberRoleAdd,
  logMemberRoleRemove,
} = require('../handlers/logs');

module.exports = function registerRoleEvents(client) {
  client.on(Events.GuildRoleCreate, async (role) => {
    await logRoleCreate(client, role);
  });

  client.on(Events.GuildRoleDelete, async (role) => {
    await logRoleDelete(client, role);
  });

  client.on(Events.GuildRoleUpdate, async (oldRole, newRole) => {
    await logRoleUpdate(client, oldRole, newRole);
  });

  // This is about a MEMBER gaining/losing a role (not the role itself
  // being created/edited/deleted, which is handled above). Diff the two
  // role lists, then check the audit log to find who actually did it.
  client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    const oldRoles = oldMember.roles.cache;
    const newRoles = newMember.roles.cache;

    const added = newRoles.filter((r) => !oldRoles.has(r.id));
    const removed = oldRoles.filter((r) => !newRoles.has(r.id));
    if (added.size === 0 && removed.size === 0) return;

    console.log(
      `🎭 Role diff for ${newMember.user.tag}: +${added.size} added, -${removed.size} removed` +
        (added.size ? ` [added: ${added.map((r) => r.name).join(', ')}]` : '') +
        (removed.size ? ` [removed: ${removed.map((r) => r.name).join(', ')}]` : '')
    );

    let executor = null;
    try {
      const auditLogs = await newMember.guild.fetchAuditLogs({
        type: AuditLogEvent.MemberRoleUpdate,
        limit: 5,
      });
      const entry = auditLogs.entries.find(
        (e) => e.target?.id === newMember.id && Date.now() - e.createdTimestamp < 10000
      );
      executor = entry?.executor ?? null;
    } catch (err) {
      console.error('Failed to fetch audit logs for role update:', err);
    }

    for (const role of added.values()) {
      await logMemberRoleAdd(client, newMember, role, executor);
    }
    for (const role of removed.values()) {
      await logMemberRoleRemove(client, newMember, role, executor);
    }
  });
};
