import dotenv from 'dotenv';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env from the workspace root (one folder up from functions)
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const secrets = {
  FINNHUB_API_KEY: process.env.FINNHUB_API_KEY,
  HUD_API_KEY: process.env.HUD_API_KEY,
  CENSUS_API_KEY: process.env.CENSUS_API_KEY,
  API_DATA_GOV_KEY: process.env.API_DATA_GOV_KEY,
  FRED_API_KEY: process.env.FRED_API_KEY,
  BLS_API_KEY: process.env.BLS_API_KEY,
  EIA_API_KEY: process.env.EIA_API_KEY,
  BEA_API_KEY: process.env.BEA_API_KEY,
  USDA_NASS_API_KEY: process.env.USDA_NASS_API_KEY,
  EDGAR_USER_AGENT: process.env.EDGAR_USER_AGENT
};

console.log('Deploying secrets to Firebase Functions...');

for (const [key, value] of Object.entries(secrets)) {
  if (!value) {
    console.warn(`Warning: Secret ${key} is missing in .env file, skipping.`);
    continue;
  }
  
  try {
    console.log(`Setting ${key}...`);
    execSync(`firebase functions:secrets:set ${key}`, {
      input: value,
      stdio: ['pipe', 'inherit', 'inherit']
    });
  } catch (error) {
    console.error(`Failed to set secret ${key}:`, error.message);
    process.exit(1);
  }
}

console.log('\nAll available secrets have been successfully set in Firebase!');
