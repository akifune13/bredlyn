// utils/srCalcUtils.js
import { getApi } from "./osuApi.js";

/**
 * Cache for star ratings to avoid repeated API calls
 * Key format: "<beatmapId>-<modsString>"
 */
const starRatingCache = new Map();

/**
 * Get mod-adjusted star rating for a score
 * @param {object} score - osu! score object with beatmap and mods info
 * @returns {Promise<number|null>}
 */
export async function getModAdjustedStarRating(score) {
  try {
    const diff = score.beatmap ?? {};
    const baseSR = diff?.difficulty_rating ?? null;
    const mods = score.mods || [];

    // If no mods, just return base SR
    if (mods.length === 0) return baseSR;

    // Create cache key from beatmap ID and mods
    const modAcronyms = mods.map(m => m.acronym || m).sort().join("");
    const cacheKey = `${diff.id}-${modAcronyms}`;

    // Check cache first
    if (starRatingCache.has(cacheKey)) return starRatingCache.get(cacheKey);

    // Fetch mod-adjusted difficulty attributes
    const api = await getApi();
    const attributes = await api.getBeatmapDifficultyAttributesOsu(score.beatmap, score.mods);
    const adjustedSR = attributes?.star_rating ?? baseSR;

    // Cache the result
    starRatingCache.set(cacheKey, adjustedSR);

    return adjustedSR;
  } catch (error) {
    // Fallback to base SR if API call fails
    return score.beatmap?.difficulty_rating ?? null;
  }
}

/**
 * Optional: clear the SR cache (for debugging or force refresh)
 */
export function clearStarRatingCache() {
  starRatingCache.clear();
}
