// Persistent settings for the stage-event feature: which role counts as
// "فريق الفعاليات" (event staff — gets access to the control panel buttons),
// which role gets handed out to people who join the event ("فعاليه"), and
// an optional custom separator image (downloaded once and kept locally so
// it can be re-sent as a plain image every round, not a link/embed).
const { loadJSON, saveJSON } = require('./db');

const FILE = 'eventSettings.json';

function emptySettings() {
  return {
    teamRoleId: null,
    participantRoleId: null,
    separatorImagePath: null, // local file path under /data
  };
}

function getSettings() {
  return loadJSON(FILE, emptySettings());
}

function saveSettings(settings) {
  saveJSON(FILE, settings);
  return settings;
}

function setTeamRole(roleId) {
  const settings = getSettings();
  settings.teamRoleId = roleId;
  return saveSettings(settings);
}

function setParticipantRole(roleId) {
  const settings = getSettings();
  settings.participantRoleId = roleId;
  return saveSettings(settings);
}

function setSeparatorImagePath(filePath) {
  const settings = getSettings();
  settings.separatorImagePath = filePath;
  return saveSettings(settings);
}

module.exports = { getSettings, setTeamRole, setParticipantRole, setSeparatorImagePath };
