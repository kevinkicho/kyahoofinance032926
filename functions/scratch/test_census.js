import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const CENSUS_API_KEY = process.env.CENSUS_API_KEY;

async function testCensus() {
  const url = `https://api.census.gov/data/2022/acs/acs5?get=NAME,B01003_001E,B25077_001E,B25064_001E,B25003_002E,B25003_003E&for=metropolitan%20statistical%20area/micropolitan%20statistical%20area:35620&key=${CENSUS_API_KEY}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    console.error('Failed to fetch:', response.status, await response.text());
    return;
  }
  const rawData = await response.json();
  console.log('--- CENSUS DATA ---');
  console.log(JSON.stringify(rawData, null, 2));
}

testCensus();
