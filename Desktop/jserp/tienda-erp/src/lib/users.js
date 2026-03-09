import { supabase } from './supabase'

export async function createUserWithRole({ email, password, role = 'vendedor' }) {
  // Crear usuario con signUp (cliente). Requiere conocer contraseña.
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error

  const user = data.user || null

  // Insertar/actualizar perfil en la tabla `perfiles` (admin deberá tener permisos RLS)
  if (user) {
    // Primero intentamos con la columna `user_id` (si tu esquema la tiene)
    try {
      const { data: perfilData, error: errPerfil } = await supabase
        .from('perfiles')
        .upsert({ user_id: user.id, rol: role }, { onConflict: 'user_id' })

      if (!errPerfil) return { user, perfil: perfilData }
      // si hay un error, lo dejamos caer al siguiente intento
      console.warn('Upsert perfiles con user_id falló, intentando con id:', errPerfil)
    } catch (e) {
      console.warn('Upsert con user_id lanzó excepción, intentando con id:', e)
    }

    // Intentar con la columna `id` (esquemas que usan perfiles.id = auth.users.id)
    try {
      const { data: perfilData2, error: errPerfil2 } = await supabase
        .from('perfiles')
        .upsert({ id: user.id, rol: role }, { onConflict: 'id' })

      if (errPerfil2) {
        console.error('Error al crear/actualizar perfil con id:', errPerfil2)
        return { user, error: errPerfil2 }
      }

      return { user, perfil: perfilData2 }
    } catch (e) {
      console.error('Error inesperado al upsertear perfil:', e)
      return { user, error: e }
    }
  }

  return { user, error }
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
