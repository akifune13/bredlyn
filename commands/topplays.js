import { getUserTopPlays } from "../utils/osuApi.js";
import fs from "fs";
import path from "path";

export const name = "topplays";
export const description = "Show a user's top osu! plays or your linked account";

export async function execute(interaction, args) {
  const filePath = path.join("./linkedAccounts.json");
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, "{}");
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  let username = args.join(" ").trim();

  // If no username argument, use linked account
  if (!username) {
    username = data[interaction.message.author.id];
    if (!username) {
      return interaction.reply(
        "❌ Please provide a username or link your account using `!link <username>`."
      );
    }
  }

  await interaction.deferReply?.();

  try {
    const plays = await getUserTopPlays(username, 5);
    if (!plays || plays.length === 0) {
      return interaction.editReply?.("No top plays found.") || interaction.reply("No top plays found.");
    }

    const formatted = plays
      .map((score, i) => {
        const map = score.beatmapset;
        const diff = score.beatmap;
        return `${i + 1}. ${map.artist} - ${map.title} [${diff.version}] (${score.pp.toFixed(2)}pp)`;
      })
      .join("\n");

    await interaction.editReply?.(`**${username}’s Top 5 Plays:**\n${formatted}`) 
      || interaction.reply(`**${username}’s Top 5 Plays:**\n${formatted}`);
  } catch (error) {
    console.error(error);
    interaction.editReply?.("Error fetching top plays.") || interaction.reply("Error fetching top plays.");
  }
}
