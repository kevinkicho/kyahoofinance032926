import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const CENSUS_API_KEY = process.env.CENSUS_API_KEY;

async function getMetros() {
  const url = `https://api.census.gov/data/2022/acs/acs5?get=NAME,B01003_001E,B25077_001E,B25064_001E,B25003_002E,B25003_003E&for=metropolitan%20statistical%20area/micropolitan%20statistical%20area:*&key=${CENSUS_API_KEY}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    console.error('Failed to fetch:', response.status, await response.text());
    return;
  }
  const rawData = await response.json();
  // Headers are the first row: ["NAME", "B01003_001E", "B25077_001E", "B25064_001E", "B25003_002E", "B25003_003E", "metropolitan statistical area/micropolitan statistical area"]
  const headers = rawData[0];
  const rows = rawData.slice(1);

  // Map to structured objects and parse population
  const parsed = rows.map(row => {
    return {
      name: row[0],
      population: parseInt(row[1]) || 0,
      homeValue: parseInt(row[2]) || 0,
      grossRent: parseInt(row[3]) || 0,
      ownerOcc: parseInt(row[4]) || 0,
      renterOcc: parseInt(row[5]) || 0,
      cbsa: row[6]
    };
  });

  // Sort by population descending and take top 10
  const sorted = parsed.sort((a, b) => b.population - a.population);
  console.log('Top 10 Metros by Population:');
  console.log(JSON.stringify(sorted.slice(0, 10), null, 2));
}

getMetros();
