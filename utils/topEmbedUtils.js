// embedBuilder.js
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { buildModString } from "./osuUtils.js";
import { getGradeKey, emojiForKey, fmt, safeFixed } from "./gradeUtils.js";
import { getApi } from "./osuApi.js";

/**
 * Cache for star ratings to avoid repeated API calls
 */
const starRatingCache = new Map();

/**
 * Get mod-adjusted star rating for a score
 */
async function getModAdjustedStarRating(score) {
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
 * Build a single play block for the embed description
 */
async function formatPlayBlock(score, idx, startIndex = 0) {
  const map = score.beatmapset ?? score.beatmap ?? {};
  const diff = score.beatmap ?? {};

  const mods = buildModString(score);
  const starRating = await getModAdjustedStarRating(score);
  const difficultyText = starRating ? ` [${Number(starRating).toFixed(2)}★]` : "";

  const ppRaw = score.pp ?? score.pp_raw ?? score.pp_amount ?? score.pp_value ?? null;
  const pp = ppRaw !== null ? `**${Number(ppRaw).toFixed(2)}pp**` : "N/A";

  let acc = null;
  if (typeof score.accuracy === "number") acc = score.accuracy * 100;
  else if (typeof score.accuracy === "string" && !isNaN(Number(score.accuracy))) acc = Number(score.accuracy) * 100;
  const accText = acc !== null ? `${acc.toFixed(2)}%` : "N/A";

  const combo = score.max_combo ?? score.maxcombo ?? score.combo ?? "x?";
  const maxCombo = diff?.max_combo ?? diff?.maxcombo ?? null;
  const comboText = maxCombo ? `x${combo}/${maxCombo}` : `x${combo}`;

  const timestamp = score.parsed_timestamp;
  const fullDate = Number.isInteger(timestamp) ? `<t:${timestamp}:R>` : "Unknown";

  const mapTitle = map.title ?? score?.beatmap?.title ?? score?.beatmapset?.title ?? "Unknown title";
  const mapId = score.normalized_map_id ?? map.id ?? map.beatmapset_id ?? map.beatmapset?.id ?? diff?.beatmapset_id ?? null;
  const mapUrl = mapId ? `https://osu.ppy.sh/beatmapsets/${mapId}` : null;

  const title = diff?.version
    ? mapUrl ? `**[${mapTitle} [${diff.version}]](${mapUrl})**` : `**${mapTitle} [${diff.version}]**`
    : mapUrl ? `**[${mapTitle}](${mapUrl})**` : `**${mapTitle}**`;

  const gradeKey = getGradeKey(score);
  const gradeEmoji = emojiForKey(gradeKey) ?? gradeKey?.toUpperCase() ?? "N/A";

  return `**${idx + startIndex + 1}.** ${title}${mods}${difficultyText}\n` +
         `${gradeEmoji} • ${pp} • 🎯 ${accText} • ${comboText} • ⏰ ${fullDate}`;
}

export async function buildEmbed(userOrUsername, profile, plays, page = 0, pageSize = 5, fmtFn = fmt) {
  const start = page * pageSize;
  const slice = plays.slice(start, start + pageSize);

  const stats = profile?.statistics ?? profile?.stats ?? {};
  const countryCode = profile?.country?.code ?? null;
  const flagIcon = countryCode ? `https://osu.ppy.sh/images/flags/${countryCode.toUpperCase()}.png` : null;

  const username = typeof userOrUsername === "string"
    ? userOrUsername
    : userOrUsername?.username ?? "Unknown";

  const titleParts = [
    username,
    typeof stats.pp === "number" ? `${safeFixed(stats.pp, 2)}pp` : null,
    stats.global_rank ? `🌍 #${fmtFn(stats.global_rank)}` : null,
    stats.country_rank && countryCode ? `${countryCode.toUpperCase()} #${fmtFn(stats.country_rank)}` : null
  ].filter(Boolean);

  const embed = new EmbedBuilder()
    .setColor(0x2f3136)
    .setAuthor({ name: titleParts.join(" · "), iconURL: flagIcon })
    .setThumbnail(profile?.avatar_url)
    .setTimestamp();

  try {
    const formattedPlays = await Promise.race([
      Promise.all(slice.map((s, i) => formatPlayBlock(s, i, start))),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout after 8s")), 8000))
    ]);
    embed.setDescription(formattedPlays.join("\n\n"));
  } catch {
    // Fallback: format without async (shows base SR only)
    const fallbackPlays = slice.map((s, i) => {
      const map = s.beatmapset ?? s.beatmap ?? {};
      const diff = s.beatmap ?? {};
      const mods = buildModString(s);
      const baseSR = diff?.difficulty_rating ?? null;
      const srText = baseSR ? ` [${Number(baseSR).toFixed(2)}★]` : "";
      const pp = s.pp ? `**${Number(s.pp).toFixed(2)}pp**` : "N/A";
      const acc = s.accuracy ? `${(s.accuracy * 100).toFixed(2)}%` : "N/A";
      const combo = s.max_combo ?? "x?";
      const maxCombo = diff?.max_combo ?? null;
      const comboText = maxCombo ? `x${combo}/${maxCombo}` : `x${combo}`;
      const timestamp = s.parsed_timestamp;
      const fullDate = Number.isInteger(timestamp) ? `<t:${timestamp}:R>` : "Unknown";
      const mapTitle = map.title ?? "Unknown";
      const mapId = s.normalized_map_id ?? map.id ?? null;
      const mapUrl = mapId ? `https://osu.ppy.sh/beatmapsets/${mapId}` : null;
      const title = diff?.version
        ? mapUrl ? `**[${mapTitle} [${diff.version}]](${mapUrl})**` : `**${mapTitle} [${diff.version}]**`
        : mapUrl ? `**[${mapTitle}](${mapUrl})**` : `**${mapTitle}**`;
      const gradeKey = getGradeKey(s);
      const gradeEmoji = emojiForKey(gradeKey) ?? gradeKey?.toUpperCase() ?? "N/A";

      return `**${i + start + 1}.** ${title}${mods}${srText}\n${gradeEmoji} • ${pp} • 🎯 ${acc} • ${comboText} • ⏰ ${fullDate}`;
    });
    embed.setDescription(fallbackPlays.join("\n\n"));
  }

  embed.setFooter({ text: `osu!top plays • Page ${page + 1}/${Math.ceil(plays.length / pageSize)}` });
  return embed;
}

export function createNavButtons(page, totalPages) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('prev')
      .setLabel('◀️')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId('next')
      .setLabel('▶️')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page >= totalPages - 1)
  );
}
