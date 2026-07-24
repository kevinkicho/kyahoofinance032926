/**
 * Firebase Admin bootstrap (local Express + shared helper).
 *
 * Credential resolution order:
 *   1. FIREBASE_SERVICE_ACCOUNT_JSON  — inline JSON string (secret env)
 *   2. FIREBASE_SERVICE_ACCOUNT_PATH / GOOGLE_APPLICATION_CREDENTIALS — file path
 *   3. Repo-root `*-firebase-adminsdk-*.json` (local only; gitignored)
 *   4. Application Default Credentials (Cloud Run / Functions / gcloud)
 *
 * Returns null when firebase-admin is missing or init fails.
 */

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..', '..');
const require = createRequire(import.meta.url);

const DATABASE_URL =
  process.env.FIREBASE_DATABASE_URL
  || process.env.VITE_FIREBASE_DATABASE_URL
  || 'https://kfinance032926-default-rtdb.firebaseio.com';

function findLocalServiceAccountFile() {
  const explicit = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (explicit) {
    const abs = path.isAbsolute(explicit) ? explicit : path.join(REPO_ROOT, explicit);
    if (fs.existsSync(abs)) return abs;
    console.warn(`[firebaseAdmin] credential path not found: ${abs}`);
    return null;
  }
  try {
    const match = fs.readdirSync(REPO_ROOT).find(
      (f) => /firebase-adminsdk.*\.json$/i.test(f) || /^service-account.*\.json$/i.test(f),
    );
    return match ? path.join(REPO_ROOT, match) : null;
  } catch {
    return null;
  }
}

function loadAdminModule() {
  try {
    return require('firebase-admin');
  } catch {
    try {
      // Monorepo: functions installs firebase-admin; local Express may not.
      return require(path.join(REPO_ROOT, 'functions', 'node_modules', 'firebase-admin'));
    } catch (e) {
      console.warn('[firebaseAdmin] firebase-admin not installed — Admin SDK disabled');
      return null;
    }
  }
}

let cached = null; // { admin } | null | false (init failed)

/**
 * @returns {import('firebase-admin') | null}
 */
export function getFirebaseAdmin() {
  if (cached === false) return null;
  if (cached) return cached.admin;

  const admin = loadAdminModule();
  if (!admin) {
    cached = false;
    return null;
  }

  try {
    if (!admin.apps || admin.apps.length === 0) {
      let credential;
      if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
      } else {
        const keyPath = findLocalServiceAccountFile();
        if (keyPath) {
          const parsed = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
          console.log(`[firebaseAdmin] using service account: ${path.basename(keyPath)}`);
          credential = admin.credential.cert(parsed);
        } else {
          credential = admin.credential.applicationDefault();
        }
      }
      admin.initializeApp({ credential, databaseURL: DATABASE_URL });
    }
    cached = { admin };
    return admin;
  } catch (e) {
    console.warn('[firebaseAdmin] initializeApp failed:', e.message);
    cached = false;
    return null;
  }
}

export function getAdminDatabase() {
  const admin = getFirebaseAdmin();
  if (!admin) return null;
  try {
    return admin.database();
  } catch (e) {
    console.warn('[firebaseAdmin] database() failed:', e.message);
    return null;
  }
}

export function getAdminAuth() {
  const admin = getFirebaseAdmin();
  if (!admin) return null;
  try {
    return admin.auth();
  } catch (e) {
    console.warn('[firebaseAdmin] auth() failed:', e.message);
    return null;
  }
}
