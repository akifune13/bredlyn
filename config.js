require('dotenv').config();

module.exports = {
  token: process.env.DISCORD_TOKEN,
  osuClientId: process.env.OSU_CLIENT_ID,
  osuClientSecret: process.env.OSU_CLIENT_SECRET,
};
