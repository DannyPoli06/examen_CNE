import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

const firebaseApp = getApps().length ? getApp() : initializeApp(environment.firebase);

export const firebaseAuth = getAuth(firebaseApp);

export const firestoreDb = getFirestore(firebaseApp);

export const supabaseClient: SupabaseClient = createClient(
  environment.supabase.url.replace(/\/+$/, ''),
  environment.supabase.anonKey
);

export const ACTAS_BUCKET = environment.supabase.bucketActas || 'actas-fotos';
