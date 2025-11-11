import fs from "fs";
import path from "path";

export const name = "unlink";
export const description = "Unlink your osu! account";

export async function execute(interaction, args) {
  const filePath = path.join("./linkedAccounts.json");
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, "{}");
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  if (!data[interaction.message.author.id]) {
    return interaction.reply("❌ No osu! account linked.");
  }

  delete data[interaction.message.author.id];
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  return interaction.reply("✅ Your osu! account has been unlinked.");
}
