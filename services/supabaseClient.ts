import { createClient } from '@supabase/supabase-js';

// Fonction utilitaire pour accéder aux variables d'environnement de manière sécurisée
const getEnv = (key: string) => {
  try {
    // @ts-ignore
    const env = import.meta.env;
    return env ? env[key] : '';
  } catch (e) {
    console.warn('Erreur accès env:', e);
    return '';
  }
};

const SUPABASE_URL = getEnv('VITE_SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_ANON_KEY');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("Supabase URL ou Key manquante. Vérifiez vos variables d'environnement Vercel (Settings > Environment Variables).");
}

export const supabase = createClient(SUPABASE_URL || 'https://placeholder.supabase.co', SUPABASE_ANON_KEY || 'placeholder');