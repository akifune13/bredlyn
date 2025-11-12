import fs from "fs";
import path from "path";
import { getUserTopPlays, getUserProfile } from "../utils/osuApi.js";
import { fmt, safeFixed } from "../utils/gradeEmojis.js";
import { formatBigNumber, timeAgo, sendAndGetMessage } from "../utils/miscUtils.js";
import { buildEmbed, createNavButtons } from "../utils/topEmbedUtils.js";

// Primary name
export const name = "topplays";
// Aliases
export const aliases = ["top", "osutop"];
export const description = "Show a user's top osu! plays or your linked account";

const PAGE_SIZE = 5;

export async function execute(interaction, args) {
  const filePath = path.join("./linkedAccounts.json");
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath,"{}");
  const data = JSON.parse(fs.readFileSync(filePath,"utf-8"));
  const authorId = interaction?.message?.author?.id ?? interaction?.user?.id;
  
  // --- Parse page number if present ---
  let page = 0;
  const pageIndex = args.findIndex(a => a.toLowerCase() === "page");
  if (pageIndex !== -1 && args[pageIndex + 1]) {
    const parsed = parseInt(args[pageIndex + 1]);
    if (!isNaN(parsed) && parsed > 0) page = parsed - 1; // user types 1-based page
    args.splice(pageIndex, 2); // remove page keyword and number
  }
  
  const username = args.join(" ").trim() || data[authorId];
  if (!username) return interaction.reply?.("❌ Provide a username or link your account.") ?? interaction.reply("❌ Provide a username or link your account.");
  
  await (interaction.deferReply?.() ?? Promise.resolve());
  
  try {
    const [profile, plays] = await Promise.all([
      getUserProfile(username),
      getUserTopPlays(username,100)
    ]);
    
    if (!plays?.length) return interaction.editReply?.("No top plays found.") ?? interaction.reply("No top plays found.");
    
    const totalPages = Math.ceil(plays.length / PAGE_SIZE);
    if (page >= totalPages) page = totalPages - 1;
    
    // FIXED: Added await here
    const embed = await buildEmbed(username, profile, plays, page, PAGE_SIZE, fmt, timeAgo);
    const row = createNavButtons(page, totalPages);
    
    const sentMessage = await sendAndGetMessage(interaction, { embeds:[embed], components:[row] });
    if (!sentMessage) return;
    
    const collector = sentMessage.createMessageComponentCollector({ time:120_000 });
    
    collector.on('collect', async i => {
      if (i.user.id !== authorId) return i.reply({ content:"You can't control this.", ephemeral:true });
      if (i.customId==='prev' && page>0) page--;
      if (i.customId==='next' && page<totalPages-1) page++;
      
      // FIXED: Added await here too
      const updatedEmbed = await buildEmbed(username, profile, plays, page, PAGE_SIZE, fmt, timeAgo);
      await i.update({ embeds:[updatedEmbed], components:[createNavButtons(page, totalPages)] });
    });
    
    collector.on('end', async ()=> {
      const disabledRow = createNavButtons(0, totalPages);
      disabledRow.components.forEach(c=>c.setDisabled(true));
      try { await sentMessage.edit({ components:[disabledRow] }); } catch {}
    });
  } catch (err) {
    console.error(err);
    try { await interaction.editReply("Error fetching top plays."); } catch { await interaction.reply("Error fetching top plays."); }
  }
}