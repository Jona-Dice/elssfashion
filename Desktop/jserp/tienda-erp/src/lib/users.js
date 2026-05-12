import { supabase } from './supabase'

export async function createUserWithRole({ email, password, role = 'vendedor' }) {
  // 1. Crear usuario en Supabase Auth
  const { data, error: authError } = await supabase.auth.signUp({ 
    email, 
    password,
    options: {
      data: { rol: role } // También lo guardamos en metadata por si acaso
    }
  })
  
  if (authError) throw authError

  const user = data.user
  if (!user) return { user: null, error: new Error('No se pudo crear el usuario') }

  // 2. Crear perfil en la tabla 'perfiles'
  // Intentamos con email, si falla (porque no existe la columna) reintentamos sin él.
  const { data: perfilData, error: perfilError } = await supabase
    .from('perfiles')
    .insert([
      { 
        id: user.id, 
        rol: role,
        email: email
      }
    ])
    .select()

  if (perfilError) {
    console.warn('Fallo insert con email en perfiles, reintentando sin email...', perfilError)
    const { data: retryData, error: retryError } = await supabase
      .from('perfiles')
      .insert([{ id: user.id, rol: role }])
      .select()
    
    if (retryError) {
      console.error('Error definitivo al crear perfil:', retryError)
      return { user, error: retryError }
    }
    return { user, perfil: retryData?.[0] }
  }

  return { user, perfil: perfilData?.[0] }
}

export async function getProfile(userId) {
  if (!userId) return null
  // Intentar buscar por `user_id` primero
  try {
    const { data, error } = await supabase
      .from('perfiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (!error && data) return data
  } catch (e) {
    // ignore
  }

  // Si no existe, intentar por `id`
  try {
    const { data: data2, error: error2 } = await supabase
      .from('perfiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (!error2) return data2
  } catch (e) {
    // ignore
  }

  return null
}
