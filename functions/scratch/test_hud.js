import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const HUD_API_KEY = process.env.HUD_API_KEY;

async function testHUD() {
  const code = 'METRO35620MM5600'; // New York
  
  // FMR
  const fmrUrl = `https://www.huduser.gov/hudapi/public/fmr/data/${code}`;
  const fmrRes = await fetch(fmrUrl, {
    headers: {
      'Authorization': `Bearer ${HUD_API_KEY}`
    }
  });
  const fmrData = await fmrRes.json();
  console.log('--- FMR DATA ---');
  console.log(JSON.stringify(fmrData, null, 2));

  // IL
  const ilUrl = `https://www.huduser.gov/hudapi/public/il/data/${code}`;
  const ilRes = await fetch(ilUrl, {
    headers: {
      'Authorization': `Bearer ${HUD_API_KEY}`
    }
  });
  const ilData = await ilRes.json();
  console.log('--- IL DATA ---');
  console.log(JSON.stringify(ilData, null, 2));
}

testHUD();
