import fs from "fs";
import path from "path";

export const name = "link";
export const description = "Link your osu! account";

export async function execute(interaction, args) {
  const username = args.join(" ").trim();
  if (!username) return interaction.reply("❌ Please provide your osu! username to link.");

  const filePath = path.join("./linkedAccounts.json");
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, "{}");
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  data[interaction.message.author.id] = username;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  return interaction.reply(`✅ Linked your osu! account as \`${username}\``);
}
