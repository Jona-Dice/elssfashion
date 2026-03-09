import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    checkUser()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Fondo decorativo sutil */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-slate-700 to-transparent rounded-full opacity-5 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-slate-700 to-transparent rounded-full opacity-5 blur-3xl"></div>
      </div>

      {/* Navbar Premium */}
      <nav className="sticky top-0 z-20 backdrop-blur-md bg-slate-800/30 border-b border-slate-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-3 text-lg sm:text-2xl font-bold">
            <span className="text-2xl sm:text-3xl">🏪</span>
            <span className="text-slate-100 hidden sm:inline">JonaSstudio</span>
            <span className="text-slate-100 sm:hidden text-sm">JonaS</span>
          </div>
          <div className="flex gap-2 sm:gap-4">
            {user ? (
              <Link
                to="/admin"
                className="relative overflow-hidden group bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 sm:py-3 px-3 sm:px-6 rounded-lg transition transform hover:scale-105 active:scale-95 shadow-lg text-xs sm:text-base"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <span className="relative flex items-center gap-1 sm:gap-2">📊 <span className="hidden sm:inline">Panel de Control</span><span className="sm:hidden">Panel</span></span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="relative overflow-hidden group bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 sm:py-3 px-3 sm:px-6 rounded-lg transition transform hover:scale-105 active:scale-95 shadow-lg text-xs sm:text-base"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <span className="relative flex items-center gap-1 sm:gap-2">🔑 <span className="hidden sm:inline">Iniciar Sesión</span><span className="sm:hidden">Login</span></span>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <div className="text-center mb-12 sm:mb-20">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-4 sm:mb-6">
            <span className="text-slate-100">Bienvenido a</span>
            <br/>
            <span className="text-slate-200">Elss Fashion Shop</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-slate-400 mb-8 sm:mb-10 max-w-2xl mx-auto font-light px-2">
            Sistema completo de gestión de ventas y control de inventario diseñado para pequeñas y medianas empresas con diseño profesional
          </p>
          {!user && (
            <Link
              to="/login"
              className="inline-block relative overflow-hidden group bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 sm:py-5 px-6 sm:px-10 rounded-xl transition transform hover:scale-105 active:scale-95 text-base sm:text-lg shadow-lg"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <span className="relative flex items-center gap-2 justify-center">🚀 Comenzar Ahora</span>
            </Link>
          )}
        </div>

        {/* Features Grid Premium */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12 sm:mb-20">
          {[
            { icon: '🛍️', title: 'Gestión de Ventas', desc: 'Registra y controla todas tus ventas de forma rápida y eficiente', color: 'blue' },
            { icon: '📦', title: 'Control de Inventario', desc: 'Mantén un seguimiento preciso del stock de tus productos', color: 'purple' },
            { icon: '📊', title: 'Reportes y Análisis', desc: 'Obtén insights valiosos sobre tu negocio', color: 'pink' },
            { icon: '🏷️', title: 'Categorías Personalizadas', desc: 'Organiza tus productos en categorías según necesites', color: 'cyan' }
          ].map((feature, idx) => (
            <div key={idx} className="group relative overflow-hidden backdrop-blur-md bg-slate-800/30 border border-slate-700 hover:border-slate-600 rounded-2xl p-6 sm:p-8 hover:shadow-2xl hover:shadow-slate-700/20 transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-br from-slate-700/10 to-transparent transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-4xl sm:text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-100 mb-2 sm:mb-3 group-hover:text-slate-50 transition-colors">{feature.title}</h3>
                <p className="text-sm sm:text-base text-slate-400">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Stats Section Premium */}
        <div className="backdrop-blur-md bg-slate-800/30 border border-slate-700 rounded-3xl p-8 sm:p-12 md:p-16 mb-12 sm:mb-20 shadow-2xl">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-100 mb-12 sm:mb-16 text-center">Por qué elegir TiendaERP</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12">
            {[
              { icon: '⚡', title: 'Rápido', desc: 'Interfaz ágil y responsiva para máxima productividad' },
              { icon: '🔒', title: 'Seguro', desc: 'Autenticación segura con Supabase' },
              { icon: '📱', title: 'Responsive', desc: 'Funciona perfecto en cualquier dispositivo' }
            ].map((stat, idx) => (
              <div key={idx} className="text-center p-6 sm:p-8 rounded-2xl backdrop-blur-sm bg-slate-700/20 border border-slate-700 hover:border-slate-600 transition-all hover:bg-slate-700/40">
                <div className="text-5xl sm:text-6xl font-bold text-slate-300 mb-4">{stat.icon}</div>
                <h4 className="text-xl sm:text-2xl font-bold text-slate-100 mb-3">{stat.title}</h4>
                <p className="text-sm sm:text-base text-slate-400">{stat.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section Premium */}
        <div className="relative overflow-hidden backdrop-blur-md bg-slate-800/30 border border-slate-700 rounded-3xl p-8 sm:p-12 md:p-16 text-center shadow-2xl">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 right-0 w-40 h-40 bg-slate-700 rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-slate-700 rounded-full blur-2xl"></div>
          </div>
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-100 mb-4">¿Listo para comenzar?</h2>
            <p className="text-base sm:text-lg text-slate-400 mb-6 sm:mb-8 px-4">
              {user ? 'Accede a tu panel de control para gestionar tus ventas' : 'Inicia sesión para acceder a tu panel de control'}
            </p>
            <Link
              to={user ? '/admin' : '/login'}
              className="inline-block relative overflow-hidden group bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 sm:py-4 px-8 sm:px-10 rounded-xl transition transform hover:scale-105 active:scale-95 shadow-lg text-sm sm:text-base"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <span className="relative flex items-center gap-2 justify-center">
                {user ? '📊 Ir al Panel de Control' : '🔑 Iniciar Sesión'}
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer Premium */}
      <footer className="relative z-10 bg-slate-800/30 border-t border-slate-700 backdrop-blur-md text-slate-400 py-8 sm:py-12 mt-12 sm:mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 mb-6 sm:mb-8">
            <div>
              <h4 className="text-slate-100 font-bold mb-3 flex items-center gap-2">🏪 TiendaERP</h4>
              <p className="text-xs sm:text-sm text-slate-500">Sistema profesional de gestión de ventas para tu negocio</p>
            </div>
            <div>
              <h4 className="text-slate-100 font-bold mb-3">Características</h4>
              <ul className="text-xs sm:text-sm space-y-2 text-slate-500">
                <li>✓ Gestión de Ventas</li>
                <li>✓ Control de Inventario</li>
                <li>✓ Análisis en Tiempo Real</li>
              </ul>
            </div>
            <div>
              <h4 className="text-slate-100 font-bold mb-3">Soporte</h4>
              <ul className="text-xs sm:text-sm space-y-2 text-slate-500">
                <li>📧 support@tiendaerp.com</li>
                <li>💬 Chat en Vivo 24/7</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-700 pt-6 text-center">
            <p className="text-xs sm:text-sm">&copy; 2024 TiendaERP. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}