import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const envPath = resolve('.env');
if (!existsSync(envPath)) {
  console.error('❌ No se encontró el archivo .env en la raíz del proyecto.');
  process.exit(1);
}

const raw = readFileSync(envPath, 'utf8');
const env = {};
for (const line of raw.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx === -1) continue;
  const key = trimmed.slice(0, idx).trim();
  const val = trimmed.slice(idx + 1).trim();
  env[key] = val;
}

const buildContent = (production) => `export const environment = {
  production: ${production},
  firebase: {
    apiKey: '${env.FIREBASE_API_KEY || ''}',
    authDomain: '${env.FIREBASE_AUTH_DOMAIN || ''}',
    projectId: '${env.FIREBASE_PROJECT_ID || ''}',
    storageBucket: '${env.FIREBASE_STORAGE_BUCKET || ''}',
    messagingSenderId: '${env.FIREBASE_MESSAGING_SENDER_ID || ''}',
    appId: '${env.FIREBASE_APP_ID || ''}',
  },
  supabase: {
    url: '${env.SUPABASE_URL || ''}',
    anonKey: '${env.SUPABASE_ANON_KEY || ''}',
    bucketActas: 'actas-fotos',
  },
};
`;

mkdirSync(resolve('src/environments'), { recursive: true });
writeFileSync(resolve('src/environments/environment.ts'), buildContent(false));
writeFileSync(resolve('src/environments/environment.prod.ts'), buildContent(true));
console.log('✅ Archivos environment.ts y environment.prod.ts generados desde .env');