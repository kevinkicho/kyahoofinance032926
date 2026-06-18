import dotenv from 'dotenv';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env from the workspace root (one folder up from functions)
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const HUD = process.env.HUD_API_KEY;
const CENSUS = process.env.CENSUS_API_KEY;
const GOV = process.env.API_DATA_GOV_KEY;

if (!HUD || !CENSUS || !GOV) {
  console.error('Error: One or more API keys are missing in the .env file.');
  process.exit(1);
}

try {
  console.log('Setting HUD_API_KEY...');
  execSync('firebase functions:secrets:set HUD_API_KEY', { 
    input: HUD, 
    stdio: ['pipe', 'inherit', 'inherit'] 
  });
  
  console.log('Setting CENSUS_API_KEY...');
  execSync('firebase functions:secrets:set CENSUS_API_KEY', { 
    input: CENSUS, 
    stdio: ['pipe', 'inherit', 'inherit'] 
  });
  
  console.log('Setting API_DATA_GOV_KEY...');
  execSync('firebase functions:secrets:set API_DATA_GOV_KEY', { 
    input: GOV, 
    stdio: ['pipe', 'inherit', 'inherit'] 
  });
  
  console.log('\nAll secrets have been successfully set in Firebase!');
} catch (error) {
  console.error('Failed to set secrets:', error.message);
  process.exit(1);
}
