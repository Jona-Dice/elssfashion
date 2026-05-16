import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { createUserWithRole } from '../lib/users'

export default function Usuarios() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('vendedor')
  const [mensaje, setMensaje] = useState('')
  const [loading, setLoading] = useState(false)
  const [usuarios, setUsuarios] = useState([])

  const cargarUsuarios = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    console.log('DEBUG: Cargando usuarios para:', user?.email, 'ID:', user?.id)
    
    const { data, error } = await supabase
      .from('perfiles')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error cargando usuarios:', error)
      setMensaje('❌ Error al cargar usuarios: ' + error.message)
    } else {
      console.log('DEBUG: Usuarios cargados:', data)
      setUsuarios(data || [])
    }
  }

  useEffect(() => {
    cargarUsuarios()
  }, [])

  const crearUsuario = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      setMensaje('⚠️ Completa email y contraseña')
      setTimeout(() => setMensaje(''), 3000)
      return
    }

    setLoading(true)
    try {
      const { user, error } = await createUserWithRole({ email, password, role })
      
      if (error) {
        // Manejo específico de cuota/rate limit de Supabase
        if (error.message?.includes('after') || error.status === 429) {
          const segundos = error.message.match(/\d+/) || '60'
          setMensaje(`⏳ Seguridad: Debes esperar aproximadamente ${segundos} segundos antes de crear otro usuario.`)
        } else {
          setMensaje('❌ Error: ' + (error.message || 'No se pudo crear el usuario'))
        }
      } else {
        setMensaje('✅ ¡Usuario Creado con éxito!')
        setEmail('')
        setPassword('')
        setRole('vendedor')
        await cargarUsuarios() // Recargar la lista ya que no perdemos la sesión
      }
    } catch (err) {
      console.error(err)
      if (err.message?.includes('after')) {
        setMensaje('⏳ Límite de seguridad alcanzado. Espera un minuto antes de intentar de nuevo.')
      } else {
        setMensaje('❌ Error inesperado: ' + err.message)
      }
    }
    setLoading(false)
    setTimeout(() => setMensaje(''), 5000)
  }

  const borrarPerfil = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este perfil? Esto no borrará la cuenta de acceso, pero revocará sus permisos.')) return
    
    const { error } = await supabase.from('perfiles').delete().eq('id', id)
    if (error) {
      setMensaje('❌ Error al eliminar perfil')
    } else {
      setMensaje('✅ Perfil eliminado')
      await cargarUsuarios()
    }
    setTimeout(() => setMensaje(''), 3000)
  }

  const resetPassword = async (email) => {
    if (!email) return
    if (!confirm(`¿Enviar correo de restablecimiento de contraseña a ${email}?`)) return
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/login',
    })
    
    if (error) {
      setMensaje('❌ Error al enviar reset: ' + error.message)
    } else {
      setMensaje('✅ Correo de restablecimiento enviado')
    }
    setTimeout(() => setMensaje(''), 5000)
  }

  const getInitials = (email) => {
    if (!email) return '?'
    return email.charAt(0).toUpperCase()
  }

  return (
    <div className="min-h-screen bg-slate-950/20 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Alerta de Mensaje */}
        {mensaje && (
          <div className="fixed top-24 right-4 z-50 animate-slide-in-right max-w-sm">
            <div className="backdrop-blur-md bg-slate-800/80 border border-slate-700 px-6 py-4 rounded-2xl shadow-2xl flex items-start gap-3">
              <div className={`mt-1.5 w-2 h-2 rounded-full ${mensaje.includes('✅') ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse flex-shrink-0`}></div>
              <span className="text-slate-100 font-medium text-sm leading-tight">{mensaje}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
          
          {/* Formulario de Registro */}
          <div className="lg:col-span-4 h-fit sticky top-8">
            <div className="backdrop-blur-md bg-slate-800/30 border border-slate-700 rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden relative group">
              {/* Background Glow */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl group-hover:bg-blue-600/20 transition-all duration-700"></div>
              
              <h2 className="text-2xl md:text-3xl font-black text-slate-100 mb-6 flex items-center gap-3 relative z-10">
                <span className="text-3xl">👤</span>
                Nuevo Usuario
              </h2>

              <form onSubmit={crearUsuario} className="space-y-5 relative z-10">
                <div className="space-y-2">
                  <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider ml-1">Email de Acceso</label>
                  <div className="relative">
                    <input 
                      type="email"
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      placeholder="usuario@ejemplo.com"
                      className="w-full backdrop-blur-sm bg-slate-900/50 border border-slate-700 text-slate-100 placeholder-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500/50 transition-all font-medium"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600">📧</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider ml-1">Contraseña Provisoria</label>
                  <div className="relative">
                    <input 
                      type="password" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      placeholder="••••••••"
                      className="w-full backdrop-blur-sm bg-slate-900/50 border border-slate-700 text-slate-100 placeholder-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500/50 transition-all font-medium"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600">🔐</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider ml-1">Rol de Usuario</label>
                  <div className="relative">
                    <select 
                      value={role} 
                      onChange={e => setRole(e.target.value)} 
                      className="w-full backdrop-blur-sm bg-slate-900/50 border border-slate-700 text-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500/50 appearance-none cursor-pointer transition-all font-medium"
                    >
                      <option value="vendedor" className="bg-slate-900">Vendedor (Acceso limitado)</option>
                      <option value="admin" className="bg-slate-900">Administrador (Control total)</option>
                    </select>
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none">▼</span>
                  </div>
                </div>

                <button 
                  disabled={loading} 
                  className="w-full relative overflow-hidden group bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <span className="relative flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>PROCESANDO...</span>
                      </>
                    ) : (
                      <>
                        <span>✓</span>
                        <span>CREAR USUARIO</span>
                      </>
                    )}
                  </span>
                </button>
              </form>
            </div>
          </div>

          {/* Listado de Usuarios */}
          <div className="lg:col-span-8">
            <div className="backdrop-blur-md bg-slate-800/30 border border-slate-700 rounded-3xl p-6 md:p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl md:text-3xl font-black text-slate-100 flex items-center gap-3">
                  <span className="text-3xl">👥</span>
                  Usuarios Registrados
                </h2>
                <span className="bg-slate-700/50 text-slate-300 text-xs font-bold px-4 py-2 rounded-full border border-slate-600">
                  {usuarios.length} perfiles
                </span>
              </div>

              {usuarios.length === 0 ? (
                <div className="text-center py-20 bg-slate-900/20 rounded-2xl border border-dashed border-slate-700">
                  <div className="text-6xl mb-4 opacity-20">👥</div>
                  <p className="text-slate-500 font-medium">No hay usuarios registrados aún</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  {usuarios.map(u => (
                    <div 
                      key={u.id}
                      className="group backdrop-blur-sm bg-slate-900/40 border border-slate-700 rounded-2xl p-5 hover:border-slate-500 transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-full"
                    >
                      {/* Decoration */}
                      <div className={`absolute top-0 right-0 w-32 h-32 opacity-[0.03] -mr-16 -mt-16 rounded-full blur-2xl ${u.rol === 'admin' ? 'bg-amber-400' : 'bg-blue-400'}`}></div>
                      
                      <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-white text-xl shadow-lg flex-shrink-0 ${u.rol === 'admin' ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
                            {getInitials(u.email)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className={`inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border mb-1 ${u.rol === 'admin' ? 'bg-amber-400/10 text-amber-400 border-amber-400/20' : 'bg-blue-400/10 text-blue-400 border-blue-400/20'}`}>
                              {u.rol}
                            </span>
                            <p className="text-slate-100 text-sm font-bold truncate max-w-full" title={u.email}>
                              {u.email || 'Sin Email'}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2 mb-4">
                          <button 
                            onClick={() => resetPassword(u.email)}
                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold py-2 rounded-lg transition-all border border-slate-700 flex items-center justify-center gap-2"
                            title="Enviar correo para cambiar contraseña"
                          >
                            <span>🔑</span>
                            <span>RESET PW</span>
                          </button>
                          <button 
                            onClick={() => borrarPerfil(u.id)}
                            className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-3 py-2 rounded-lg transition-all border border-red-500/20"
                            title="Eliminar Perfil"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      
                      <div className="mt-auto pt-4 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500 relative z-10">
                        <span className="font-mono opacity-50 text-[8px]">ID: {u.id?.slice(0, 8)}</span>
                        <span className="font-mono">{new Date(u.created_at || u.fecha_creacion).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Nota Informativa */}
              <div className="mt-8 space-y-4">


                <div className="p-4 bg-blue-400/5 border border-blue-400/10 rounded-xl flex gap-3 items-start">
                  <span className="text-xl">ℹ️</span>
                  <p className="text-[11px] md:text-xs text-slate-400 leading-relaxed">
                    El borrado de perfiles revoca los permisos dentro de la aplicación, pero la cuenta de correo seguirá existiendo en el sistema de autenticación central.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
      
      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right { animation: slide-in-right 0.3s ease-out forwards; }
      `}</style>
    </div>
  )
}
