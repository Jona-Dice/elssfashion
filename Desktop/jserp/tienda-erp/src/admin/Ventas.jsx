import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { registerAccountTransaction } from '../lib/account'

export default function Ventas() {
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null)
  const [carrito, setCarrito] = useState([])
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [showTrash, setShowTrash] = useState(false)
  const [ventasTrash, setVentasTrash] = useState([])

  // 🔄 Cargar categorías
  const cargarCategorias = async () => {
    const { data } = await supabase.from('categorias').select('*').eq('is_deleted', false).order('nombre')
    setCategorias(data || [])
  }

  // 🔄 Cargar productos
  const cargarProductos = async () => {
    const { data, error } = await supabase
      .from('productos')
      .select('*, categorias(nombre)')
      .eq('is_deleted', false)
      .order('nombre')

    if (!error) setProductos(data || [])
  }

  // 🔄 Cargar ventas en papelera
  const cargarVentasTrash = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('ventas')
      .select('*')
      .eq('usuario_id', user.id)
      .eq('is_deleted', true)
      .order('created_at', { ascending: false })

    setVentasTrash(data || [])
  }

  // 🔢 Contar productos filtrados
  const getProductosFiltrados = () => {
    return productos.filter(p => 
      !categoriaSeleccionada || 
      p.categorias?.nombre === categorias.find(c => c.id.toString() === categoriaSeleccionada)?.nombre
    )
  }

  // 🔄 Cargar clientes
  const cargarClientes = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('usuario_id', user.id)
      .order('nombre')

    if (error) {
      console.error('Error al cargar clientes:', error)
      setClientes([])
      return
    }

    setClientes(data || [])
  }

  const [clientes, setClientes] = useState([])
  const [tipoVenta, setTipoVenta] = useState('contado')
  const [clienteSeleccionado, setClienteSeleccionado] = useState('')
  const [showModalCredito, setShowModalCredito] = useState(false)

  useEffect(() => {
    cargarProductos()
    cargarCategorias()
    cargarClientes()
    cargarVentasTrash()
  }, [])

  // ➕ Agregar producto al carrito (con límite de stock)
  const agregarProducto = (producto) => {
    if (producto.stock <= 0) {
      setMensaje('Producto sin stock')
      setTimeout(() => setMensaje(''), 3000)
      return
    }

    setCarrito(prevCarrito => {
      const existe = prevCarrito.find(p => p.id === producto.id)

      if (existe) {
        // Validar que no exceda el stock disponible
        if (existe.cantidad >= producto.stock) {
          setMensaje(`⚠️ Stock máximo alcanzado (${producto.stock} disponibles)`)
          setTimeout(() => setMensaje(''), 3000)
          return prevCarrito
        }
        return prevCarrito.map(p =>
          p.id === producto.id
            ? { ...p, cantidad: p.cantidad + 1 }
            : p
        )
      } else {
        return [...prevCarrito, { ...producto, cantidad: 1 }]
      }
    })

    setMensaje(`✅ Agregado: ${producto.nombre}`)
    setTimeout(() => setMensaje(''), 2000)
  }

  // ❌ Eliminar del carrito
  const eliminarDelCarrito = (id) => {
    setCarrito(prevCarrito => prevCarrito.filter(p => p.id !== id))
  }

  // 💰 Total
  const total = carrito.reduce((sum, p) => {
    return sum + (parseFloat(p.precio_venta) || 0) * (p.cantidad || 1)
  }, 0)

  // 🧾 Registrar venta (tipoOverride permite forzar tipo sin depender de setState asíncrono)
  const registrarVenta = async (tipoOverride) => {
    const tipoFinal = tipoOverride || tipoVenta

    if (carrito.length === 0) {
      setMensaje('El carrito está vacío')
      setTimeout(() => setMensaje(''), 3000)
      return
    }

    // 🆕 VALIDACIÓN: Cliente obligatorio en crédito
    if (tipoFinal === 'credito' && !clienteSeleccionado) {
      setMensaje('❌ Debes seleccionar un cliente para venta a crédito')
      setTimeout(() => setMensaje(''), 3000)
      return
    }

    setLoading(true)

    // 🔐 Usuario autenticado
    const {
      data: { user },
      error: errorUser
    } = await supabase.auth.getUser()

    if (errorUser || !user) {
      setMensaje('Usuario no autenticado')
      setLoading(false)
      setTimeout(() => setMensaje(''), 3000)
      return
    }

    // 🧾 Crear venta
    const { data: venta, error: errorVenta } = await supabase
      .from('ventas')
      .insert({
        total,
        estado: tipoFinal === 'apartado' ? 'apartado' : 'venta',
        tipo_venta: tipoFinal,
        cliente_id: tipoFinal === 'credito' ? clienteSeleccionado : null,
        usuario_id: user.id
      })
      .select()
      .single()

    if (errorVenta || !venta) {
      console.error(errorVenta)
      setMensaje('Error al registrar la venta')
      setLoading(false)
      setTimeout(() => setMensaje(''), 3000)
      return
    }

    // 📦 Detalle de venta + descontar stock
    for (const p of carrito) {
      const { error: errorDetalle } = await supabase
        .from('detalle_ventas')
        .insert({
          venta_id: venta.id,
          producto_id: p.id,
          cantidad: p.cantidad,
          precio: p.precio_venta,
          subtotal: p.precio_venta * p.cantidad
        })

      if (errorDetalle) {
        console.error(errorDetalle)
        setMensaje('Error al registrar detalle de venta')
        setLoading(false)
        setTimeout(() => setMensaje(''), 3000)
        return
      }

      // 📉 Descontar stock del producto
      const nuevoStock = Math.max(0, p.stock - p.cantidad)
      const { error: errorStock } = await supabase
        .from('productos')
        .update({ stock: nuevoStock })
        .eq('id', p.id)

      if (errorStock) {
        console.error('Error al descontar stock:', errorStock)
      }
    }

    // 💳 Si es venta a crédito, crear registro en tabla creditos
    if (tipoFinal === 'credito' && clienteSeleccionado) {
      const { error: errorCredito } = await supabase
        .from('creditos')
        .insert({
          cliente_id: clienteSeleccionado,
          venta_id: venta.id,
          monto_total: total,
          monto_pagado: 0,
          monto_pendiente: total,
          estado: 'pendiente',
          usuario_id: user.id
        })
        .select()

      if (errorCredito) {
        console.error('ERROR al crear crédito:', errorCredito)
        setMensaje('❌ Error al crear el crédito: ' + (errorCredito.message || JSON.stringify(errorCredito)))
        setLoading(false)
        setTimeout(() => setMensaje(''), 5000)
        return
      }
    }

    // 🔄 Recargar productos (con stock actualizado)
    await cargarProductos()
    
    // 💳 Registrar transacción contable
    if (tipoFinal === 'contado') {
      const descripcionProductos = carrito.map(p => `${p.cantidad}x ${p.nombre}`).join(', ')
      try {
        await registerAccountTransaction({
          usuarioId: user.id,
          tipo: 'ingreso',
          monto: total,
          descripcion: `Venta ${venta.id}: ${descripcionProductos}`
        })
      } catch (err) {
        console.error('Error registrando transacción en cuenta principal', err)
        setMensaje('Venta registrada, pero error al actualizar la cuenta principal')
        setTimeout(() => setMensaje(''), 3000)
      }
    } else if (tipoFinal === 'credito' && clienteSeleccionado) {
      const clienteNombre = clientes.find(c => c.id === clienteSeleccionado)?.nombre || 'Cliente'
      const descripcionProductos = carrito.map(p => `${p.cantidad}x ${p.nombre}`).join(', ')
      
      try {
        await registerAccountTransaction({
          usuarioId: user.id,
          tipo: 'ingreso',
          monto: total,
          descripcion: `Crédito a ${clienteNombre} - Venta ${venta.id}: ${descripcionProductos}`,
          esCredito: true
        })
      } catch (err) {
        console.error('Error registrando transacción de crédito', err)
        setMensaje('⚠️ Venta a crédito registrada pero error en flujo de caja')
        setTimeout(() => setMensaje(''), 3000)
      }
    }
    
    // Limpiar carrito
    setCarrito([])
    setLoading(false)
    setMensaje(`Venta ${tipoFinal === 'contado' ? 'realizada' : tipoFinal === 'apartado' ? 'apartada' : 'a crédito'} correctamente ✅`)
    setTimeout(() => setMensaje(''), 3000)
  }

  // 🗑️ Mover venta a papelera
  const moverVentaPapelera = async (id) => {
    try {
      const { error } = await supabase.from('ventas').update({ is_deleted: true }).eq('id', id)
      
      if (error) {
        setMensaje('❌ Error al mover venta a papelera')
        console.error('Error:', error)
        return
      }
      
      setMensaje('✅ Venta movida a papelera')
      setTimeout(() => setMensaje(''), 3000)
      await cargarVentasTrash()
    } catch (error) {
      setMensaje('❌ Error al mover venta a papelera')
      console.error('Error:', error)
      setTimeout(() => setMensaje(''), 3000)
    }
  }

  // ↩️ Recuperar venta
  const recuperarVenta = async (id) => {
    await supabase.from('ventas').update({ is_deleted: false }).eq('id', id)
    setMensaje('Venta restaurada')
    setTimeout(() => setMensaje(''), 3000)
    cargarVentasTrash()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-3 md:p-8">
      {/* Fondo decorativo sutil */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-slate-700 to-transparent rounded-full opacity-5 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-slate-700 to-transparent rounded-full opacity-5 blur-3xl"></div>
      </div>

      {/* Mensaje de alerta mejorado */}
      {mensaje && (
        <div className="fixed top-4 right-4 backdrop-blur-md bg-slate-800/60 border border-slate-700 text-slate-100 px-4 md:px-6 py-3 md:py-4 rounded-2xl shadow-2xl z-50 animate-slide-in-right text-xs md:text-base">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-slate-400 rounded-full animate-pulse"></div>
            <span className="font-medium">{mensaje}</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header Premium */}
        <div className="mb-8 md:mb-12">
          <div className="backdrop-blur-md bg-slate-800/30 border border-slate-700 rounded-3xl p-6 md:p-8 mb-6 md:mb-8">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-slate-100 mb-2 md:mb-3">
              💼 Elss Fashion Shop
            </h1>
            <p className="text-slate-400 text-sm md:text-lg font-light">Gestiona tus ventas y apartados con diseño profesional</p>
            <button
              onClick={() => setShowTrash(!showTrash)}
              className={`mt-4 font-bold px-4 md:px-6 py-2 md:py-3 rounded-xl transition transform hover:scale-105 active:scale-95 shadow-lg text-xs sm:text-base whitespace-nowrap ${showTrash ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
            >
              {showTrash ? '💼 Ventas' : '🗑️ Papelera'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Sección de Productos - Mejorada */}
          <div className="lg:col-span-2 space-y-6">
            <div className="backdrop-blur-md bg-slate-800/30 border border-slate-700 rounded-3xl p-6 md:p-8 shadow-2xl">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-100 mb-6 md:mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <span className="text-3xl md:text-4xl">📦</span> 
                <span>Catálogo de Productos</span>
                <span className="ml-0 sm:ml-auto text-xs md:text-sm font-normal text-slate-400 bg-slate-700/40 px-3 md:px-4 py-1 md:py-2 rounded-full">
                  {getProductosFiltrados().length} disponibles
                </span>
              </h2>

              {/* Selector de categorías */}
              {productos.length > 0 && (
                <div className="mb-6 flex gap-2 items-center flex-wrap">
                  <label className="text-slate-300 text-sm font-semibold whitespace-nowrap">Filtrar por:</label>
                  <select
                    value={categoriaSeleccionada || ''}
                    onChange={(e) => setCategoriaSeleccionada(e.target.value || null)}
                    className="backdrop-blur-sm bg-slate-700/30 border border-slate-600 text-slate-100 rounded-xl px-3 sm:px-4 py-2 sm:py-3 focus:outline-none focus:border-slate-500 transition text-xs sm:text-base"
                  >
                    <option value="" className="bg-slate-800">📂 Todas las categorías</option>
                    {categorias.map(cat => (
                      <option key={cat.id} value={cat.id} className="bg-slate-800">
                        📁 {cat.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {productos.length === 0 ? (
                <div className="text-center py-12 md:py-16">
                  <div className="text-5xl md:text-6xl mb-3 md:mb-4 opacity-30">📭</div>
                  <p className="text-slate-500 text-sm md:text-lg">No hay productos disponibles en este momento</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
                    {getProductosFiltrados().map(p => (
                    <button
                      key={p.id}
                      onClick={() => agregarProducto(p)}
                      disabled={p.stock <= 0}
                      className={`relative group overflow-hidden rounded-xl transition-all duration-300 transform text-left text-xs ${
                        p.stock <= 0
                          ? 'bg-slate-700/20 opacity-40 cursor-not-allowed border border-slate-700'
                          : 'backdrop-blur-sm bg-slate-700/30 border border-slate-600 hover:border-slate-500 hover:shadow-lg hover:shadow-slate-700/20 hover:scale-105 active:scale-95'
                      }`}
                    >
                      {/* Glow Effect */}
                      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${p.stock > 0 ? 'bg-gradient-to-r from-slate-600/20 to-slate-600/10' : ''}`}></div>

                      {/* Imagen */}
                      <div className="relative w-full h-24 sm:h-28 lg:h-40 bg-gradient-to-br from-slate-600/30 to-slate-700/30 flex items-center justify-center overflow-hidden">
                        {p.imagen_url ? (
                          <>
                            <img
                              src={p.imagen_url}
                              alt={p.nombre}
                              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent"></div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-500">
                            <span className="text-2xl md:text-3xl">🖼️</span>
                          </div>
                        )}
                      </div>

                      {/* Contenido */}
                      <div className="relative p-2 sm:p-3 lg:p-5 z-10">
                        <div className="font-bold text-slate-100 text-xs sm:text-sm lg:text-base mb-1 sm:mb-2 lg:mb-3 line-clamp-1 lg:line-clamp-2">{p.nombre}</div>
                        <div className="flex justify-between items-end mb-1 sm:mb-2 lg:mb-3 gap-1">
                          <span className="text-xs lg:text-sm text-slate-400 flex-shrink-0 lg:block hidden">Precio</span>
                          <span className="text-xs lg:hidden text-slate-400 flex-shrink-0">$</span>
                          <div className="text-sm sm:text-base lg:text-2xl font-black text-slate-100 text-right">
                            {p.precio_venta}
                          </div>
                        </div>
                        <div className={`flex items-center justify-between text-xs lg:text-sm font-semibold rounded-lg px-1.5 sm:px-2 lg:px-3 py-0.5 sm:py-1 lg:py-2 ${
                          p.stock > 5 
                            ? 'bg-emerald-500/20 text-emerald-300' 
                            : p.stock > 0 
                            ? 'bg-red-500/20 text-red-300' 
                            : 'bg-red-600/20 text-red-400'
                        }`}>
                          <span className="flex-shrink-0 lg:block hidden">Stock:</span>
                          <span className="flex-shrink-0 lg:hidden">S:</span>
                          <span className="font-bold">{p.stock}</span>
                        </div>
                        {p.stock <= 0 && <div className="text-xs lg:text-sm mt-1 lg:mt-2 text-slate-500 font-semibold line-clamp-1">❌ Sin stock</div>}
                      </div>
                    </button>
                  ))}
                  </div>
                  {getProductosFiltrados().length === 0 && categoriaSeleccionada && (
                    <div className="text-center py-12 md:py-16">
                      <div className="text-5xl md:text-6xl mb-3 md:mb-4 opacity-30">📂</div>
                      <p className="text-slate-500 text-xs md:text-lg">No hay productos en esta categoría</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Sección de Carrito - Mejorada */}
          <div className="lg:col-span-1">
            <div className="backdrop-blur-md bg-slate-800/30 border border-slate-700 rounded-3xl p-6 md:p-8 sticky top-6 shadow-2xl">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-100 mb-4 md:mb-6 flex items-center gap-3">
                <span className="text-3xl md:text-4xl">🛒</span>
                <span className="text-base md:text-2xl">Carrito</span>
                {carrito.length > 0 && (
                  <span className="ml-auto bg-slate-700 text-slate-100 text-xs md:text-sm font-bold px-2 md:px-3 py-1 rounded-full">
                    {carrito.length}
                  </span>
                )}
              </h2>

              {carrito.length === 0 ? (
                <div className="text-center py-8 md:py-12">
                  <div className="text-5xl md:text-6xl mb-3 md:mb-4 opacity-30 animate-bounce">🛒</div>
                  <p className="text-slate-500 text-xs md:text-base">Añade productos para comenzar</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 md:space-y-3 mb-4 md:mb-6 max-h-80 md:max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                    {carrito.map((p, i) => (
                      <div
                        key={i}
                        className="backdrop-blur-sm bg-slate-700/30 border border-slate-600 rounded-xl p-2 md:p-3 hover:bg-slate-700/50 hover:border-slate-500 transition-all duration-200 group flex gap-2 md:gap-3 text-xs md:text-sm"
                      >
                        {/* Imagen pequeña del producto */}
                        <div className="flex-shrink-0 w-16 md:w-20 h-16 md:h-20 bg-gradient-to-br from-slate-600/30 to-slate-700/30 rounded-lg overflow-hidden border border-slate-600">
                          {p.imagen_url ? (
                            <img
                              src={p.imagen_url}
                              alt={p.nombre}
                              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-slate-500 text-lg">🖼️</div>
                          )}
                        </div>

                        {/* Información del producto */}
                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <h4 className="font-semibold text-slate-100 group-hover:text-slate-50 transition-colors line-clamp-2">{p.nombre}</h4>
                              <p className="text-xs text-slate-400 mt-0.5 md:mt-1">{p.cantidad} × ${p.precio_venta}</p>
                            </div>
                            <button
                              onClick={() => eliminarDelCarrito(p.id)}
                              className="text-slate-500 hover:text-slate-300 hover:bg-slate-600/30 font-bold px-2 py-1 rounded-lg transition-all transform hover:scale-110 active:scale-90 flex-shrink-0"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-slate-200">${p.precio_venta * p.cantidad}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-slate-600 pt-4 md:pt-6">
                    <div className="backdrop-blur-sm bg-slate-700/40 border border-slate-600 rounded-xl p-3 md:p-4 mb-4 md:mb-6">
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-slate-400 font-medium text-xs md:text-sm">Total a pagar:</span>
                        <span className="text-2xl md:text-4xl font-black text-slate-100">
                          ${total.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 md:space-y-3">


                      {/* Selector de tipo de venta */}
                      <div className="space-y-3 bg-slate-700/20 border border-slate-600 rounded-xl p-3 md:p-4">
                        <p className="text-xs md:text-sm font-semibold text-slate-300">Tipo de Venta:</p>
                        <div className="space-y-2">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="radio"
                              name="tipoVenta"
                              value="contado"
                              checked={tipoVenta === 'contado'}
                              onChange={(e) => {
                                setTipoVenta(e.target.value)
                                setClienteSeleccionado('')
                              }}
                              className="w-4 h-4"
                            />
                            <span className="text-slate-300 text-sm">💵 Al Contado</span>
                          </label>
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="radio"
                              name="tipoVenta"
                              value="credito"
                              checked={tipoVenta === 'credito'}
                              onChange={(e) => setTipoVenta(e.target.value)}
                              className="w-4 h-4"
                            />
                            <span className="text-slate-300 text-sm">💳 A Crédito</span>
                          </label>
                        </div>

                        {/* Selector de cliente */}
                        {tipoVenta === 'credito' && (
                          <div>
                            <select
                              value={clienteSeleccionado}
                              onChange={(e) => setClienteSeleccionado(e.target.value)}
                              className="w-full bg-slate-700/30 border border-slate-600 text-slate-100 rounded-lg px-3 py-2 focus:outline-none focus:border-slate-500 text-sm"
                            >
                              <option value="">Selecciona un cliente</option>
                              {clientes.map(c => (
                                <option key={c.id} value={c.id}>{c.nombre}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => registrarVenta()}
                        disabled={
                          loading || 
                          carrito.length === 0 || 
                          (tipoVenta === 'credito' && !clienteSeleccionado)
                        }
                        className="w-full relative overflow-hidden group bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 md:py-4 px-4 md:px-6 rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg shadow-blue-600/30 text-xs md:text-base"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative flex items-center justify-center gap-2">
                          {loading ? (
                            <>
                              <span className="animate-spin">⏳</span>
                              <span>Procesando...</span>
                            </>
                          ) : (
                            <>
                              <span>{tipoVenta === 'contado' ? '✓' : '💳'}</span>
                              <span>{tipoVenta === 'contado' ? 'Completar Venta' : 'Registrar a Crédito'}</span>
                            </>
                          )}
                        </div>
                      </button>
                      <button
                        onClick={() => registrarVenta('apartado')}
                        disabled={loading || carrito.length === 0}
                        className="w-full relative overflow-hidden group bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 md:py-4 px-4 md:px-6 rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg shadow-amber-600/30 text-xs md:text-base"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative flex items-center justify-center gap-2">
                          {loading ? (
                            <>
                              <span className="animate-spin">⏳</span>
                              <span>Procesando...</span>
                            </>
                          ) : (
                            <>
                              <span>🏷️</span>
                              <span>Apartar Orden</span>
                            </>
                          )}
                        </div>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PAPELERA */}
      {showTrash && (
        <div className="mt-8 md:mt-12 backdrop-blur-md bg-slate-800/30 border border-slate-700 rounded-3xl p-6 md:p-8 shadow-2xl">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-100 mb-6 md:mb-8 flex items-center gap-3">
            <span className="text-3xl">🗑️</span>
            <span>Papelera de Ventas</span>
            {ventasTrash.length > 0 && (
              <span className="ml-auto bg-red-600 text-white text-xs md:text-sm font-bold px-3 md:px-4 py-1 md:py-2 rounded-full">
                {ventasTrash.length} ventas
              </span>
            )}
          </h2>

          {ventasTrash.length === 0 ? (
            <div className="text-center py-12 md:py-16">
              <div className="text-5xl md:text-6xl mb-3 md:mb-4 opacity-30">🗑️</div>
              <p className="text-slate-500 text-sm md:text-lg">Papelera vacía</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {ventasTrash.map(venta => (
                <div
                  key={venta.id}
                  className="flex items-center justify-between backdrop-blur-sm border border-red-500/30 bg-red-500/10 rounded-xl p-4 hover:bg-red-500/20 transition-all group"
                >
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-100">Venta #{venta.id.slice(0, 8).toUpperCase()}</span>
                      <span className={`text-lg font-bold ${venta.estado === 'venta' ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {venta.estado === 'venta' ? '💵' : '🏷️'} ${venta.total}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {venta.estado === 'venta' ? 'Venta' : 'Apartado'} • {new Date(venta.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => recuperarVenta(venta.id)}
                    className="text-slate-500 hover:text-slate-300 font-bold transition transform hover:scale-110 active:scale-90 ml-4 text-lg"
                  >
                    ↩️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.2);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.4);
        }
      `}</style>
    </div>
  )
}
