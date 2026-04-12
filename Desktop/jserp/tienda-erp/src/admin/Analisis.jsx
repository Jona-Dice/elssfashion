import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Analisis() {
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    setCargando(true)
    try {
      // 1. Obtener Ventas
      const { data: ventas, error: eVentas } = await supabase
        .from('ventas')
        .select('*, detalle_ventas(cantidad, subtotal, productos(nombre, precio_venta))')
        .eq('is_deleted', false)
      
      if (eVentas) throw eVentas

      // 2. Obtener Productos
      const { data: productos, error: eProd } = await supabase
        .from('productos')
        .select('*')
        .eq('is_deleted', false)
      
      if (eProd) throw eProd

      // 3. Obtener Transacciones (Egresos e Ingresos Extra)
      const { data: transacciones, error: eTrans } = await supabase
        .from('transacciones')
        .select('*')
      
      if (eTrans) throw eTrans

      // 4. Obtener Créditos
      const { data: creditos, error: eCred } = await supabase
        .from('creditos')
        .select('*')
      
      if (eCred) throw eCred

      procesarDatos(ventas || [], productos || [], transacciones || [], creditos || [])
    } catch (error) {
      console.error('Error al cargar datos de análisis:', error)
      // Inicializar con ceros para evitar crash
      setDatos({
        ingresosVentas: 0,
        egresosOperativos: 0,
        ingresosExtra: 0,
        balanceNeto: 0,
        topProductos: [],
        maxIngresoProd: 1,
        porCobrar: 0,
        capitalRecuperado: 0,
        valorInventario: 0,
        agotados: 0,
        totalVentas: 0,
        totalProductos: 0,
        error: true
      })
    } finally {
      setCargando(false)
    }
  }

  const procesarDatos = (ventas, productos, transacciones, creditos) => {
    try {
      const ingresosVentas = ventas.reduce((acc, v) => acc + (parseFloat(v.total) || 0), 0)
      
      // Gastos operativos y otros ingresos
      const egresosOperativos = (transacciones || []).filter(t => t.tipo === 'egreso').reduce((acc, t) => acc + (parseFloat(t.monto) || 0), 0)
      const ingresosExtra = (transacciones || []).filter(t => t.tipo === 'ingreso').reduce((acc, t) => acc + (parseFloat(t.monto) || 0), 0)
      
      // Top Productos y Días desde última venta
      const prodCount = {}
      const ultimaVenta = {} // { productId: Date }

      ventas.forEach(v => {
        if (v.detalle_ventas) {
          const fechaVenta = new Date(v.fecha || v.created_at)
          v.detalle_ventas.forEach(d => {
            const pId = d.producto_id
            const nombre = d.productos?.nombre || 'Producto Desconocido'
            if (!prodCount[nombre]) prodCount[nombre] = { cantidad: 0, ingresos: 0 }
            prodCount[nombre].cantidad += (parseInt(d.cantidad) || 0)
            prodCount[nombre].ingresos += (parseFloat(d.subtotal) || 0)

            if (!ultimaVenta[pId] || fechaVenta > ultimaVenta[pId]) {
              ultimaVenta[pId] = fechaVenta
            }
          })
        }
      })

      const topProductos = Object.entries(prodCount)
        .map(([nombre, data]) => ({ nombre, ...data }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5)

      // Identificar Productos Estancados (Slow Movers / Dead Stock)
      const ahora = new Date()
      const productosEstancados = productos
        .map(p => {
          const fechaLV = ultimaVenta[p.id]
          const dias = fechaLV 
            ? Math.floor((ahora - fechaLV) / (1000 * 60 * 60 * 24))
            : 999 // Si nunca se vendió, marcamos como 999 días
          return { ...p, diasSinVenta: dias, nuncaVendido: !fechaLV }
        })
        .filter(p => p.diasSinVenta > 0) // Solo los que no se han vendido hoy
        .sort((a, b) => b.diasSinVenta - a.diasSinVenta)
        .slice(0, 10) // Top 10 productos más lentos

      // Créditos (Dinero en la calle)
      const porCobrar = (creditos || []).reduce((acc, c) => acc + (parseFloat(c.monto_pendiente) || 0), 0)
      const capitalRecuperado = (creditos || []).reduce((acc, c) => acc + (parseFloat(c.monto_pagado) || 0), 0)

      // Salud del Inventario
      const valorInventario = (productos || []).reduce((acc, p) => acc + ((parseInt(p.stock) || 0) * (parseFloat(p.precio_venta) || 0)), 0)
      const agotados = (productos || []).filter(p => (parseInt(p.stock) || 0) <= 0).length

      // Sostenibilidad: Utilidad Neta
      const balanceNeto = ingresosVentas + ingresosExtra - egresosOperativos

      const maxIngresoProd = topProductos.length > 0 ? Math.max(...topProductos.map(p => p.ingresos)) : 1

      setDatos({
        ingresosVentas,
        egresosOperativos,
        ingresosExtra,
        balanceNeto,
        topProductos,
        productosEstancados,
        maxIngresoProd,
        porCobrar,
        capitalRecuperado,
        valorInventario,
        agotados,
        totalVentas: ventas.length,
        totalProductos: productos.length
      })
    } catch (err) {
      console.error("Error procesando datos:", err)
    }
  }

  const fmt = (n) => `$${parseFloat(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  if (cargando) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-950 min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-emerald-500"></div>
          <p className="text-slate-400 font-medium">Escaneando transacciones...</p>
        </div>
      </div>
    )
  }

  if (!datos) return null

  return (
    <div className="p-4 md:p-8 min-h-screen bg-slate-950 text-slate-100 overflow-y-auto w-full">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        
        {datos.error && (
          <div className="bg-rose-500/20 border border-rose-500/50 p-4 rounded-2xl text-rose-200 text-sm">
            ⚠️ Se produjo un error al cargar algunos datos parciales. Los resultados pueden no ser exactos.
          </div>
        )}
        
        {/* Header */}
        <div className="backdrop-blur-md bg-slate-900/50 border border-slate-700/50 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-5xl font-black bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-2">
              Análisis Inteligente de Negocio
            </h1>
            <p className="text-slate-400 text-sm md:text-base">
              Evaluación profesional de rentabilidad, eficiencia de ventas y salud financiera.
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('cambiarSeccion', { detail: 'ia' }))}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/50 rounded-2xl text-white font-bold transition-all flex items-center gap-2 group shadow-lg active:scale-95"
            >
              <span>🤖</span>
              <span>Consultar con IA</span>
            </button>
            <button 
              onClick={cargarDatos}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-2xl text-white font-bold transition-all flex items-center gap-2 group shadow-lg active:scale-95"
              title="Actualizar datos"
            >
              <span className="group-hover:rotate-180 transition-transform duration-500">🔄</span>
              <span>Recargar Análisis</span>
            </button>
          </div>
        </div>

        {/* KPIs Principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <KpiCard 
            title="Ingresos por Ventas" 
            value={fmt(datos.ingresosVentas)} 
            subtitle={`${datos.totalVentas} tickets cerrados`}
            icon="💰" 
            color="text-emerald-400" 
            bg="bg-emerald-500/10" 
            borderColor="border-emerald-500/20"
          />
          <KpiCard 
            title="Egresos Operativos" 
            value={fmt(datos.egresosOperativos)} 
            subtitle="Gastos registrados"
            icon="📉" 
            color="text-rose-400" 
            bg="bg-rose-500/10" 
            borderColor="border-rose-500/20"
          />
          <KpiCard 
            title="Balance Neto" 
            value={fmt(datos.balanceNeto)} 
            subtitle={datos.balanceNeto >= 0 ? 'Negocio Rentable' : 'Pérdida Operativa'}
            icon="⚖️" 
            color={datos.balanceNeto >= 0 ? "text-cyan-400" : "text-rose-400"} 
            bg={datos.balanceNeto >= 0 ? "bg-cyan-500/10" : "bg-rose-500/10"} 
            borderColor={datos.balanceNeto >= 0 ? "border-cyan-500/20" : "border-rose-500/20"}
          />
          <KpiCard 
            title="Capital en Cuentas por Cobrar" 
            value={fmt(datos.porCobrar)} 
            subtitle={`${fmt(datos.capitalRecuperado)} ya recuperados`}
            icon="💳" 
            color="text-amber-400" 
            bg="bg-amber-500/10" 
            borderColor="border-amber-500/20"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Top Productos Chart (Custom CSS Bars) */}
          <div className="lg:col-span-2 backdrop-blur-md bg-slate-900/50 border border-slate-700/50 rounded-3xl p-6 shadow-xl">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span>🏆</span> Productos Estrella (Top 5)
            </h2>
            
            {datos.topProductos.length > 0 ? (
              <div className="space-y-5">
                {datos.topProductos.map((prod, i) => {
                  const percent = Math.max((prod.ingresos / datos.maxIngresoProd) * 100, 5)
                  return (
                    <div key={i} className="group">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-slate-200">{prod.nombre}</span>
                        <span className="text-slate-400">{prod.cantidad} unds. - <span className="text-emerald-400 font-bold">{fmt(prod.ingresos)}</span></span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-full rounded-full transition-all duration-1000 ease-out group-hover:brightness-110"
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-10 text-slate-500">
                <span className="text-4xl mb-2 block">🤷‍♂️</span>
                No hay ventas suficientes para determinar los mejores productos.
              </div>
            )}

            {/* Nueva Sección: Productos Estancados */}
            <div className="mt-12 border-t border-slate-700/50 pt-8">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span>⚠️</span> Productos con Baja Rotación (Estancados)
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-800">
                      <th className="pb-3 pr-4 font-semibold uppercase tracking-wider">Producto</th>
                      <th className="pb-3 pr-4 font-semibold uppercase tracking-wider text-center">Stock</th>
                      <th className="pb-3 pr-4 font-semibold uppercase tracking-wider text-right">Inactividad</th>
                      <th className="pb-3 font-semibold uppercase tracking-wider text-right">Sugerencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {datos.productosEstancados.length > 0 ? (
                      datos.productosEstancados.map((p, i) => (
                        <tr key={i} className="hover:bg-slate-800/20 transition-colors group">
                          <td className="py-4 pr-4">
                            <span className="font-medium text-slate-200">{p.nombre}</span>
                          </td>
                          <td className="py-4 pr-4 text-center">
                            <span className={`px-2 py-1 rounded-md text-xs font-bold ${p.stock > 10 ? 'bg-slate-700 text-slate-300' : 'bg-rose-500/20 text-rose-400'}`}>
                              {p.stock}
                            </span>
                          </td>
                          <td className="py-4 pr-4 text-right">
                            <span className={p.nuncaVendido ? "text-rose-400 font-bold" : "text-amber-400"}>
                              {p.nuncaVendido ? 'SIN VENTAS' : `${p.diasSinVenta} días`}
                            </span>
                          </td>
                          <td className="py-4 text-right">
                            <span className="text-xs px-3 py-1 bg-slate-800 rounded-full text-slate-400 italic">
                              {p.nuncaVendido ? 'Liquidar / Promoción' : 'Revisar Precio'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="py-10 text-center text-slate-500 italic">
                          ¡Excelente! No tienes productos con baja rotación.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Salud del Inventario y Diagnóstico */}
          <div className="space-y-6">
            <div className="backdrop-blur-md bg-slate-900/50 border border-slate-700/50 rounded-3xl p-6 shadow-xl">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span>📦</span> Salud de Inventario
              </h2>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Valor Comercial Estancado</p>
                  <p className="text-2xl font-bold text-indigo-400">{fmt(datos.valorInventario)}</p>
                </div>
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <p className="text-xs text-rose-400 uppercase tracking-wider mb-1">Stock Agotado (Riesgo)</p>
                  <p className="text-2xl font-bold text-rose-300">{datos.agotados} <span className="text-sm font-normal text-rose-400">/ {datos.totalProductos} productos</span></p>
                </div>
              </div>
            </div>

            <div className="backdrop-blur-md bg-slate-900/50 border border-slate-700/50 rounded-3xl p-6 shadow-xl">
              <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                <span>🧠</span> Veredicto de Sostenibilidad
              </h2>
              {datos.balanceNeto > 0 ? (
                <p className="text-sm text-slate-300 leading-relaxed">
                  Basado en los datos actuales, el negocio es <span className="text-emerald-400 font-bold">SOSTENIBLE</span>. Tus ingresos superan a tus gastos registrados generando un flujo de caja positivo. 
                </p>
              ) : datos.ingresosVentas === 0 ? (
                <p className="text-sm text-slate-300 leading-relaxed">
                  <span className="text-amber-400 font-bold">INFO INSUFICIENTE:</span> Necesitas empezar a registrar tus ventas diarias en el módulo de Ventas para que el sistema pueda proyectar tus ganancias reales.
                </p>
              ) : (
                <p className="text-sm text-slate-300 leading-relaxed">
                  <span className="text-rose-400 font-bold">ALERTA FINANCIERA:</span> Actualmente los gastos superan a los ingresos. Recomendamos revisar los costos operativos y aumentar las estrategias de venta de los "Productos Estrella".
                </p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

function KpiCard({ title, value, subtitle, icon, color, bg, borderColor }) {
  return (
    <div className={`backdrop-blur-md ${bg} border ${borderColor} rounded-3xl p-6 shadow-xl relative overflow-hidden group hover:scale-[1.02] transition-transform`}>
      <div className="absolute -right-4 -top-4 text-6xl opacity-20 transform group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <p className="text-xs md:text-sm text-slate-400 font-medium mb-1 relative z-10">{title}</p>
      <p className={`text-2xl md:text-3xl lg:text-4xl font-black ${color} mb-2 relative z-10`}>{value}</p>
      <p className="text-xs text-slate-500 relative z-10">{subtitle}</p>
    </div>
  )
}
