import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const login = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!email || !password) {
      setError('Por favor completa todos los campos')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      setError('Email o contraseña incorrectos')
      setLoading(false)
    } else {
      navigate('/admin')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-3 sm:p-4 relative overflow-hidden">
      {/* Elementos decorativos animados */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-slate-700 to-transparent rounded-full opacity-5 blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-gradient-to-br from-slate-700 to-transparent rounded-full opacity-5 blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-gradient-to-br from-slate-700 to-transparent rounded-full opacity-5 blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Tarjeta de Login Premium */}
        <div className="backdrop-blur-xl bg-slate-800/30 border border-slate-700 rounded-3xl shadow-2xl p-6 sm:p-8 md:p-10">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-10">
            <div className="inline-flex items-center justify-center w-30 sm:w-30 h-30 sm:h-30 bg-slate-700 rounded-2xl mb-4 sm:mb-6 shadow-lg">
              <img src="/Jona.png" alt="TiendaERP" className="w-30 h-30 sm:w-30 sm:h-30 object-contain" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-100 mb-2">
              
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm">Sistema Profesional de Gestión de Ventas</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="backdrop-blur-sm bg-slate-700/30 border border-slate-600 text-slate-100 p-3 sm:p-4 rounded-xl mb-6 sm:mb-8 flex items-center gap-3 animate-slide-in-right">
              <span className="text-lg sm:text-xl">⚠️</span>
              <span className="font-medium text-sm sm:text-base">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={login} className="space-y-4 sm:space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="block text-slate-300 font-semibold text-xs sm:text-sm">Email</label>
              <div className="relative group">
                <input
                  type="email"
                  className="w-full backdrop-blur-sm bg-slate-700/30 border border-slate-600 text-slate-100 placeholder-slate-500 rounded-xl px-4 sm:px-5 py-3 sm:py-4 focus:outline-none focus:border-slate-500 transition duration-300 group-focus-within:bg-slate-700/50 text-sm sm:text-base"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={loading}
                />
                <span className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg sm:text-xl">📧</span>
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="block text-slate-300 font-semibold text-xs sm:text-sm">Contraseña</label>
              <div className="relative group">
                <input
                  type="password"
                  className="w-full backdrop-blur-sm bg-slate-700/30 border border-slate-600 text-slate-100 placeholder-slate-500 rounded-xl px-4 sm:px-5 py-3 sm:py-4 focus:outline-none focus:border-slate-500 transition duration-300 group-focus-within:bg-slate-700/50 text-sm sm:text-base"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={loading}
                />
                <span className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg sm:text-xl">🔐</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full relative overflow-hidden group bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 sm:py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg mt-6 sm:mt-8 text-sm sm:text-base"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>Iniciando sesión...</span>
                  </>
                ) : (
                  <>
                    <span>🔑</span>
                    <span>Iniciar Sesión</span>
                  </>
                )}
              </div>
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 sm:my-8 flex items-center gap-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-slate-700"></div>
            <span className="text-slate-500 text-xs font-semibold">O</span>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-slate-700"></div>
          </div>

          {/* Help Section */}
          <div className="backdrop-blur-sm bg-slate-700/20 border border-slate-700 rounded-xl p-3 sm:p-4 text-center">
            <p className="text-slate-400 text-xs sm:text-sm">
              ¿Problemas para acceder?<br/>
              <span className="text-slate-300 font-semibold">Contacta al administrador</span>
            </p>
          </div>
        </div>

        {/* Info Card */}
        <div className="mt-4 sm:mt-6 backdrop-blur-md bg-slate-800/30 border border-slate-700 rounded-xl p-4 sm:p-6">
          <div className="text-center">
            <h3 className="text-slate-100 font-bold mb-3 text-sm sm:text-base">✨ Características Premium</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <span className="text-xl sm:text-2xl block mb-1">⚡</span>
                <p className="text-xs text-slate-400">Rápido</p>
              </div>
              <div>
                <span className="text-xl sm:text-2xl block mb-1">🔒</span>
                <p className="text-xs text-slate-400">Seguro</p>
              </div>
              <div>
                <span className="text-xl sm:text-2xl block mb-1">📱</span>
                <p className="text-xs text-slate-400">Responsive</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .animate-slide-in-right {
          animation: slide-in-right 0.4s ease-out;
        }
      `}</style>
    </div>
  )
}

