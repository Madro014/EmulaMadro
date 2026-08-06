import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (supabaseUrl === 'PON_TU_URL_AQUI' || supabaseAnonKey === 'PON_TU_ANON_KEY_AQUI') {
  console.warn("⚠️ Advertencia: No has configurado las credenciales de Supabase en .env.local")
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder')
