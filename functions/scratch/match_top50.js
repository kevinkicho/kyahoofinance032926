import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const HUD_API_KEY = process.env.HUD_API_KEY;

const TOP_50_CITIES = [
  { city: 'New York', search: 'New York, NY' },
  { city: 'Los Angeles', search: 'Los Angeles-Long Beach-Glendale, CA' },
  { city: 'Chicago', search: 'Chicago-Joliet-Naperville, IL' },
  { city: 'Dallas', search: 'Dallas, TX' },
  { city: 'Houston', search: 'Houston-The Woodlands-Sugar Land, TX' },
  { city: 'Miami', search: 'Miami-Miami Beach-Kendall, FL' },
  { city: 'Atlanta', search: 'Atlanta-Sandy Springs-Roswell, GA' },
  { city: 'Philadelphia', search: 'Philadelphia, PA' },
  { city: 'Washington', search: 'Washington-Arlington-Alexandria, DC' },
  { city: 'Phoenix', search: 'Phoenix-Mesa-Scottsdale, AZ' },
  { city: 'Boston', search: 'Boston-Cambridge-Quincy, MA' },
  { city: 'Riverside', search: 'Riverside-San Bernardino-Ontario, CA' },
  { city: 'San Francisco', search: 'San Francisco, CA' },
  { city: 'Detroit', search: 'Detroit-Warren-Livonia, MI' },
  { city: 'Seattle', search: 'Seattle-Bellevue, WA' },
  { city: 'Minneapolis', search: 'Minneapolis-St. Paul-Bloomington, MN' },
  { city: 'Tampa', search: 'Tampa-St. Petersburg-Clearwater, FL' },
  { city: 'San Diego', search: 'San Diego-Carlsbad, CA' },
  { city: 'Denver', search: 'Denver-Aurora-Lakewood, CO' },
  { city: 'Orlando', search: 'Orlando-Kissimmee-Sanford, FL' },
  { city: 'Austin', search: 'Austin-Round Rock, TX' },
  { city: 'St. Louis', search: 'St. Louis, MO' },
  { city: 'Charlotte', search: 'Charlotte-Concord-Gastonia, NC' },
  { city: 'San Antonio', search: 'San Antonio-New Braunfels, TX' },
  { city: 'Portland', search: 'Portland-Vancouver-Hillsboro, OR' },
  { city: 'Sacramento', search: 'Sacramento--Roseville--Arden-Arcade, CA' },
  { city: 'Pittsburgh', search: 'Pittsburgh, PA' },
  { city: 'Las Vegas', search: 'Las Vegas-Henderson-Paradise, NV' },
  { city: 'Cincinnati', search: 'Cincinnati, OH' },
  { city: 'Kansas City', search: 'Kansas City, MO' },
  { city: 'Columbus', search: 'Columbus, OH' },
  { city: 'Indianapolis', search: 'Indianapolis-Carmel, IN' },
  { city: 'Cleveland', search: 'Cleveland-Elyria, OH' },
  { city: 'San Jose', search: 'San Jose-Sunnyvale-Santa Clara, CA' },
  { city: 'Nashville', search: 'Nashville-Davidson--Murfreesboro--Franklin, TN' },
  { city: 'Virginia Beach', search: 'Virginia Beach-Norfolk-Newport News, VA' },
  { city: 'Jacksonville', search: 'Jacksonville, FL' },
  { city: 'Providence', search: 'Providence-Fall River, RI' },
  { city: 'Milwaukee', search: 'Milwaukee-Waukesha-West Allis, WI' },
  { city: 'Raleigh', search: 'Raleigh, NC' },
  { city: 'Oklahoma City', search: 'Oklahoma City, OK' },
  { city: 'Memphis', search: 'Memphis, TN' },
  { city: 'Louisville', search: 'Louisville, KY' },
  { city: 'Richmond', search: 'Richmond, VA' },
  { city: 'New Orleans', search: 'New Orleans-Metairie, LA' },
  { city: 'Salt Lake City', search: 'Salt Lake City, UT' },
  { city: 'Hartford', search: 'Hartford-West Hartford-East Hartford, CT' },
  { city: 'Buffalo', search: 'Buffalo-Cheektowaga-Niagara Falls, NY' },
  { city: 'Birmingham', search: 'Birmingham-Hoover, AL' },
  { city: 'Rochester', search: 'Rochester, NY' }
];

async function matchTop50() {
  const url = 'https://www.huduser.gov/hudapi/public/fmr/listMetroAreas';
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${HUD_API_KEY}`
    }
  });
  if (!response.ok) {
    console.error('Failed to fetch:', response.status, await response.text());
    return;
  }
  const data = await response.json();
  
  const matched = [];
  
  for (const item of TOP_50_CITIES) {
    let matches = data.filter(m => 
      m.area_name.toLowerCase().includes(item.search.toLowerCase())
    );
    
    if (matches.length > 0) {
      matched.push({
        city: item.city,
        cbsa_code: matches[0].cbsa_code,
        area_name: matches[0].area_name
      });
    } else {
      console.warn(`No match found for: ${item.city} (search: ${item.search})`);
      // Fallback search by city name only
      let fallbackMatches = data.filter(m => 
        m.area_name.toLowerCase().includes(item.city.toLowerCase())
      );
      if (fallbackMatches.length > 0) {
        matched.push({
          city: item.city,
          cbsa_code: fallbackMatches[0].cbsa_code,
          area_name: fallbackMatches[0].area_name
        });
      } else {
        console.error(`CRITICAL: No fallback match for: ${item.city}`);
      }
    }
  }
  
  console.log(JSON.stringify(matched, null, 2));
  console.log(`Matched ${matched.length} / ${TOP_50_CITIES.length}`);
}

matchTop50();
