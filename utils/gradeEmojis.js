import fs from "fs";
import path from "path";

// Load emojis from JSON
const emojisPath = path.join(process.cwd(), "emojis.json");
let gradeEmojis = {};
if (fs.existsSync(emojisPath)) {
  gradeEmojis = JSON.parse(fs.readFileSync(emojisPath, "utf-8"));
} else {
  console.warn("Warning: emojis.json not found. Grades will fallback to text.");
}

// Format numbers with commas
export function fmt(n) {
  if (n === undefined || n === null) return "N/A";
  return n.toLocaleString();
}

// Safe fixed decimal formatting
export function safeFixed(n, d = 2) {
  return typeof n === "number" ? n.toFixed(d) : "N/A";
}

// Build grade text for embed using JSON emojis
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
