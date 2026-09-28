const { loadJSON, saveJSON } = require('./db');
const FILE = 'eventSettings.json';

function emptySettings() { return { teamRoleId: null, participantRoleId: null, separatorImagePath: null }; }

async function getSettings() { return await loadJSON(FILE, emptySettings()); }
async function saveSettings(settings) { await saveJSON(FILE, settings); return settings; }

async function setTeamRole(roleId) { const settings = await getSettings(); settings.teamRoleId = roleId; return await saveSettings(settings); }
async function setParticipantRole(roleId) { const settings = await getSettings(); settings.participantRoleId = roleId; return await saveSettings(settings); }
async function setSeparatorImagePath(filePath) { const settings = await getSettings(); settings.separatorImagePath = filePath; return await saveSettings(settings); }

module.exports = { getSettings, setTeamRole, setParticipantRole, setSeparatorImagePath };
