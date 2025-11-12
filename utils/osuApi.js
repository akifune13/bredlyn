// osuApi.js
import * as osu from "osu-api-v2-js";
import dotenv from "dotenv";

dotenv.config();

let api = null;
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
 * Parse ONLY the ended_at field into unix seconds (or null).
 * - If ended_at is an ISO string => Date.parse -> milliseconds -> /1000
 * - If it's a numeric epoch (rare) we handle seconds vs ms safely.
 */
export function parseEndedAtToUnixSeconds(score) {
  if (!score || !score.ended_at) return null;
  const ms = Date.parse(score.ended_at); // Date.parse returns milliseconds
  if (isNaN(ms)) return null;
  return Math.floor(ms / 1000); // <- integer seconds
}


/* ---------- API fetch + normalization ---------- */

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
 * Fetch top plays for a user and attach parsed_timestamp (based only on ended_at)
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

    const normalized = scores.map((s) => {
      const parsedTs = parseEndedAtToUnixSeconds(s); // seconds
      const mapId = s.beatmapset?.id
        ?? s.beatmapset_id
        ?? s.beatmap?.beatmapset_id
        ?? s.beatmap?.set_id
        ?? null;

      return {
        ...s,
        parsed_timestamp: parsedTs,
        normalized_map_id: mapId
      };
    });


    return normalized;
  } catch (err) {
    console.error(`Error fetching top plays for ${username}:`, err);
    throw err;
  }
}
