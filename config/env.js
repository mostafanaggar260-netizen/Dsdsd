// Loads and validates all environment variables in one place.
require('dotenv').config();

const env = {
  TOKEN: process.env.DISCORD_TOKEN,
  WELCOME_CHANNEL_ID: process.env.WELCOME_CHANNEL_ID,
  RULES_CHANNEL_ID: process.env.RULES_CHANNEL_ID,
  REACTION_ROLE_CHANNEL_ID: process.env.REACTION_ROLE_CHANNEL_ID,
  COMMUNITY_ROLE_ID: process.env.COMMUNITY_ROLE_ID,
  TIKTOK_ROLE_ID: process.env.TIKTOK_ROLE_ID,
  YOUTUBE_ROLE_ID: process.env.YOUTUBE_ROLE_ID,
  OWNER_ID: process.env.OWNER_ID,

  TICKET_SUPPORT_ROLE_ID: process.env.TICKET_SUPPORT_ROLE_ID,
  SUPPORT_CATEGORY_ID: process.env.SUPPORT_CATEGORY_ID,
  APPLY_CATEGORY_ID: process.env.APPLY_CATEGORY_ID,
  TICKET_CATEGORY_ID: process.env.TICKET_CATEGORY_ID,

  LOG_MODERATION_CHANNEL_ID: process.env.LOG_MODERATION_CHANNEL_ID,
  LOG_MESSAGE_CHANNEL_ID: process.env.LOG_MESSAGE_CHANNEL_ID,
  LOG_MEMBER_CHANNEL_ID: process.env.LOG_MEMBER_CHANNEL_ID,
  LOG_CHANNEL_ROLE_CHANNEL_ID: process.env.LOG_CHANNEL_ROLE_CHANNEL_ID,
  LOG_TICKET_CHANNEL_ID: process.env.LOG_TICKET_CHANNEL_ID,
  LOG_VOICE_CHANNEL_ID: process.env.LOG_VOICE_CHANNEL_ID,

  SERVER_BRAND_NAME: process.env.SERVER_BRAND_NAME || 'ازيكس',
};

if (!env.TOKEN || !env.WELCOME_CHANNEL_ID) {
  console.error('❌ Missing DISCORD_TOKEN or WELCOME_CHANNEL_ID in your .env file.');
  process.exit(1);
}

module.exports = env;
