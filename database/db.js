// Tiny JSON-file database. No native modules to compile, so it works on
// any free host (Orihost included) with nothing extra to install.
// Everything is stored under /data as plain .json files.
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function loadJSON(fileName, fallback) {
  const filePath = path.join(DATA_DIR, fileName);
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`⚠️ Failed to read ${fileName}, using fallback data.`, err);
    return fallback;
  }
}

function saveJSON(fileName, data) {
  const filePath = path.join(DATA_DIR, fileName);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

module.exports = { DATA_DIR, loadJSON, saveJSON };
