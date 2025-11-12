import fs from "fs";
import { getUserProfile } from "../utils/osuApi.js";
import { buildGradesForDisplay } from "../utils/gradeUtils.js";
import { buildProfileEmbed } from "../utils/profileEmbedUtils.js";

export const name = "profile";
export const description = "Show a user's osu! profile";

export async function execute(interaction, args) {
  const filePath = "./linkedAccounts.json";
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, "{}");
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  const authorId = interaction?.message?.author?.id ?? interaction?.user?.id;
  let username = args.join(" ").trim() || data[authorId];

  if (!username) {
    return interaction.reply?.(
      "❌ Please provide a username or link your account using `!link link <username>`."
    ) || interaction.reply(
      "❌ Please provide a username or link your account using `!link link <username>`."
    );
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
