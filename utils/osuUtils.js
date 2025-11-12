import { gradeEmojis, emojiForKey } from "./gradeEmojis.js";

// Hitcounts & accuracy
export function getHitCounts(score) {
  const counts = score.statistics ?? score.counts ?? score;
  return {
    c300: Number(counts?.count_300 ?? counts?.count300 ?? counts?.geki ?? 0),
    c100: Number(counts?.count_100 ?? counts?.count100 ?? counts?.katu ?? 0),
    c50: Number(counts?.count_50 ?? counts?.count50 ?? 0),
    cmiss: Number(counts?.count_miss ?? counts?.countmiss ?? counts?.miss ?? 0)
  };
}

export function getAccuracy(score) {
  if (!score) return null;
  if (typeof score.accuracy === "number") return score.accuracy * 100;
  if (typeof score.accuracy === "string" && score.accuracy.includes(".")) return Number(score.accuracy) * 100;
  const { c300, c100, c50, cmiss } = getHitCounts(score);
  const totalHits = c300 + c100 + c50 + cmiss;
  if (!totalHits) return null;
  return ((c300*300 + c100*100 + c50*50) / (totalHits*300)) * 100;
}

// Mods parser
export function buildModString(score) {
  if (!score) return "";

  let mods = score.mods ?? score.modifiers ?? score.mod ?? score.mod_list ?? score.modArray ?? null;

  if (typeof mods === "string") {
    const cleaned = mods.replace(/\s+/g, "");
    return cleaned ? ` +${cleaned}` : "";
  }

  if (Array.isArray(mods)) {
    const parts = mods.map(m => {
      if (!m) return null;
      if (typeof m === "string") return m.replace(/\s+/g, "");
      if (typeof m === "number") return String(m);
      if (typeof m === "object") return m.acronym ?? m.code ?? m.name ?? String(m);
      return String(m);
    }).filter(Boolean);
    return parts.length ? ` +${parts.join("")}` : "";
  }

  if (typeof mods === "object") {
    const boolKeys = Object.keys(mods).filter(k => mods[k] === true || mods[k] === 1);
    if (boolKeys.length) return ` +${boolKeys.join("")}`;

    const arr = mods.acronyms ?? mods.list ?? mods.mods ?? mods.values;
    if (Array.isArray(arr)) {
      const parts = arr.map(x => (typeof x === "string" ? x : x?.acronym ?? x?.code ?? x?.name ?? String(x))).filter(Boolean);
      return parts.length ? ` +${parts.join("")}` : "";
    }
  }

  return "";
}

// Grades
export function getGradeKeyFromRank(rank) {
  if (!rank) return null;
  const r = String(rank).toUpperCase();
  if (["XH","SSH","SS+"].includes(r)) return "ssh";
  if (["X","SS"].includes(r)) return "ss";
  if (["SH","S+"].includes(r)) return "sh";
  if (r==="S") return "s";
  if (r==="A") return "a";
  if (r==="B") return "b";
  if (r==="C") return "c";
  if (r==="D") return "d";
  if (r==="F") return "f";
  return null;
}

export function gradeEmojiForScore(score) {
  const rawRank = score.rank ?? score.grade ?? score.rank_old ?? score?.rank_id;
  const key = getGradeKeyFromRank(rawRank);
  if (!key) return `**${rawRank ?? "?"}**`;
  return emojiForKey(key) ?? gradeEmojis[key] ?? `**${rawRank ?? key.toUpperCase()}**`;
}

// Format a single play block
export function formatPlayBlock(score, idx, startIndex = 0, fmt, timeAgo) {
  const map = score.beatmapset ?? score.beatmapset;
  const diff = score.beatmap ?? score.beatmap;
  const artist = map?.artist ?? map?.metadata?.artist ?? "Unknown artist";
  const title = map?.title ?? map?.metadata?.title ?? "Unknown title";
  const version = diff?.version ?? diff?.difficulty ?? "";
  const difficulty = diff?.difficulty_rating ?? diff?.difficultyrating ?? diff?.rating ?? null;

  const rankEmoji = gradeEmojiForScore(score);
  const mods = buildModString(score);
  const difficultyText = difficulty ? ` [${Number(difficulty).toFixed(2)}★]` : "";

  const beatmapsetId = map?.id ?? map?.beatmapset_id ?? map?.beatmapsetId;
  const beatmapId = diff?.id ?? diff?.beatmap_id ?? diff?.beatmapId;
  const beatmapUrl = beatmapsetId ? `https://osu.ppy.sh/beatmapsets/${beatmapsetId}${beatmapId ? `#osu/${beatmapId}` : ""}` : "";

  const line1 = `${startIndex + idx + 1}. ${rankEmoji} ${beatmapUrl ? `[${title}${version ? ` [${version}]` : ""}](${beatmapUrl})` : `${artist} - ${title}${version ? ` [${version}]` : ""}`}${mods}${difficultyText}`;

  const playCount = map?.play_count ?? map?.playcount ?? null;
  const playCountText = playCount ? fmt(playCount) : "N/A";
  const acc = getAccuracy(score);
  const accText = typeof acc === "number" ? `${acc.toFixed(2)}%` : "N/A";
  const ppRaw = score.pp ?? score.pp_raw ?? score.pp_amount ?? score.pp_value ?? null;
  const ppVal = ppRaw != null ? (Number(ppRaw)?Number(ppRaw).toFixed(2)+"pp":String(ppRaw)) : "N/A";

  const line2 = `${playCountText} • ${accText} • ${ppVal}`;

  const combo = score.max_combo ?? score.maxcombo ?? score.combo ?? "x?";
  const maxCombo = diff?.max_combo ?? diff?.maxcombo ?? null;
  const comboText = maxCombo ? `x${combo}/${maxCombo}` : `x${combo}`;

  const counts = getHitCounts(score);
  const countsText = `[${fmt(counts.c300)} • ${fmt(counts.c100)} • ${fmt(counts.c50)} • ${fmt(counts.cmiss)}]`;

  const when = score.created_at ?? score.date ?? score.time ?? score.played_at ?? null;
  const timeText = timeAgo(when);

  const line3 = `${comboText} • ${countsText} • ${timeText}`;
  return `${line1}\n${line2}\n${line3}`;
}
