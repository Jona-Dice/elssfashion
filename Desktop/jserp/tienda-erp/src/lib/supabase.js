import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Cliente principal (con sesión persistente)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Cliente secundario (SIN sesión persistente) para crear usuarios sin perder la sesión actual
export const supabaseSecundario = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'supabase-secondary-auth' // Clave de storage diferente para evitar conflictos
  }
})
