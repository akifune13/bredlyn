// embedBuilder.js
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { buildModString } from "./osuUtils.js";
import { fmt, safeFixed, emojiForKey } from "./gradeEmojis.js";
import { getApi } from "./osuApi.js";

/**
 * Map osu! score rank string from API to grade key in your JSON
 */
function getGradeKey(score) {
  const rank = score.rank ?? score.grade ?? null;
  switch ((rank ?? "").toUpperCase()) {
    case "XH" : return "ssh";
    case "SH": return "sh";
    case "X": return "x";
    case "S": return "s";
    case "A": return "a";
    case "B": return "b";
    case "C": return "c";
    case "D": return "d";
    default: return null;
  }
}

/**
 * Cache for star ratings to avoid repeated API calls
 */
const starRatingCache = new Map();

/**
 * Get mod-adjusted star rating for a score
 * Uses the osu! API to calculate difficulty with mods applied
 */
async function getModAdjustedStarRating(score) {
  try {
    const diff = score.beatmap ?? {};
    const baseSR = diff?.difficulty_rating ?? null;
    const mods = score.mods || [];
    
    console.log(`[SR] Processing beatmap ${diff.id}, mods: ${mods.map(m => m.acronym).join("") || "NoMod"}`);
    
    // If no mods, just return base SR
    if (mods.length === 0) {
      console.log(`[SR] No mods, returning base SR: ${baseSR}`);
      return baseSR;
    }
    
    // Create cache key from beatmap ID and mods
    const modAcronyms = mods.map(m => m.acronym || m).sort().join("");
    const cacheKey = `${diff.id}-${modAcronyms}`;
    
    // Check cache first
    if (starRatingCache.has(cacheKey)) {
      const cached = starRatingCache.get(cacheKey);
      console.log(`[SR] Cache hit for ${cacheKey}: ${cached}`);
      return cached;
    }
    
    console.log(`[SR] Cache miss, fetching from API for ${cacheKey}...`);
    
    // Fetch mod-adjusted difficulty attributes using the official method
    const api = await getApi();
    const attributes = await api.getBeatmapDifficultyAttributesOsu(
      score.beatmap,
      score.mods
    );
    
    const adjustedSR = attributes?.star_rating ?? baseSR;
    console.log(`[SR] API returned: ${adjustedSR}`);
    
    // Cache the result
    starRatingCache.set(cacheKey, adjustedSR);
    
    return adjustedSR;
  } catch (error) {
    console.error(`[SR] Error fetching mod-adjusted SR:`, error);
    console.error(`[SR] Error stack:`, error.stack);
    // Fallback to base SR if API call fails
    return score.beatmap?.difficulty_rating ?? null;
  }
}

/**
 * Build a single play block for the embed description
 * Assumes score.parsed_timestamp (unix seconds) was populated by getUserTopPlays
 */
async function formatPlayBlock(score, idx, startIndex = 0) {
  console.log(`[FORMAT] Starting format for play #${idx + startIndex + 1}`);
  
  const map = score.beatmapset ?? score.beatmap ?? {};
  const diff = score.beatmap ?? {};

  // --- Mods ---
  const mods = buildModString(score);
  console.log(`[FORMAT] Mods string: ${mods}`);

  // --- Difficulty (Mod-adjusted via API) ---
  const starRating = await getModAdjustedStarRating(score);
  const difficultyText = starRating ? ` [${Number(starRating).toFixed(2)}★]` : "";
  console.log(`[FORMAT] Star rating: ${starRating}, text: ${difficultyText}`);

  // --- PP ---
  const ppRaw = score.pp ?? score.pp_raw ?? score.pp_amount ?? score.pp_value ?? null;
  const pp = ppRaw !== null ? `**${Number(ppRaw).toFixed(2)}pp**` : "N/A";

  // --- Accuracy ---
  let acc = null;
  if (typeof score.accuracy === "number") acc = score.accuracy * 100;
  else if (typeof score.accuracy === "string" && !isNaN(Number(score.accuracy))) acc = Number(score.accuracy) * 100;
  const accText = acc !== null ? `${acc.toFixed(2)}%` : "N/A";

  // --- Combo ---
  const combo = score.max_combo ?? score.maxcombo ?? score.combo ?? "x?";
  const maxCombo = diff?.max_combo ?? diff?.maxcombo ?? null;
  const comboText = maxCombo ? `x${combo}/${maxCombo}` : `x${combo}`;

  // --- Date ---
  const timestamp = score.parsed_timestamp; // unix seconds
  const fullDate = Number.isInteger(timestamp) ? `<t:${timestamp}:R>` : "Unknown";

  // --- Beatmap title ---
  const mapTitle = map.title ?? score?.beatmap?.title ?? score?.beatmapset?.title ?? "Unknown title";
  const mapId = score.normalized_map_id ?? map.id ?? map.beatmapset_id ?? map.beatmapset?.id ?? diff?.beatmapset_id ?? null;
  const mapUrl = mapId ? `https://osu.ppy.sh/beatmapsets/${mapId}` : null;

  const title = diff?.version
    ? mapUrl
      ? `**[${mapTitle} [${diff.version}]](${mapUrl})**`
      : `**${mapTitle} [${diff.version}]**`
    : mapUrl
      ? `**[${mapTitle}](${mapUrl})**`
      : `**${mapTitle}**`;

  // --- Grade emoji ---
  const gradeKey = getGradeKey(score);
  const gradeEmoji = emojiForKey(gradeKey) ?? gradeKey?.toUpperCase() ?? "N/A";

  // --- Build play block ---
  const result = `**${idx + startIndex + 1}.** ${title}${mods}${difficultyText}\n` +
         `${gradeEmoji} • ${pp} • 🎯 ${accText} • ${comboText} • ⏰ ${fullDate}`;
  
  console.log(`[FORMAT] Finished play #${idx + startIndex + 1}`);
  return result;
}

export async function buildEmbed(userOrUsername, profile, plays, page = 0, pageSize = 5, fmtFn = fmt) {
  console.log(`[EMBED] Starting buildEmbed - page ${page}, pageSize ${pageSize}`);
  console.log(`[EMBED] Total plays: ${plays.length}`);
  
  const start = page * pageSize;
  const slice = plays.slice(start, start + pageSize);
  console.log(`[EMBED] Sliced plays: ${slice.length} (from ${start} to ${start + pageSize})`);

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

  console.log(`[EMBED] Creating embed for user: ${username}`);

  const embed = new EmbedBuilder()
    .setColor(0x2f3136)
    .setAuthor({ name: titleParts.join(" · "), iconURL: flagIcon })
    .setThumbnail(profile?.avatar_url)
    .setTimestamp();

  // Format all plays with mod-adjusted star ratings (async operations with timeout)
  console.log(`[EMBED] Starting to format plays...`);
  try {
    const startTime = Date.now();
    const formattedPlays = await Promise.race([
      Promise.all(slice.map((s, i) => formatPlayBlock(s, i, start))),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout after 8s")), 8000))
    ]);
    const elapsed = Date.now() - startTime;
    console.log(`[EMBED] Successfully formatted all plays in ${elapsed}ms`);
    
    const description = formattedPlays.join("\n\n");
    embed.setDescription(description);
    console.log(`[EMBED] Description length: ${description.length} characters`);
  } catch (error) {
    console.error(`[EMBED] Error or timeout while formatting plays:`, error.message);
    console.error(`[EMBED] Full error:`, error);
    
    // Fallback: format without async (shows base SR only)
    console.log(`[EMBED] Using fallback formatting (base SR only)`);
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
    console.log(`[EMBED] Fallback description created`);
  }
  
  embed.setFooter({ text: `osu!top plays • Page ${page + 1}/${Math.ceil(plays.length / pageSize)}` });

  console.log(`[EMBED] Embed complete, returning...`);
  return embed;
}

export function createNavButtons(page, totalPages) {
  const row = new ActionRowBuilder().addComponents(
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
  return row;
}

export function formatBigNumber(n) {
  if (n === undefined || n === null || Number.isNaN(Number(n))) return "N/A";
  n = Number(n);
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return `${n}`;
}