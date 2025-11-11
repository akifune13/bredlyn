import { getUserProfile } from "../utils/osuApi.js";
import fs from "fs";
import path from "path";

export const name = "profile";
export const description = "View an osu! player’s profile or your linked account";

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
        "❌ Please provide a username or link your account using `!link link <username>`."
      );
    }
  }

  await interaction.deferReply?.();

  try {
    const user = await getUserProfile(username);
    if (!user) {
      return interaction.editReply?.("User not found.") || interaction.reply("User not found.");
    }

    const replyMessage = `**${user.username}** (${user.id})\nRank: #${user.statistics.global_rank}\nPP: ${user.statistics.pp.toFixed(2)}\nAccuracy: ${user.statistics.hit_accuracy.toFixed(2)}%`;

    await interaction.editReply?.(replyMessage) || interaction.reply(replyMessage);
  } catch (error) {
    console.error(error);
    interaction.editReply?.("An error occurred while fetching the profile.") || interaction.reply("An error occurred while fetching the profile.");
  }
}
