import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { createClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

const app = getApps().length ? getApp() : initializeApp(environment.firebase);

export const firebaseApp = app;
export const firebaseAuth = getAuth(app);
export const firestoreDb = getFirestore(app);

export const supabaseClient = createClient(
  environment.supabase.url,
  environment.supabase.anonKey
);

export const SUPABASE_BUCKET_ACTAS = environment.supabase.bucketActas || 'actas-fotos';