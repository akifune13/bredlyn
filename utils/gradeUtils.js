// utils/gradeEmojis.js
import fs from "fs";
import path from "path";

// Load emojis from JSON (ignored by git if you put it in .gitignore)
const emojisPath = path.join(process.cwd(), "emojis.json");
export let gradeEmojis = {};
if (fs.existsSync(emojisPath)) {
  try {
    gradeEmojis = JSON.parse(fs.readFileSync(emojisPath, "utf-8"));
  } catch (err) {
    console.warn("Failed to parse emojis.json:", err);
    gradeEmojis = {};
  }
} else {
  console.warn("Warning: emojis.json not found. Grades will fallback to text.");
}

// Format numbers with commas
export function fmt(n) {
  if (n === undefined || n === null) return "N/A";
  if (typeof n === "number") return n.toLocaleString();
  const num = Number(n);
  return Number.isNaN(num) ? String(n) : num.toLocaleString();
}

// Safe fixed decimal formatting
export function safeFixed(n, d = 2) {
  return typeof n === "number" ? n.toFixed(d) : (Number(n) ? Number(n).toFixed(d) : "N/A");
}

// Build a small helper to get single emoji by key (ssh, ss, sh, s, a, b, ...)
export function emojiForKey(key) {
  if (!key) return null;
  return gradeEmojis[key] ?? null;
}

// Map osu! score rank string from API to grade key
export function getGradeKey(score) {
  const rank = score.rank ?? score.grade ?? null;
  switch ((rank ?? "").toUpperCase()) {
    case "XH": return "ssh";
    case "SH": return "sh";
    case "X":  return "x";
    case "S":  return "s";
    case "A":  return "a";
    case "B":  return "b";
    case "C":  return "c";
    case "D":  return "d";
    default:   return null;
  }
}

// Build grade text for embed using JSON emojis (keeps old usage compatibility)
export function buildGradesForDisplay(stats = {}) {
  const sssh = stats.grade_counts?.ssh ?? stats.counts?.ss_h ?? 0;
  const ss   = stats.grade_counts?.ss  ?? stats.counts?.ss   ?? 0;
  const sh   = stats.grade_counts?.sh  ?? stats.counts?.s_h  ?? 0;
  const s    = stats.grade_counts?.s   ?? stats.counts?.s    ?? 0;
  const a    = stats.grade_counts?.a   ?? stats.counts?.a    ?? 0;

  const order = [
    { key: "ssh", count: sssh },
    { key: "ss",  count: ss   },
    { key: "sh",  count: sh   },
    { key: "s",   count: s    },
    { key: "a",   count: a    }
  ];

  const parts = [];
  for (const e of order) {
    if (!e.count) continue;
    const em = gradeEmojis[e.key];
    if (em) parts.push(`${em} **${fmt(e.count)}**`);
    else parts.push(`${e.key.toUpperCase()} **${fmt(e.count)}**`);
  }

  return parts.length ? parts.join(" • ") : "None";
}
