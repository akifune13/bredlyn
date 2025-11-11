import { getUserProfile } from "../utils/osuApi.js";
import fs from "fs";
import { EmbedBuilder } from "discord.js";
import { buildGradesForDisplay, fmt, safeFixed } from "../utils/gradeEmojis.js";

// Regional indicator emoji for country flag
function toRegionalIndicator(code) {
  if (!code || code.length !== 2) return "";
  const A = 0x1f1e6;
  return String.fromCodePoint(
    code.toUpperCase().charCodeAt(0) - 65 + A,
    code.toUpperCase().charCodeAt(1) - 65 + A
  );
}

function buildProfileEmbed(user, gradeText) {
  const stats = user.statistics || {};
  const country = user.country || {};
  const countryCode = (country.code || "").toUpperCase();
  const flagIcon = countryCode ? `https://osu.ppy.sh/images/flags/${countryCode}.png` : null;

  const titleParts = [
    user.username || "Unknown",
    typeof stats.pp === "number" ? `${safeFixed(stats.pp, 2)}pp` : null,
    stats.global_rank ? `🌍 #${fmt(stats.global_rank)}` : null,
    stats.country_rank ? `${countryCode} #${fmt(stats.country_rank)}` : null
  ].filter(Boolean);

  const embed = new EmbedBuilder()
    .setColor(0x2f3136)
    .setAuthor({ name: titleParts.join(" · "), iconURL: flagIcon || user.avatar_url })
    .setThumbnail(user.avatar_url)
    .setTimestamp();

  const addField = (name, value, inline = true) => {
    if (value && value !== "N/A") embed.addFields({ name, value: String(value), inline });
  };

  addField("Total score", fmt(stats.total_score));
  addField("Ranked score", fmt(stats.ranked_score));
  addField("Level", stats.level?.current?.toFixed(2));
  addField("Accuracy", typeof stats.hit_accuracy === "number" ? `${safeFixed(stats.hit_accuracy, 2)}%` : null);
  addField("Max combo", fmt(stats.maximum_combo));
  addField("Replays watched", fmt(user.replays_watched_count));

  const playcount = stats.play_count;
  const playtimeHrs = stats.play_time ? `${Math.round(stats.play_time / 3600)} hrs` : null;
  const totalHits = stats.total_hits;
  const hitsPerPlay = playcount && totalHits ? (totalHits / playcount).toFixed(2) : null;

  addField("Playcount / Playtime", playcount && playtimeHrs ? `${fmt(playcount)} / ${playtimeHrs}` : null);
  addField("Total hits / Hits per play", totalHits && hitsPerPlay ? `${fmt(totalHits)} / ${hitsPerPlay}` : null);

  if (gradeText && gradeText !== "None") embed.addFields({ name: "Grades", value: gradeText, inline: false });

  const joined = user.joined_at || user.join_date;
  if (joined) embed.setFooter({ text: `Joined ${new Date(joined).toLocaleDateString()}` });

  return embed;
}

export async function execute(interaction, args) {
  const filePath = "./linkedAccounts.json";
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, "{}");
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  const authorId = interaction?.message?.author?.id ?? interaction?.user?.id;
  let username = args.join(" ").trim() || data[authorId];

  if (!username) {
    return interaction.reply?.("❌ Please provide a username or link your account using `!link link <username>`.") ||
           interaction.reply("❌ Please provide a username or link your account using `!link link <username>`.");
  }

  await interaction.deferReply?.();

  try {
    const user = await getUserProfile(username);
    if (!user) return interaction.editReply?.("User not found.") || interaction.reply("User not found.");

    const gradeText = buildGradesForDisplay(user.statistics || {});
    const embed = buildProfileEmbed(user, gradeText);

    if (interaction.editReply) await interaction.editReply({ embeds: [embed] });
    else await interaction.reply({ embeds: [embed] });

  } catch (error) {
    console.error(error);
    if (interaction.editReply) await interaction.editReply("An error occurred while fetching the profile.");
    else await interaction.reply("An error occurred while fetching the profile.");
  }
}
