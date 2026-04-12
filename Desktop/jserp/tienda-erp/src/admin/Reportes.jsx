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

  const fmt = (n) => `$${parseFloat(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  // ========== REPORTE DE VENTAS ==========
  const generarReporteVentas = async () => {
    setCargando(true)
    try {
      let query = supabase
        .from('ventas')
        .select('*, detalle_ventas(*, productos(nombre))')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (fechaInicio) query = query.gte('created_at', fechaInicio + 'T00:00:00')
      if (fechaFin) query = query.lte('created_at', fechaFin + 'T23:59:59')

      const { data, error } = await query
      if (error) throw error

      const { data: usuarios } = await supabase.from('perfiles').select('id, nombre')
      const usuariosMap = {}
      if (usuarios) usuarios.forEach(u => { usuariosMap[u.id] = u.nombre || 'Desconocido' })

      const datosFormateados = (data || []).map((venta, i) => {
        const fecha = new Date(venta.created_at)
        const tipo = venta.tipo_venta || 'contado'
        return {
          '#': i + 1,
          fecha: fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }),
          hora: fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
          usuario: usuariosMap[venta.usuario_id] || 'Desconocido',
          tipo_venta: tipo,
          tipoLabel: tipo === 'contado' ? '💵 Contado' : tipo === 'credito' ? '💳 Crédito' : '🏷️ Apartado',
          estado: venta.estado,
          totalNum: parseFloat(venta.total || 0),
          total: fmt(venta.total),
          productos: venta.detalle_ventas?.length || 0,
          detalles: venta.detalle_ventas
        }
      })

      setDatos(datosFormateados)

      // Resumen enriquecido
      const totalVentas = data?.reduce((s, v) => s + parseFloat(v.total || 0), 0) || 0
      const cantidadVentas = data?.length || 0
      const promedio = cantidadVentas > 0 ? totalVentas / cantidadVentas : 0
      const totalProductos = data?.reduce((s, v) => s + (v.detalle_ventas?.length || 0), 0) || 0

      // Desglose por tipo
      const contado = data?.filter(v => (v.tipo_venta || 'contado') === 'contado') || []
      const credito = data?.filter(v => v.tipo_venta === 'credito') || []
      const apartado = data?.filter(v => v.tipo_venta === 'apartado') || []
      const totalContado = contado.reduce((s, v) => s + parseFloat(v.total || 0), 0)
      const totalCredito = credito.reduce((s, v) => s + parseFloat(v.total || 0), 0)
      const totalApartado = apartado.reduce((s, v) => s + parseFloat(v.total || 0), 0)

      // Top productos
      const productoConteo = {}
      data?.forEach(v => v.detalle_ventas?.forEach(d => {
        const name = d.productos?.nombre || 'Desconocido'
        if (!productoConteo[name]) productoConteo[name] = { cantidad: 0, total: 0 }
        productoConteo[name].cantidad += d.cantidad || 1
        productoConteo[name].total += parseFloat(d.subtotal || 0)
      }))
      const topProductos = Object.entries(productoConteo)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 5)
        .map(([nombre, info]) => ({ nombre, ...info }))

      setResumen({
        totalVentas, cantidadVentas, promedio, totalProductos,
        contado: { cantidad: contado.length, total: totalContado },
        credito: { cantidad: credito.length, total: totalCredito },
        apartado: { cantidad: apartado.length, total: totalApartado },
        topProductos
      })

      setMensaje('✅ Reporte generado')
      setTimeout(() => setMensaje(''), 3000)
    } catch (error) {
      setMensaje('Error: ' + error.message)
      setTimeout(() => setMensaje(''), 3000)
    }
    setCargando(false)
  }

  // ========== REPORTE DE STOCK ==========
  const generarReporteStock = async () => {
    setCargando(true)
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('*, categorias(nombre)')
        .eq('is_deleted', false)
        .order('stock', { ascending: true })

      if (error) throw error
      setDatos(data || [])

      const stockTotal = data?.reduce((s, p) => s + p.stock, 0) || 0
      const agotados = data?.filter(p => p.stock === 0) || []
      const stockBajo = data?.filter(p => p.stock > 0 && p.stock <= 5) || []
      const disponible = data?.filter(p => p.stock > 5) || []
      const valorStock = data?.reduce((s, p) => s + (p.stock * parseFloat(p.precio_venta || 0)), 0) || 0

      // Agrupar por categoría
      const porCategoria = {}
      data?.forEach(p => {
        const cat = p.categorias?.nombre || 'Sin categoría'
        if (!porCategoria[cat]) porCategoria[cat] = { cantidad: 0, stock: 0, valor: 0 }
        porCategoria[cat].cantidad++
        porCategoria[cat].stock += p.stock
        porCategoria[cat].valor += p.stock * parseFloat(p.precio_venta || 0)
      })

      setResumen({
        stockTotal, valorStock,
        totalProductos: data?.length || 0,
        agotados: agotados.length,
        stockBajo: stockBajo.length,
        disponible: disponible.length,
        alertas: [...agotados, ...stockBajo],
        porCategoria
      })

      setMensaje('✅ Reporte generado')
      setTimeout(() => setMensaje(''), 3000)
    } catch (error) {
      setMensaje('Error: ' + error.message)
      setTimeout(() => setMensaje(''), 3000)
    }
    setCargando(false)
  }

  // ========== REPORTE DE CLIENTES ==========
  const generarReporteClientes = async () => {
    setCargando(true)
    try {
      const { data: clientes, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nombre')
      if (error) throw error

      // Obtener ventas con cliente
      const { data: ventas } = await supabase
        .from('ventas')
        .select('id, total, tipo_venta, cliente_id, created_at')
        .eq('is_deleted', false)
        .not('cliente_id', 'is', null)

      // Obtener créditos
      const { data: creditos } = await supabase
        .from('creditos')
        .select('cliente_id, monto_total, monto_pagado, monto_pendiente, estado')

      // Enriquecer clientes
      const clientesEnriquecidos = (clientes || []).map(c => {
        const ventasCliente = ventas?.filter(v => v.cliente_id === c.id) || []
        const creditosCliente = creditos?.filter(cr => cr.cliente_id === c.id) || []
        const totalCompras = ventasCliente.reduce((s, v) => s + parseFloat(v.total || 0), 0)
        const deudaTotal = creditosCliente.reduce((s, cr) => s + parseFloat(cr.monto_pendiente || 0), 0)
        const creditosPendientes = creditosCliente.filter(cr => cr.estado === 'pendiente').length
        return {
          ...c,
          totalCompras,
          cantidadCompras: ventasCliente.length,
          deudaTotal,
          creditosPendientes,
          ultimaCompra: ventasCliente.length > 0
            ? new Date(ventasCliente.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0].created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
            : 'Sin compras'
        }
      }).sort((a, b) => b.totalCompras - a.totalCompras)

      setDatos(clientesEnriquecidos)

      const totalClientes = clientesEnriquecidos.length
      const totalComprasGlobal = clientesEnriquecidos.reduce((s, c) => s + c.totalCompras, 0)
      const deudaGlobal = clientesEnriquecidos.reduce((s, c) => s + c.deudaTotal, 0)
      const conDeuda = clientesEnriquecidos.filter(c => c.deudaTotal > 0).length

      setResumen({ totalClientes, totalComprasGlobal, deudaGlobal, conDeuda })

      setMensaje('✅ Reporte generado')
      setTimeout(() => setMensaje(''), 3000)
    } catch (error) {
      setMensaje('Error: ' + error.message)
      setTimeout(() => setMensaje(''), 3000)
    }
    setCargando(false)
  }

  // ========== REPORTE DE CUENTAS ==========
  const generarReporteCuentas = async () => {
    setCargando(true)
    try {
      const { data, error } = await supabase
        .from('cuentas')
        .select('*')
        .eq('is_deleted', false)
        .order('nombre')
      if (error) throw error

      // Obtener últimas transacciones
      const { data: transacciones } = await supabase
        .from('transacciones')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(20)

      setDatos(data || [])

      const saldoTotal = data?.reduce((s, c) => s + parseFloat(c.saldo || 0), 0) || 0
      const totalCuentas = data?.length || 0
      const ingresos = transacciones?.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + parseFloat(t.monto || 0), 0) || 0
      const egresos = transacciones?.filter(t => t.tipo === 'egreso').reduce((s, t) => s + parseFloat(t.monto || 0), 0) || 0

      setResumen({ saldoTotal, totalCuentas, ingresos, egresos, transacciones: transacciones || [] })

      setMensaje('✅ Reporte generado')
      setTimeout(() => setMensaje(''), 3000)
    } catch (error) {
      setMensaje('Error: ' + error.message)
      setTimeout(() => setMensaje(''), 3000)
    }
    setCargando(false)
  }

  const generarReporte = () => {
    switch (tipoReporte) {
      case 'ventas': generarReporteVentas(); break
      case 'stock': generarReporteStock(); break
      case 'clientes': generarReporteClientes(); break
      case 'cuentas': generarReporteCuentas(); break
      default: break
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

        {/* ========== RESUMEN Y DATOS ========== */}
        {resumen && (
          <div className="space-y-6">
            {/* Botones de Acción */}
            {datos.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={descargarCSV} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-5 rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-lg text-xs md:text-sm">
                  📥 Descargar CSV
                </button>
                <button onClick={imprimirReporte} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-5 rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-lg text-xs md:text-sm">
                  🖨️ Imprimir Reporte
                </button>
              </div>
            )}

            {/* ===================== REPORTE VENTAS ===================== */}
            {tipoReporte === 'ventas' && (
              <>
                {/* KPIs principales */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                  <div className="backdrop-blur-sm bg-slate-800/40 border border-slate-700 rounded-2xl p-4 md:p-5">
                    <p className="text-slate-400 text-xs mb-1">Ingreso Total</p>
                    <p className="text-xl md:text-2xl font-black text-emerald-400">{fmt(resumen.totalVentas)}</p>
                  </div>
                  <div className="backdrop-blur-sm bg-slate-800/40 border border-slate-700 rounded-2xl p-4 md:p-5">
                    <p className="text-slate-400 text-xs mb-1">Ventas Realizadas</p>
                    <p className="text-xl md:text-2xl font-black text-blue-400">{resumen.cantidadVentas}</p>
                  </div>
                  <div className="backdrop-blur-sm bg-slate-800/40 border border-slate-700 rounded-2xl p-4 md:p-5">
                    <p className="text-slate-400 text-xs mb-1">Ticket Promedio</p>
                    <p className="text-xl md:text-2xl font-black text-amber-400">{fmt(resumen.promedio)}</p>
                  </div>
                  <div className="backdrop-blur-sm bg-slate-800/40 border border-slate-700 rounded-2xl p-4 md:p-5">
                    <p className="text-slate-400 text-xs mb-1">Productos Vendidos</p>
                    <p className="text-xl md:text-2xl font-black text-purple-400">{resumen.totalProductos}</p>
                  </div>
                </div>

                {/* Desglose por Tipo de Venta */}
                <div className="backdrop-blur-md bg-slate-800/30 border border-slate-700 rounded-2xl p-5 md:p-6">
                  <h3 className="text-lg font-bold text-slate-100 mb-4">💰 Desglose por Tipo de Pago</h3>
                  <div className="space-y-3">
                    {[
                      { label: '💵 Contado', data: resumen.contado, color: 'bg-emerald-500', textColor: 'text-emerald-400' },
                      { label: '💳 Crédito', data: resumen.credito, color: 'bg-amber-500', textColor: 'text-amber-400' },
                      { label: '🏷️ Apartado', data: resumen.apartado, color: 'bg-blue-500', textColor: 'text-blue-400' },
                    ].map((item, i) => {
                      const pct = resumen.totalVentas > 0 ? (item.data.total / resumen.totalVentas) * 100 : 0
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-slate-300 text-xs md:text-sm w-28 flex-shrink-0">{item.label}</span>
                          <div className="flex-1 bg-slate-700/40 rounded-full h-5 md:h-6 overflow-hidden">
                            <div className={`${item.color} h-full rounded-full transition-all duration-700 flex items-center justify-end pr-2`} style={{ width: `${Math.max(pct, 2)}%` }}>
                              {pct > 15 && <span className="text-[10px] font-bold text-white">{pct.toFixed(0)}%</span>}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 w-32">
                            <span className={`font-bold text-sm ${item.textColor}`}>{fmt(item.data.total)}</span>
                            <span className="text-slate-500 text-xs ml-1">({item.data.cantidad})</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Top Productos + Tabla lado a lado en desktop */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                  {/* Top 5 Productos más vendidos */}
                  {resumen.topProductos?.length > 0 && (
                    <div className="backdrop-blur-md bg-slate-800/30 border border-slate-700 rounded-2xl p-5 md:p-6">
                      <h3 className="text-lg font-bold text-slate-100 mb-4">🏆 Top Productos</h3>
                      <div className="space-y-3">
                        {resumen.topProductos.map((prod, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <span className={`text-lg font-black w-7 text-center ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-500'}`}>
                              {i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-slate-100 font-semibold text-sm truncate">{prod.nombre}</p>
                              <p className="text-slate-500 text-xs">{prod.cantidad} uds vendidas</p>
                            </div>
                            <span className="text-emerald-400 font-bold text-sm flex-shrink-0">{fmt(prod.total)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tabla de ventas */}
                  <div className="lg:col-span-2 backdrop-blur-md bg-slate-800/30 border border-slate-700 rounded-2xl p-5 md:p-6 overflow-x-auto">
                    <h3 className="text-lg font-bold text-slate-100 mb-4">📋 Detalle de Ventas ({datos.length})</h3>
                    <table className="w-full text-xs md:text-sm">
                      <thead>
                        <tr className="border-b border-slate-600 text-slate-400">
                          <th className="py-2 pr-3 text-left">#</th>
                          <th className="py-2 pr-3 text-left">Fecha</th>
                          <th className="py-2 pr-3 text-left hidden md:table-cell">Hora</th>
                          <th className="py-2 pr-3 text-left">Tipo</th>
                          <th className="py-2 pr-3 text-left hidden sm:table-cell">Productos</th>
                          <th className="py-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {datos.map((v, idx) => (
                          <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                            <td className="py-2.5 pr-3 text-slate-500 font-mono">{v['#']}</td>
                            <td className="py-2.5 pr-3 text-slate-300">{v.fecha}</td>
                            <td className="py-2.5 pr-3 text-slate-500 hidden md:table-cell">{v.hora}</td>
                            <td className="py-2.5 pr-3">
                              <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] md:text-xs font-semibold ${
                                v.tipo_venta === 'contado' ? 'bg-emerald-500/20 text-emerald-300' :
                                v.tipo_venta === 'credito' ? 'bg-amber-500/20 text-amber-300' :
                                'bg-blue-500/20 text-blue-300'
                              }`}>{v.tipoLabel}</span>
                            </td>
                            <td className="py-2.5 pr-3 text-slate-400 hidden sm:table-cell">{v.productos} items</td>
                            <td className="py-2.5 text-right font-bold text-slate-100">{v.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* ===================== REPORTE STOCK ===================== */}
            {tipoReporte === 'stock' && (
              <>
                {/* KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                  <div className="backdrop-blur-sm bg-slate-800/40 border border-slate-700 rounded-2xl p-4 md:p-5">
                    <p className="text-slate-400 text-xs mb-1">Total Productos</p>
                    <p className="text-xl md:text-2xl font-black text-blue-400">{resumen.totalProductos}</p>
                  </div>
                  <div className="backdrop-blur-sm bg-slate-800/40 border border-slate-700 rounded-2xl p-4 md:p-5">
                    <p className="text-slate-400 text-xs mb-1">Unidades en Stock</p>
                    <p className="text-xl md:text-2xl font-black text-slate-100">{resumen.stockTotal}</p>
                  </div>
                  <div className="backdrop-blur-sm bg-slate-800/40 border border-slate-700 rounded-2xl p-4 md:p-5">
                    <p className="text-slate-400 text-xs mb-1">Valor del Inventario</p>
                    <p className="text-xl md:text-2xl font-black text-emerald-400">{fmt(resumen.valorStock)}</p>
                  </div>
                  <div className="backdrop-blur-sm bg-slate-800/40 border border-red-500/30 rounded-2xl p-4 md:p-5">
                    <p className="text-slate-400 text-xs mb-1">⚠️ Requieren Acción</p>
                    <p className="text-xl md:text-2xl font-black text-red-400">{resumen.agotados + resumen.stockBajo}</p>
                    <p className="text-[10px] text-red-400/70">{resumen.agotados} agotados · {resumen.stockBajo} stock bajo</p>
                  </div>
                </div>

                {/* Alertas de stock */}
                {resumen.alertas?.length > 0 && (
                  <div className="backdrop-blur-md bg-red-950/20 border border-red-500/30 rounded-2xl p-5 md:p-6">
                    <h3 className="text-lg font-bold text-red-300 mb-3">🚨 Productos que Necesitas Resurtir</h3>
                    <p className="text-red-400/60 text-xs mb-4">Estos productos necesitan atención inmediata para no perder ventas</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {resumen.alertas.map((p, i) => (
                        <div key={i} className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${p.stock === 0 ? 'bg-red-500/10 border border-red-500/20' : 'bg-amber-500/10 border border-amber-500/20'}`}>
                          <div className="min-w-0 flex-1">
                            <p className="text-slate-100 font-semibold text-sm truncate">{p.nombre}</p>
                            <p className="text-slate-500 text-[10px]">{p.categorias?.nombre || 'Sin cat.'} · {fmt(p.precio_venta)}</p>
                          </div>
                          <span className={`font-black text-sm ml-2 flex-shrink-0 ${p.stock === 0 ? 'text-red-400' : 'text-amber-400'}`}>
                            {p.stock === 0 ? '❌ AGOTADO' : `⚠️ ${p.stock} uds`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resumen por Categoría */}
                {resumen.porCategoria && Object.keys(resumen.porCategoria).length > 0 && (
                  <div className="backdrop-blur-md bg-slate-800/30 border border-slate-700 rounded-2xl p-5 md:p-6">
                    <h3 className="text-lg font-bold text-slate-100 mb-4">📂 Inventario por Categoría</h3>
                    <div className="space-y-2">
                      {Object.entries(resumen.porCategoria).sort((a, b) => b[1].valor - a[1].valor).map(([cat, info], i) => (
                        <div key={i} className="flex items-center justify-between bg-slate-700/20 border border-slate-700 rounded-xl px-4 py-3">
                          <div>
                            <p className="text-slate-100 font-semibold text-sm">{cat}</p>
                            <p className="text-slate-500 text-xs">{info.cantidad} productos · {info.stock} unidades</p>
                          </div>
                          <span className="text-emerald-400 font-bold text-sm">{fmt(info.valor)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tabla completa de productos */}
                <div className="backdrop-blur-md bg-slate-800/30 border border-slate-700 rounded-2xl p-5 md:p-6 overflow-x-auto">
                  <h3 className="text-lg font-bold text-slate-100 mb-4">📦 Todos los Productos ({datos.length})</h3>
                  <table className="w-full text-xs md:text-sm">
                    <thead>
                      <tr className="border-b border-slate-600 text-slate-400">
                        <th className="py-2 pr-3 text-left">Producto</th>
                        <th className="py-2 pr-3 text-left hidden sm:table-cell">Categoría</th>
                        <th className="py-2 pr-3 text-right">Precio</th>
                        <th className="py-2 pr-3 text-center">Stock</th>
                        <th className="py-2 text-right">Valor Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datos.map((p, idx) => (
                        <tr key={idx} className={`border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors ${p.stock === 0 ? 'opacity-60' : ''}`}>
                          <td className="py-2.5 pr-3 text-slate-100 font-medium">{p.nombre}</td>
                          <td className="py-2.5 pr-3 text-slate-400 hidden sm:table-cell">{p.categorias?.nombre || '—'}</td>
                          <td className="py-2.5 pr-3 text-right text-slate-300">{fmt(p.precio_venta)}</td>
                          <td className="py-2.5 pr-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-bold ${
                              p.stock === 0 ? 'bg-red-500/20 text-red-400' :
                              p.stock <= 5 ? 'bg-amber-500/20 text-amber-400' :
                              'bg-emerald-500/20 text-emerald-400'
                            }`}>{p.stock}</span>
                          </td>
                          <td className="py-2.5 text-right font-semibold text-slate-100">{fmt(p.stock * parseFloat(p.precio_venta || 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ===================== REPORTE CLIENTES ===================== */}
            {tipoReporte === 'clientes' && (
              <>
                {/* KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                  <div className="backdrop-blur-sm bg-slate-800/40 border border-slate-700 rounded-2xl p-4 md:p-5">
                    <p className="text-slate-400 text-xs mb-1">Total Clientes</p>
                    <p className="text-xl md:text-2xl font-black text-blue-400">{resumen.totalClientes}</p>
                  </div>
                  <div className="backdrop-blur-sm bg-slate-800/40 border border-slate-700 rounded-2xl p-4 md:p-5">
                    <p className="text-slate-400 text-xs mb-1">Total en Compras</p>
                    <p className="text-xl md:text-2xl font-black text-emerald-400">{fmt(resumen.totalComprasGlobal)}</p>
                  </div>
                  <div className="backdrop-blur-sm bg-slate-800/40 border border-slate-700 rounded-2xl p-4 md:p-5">
                    <p className="text-slate-400 text-xs mb-1">Deuda Pendiente</p>
                    <p className="text-xl md:text-2xl font-black text-red-400">{fmt(resumen.deudaGlobal)}</p>
                  </div>
                  <div className="backdrop-blur-sm bg-slate-800/40 border border-slate-700 rounded-2xl p-4 md:p-5">
                    <p className="text-slate-400 text-xs mb-1">Clientes con Deuda</p>
                    <p className="text-xl md:text-2xl font-black text-amber-400">{resumen.conDeuda}</p>
                  </div>
                </div>

                {/* Tabla de clientes */}
                <div className="backdrop-blur-md bg-slate-800/30 border border-slate-700 rounded-2xl p-5 md:p-6 overflow-x-auto">
                  <h3 className="text-lg font-bold text-slate-100 mb-4">👥 Detalle de Clientes (ordenados por compras)</h3>
                  <table className="w-full text-xs md:text-sm">
                    <thead>
                      <tr className="border-b border-slate-600 text-slate-400">
                        <th className="py-2 pr-3 text-left">#</th>
                        <th className="py-2 pr-3 text-left">Cliente</th>
                        <th className="py-2 pr-3 text-center hidden sm:table-cell">Compras</th>
                        <th className="py-2 pr-3 text-right">Total Comprado</th>
                        <th className="py-2 pr-3 text-right">Deuda</th>
                        <th className="py-2 text-right hidden md:table-cell">Última Compra</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datos.map((c, idx) => (
                        <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                          <td className="py-2.5 pr-3 text-slate-500 font-mono">{idx + 1}</td>
                          <td className="py-2.5 pr-3">
                            <p className="text-slate-100 font-semibold">{c.nombre}</p>
                            {c.telefono && <p className="text-slate-500 text-[10px]">{c.telefono}</p>}
                          </td>
                          <td className="py-2.5 pr-3 text-center text-slate-300 hidden sm:table-cell">{c.cantidadCompras}</td>
                          <td className="py-2.5 pr-3 text-right font-bold text-emerald-400">{fmt(c.totalCompras)}</td>
                          <td className="py-2.5 pr-3 text-right">
                            {c.deudaTotal > 0 ? (
                              <span className="text-red-400 font-bold">{fmt(c.deudaTotal)}</span>
                            ) : (
                              <span className="text-slate-600 text-xs">Sin deuda</span>
                            )}
                          </td>
                          <td className="py-2.5 text-right text-slate-400 hidden md:table-cell text-xs">{c.ultimaCompra}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ===================== REPORTE CUENTAS ===================== */}
            {tipoReporte === 'cuentas' && (
              <>
                {/* KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                  <div className="backdrop-blur-sm bg-slate-800/40 border border-slate-700 rounded-2xl p-4 md:p-5">
                    <p className="text-slate-400 text-xs mb-1">Total Cuentas</p>
                    <p className="text-xl md:text-2xl font-black text-blue-400">{resumen.totalCuentas}</p>
                  </div>
                  <div className="backdrop-blur-sm bg-slate-800/40 border border-slate-700 rounded-2xl p-4 md:p-5">
                    <p className="text-slate-400 text-xs mb-1">Saldo Total</p>
                    <p className="text-xl md:text-2xl font-black text-emerald-400">{fmt(resumen.saldoTotal)}</p>
                  </div>
                  <div className="backdrop-blur-sm bg-slate-800/40 border border-slate-700 rounded-2xl p-4 md:p-5">
                    <p className="text-slate-400 text-xs mb-1">Ingresos Recientes</p>
                    <p className="text-xl md:text-2xl font-black text-green-400">{fmt(resumen.ingresos)}</p>
                  </div>
                  <div className="backdrop-blur-sm bg-slate-800/40 border border-slate-700 rounded-2xl p-4 md:p-5">
                    <p className="text-slate-400 text-xs mb-1">Egresos Recientes</p>
                    <p className="text-xl md:text-2xl font-black text-red-400">{fmt(resumen.egresos)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                  {/* Saldos por cuenta */}
                  <div className="backdrop-blur-md bg-slate-800/30 border border-slate-700 rounded-2xl p-5 md:p-6">
                    <h3 className="text-lg font-bold text-slate-100 mb-4">🏦 Saldos por Cuenta</h3>
                    <div className="space-y-2">
                      {datos.map((c, i) => (
                        <div key={i} className="flex items-center justify-between bg-slate-700/20 border border-slate-700 rounded-xl px-4 py-3">
                          <p className="text-slate-100 font-semibold text-sm">{c.nombre}</p>
                          <span className={`font-black text-sm ${parseFloat(c.saldo || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {fmt(c.saldo)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Últimas transacciones */}
                  {resumen.transacciones?.length > 0 && (
                    <div className="backdrop-blur-md bg-slate-800/30 border border-slate-700 rounded-2xl p-5 md:p-6">
                      <h3 className="text-lg font-bold text-slate-100 mb-4">📜 Últimos Movimientos</h3>
                      <div className="space-y-1.5 max-h-80 overflow-y-auto">
                        {resumen.transacciones.map((t, i) => (
                          <div key={i} className="flex items-center gap-3 bg-slate-700/20 rounded-lg px-3 py-2">
                            <span className={`text-lg ${t.tipo === 'ingreso' ? '📈' : '📉'}`}></span>
                            <div className="flex-1 min-w-0">
                              <p className="text-slate-300 text-xs truncate">{t.descripcion || 'Sin descripción'}</p>
                              <p className="text-slate-600 text-[10px]">{new Date(t.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}</p>
                            </div>
                            <span className={`font-bold text-sm flex-shrink-0 ${t.tipo === 'ingreso' ? 'text-emerald-400' : 'text-red-400'}`}>
                              {t.tipo === 'ingreso' ? '+' : '-'}{fmt(t.monto)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
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
