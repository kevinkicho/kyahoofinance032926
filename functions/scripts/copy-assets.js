import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, '..', 'src');
const destDir = path.join(__dirname, '..', 'lib');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyDir(path.join(srcDir, 'routes'), path.join(destDir, 'routes'));
copyDir(path.join(srcDir, 'lib'), path.join(destDir, 'lib'));
copyDir(path.join(__dirname, '..', '..', 'src', 'data'), path.join(destDir, 'data'));
copyDir(path.join(__dirname, '..', '..', 'server', 'dataSources'), path.join(destDir, 'dataSources'));

console.log('Assets copied to lib/');
