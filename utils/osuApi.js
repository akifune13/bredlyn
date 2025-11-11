import * as osu from "osu-api-v2-js";
import dotenv from "dotenv";

dotenv.config();

let api = null;

/**
 * Get or create a single osu! API instance
 */
export async function getApi() {
  if (!api) {
    api = await osu.API.createAsync(
      Number(process.env.OSU_CLIENT_ID),
      process.env.OSU_CLIENT_SECRET
    );
  }
  return api;
}

/**
 * Fetch osu! user profile by username
 * @param {string} username
 * @returns {Promise<Object>} user object
 */
export async function getUserProfile(username) {
  try {
    const api = await getApi();
    return await api.getUser(username);
  } catch (err) {
    console.error(`Error fetching profile for ${username}:`, err);
    throw err;
  }
}

/**
 * Fetch top plays for a user
 * @param {string} username
 * @param {number} limit
 * @returns {Promise<Array>} array of top scores
 */
export async function getUserTopPlays(username, limit = 5) {
  try {
    const api = await getApi();
    const user = await api.getUser(username);
    const scores = await api.getUserScores(
      user,
      "best",
      osu.Ruleset.osu,
      { lazer: false },
      { limit }
    );
    return scores;
  } catch (err) {
    console.error(`Error fetching top plays for ${username}:`, err);
    throw err;
  }
}
