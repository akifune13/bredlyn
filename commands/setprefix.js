import fs from "fs";
import path from "path";

export const name = "setprefix";
export const description = "Change the bot's command prefix";

export async function execute(interaction, args) {
  const newPrefix = args.join(" ").trim();

  // Validation
  if (!newPrefix) {
    return interaction.reply("❌ Please provide a new prefix.");
  }
  if (newPrefix.length > 5) {
    return interaction.reply("❌ Prefix is too long. Please use 5 characters or less.");
  }
  if (/\s/.test(newPrefix)) {
    return interaction.reply("❌ Prefix cannot contain spaces.");
  }

  // Update in-memory prefix
  interaction.client.prefix = newPrefix;

  // Update config.json on disk
  const configPath = path.join("./config.json");
  const configFile = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  configFile.defaultPrefix = newPrefix;
  fs.writeFileSync(configPath, JSON.stringify(configFile, null, 2));

  interaction.reply(`✅ Prefix updated to \`${newPrefix}\``);
}
