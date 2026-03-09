/*export default function Dashboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Dashboard Administrativo</h1>
    </div>
  )
}*/
//import { useEffect } from 'react'
//import { supabase } from '../lib/supabase'
//
//export default function Dashboard() {
//
//  useEffect(() => {
//    const test = async () => {
//      const { data, error } = await supabase.from('test').select('*')
//      console.log(data, error)
//    }
//    test()
//  }, [])
//
//  return (
//    <div className="p-6">
//      <h1 className="text-2xl font-bold">Dashboard Administrativo</h1>
//    </div>
//  )
//}

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Productos from './Productos'
import Ventas from './Ventas'
import Cuentas from './Cuentas'
import Creditos from './Creditos'
import Reportes from './Reportes'

export default function Dashboard() {
  const [seccionActiva, setSeccionActiva] = useState('ventas')
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768)
  const navigate = useNavigate()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        const { data: perfil, error } = await supabase
          .from('perfiles')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (!error && perfil) setProfile(perfil)
      }
    }
    getUser()
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const getInitials = (email) => {
    return email ? email.charAt(0).toUpperCase() : 'U'
  }

  return (
    <div className="flex h-screen bg-slate-950 flex-col md:flex-row">
      {/* Sidebar Premium Colapsable */}
      <div className={`bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl border-b md:border-b-0 md:border-r border-slate-700 transition-all duration-300 ease-in-out flex flex-col ${sidebarOpen ? 'w-full md:w-64' : 'w-full md:w-20'}`}>
        {/* Fondo decorativo */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-40 h-40 bg-slate-700/10 rounded-full blur-3xl"></div>
        </div>

        {/* Header con botón toggle */}
        <div className="relative z-10 p-3 md:p-4 border-b border-slate-700 flex items-center justify-center md:justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-2 md:gap-3">
              <span className="text-xl md:text-2xl">🏪</span>
              <h1 className="text-lg md:text-xl font-black text-slate-100 hidden sm:inline">JonaStudio</h1>
              <h1 className="text-lg font-black text-slate-100 sm:hidden">JonaS</h1>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition-all text-slate-300 hover:text-white md:ml-auto"
          >
            {sidebarOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>

        {/* Descripción (solo cuando está abierto) */}
        {sidebarOpen && (
          <div className="relative z-10 px-4 md:px-6 py-2 text-slate-400 text-xs md:text-sm border-b border-slate-700">
            <p>Sistema de Gestión</p>
          </div>
        )}

        {/* Navegación */}
        <nav className="relative z-10 flex-1 p-3 md:p-4 space-y-2 flex flex-row md:flex-col md:overflow-auto">
          <button
            onClick={() => setSeccionActiva('ventas')}
            className={`flex-1 md:w-full px-3 md:px-4 py-3 md:py-4 rounded-xl transition-all flex items-center justify-center gap-2 md:gap-3 font-semibold duration-300 text-xs md:text-base ${
              seccionActiva === 'ventas'
                ? 'bg-slate-700 text-white shadow-lg'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50 border border-transparent hover:border-slate-600'
            }`}
            title={!sidebarOpen ? 'Ventas' : ''}
          >
            <span className="text-lg md:text-xl flex-shrink-0">🛍️</span>
            {sidebarOpen && <span>Ventas</span>}
          </button>
          <button
            onClick={() => setSeccionActiva('productos')}
            className={`flex-1 md:w-full px-3 md:px-4 py-3 md:py-4 rounded-xl transition-all flex items-center justify-center gap-2 md:gap-3 font-semibold duration-300 text-xs md:text-base ${
              seccionActiva === 'productos'
                ? 'bg-slate-700 text-white shadow-lg'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50 border border-transparent hover:border-slate-600'
            }`}
            title={!sidebarOpen ? 'Productos' : ''}
          >
            <span className="text-lg md:text-xl flex-shrink-0">📦</span>
            {sidebarOpen && <span>Productos</span>}
          </button>
          <button
            onClick={() => setSeccionActiva('cuentas')}
            className={`flex-1 md:w-full px-3 md:px-4 py-3 md:py-4 rounded-xl transition-all flex items-center justify-center gap-2 md:gap-3 font-semibold duration-300 text-xs md:text-base ${
              seccionActiva === 'cuentas'
                ? 'bg-slate-700 text-white shadow-lg'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50 border border-transparent hover:border-slate-600'
            }`}
            title={!sidebarOpen ? 'Cuentas' : ''}
          >
            <span className="text-lg md:text-xl flex-shrink-0">📊</span>
            {sidebarOpen && <span>Cuentas</span>}
          </button>
                <button
                  onClick={() => setSeccionActiva('creditos')}
                  className={`flex-1 md:w-full px-3 md:px-4 py-3 md:py-4 rounded-xl transition-all flex items-center justify-center gap-2 md:gap-3 font-semibold duration-300 text-xs md:text-base ${
                    seccionActiva === 'creditos'
                      ? 'bg-slate-700 text-white shadow-lg'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/50 border border-transparent hover:border-slate-600'
                  }`}
                  title={!sidebarOpen ? 'Créditos' : ''}
                >
                  <span className="text-lg md:text-xl flex-shrink-0">💳</span>
                  {sidebarOpen && <span>Créditos</span>}
                </button>
                <button
                  onClick={() => setSeccionActiva('reportes')}
                  className={`flex-1 md:w-full px-3 md:px-4 py-3 md:py-4 rounded-xl transition-all flex items-center justify-center gap-2 md:gap-3 font-semibold duration-300 text-xs md:text-base ${
                    seccionActiva === 'reportes'
                      ? 'bg-slate-700 text-white shadow-lg'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/50 border border-transparent hover:border-slate-600'
                  }`}
                  title={!sidebarOpen ? 'Reportes' : ''}
                >
                  <span className="text-lg md:text-xl flex-shrink-0">📊</span>
                  {sidebarOpen && <span>Reportes</span>}
                </button>
        </nav>
      </div>

      {/* Contenido Principal */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 w-full">
        {/* Header con Perfil de Usuario */}
        <div className="relative z-20 backdrop-blur-md bg-slate-800/30 border-b border-slate-700 px-4 md:px-8 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0 shadow-lg">
          {/* Título de Sección */}
          <div className="w-full md:w-auto">
            <h2 className="text-xl md:text-2xl font-bold text-slate-100">
              {seccionActiva === 'ventas' ? '🛍️ Sistema de Ventas' : seccionActiva === 'productos' ? '📦 Gestión de Productos' : seccionActiva === 'cuentas' ? '📊 Contabilidad & Cuentas' : seccionActiva === 'creditos' ? '💳 Créditos & Clientes' : '📊 Generador de Reportes'}
            </h2>
            <p className="text-slate-400 text-xs md:text-sm mt-1">
              {seccionActiva === 'ventas' ? 'Registra y controla tus ventas' : seccionActiva === 'productos' ? 'Administra tu catálogo de productos' : seccionActiva === 'cuentas' ? 'Gestiona todas tus cuentas y transacciones' : seccionActiva === 'creditos' ? 'Maneja créditos a clientes y abonos' : 'Analiza y descarga reportes de tu negocio'}
            </p>
          </div>

          {/* Perfil de Usuario */}
          <div className="relative w-full md:w-auto">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-3 md:gap-4 px-3 md:px-4 py-2 md:py-3 rounded-xl hover:bg-slate-700/30 transition-all border border-slate-700 hover:border-slate-600 w-full md:w-auto justify-between md:justify-start"
            >
              <div className="flex flex-col items-start md:items-end">
                <span className="text-xs md:text-sm font-semibold text-slate-100">{user?.email || 'Usuario'}</span>
                <span className="text-xs text-slate-400">{profile?.rol === 'admin' ? 'Administrador' : 'Vendedor'}</span>
              </div>
              <div className="w-9 md:w-10 h-9 md:h-10 rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center border border-slate-600 font-bold text-white text-sm md:text-base">
                {getInitials(user?.email)}
              </div>
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
              <div className="absolute right-0 top-full mt-2 w-full md:w-48 backdrop-blur-md bg-slate-800/80 border border-slate-700 rounded-xl shadow-2xl z-50 animate-slide-in-down">
                <div className="p-4 border-b border-slate-700">
                  <p className="text-xs md:text-sm text-slate-100 font-semibold">Sesión Iniciada</p>
                  <p className="text-xs text-slate-400 mt-1">{user?.email}</p>
                </div>
                <button
                  onClick={logout}
                  className="w-full text-left px-4 py-3 text-slate-300 hover:text-white hover:bg-red-600/20 transition-all flex items-center gap-2 rounded-lg text-sm md:text-base"
                >
                  <span>🚪</span>
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-auto">
          {seccionActiva === 'ventas' ? (
            <Ventas />
          ) : seccionActiva === 'productos' ? (
            <Productos />
          ) : seccionActiva === 'cuentas' ? (
            <Cuentas />
          ) : seccionActiva === 'creditos' ? (
            <Creditos />
          ) : seccionActiva === 'reportes' ? (
            <Reportes />
          ) : null}
        </div>
      </div>

      <style>{`
        @keyframes slide-in-down {
          from {
            transform: translateY(-10px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        .animate-slide-in-down {
          animation: slide-in-down 0.2s ease-out;
        }
      `}</style>
    </div>
  )
}

