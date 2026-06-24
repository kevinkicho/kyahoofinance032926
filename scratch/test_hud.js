import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const HUD_METROS = [
  { city: 'New York', hud_code: 'METRO35620MM5600', cbsa_code: '35620', lat: 40.7128, lng: -74.0060 }
];

async function fetchHudAffordabilityData(hudApiKey, censusApiKey) {
  if (!hudApiKey) {
    console.warn('[RealEstate] HUD_API_KEY is missing');
    return null;
  }

  // 1. Fetch Census data in a single query
  let censusMap = new Map();
  if (censusApiKey) {
    try {
      const url = `https://api.census.gov/data/2022/acs/acs5?get=NAME,B25077_001E,B25064_001E,B25003_002E,B25003_003E&for=metropolitan%20statistical%20area/micropolitan%20statistical%20area:*&key=${censusApiKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const rawData = await res.json();
        for (let i = 1; i < rawData.length; i++) {
          const row = rawData[i];
          const homeValue = parseInt(row[1]) || null;
          const grossRent = parseInt(row[2]) || null;
          const ownerOcc = parseInt(row[3]) || 0;
          const renterOcc = parseInt(row[4]) || 0;
          const cbsa = row[5];
          censusMap.set(cbsa, {
            homeValue,
            grossRent,
            homeownership: (ownerOcc + renterOcc) > 0 ? Math.round((ownerOcc / (ownerOcc + renterOcc)) * 100 * 10) / 10 : null
          });
        }
      } else {
        console.warn('[RealEstate] Census API returned error status:', res.status, await res.text());
      }
    } catch (e) {
      console.warn('[RealEstate] Census API fetch failed:', e.message || e);
    }
  }

  const hudData = [];
  const limit = 10;
  
  for (let i = 0; i < HUD_METROS.length; i += limit) {
    const chunk = HUD_METROS.slice(i, i + limit);
    const chunkPromises = chunk.map(async (metro) => {
      try {
        const fmrUrl = `https://www.huduser.gov/hudapi/public/fmr/data/${metro.hud_code}`;
        const ilUrl = `https://www.huduser.gov/hudapi/public/il/data/${metro.hud_code}`;
        
        const [fmrRes, ilRes] = await Promise.all([
          fetch(fmrUrl, { headers: { 'Authorization': `Bearer ${hudApiKey}` } }),
          fetch(ilUrl, { headers: { 'Authorization': `Bearer ${hudApiKey}` } })
        ]);
        
        let rent = null;
        let income = null;
        
        if (fmrRes.ok) {
          const fmrJson = await fmrRes.json();
          rent = fmrJson?.data?.basicdata?.['Two-Bedroom'] || null;
        } else {
          console.log('fmr fail', fmrRes.status, await fmrRes.text());
        }
        
        if (ilRes.ok) {
          const ilJson = await ilRes.json();
          income = ilJson?.data?.median_income || null;
        } else {
          console.log('il fail', ilRes.status, await ilRes.text());
        }
        
        let ratio = null;
        if (rent && income) {
          ratio = Math.round(((rent * 12) / income) * 100 * 10) / 10;
        }
        
        const censusInfo = censusMap.get(metro.cbsa_code) || null;
        
        return {
          city: metro.city,
          hud_code: metro.hud_code,
          cbsa_code: metro.cbsa_code,
          lat: metro.lat,
          lng: metro.lng,
          rent,
          income,
          ratio,
          homeValue: censusInfo?.homeValue || null,
          grossRent: censusInfo?.grossRent || null,
          homeownership: censusInfo?.homeownership || null
        };
      } catch (e) {
        console.warn(`[RealEstate] Error fetching HUD data for ${metro.city}:`, e.message || e);
        return null;
      }
    });
    
    const chunkResults = await Promise.all(chunkPromises);
    hudData.push(...chunkResults);
  }
  
  return hudData;
}

(async () => {
  const data = await fetchHudAffordabilityData(process.env.HUD_API_KEY, process.env.CENSUS_API_KEY);
  console.log(JSON.stringify(data, null, 2));
})();
