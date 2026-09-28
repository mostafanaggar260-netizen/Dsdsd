// Creates one .txt log file per ticket under data/transcripts/<channelId>.txt.
// Every message sent in a ticket channel gets appended to that file, so
// when the ticket closes you have a full written record of what happened.
const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('../database/db');

const TRANSCRIPT_DIR = path.join(DATA_DIR, 'transcripts');
if (!fs.existsSync(TRANSCRIPT_DIR)) fs.mkdirSync(TRANSCRIPT_DIR, { recursive: true });

function transcriptPath(channelId) {
  return path.join(TRANSCRIPT_DIR, `${channelId}.txt`);
}

function startTranscript(channelId, header) {
  fs.writeFileSync(transcriptPath(channelId), `${header}\n${'='.repeat(60)}\n\n`);
}

function appendMessage(channelId, { authorTag, content, attachments = [] }) {
  const filePath = transcriptPath(channelId);
  if (!fs.existsSync(filePath)) return;
  const time = new Date().toLocaleString('en-GB');
  let line = `[${time}] ${authorTag}: ${content || ''}`;
  if (attachments.length) {
    line += `\n  📎 Attachments: ${attachments.join(', ')}`;
  }
  fs.appendFileSync(filePath, line + '\n');
}

function appendSystemLine(channelId, text) {
  const filePath = transcriptPath(channelId);
  if (!fs.existsSync(filePath)) return;
  const time = new Date().toLocaleString('en-GB');
  fs.appendFileSync(filePath, `[${time}] *** ${text} ***\n`);
}

function getTranscriptFile(channelId) {
  const filePath = transcriptPath(channelId);
  return fs.existsSync(filePath) ? filePath : null;
}

module.exports = { startTranscript, appendMessage, appendSystemLine, getTranscriptFile, transcriptPath };
