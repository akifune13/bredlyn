// testSR.js
import { getApi } from './utils/osuApi.js';
import { calculateStarRating } from 'osu-sr-calculator';

async function test() {
  try {
    const mapId = 2444148; // Example map ID
    const mods = ['HR']; // optional mods

    // 1️⃣ Fetch beatmap info from osu API v2
    const api = await getApi();
    const map = await api.getBeatmap(mapId);

    console.log('Beatmap info:');
    console.log(`Title: ${map.title}`);
    console.log(`Artist: ${map.artist}`);
    console.log(`Version: ${map.version}`);
    console.log(`Difficulty rating (nomod): ${map.difficulty_rating}`);

    // 2️⃣ Calculate star rating with mods
    const srResult = await calculateStarRating(mapId, mods, false, true);
    console.log('Raw SR result:', srResult);

    // Star ratings are inside srResult.star_ratings
    const starRatings = srResult.star_ratings;

    // Build the key: NM for nomod, otherwise concatenate mods excluding HD/FL/SD
    const relevantMods = mods.filter(m => ['HR','DT','HT','EZ'].includes(m.toUpperCase()));
    const modKey = relevantMods.length ? relevantMods.join('') : 'NM';

    const srData = starRatings[modKey] ?? starRatings['NM'] ?? Object.values(starRatings)[0];

    if (!srData) {
      console.log('No SR data available for this mod combination.');
      return;
    }

    console.log(`\nMods enabled on this map: ${mods.length ? mods.join(', ') : 'Nomod'}`);
    console.log('Star rating details:');
    console.log(`Total SR: ${srData.star_rating.toFixed(2)}`);
    console.log(`Aim SR: ${srData.aim_rating.toFixed(2)}`);
    console.log(`Speed SR: ${srData.speed_rating.toFixed(2)}`);

  } catch (err) {
    console.error('Error calculating SR:', err);
  }
}

test();
