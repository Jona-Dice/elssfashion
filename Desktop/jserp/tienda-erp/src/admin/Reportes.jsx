import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Reportes() {
  const [tipoReporte, setTipoReporte] = useState('ventas')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [datos, setDatos] = useState([])
  const [resumen, setResumen] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  // Generar reporte de ventas - MEJORADO
  const generarReporteVentas = async () => {
    setCargando(true)
    try {
      let query = supabase
        .from('ventas')
        .select('*, detalle_ventas(*, productos(nombre))')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (fechaInicio) {
        query = query.gte('created_at', fechaInicio + 'T00:00:00')
      }
      if (fechaFin) {
        query = query.lte('created_at', fechaFin + 'T23:59:59')
      }

      const { data, error } = await query
      if (error) throw error

      // Obtener información de usuarios
      const { data: usuarios } = await supabase
        .from('perfiles')
        .select('id, nombre')

      const usuariosMap = {}
      if (usuarios) {
        usuarios.forEach(u => {
          usuariosMap[u.id] = u.nombre || 'Usuario Desconocido'
        })
      }

      // Transformar datos para mejor presentación
      const datosFormateados = (data || []).map((venta, indice) => {
        const fecha = new Date(venta.created_at)
        return {
          '#': indice + 1, // Contador secuencial
          fecha: fecha.toLocaleDateString('es-ES'), // Solo la fecha
          usuario: usuariosMap[venta.usuario_id] || 'Usuario Desconocido',
          estado: venta.estado === 'venta' ? '💵 Venta' : '🏷️ Apartado',
          total: `$${parseFloat(venta.total || 0).toFixed(2)}`,
          productos: venta.detalle_ventas?.length || 0,
          detalles: venta.detalle_ventas // Para mostrar expandido si necesita
        }
      })

      setDatos(datosFormateados)

      // Calcular resumen
      const totalVentas = data?.reduce((sum, v) => sum + parseFloat(v.total || 0), 0) || 0
      const cantidadVentas = data?.length || 0
      const totalProductos = data?.reduce((sum, v) => sum + (v.detalle_ventas?.length || 0), 0) || 0
      const promedio = cantidadVentas > 0 ? totalVentas / cantidadVentas : 0

      setResumen({
        totalVentas,
        cantidadVentas,
        promedio,
        totalProductos
      })

      setMensaje('Reporte generado exitosamente')
      setTimeout(() => setMensaje(''), 3000)
    } catch (error) {
      setMensaje('Error: ' + error.message)
      setTimeout(() => setMensaje(''), 3000)
    }
    setCargando(false)
  }

  // Generar reporte de stock
  const generarReporteStock = async () => {
    setCargando(true)
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('*, categorias(nombre)')
        .eq('is_deleted', false)
        .order('nombre')

      if (error) throw error

      setDatos(data || [])

      // Calcular resumen
      const stockTotal = data?.reduce((sum, p) => sum + p.stock, 0) || 0
      const productosAgotados = data?.filter(p => p.stock === 0).length || 0
      const productosStock = data?.filter(p => p.stock > 0).length || 0
      const valorStock = data?.reduce((sum, p) => sum + (p.stock * p.precio_venta), 0) || 0

      setResumen({
        stockTotal,
        productosAgotados,
        productosStock,
        valorStock
      })

      setMensaje('Reporte generado exitosamente')
      setTimeout(() => setMensaje(''), 3000)
    } catch (error) {
      setMensaje('Error: ' + error.message)
      setTimeout(() => setMensaje(''), 3000)
    }
    setCargando(false)
  }

  // Generar reporte de clientes
  const generarReporteClientes = async () => {
    setCargando(true)
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*, ventas(count)')
        .order('nombre')

      if (error) throw error

      setDatos(data || [])

      const totalClientes = data?.length || 0
      const clientesActivos = data?.filter(c => c.ventas?.length > 0).length || 0

      setResumen({
        totalClientes,
        clientesActivos
      })

      setMensaje('Reporte generado exitosamente')
      setTimeout(() => setMensaje(''), 3000)
    } catch (error) {
      setMensaje('Error: ' + error.message)
      setTimeout(() => setMensaje(''), 3000)
    }
    setCargando(false)
  }

  // Generar reporte de cuentas
  const generarReporteCuentas = async () => {
    setCargando(true)
    try {
      const { data, error } = await supabase
        .from('cuentas')
        .select('*')
        .order('nombre')

      if (error) throw error

      setDatos(data || [])

      const saldoTotal = data?.reduce((sum, c) => sum + parseFloat(c.saldo || 0), 0) || 0
      const totalCuentas = data?.length || 0

      setResumen({
        saldoTotal,
        totalCuentas
      })

      setMensaje('Reporte generado exitosamente')
      setTimeout(() => setMensaje(''), 3000)
    } catch (error) {
      setMensaje('Error: ' + error.message)
      setTimeout(() => setMensaje(''), 3000)
    }
    setCargando(false)
  }

  const generarReporte = () => {
    switch (tipoReporte) {
      case 'ventas':
        generarReporteVentas()
        break
      case 'stock':
        generarReporteStock()
        break
      case 'clientes':
        generarReporteClientes()
        break
      case 'cuentas':
        generarReporteCuentas()
        break
      default:
        break
    }
  }

  // Descargar como CSV
  const descargarCSV = () => {
    if (datos.length === 0) {
      setMensaje('No hay datos para descargar')
      setTimeout(() => setMensaje(''), 3000)
      return
    }

    let csv = ''
    
    if (tipoReporte === 'ventas') {
      // CSV para ventas con formato mejorado
      csv = 'N°,Fecha,Usuario,Estado,Total,Cantidad de Productos\n'
      datos.forEach(venta => {
        csv += `${venta['#']},${venta.fecha},"${venta.usuario}",${venta.estado},${venta.total},${venta.productos}\n`
      })
    } else {
      // CSV genérico para otros reportes
      const keys = Object.keys(datos[0])
      csv += keys.join(',') + '\n'

      datos.forEach(row => {
        csv += keys.map(key => {
          const valor = row[key]
          if (typeof valor === 'object') {
            return JSON.stringify(valor)
          }
          return `"${valor}"`
        }).join(',') + '\n'
      })
    }

    const link = document.createElement('a')
    const blob = new Blob([csv], { type: 'text/csv' })
    link.href = window.URL.createObjectURL(blob)
    link.download = `reporte-${tipoReporte}-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  // Imprimir reporte
  const imprimirReporte = () => {
    const ventana = window.open('', '', 'height=700,width=900')
    let tablaHTML = '<html><head><style>'
    tablaHTML += 'body { font-family: Arial, sans-serif; margin: 20px; }'
    tablaHTML += 'h1 { text-align: center; color: #333; }'
    tablaHTML += 'h2 { margin-top: 20px; color: #555; }'
    tablaHTML += 'table { width: 100%; border-collapse: collapse; margin: 20px 0; }'
    tablaHTML += 'th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }'
    tablaHTML += 'th { background-color: #4CAF50; color: white; }'
    tablaHTML += 'tr:nth-child(even) { background-color: #f9f9f9; }'
    tablaHTML += '.resumen { background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0; }'
    tablaHTML += '.resumen p { margin: 10px 0; font-weight: bold; }'
    tablaHTML += '</style></head><body>'
    
    tablaHTML += '<h1>📊 Reporte de ' + tipoReporte.charAt(0).toUpperCase() + tipoReporte.slice(1) + '</h1>'
    tablaHTML += '<p style="text-align: center; color: #666;">Generado: ' + new Date().toLocaleString('es-ES') + '</p>'
    
    if (resumen) {
      tablaHTML += '<div class="resumen"><h2>📈 Resumen</h2>'
      Object.keys(resumen).forEach(key => {
        let valor = resumen[key]
        if (typeof valor === 'number') {
          valor = valor.toFixed(2)
        }
        tablaHTML += '<p>' + key.charAt(0).toUpperCase() + key.slice(1) + ': ' + valor + '</p>'
      })
      tablaHTML += '</div>'
    }

    if (datos.length > 0) {
      if (tipoReporte === 'ventas') {
        // Tabla mejorada para ventas
        tablaHTML += '<h2>Detalle de Ventas</h2>'
        tablaHTML += '<table><thead><tr>'
        tablaHTML += '<th>N°</th><th>Fecha</th><th>Usuario</th><th>Estado</th><th>Total</th><th>Productos</th>'
        tablaHTML += '</tr></thead><tbody>'
        
        datos.forEach(venta => {
          tablaHTML += '<tr>'
          tablaHTML += '<td>' + venta['#'] + '</td>'
          tablaHTML += '<td>' + venta.fecha + '</td>'
          tablaHTML += '<td>' + venta.usuario + '</td>'
          tablaHTML += '<td>' + venta.estado + '</td>'
          tablaHTML += '<td>' + venta.total + '</td>'
          tablaHTML += '<td>' + venta.productos + '</td>'
          tablaHTML += '</tr>'
        })
        tablaHTML += '</tbody></table>'
      } else if (tipoReporte === 'stock') {
        // Tabla mejorada para stock
        tablaHTML += '<h2>Stock de Productos</h2>'
        tablaHTML += '<table><thead><tr>'
        tablaHTML += '<th>Nombre</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Valor Total</th>'
        tablaHTML += '</tr></thead><tbody>'
        
        datos.forEach(producto => {
          const valorTotal = producto.stock * producto.precio_venta
          tablaHTML += '<tr>'
          tablaHTML += '<td>' + producto.nombre + '</td>'
          tablaHTML += '<td>' + (producto.categorias?.nombre || 'Sin categoría') + '</td>'
          tablaHTML += '<td>$' + parseFloat(producto.precio_venta).toFixed(2) + '</td>'
          tablaHTML += '<td>' + producto.stock + '</td>'
          tablaHTML += '<td>$' + valorTotal.toFixed(2) + '</td>'
          tablaHTML += '</tr>'
        })
        tablaHTML += '</tbody></table>'
      } else {
        // Tabla genérica para otros reportes
        tablaHTML += '<table><thead><tr>'
        const keys = Object.keys(datos[0])
        keys.forEach(key => {
          tablaHTML += '<th>' + key + '</th>'
        })
        tablaHTML += '</tr></thead><tbody>'
        
        datos.forEach(row => {
          tablaHTML += '<tr>'
          keys.forEach(key => {
            const valor = typeof row[key] === 'object' ? JSON.stringify(row[key]) : row[key]
            tablaHTML += '<td>' + valor + '</td>'
          })
          tablaHTML += '</tr>'
        })
        tablaHTML += '</tbody></table>'
      }
    }

    tablaHTML += '</body></html>'
    ventana.document.write(tablaHTML)
    ventana.document.close()
    ventana.print()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-3 md:p-8">
      {/* Fondo decorativo */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-slate-700 to-transparent rounded-full opacity-5 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-slate-700 to-transparent rounded-full opacity-5 blur-3xl"></div>
      </div>

      {/* Mensaje de alerta */}
      {mensaje && (
        <div className="fixed top-4 right-4 backdrop-blur-md bg-slate-800/60 border border-slate-700 text-slate-100 px-4 md:px-6 py-3 md:py-4 rounded-2xl shadow-2xl z-50 animate-slide-in-right text-xs md:text-base">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-slate-400 rounded-full animate-pulse"></div>
            <span className="font-medium">{mensaje}</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-8 md:mb-12">
          <div className="backdrop-blur-md bg-slate-800/30 border border-slate-700 rounded-3xl p-6 md:p-8 mb-6 md:mb-8">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-slate-100 mb-2 md:mb-3">
              📊 Generador de Reportes
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm md:text-lg font-light">Analiza y descarga reportes de tu negocio</p>
          </div>
        </div>

        {/* Panel de Configuración */}
        <div className="backdrop-blur-md bg-slate-800/30 border border-slate-700 rounded-3xl p-6 md:p-8 shadow-2xl mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-100 mb-6 flex items-center gap-2 md:gap-3">
            <span className="text-3xl md:text-4xl">⚙️</span>
            <span>Configurar Reporte</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
            {/* Tipo de Reporte */}
            <div>
              <label className="block text-slate-300 text-xs md:text-sm font-semibold mb-2">Tipo de Reporte</label>
              <select
                value={tipoReporte}
                onChange={e => setTipoReporte(e.target.value)}
                className="w-full backdrop-blur-sm bg-slate-700/30 border border-slate-600 text-slate-100 rounded-xl px-3 sm:px-4 py-2 sm:py-3 focus:outline-none focus:border-slate-500 transition text-xs sm:text-base"
              >
                <option value="ventas">Ventas</option>
                <option value="stock">Stock de Productos</option>
                <option value="clientes">Clientes</option>
                <option value="cuentas">Cuentas</option>
              </select>
            </div>

            {/* Fecha Inicio (solo para ventas) */}
            {tipoReporte === 'ventas' && (
              <div>
                <label className="block text-slate-300 text-xs md:text-sm font-semibold mb-2">Fecha Inicio</label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={e => setFechaInicio(e.target.value)}
                  className="w-full backdrop-blur-sm bg-slate-700/30 border border-slate-600 text-slate-100 rounded-xl px-3 sm:px-4 py-2 sm:py-3 focus:outline-none focus:border-slate-500 transition text-xs sm:text-base"
                />
              </div>
            )}

            {/* Fecha Fin (solo para ventas) */}
            {tipoReporte === 'ventas' && (
              <div>
                <label className="block text-slate-300 text-xs md:text-sm font-semibold mb-2">Fecha Fin</label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={e => setFechaFin(e.target.value)}
                  className="w-full backdrop-blur-sm bg-slate-700/30 border border-slate-600 text-slate-100 rounded-xl px-3 sm:px-4 py-2 sm:py-3 focus:outline-none focus:border-slate-500 transition text-xs sm:text-base"
                />
              </div>
            )}

            {/* Botón Generar */}
            <div className="flex items-end">
              <button
                onClick={generarReporte}
                disabled={cargando}
                className="w-full relative overflow-hidden group bg-slate-700 hover:bg-slate-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 md:py-4 px-6 rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-lg text-xs sm:text-base"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <span className="relative">{cargando ? '⏳ Generando...' : '🔄 Generar'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Resumen */}
        {resumen && (
          <div className="backdrop-blur-md bg-slate-800/30 border border-slate-700 rounded-3xl p-6 md:p-8 shadow-2xl mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-100 mb-6 flex items-center gap-2 md:gap-3">
              <span className="text-3xl md:text-4xl">📈</span>
              <span>Resumen</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {tipoReporte === 'ventas' && (
                <>
                  <div className="backdrop-blur-sm bg-slate-700/30 border border-slate-600 rounded-2xl p-4 md:p-6">
                    <p className="text-slate-400 text-xs md:text-sm mb-2">Total de Ventas</p>
                    <p className="text-2xl md:text-3xl font-bold text-emerald-400">${resumen.totalVentas.toFixed(2)}</p>
                  </div>
                  <div className="backdrop-blur-sm bg-slate-700/30 border border-slate-600 rounded-2xl p-4 md:p-6">
                    <p className="text-slate-400 text-xs md:text-sm mb-2">Cantidad de Ventas</p>
                    <p className="text-2xl md:text-3xl font-bold text-blue-400">{resumen.cantidadVentas}</p>
                  </div>
                  <div className="backdrop-blur-sm bg-slate-700/30 border border-slate-600 rounded-2xl p-4 md:p-6">
                    <p className="text-slate-400 text-xs md:text-sm mb-2">Total de Productos</p>
                    <p className="text-2xl md:text-3xl font-bold text-purple-400">{resumen.totalProductos}</p>
                  </div>
                  <div className="backdrop-blur-sm bg-slate-700/30 border border-slate-600 rounded-2xl p-4 md:p-6">
                    <p className="text-slate-400 text-xs md:text-sm mb-2">Promedio por Venta</p>
                    <p className="text-2xl md:text-3xl font-bold text-orange-400">${resumen.promedio.toFixed(2)}</p>
                  </div>
                </>
              )}

              {tipoReporte === 'stock' && (
                <>
                  <div className="backdrop-blur-sm bg-slate-700/30 border border-slate-600 rounded-2xl p-4 md:p-6">
                    <p className="text-slate-400 text-xs md:text-sm mb-2">Stock Total</p>
                    <p className="text-2xl md:text-3xl font-bold text-blue-400">{resumen.stockTotal}</p>
                  </div>
                  <div className="backdrop-blur-sm bg-slate-700/30 border border-slate-600 rounded-2xl p-4 md:p-6">
                    <p className="text-slate-400 text-xs md:text-sm mb-2">Productos en Stock</p>
                    <p className="text-2xl md:text-3xl font-bold text-emerald-400">{resumen.productosStock}</p>
                  </div>
                  <div className="backdrop-blur-sm bg-slate-700/30 border border-slate-600 rounded-2xl p-4 md:p-6">
                    <p className="text-slate-400 text-xs md:text-sm mb-2">Productos Agotados</p>
                    <p className="text-2xl md:text-3xl font-bold text-red-400">{resumen.productosAgotados}</p>
                  </div>
                  <div className="backdrop-blur-sm bg-slate-700/30 border border-slate-600 rounded-2xl p-4 md:p-6">
                    <p className="text-slate-400 text-xs md:text-sm mb-2">Valor del Stock</p>
                    <p className="text-2xl md:text-3xl font-bold text-orange-400">${resumen.valorStock.toFixed(2)}</p>
                  </div>
                </>
              )}

              {tipoReporte === 'clientes' && (
                <>
                  <div className="backdrop-blur-sm bg-slate-700/30 border border-slate-600 rounded-2xl p-4 md:p-6">
                    <p className="text-slate-400 text-xs md:text-sm mb-2">Total de Clientes</p>
                    <p className="text-2xl md:text-3xl font-bold text-blue-400">{resumen.totalClientes}</p>
                  </div>
                  <div className="backdrop-blur-sm bg-slate-700/30 border border-slate-600 rounded-2xl p-4 md:p-6">
                    <p className="text-slate-400 text-xs md:text-sm mb-2">Clientes Activos</p>
                    <p className="text-2xl md:text-3xl font-bold text-emerald-400">{resumen.clientesActivos}</p>
                  </div>
                </>
              )}

              {tipoReporte === 'cuentas' && (
                <>
                  <div className="backdrop-blur-sm bg-slate-700/30 border border-slate-600 rounded-2xl p-4 md:p-6">
                    <p className="text-slate-400 text-xs md:text-sm mb-2">Total de Cuentas</p>
                    <p className="text-2xl md:text-3xl font-bold text-blue-400">{resumen.totalCuentas}</p>
                  </div>
                  <div className="backdrop-blur-sm bg-slate-700/30 border border-slate-600 rounded-2xl p-4 md:p-6">
                    <p className="text-slate-400 text-xs md:text-sm mb-2">Saldo Total</p>
                    <p className="text-2xl md:text-3xl font-bold text-emerald-400">${resumen.saldoTotal.toFixed(2)}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Tabla de Datos */}
        {datos.length > 0 && (
          <div className="space-y-6">
            {/* Botones de Acción */}
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
              <button
                onClick={descargarCSV}
                className="flex-1 relative overflow-hidden group bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 md:py-3 px-4 md:px-6 rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-lg text-xs md:text-base"
              >
                <span className="relative">📥 Descargar CSV</span>
              </button>
              <button
                onClick={imprimirReporte}
                className="flex-1 relative overflow-hidden group bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 md:py-3 px-4 md:px-6 rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-lg text-xs md:text-base"
              >
                <span className="relative">🖨️ Imprimir</span>
              </button>
            </div>

            {/* Tabla de VENTAS MEJORADA */}
            {tipoReporte === 'ventas' ? (
              <div className="backdrop-blur-md bg-slate-800/30 border border-slate-700 rounded-3xl p-6 md:p-8 shadow-2xl overflow-x-auto">
                <h2 className="text-2xl md:text-3xl font-bold text-slate-100 mb-6 flex items-center gap-2 md:gap-3">
                  <span className="text-3xl md:text-4xl">📋</span>
                  <span>Detalle de Ventas ({datos.length})</span>
                </h2>

                <div className="space-y-3">
                  {datos.map((venta, idx) => (
                    <div key={idx} className="backdrop-blur-sm bg-slate-700/30 border border-slate-600 rounded-xl p-4 md:p-5 hover:bg-slate-700/50 transition-all">
                      {/* Encabezado de la venta */}
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-600">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl font-black text-slate-400">#{venta['#']}</span>
                          <div>
                            <p className="font-bold text-slate-100">{venta.usuario}</p>
                            <p className="text-xs text-slate-400">{venta.fecha}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400 mb-1">{venta.estado}</p>
                          <p className="text-2xl font-black text-emerald-400">{venta.total}</p>
                        </div>
                      </div>

                      {/* Productos de la venta */}
                      {venta.detalles && venta.detalles.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-slate-400 uppercase">Productos ({venta.productos})</p>
                          {venta.detalles.map((detalle, didx) => (
                            <div key={didx} className="flex items-center justify-between bg-slate-800/30 rounded-lg p-3">
                              <div className="flex-1">
                                <p className="font-semibold text-slate-100">{detalle.productos?.nombre}</p>
                                <p className="text-xs text-slate-400">{detalle.cantidad} × ${detalle.precio}</p>
                              </div>
                              <p className="font-bold text-slate-300">${detalle.subtotal.toFixed(2)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : tipoReporte === 'stock' ? (
              // Vista mejorada para Stock de Productos
              <div className="backdrop-blur-md bg-slate-800/30 border border-slate-700 rounded-3xl p-6 md:p-8 shadow-2xl">
                <h2 className="text-2xl md:text-3xl font-bold text-slate-100 mb-6 flex items-center gap-2 md:gap-3">
                  <span className="text-3xl md:text-4xl">📦</span>
                  <span>Productos Registrados ({datos.length})</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {datos.map((p, idx) => (
                    <div
                      key={idx}
                      className="group relative overflow-hidden backdrop-blur-sm border border-slate-600 bg-slate-700/20 rounded-2xl shadow-lg transition-all duration-300 flex flex-col text-xs md:text-sm hover:border-slate-500 hover:shadow-2xl hover:shadow-slate-700/20 hover:scale-105"
                    >
                      {/* Glow Effect */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-slate-600/10 to-slate-600/5 transition-opacity duration-300"></div>

                      {/* Imagen de referencia */}
                      <div className="relative z-10 w-full h-32 md:h-48 bg-gradient-to-br from-slate-600/30 to-slate-700/30 border-b border-slate-600 flex items-center justify-center overflow-hidden">
                        {p.imagen_url ? (
                          <>
                            <img
                              src={p.imagen_url}
                              alt={p.nombre}
                              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent"></div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-500">
                            <span className="text-3xl md:text-4xl mb-2">🖼️</span>
                            <span className="text-xs md:text-sm">Sin imagen</span>
                          </div>
                        )}
                      </div>

                      {/* Contenido */}
                      <div className="relative z-10 p-4 md:p-5 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-3 md:mb-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-slate-100 text-sm md:text-lg mb-1 group-hover:text-slate-50 transition-colors line-clamp-2">{p.nombre}</h3>
                            <p className="text-xs text-slate-400 line-clamp-1">{p.categorias?.nombre}</p>
                          </div>
                        </div>

                        <div className="space-y-2 md:space-y-3 mb-3 md:mb-4 flex-1">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-xs md:text-sm">Precio:</span>
                            <span className="font-bold text-slate-100 text-base md:text-lg">${p.precio_venta}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-xs md:text-sm">Stock:</span>
                            <span className={`font-bold text-sm md:text-lg ${
                              p.stock > 5 ? 'text-slate-100' : p.stock > 0 ? 'text-slate-200' : 'text-slate-400'
                            }`}>
                              {p.stock}
                            </span>
                          </div>
                        </div>

                        <div className={`text-xs md:text-xs font-semibold rounded-lg px-2 md:px-3 py-1 md:py-2 text-center ${
                          p.stock > 5
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : p.stock > 0
                            ? 'bg-red-500/20 text-red-300'
                            : 'bg-red-600/20 text-red-400'
                        }`}>
                          {p.stock > 5 ? '✓ Stock disponible' : p.stock > 0 ? '⚠️ Stock bajo' : '❌ Sin stock'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="backdrop-blur-md bg-slate-800/30 border border-slate-700 rounded-3xl p-6 md:p-8 shadow-2xl overflow-x-auto">
                <h2 className="text-2xl md:text-3xl font-bold text-slate-100 mb-6 flex items-center gap-2 md:gap-3">
                  <span className="text-3xl md:text-4xl">📋</span>
                  <span>Datos Detallados ({datos.length})</span>
                </h2>

                <table className="w-full text-xs md:text-sm">
                  <thead>
                    <tr className="border-b border-slate-600">
                      {Object.keys(datos[0]).map(key => (
                        <th key={key} className="px-4 py-3 text-left font-semibold text-slate-300 text-xs md:text-sm">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {datos.map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-700 hover:bg-slate-700/20 transition-colors">
                        {Object.keys(datos[0]).map(key => (
                          <td key={key} className="px-4 py-3 text-slate-300">
                            {typeof row[key] === 'object' ? JSON.stringify(row[key]) : row[key]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {datos.length === 0 && resumen === null && (
          <div className="backdrop-blur-md bg-slate-800/30 border border-slate-700 rounded-3xl p-6 md:p-8 shadow-2xl text-center py-12 md:py-16">
            <div className="text-5xl md:text-6xl mb-3 md:mb-4 opacity-30">📊</div>
            <p className="text-slate-400 text-xs md:text-lg">Selecciona un tipo de reporte y haz clic en generar</p>
          </div>
        )}
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
