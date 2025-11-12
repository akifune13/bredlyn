// test-star-rating.js
import * as osu from "osu-api-v2-js";
import { getApi, getUserTopPlays } from "./utils/osuApi.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * Test function to check a specific top play's star rating
 * Usage: node test-star-rating.js <username> <play_number>
 */
async function testSinglePlay() {
  try {
    const username = process.argv[2];
    const playNumber = parseInt(process.argv[3]) || 1;
    
    if (!username) {
      console.error("❌ Error: Please provide a username!");
      console.log("\nUsage: node test-star-rating.js <username> <play_number>");
      console.log("Example: node test-star-rating.js mrekk 1\n");
      process.exit(1);
    }
    
    console.log("🔍 Fetching play data...\n");
    
    const plays = await getUserTopPlays(username, Math.max(playNumber, 5));
    
    if (plays.length < playNumber) {
      console.error(`\n❌ Error: User only has ${plays.length} top plays!`);
      process.exit(1);
    }
    
    const score = plays[playNumber - 1];
    const api = await getApi();
    
    // Extract mods
    const mods = score.mods || [];
    const modAcronyms = mods.map(m => m.acronym || m);
    const modString = modAcronyms.length > 0 ? modAcronyms.join("") : "NoMod";
    
    const diff = score.beatmap ?? {};
    const beatmapset = score.beatmapset ?? {};
    const baseSR = diff?.difficulty_rating ?? 0;
    
    console.log("================================================================================");
    console.log(`📍 ${beatmapset?.artist} - ${beatmapset?.title} [${diff?.version}]`);
    console.log(`🎮 Mods: ${modString}`);
    console.log(`🏆 Rank: ${score.rank} | PP: ${score.pp?.toFixed(2)}pp | Acc: ${(score.accuracy * 100).toFixed(2)}%`);
    console.log("================================================================================\n");
    
    // Fetch mod-adjusted difficulty attributes
    console.log("🔄 Fetching mod-adjusted difficulty attributes...\n");
    console.log(`   Beatmap ID: ${diff.id}`);
    console.log(`   Mods: [${modAcronyms.join(", ")}]`);
    
    try {
      // Use getBeatmapDifficultyAttributesOsu with score.mods directly
      const attributes = await api.getBeatmapDifficultyAttributesOsu(
        score.beatmap,  // Pass the beatmap object
        score.mods      // Pass the mods array from the score
      );
      
      const adjustedSR = attributes?.star_rating ?? attributes?.difficulty_rating ?? null;
      
      console.log("⭐ STAR RATING COMPARISON:");
      console.log(`  Base SR (NoMod):     ${baseSR.toFixed(2)}★`);
      console.log(`  Adjusted SR (+${modString}): ${adjustedSR?.toFixed(2) ?? 'N/A'}★`);
      
      if (adjustedSR) {
        const diff = adjustedSR - baseSR;
        const percent = ((adjustedSR / baseSR - 1) * 100);
        console.log(`  Difference:          ${diff > 0 ? '+' : ''}${diff.toFixed(2)}★ (${percent > 0 ? '+' : ''}${percent.toFixed(1)}%)`);
        
        // Show if it matches expected value
        const expected = 11.56; // mrekk's actual SR
        if (Math.abs(adjustedSR - expected) < 0.1) {
          console.log(`\n  ✅ This matches the expected ${expected}★!`);
        } else {
          console.log(`\n  ⚠️  Expected ~${expected}★, got ${adjustedSR.toFixed(2)}★`);
          console.log(`     Difference: ${(adjustedSR - expected).toFixed(2)}★`);
        }
      }
      
      console.log("\n📊 FULL DIFFICULTY ATTRIBUTES:");
      console.log(JSON.stringify(attributes, null, 2));
      
    } catch (error) {
      console.error("\n❌ Error fetching difficulty attributes:", error.message);
      console.log("\n⚠️  The API might not support difficulty attributes for this beatmap.");
      console.log("    Base SR: " + baseSR.toFixed(2) + "★");
    }
    
    console.log("\n================================================================================");
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
}

testSinglePlay();