import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { registerPaymentTransaction } from '../lib/account'

export default function Creditos() {
  const [clientes, setClientes] = useState([])
  const [creditos, setCreditos] = useState([])
  const [abonos, setAbonos] = useState([])
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [tab, setTab] = useState('clientes') // 'clientes' o 'creditos'

  // Modal para nuevo cliente
  const [showModalCliente, setShowModalCliente] = useState(false)
  const [nombreCliente, setNombreCliente] = useState('')
  const [emailCliente, setEmailCliente] = useState('')
  const [telefonoCliente, setTelefonoCliente] = useState('')
  const [direccionCliente, setDireccionCliente] = useState('')

  // Modal para nuevo abono
  const [showModalAbono, setShowModalAbono] = useState(false)
  const [creditoSeleccionado, setCreditoSeleccionado] = useState('')
  const [montoAbono, setMontoAbono] = useState('')
  const [metodoAbono, setMetodoAbono] = useState('efectivo')
  const [descripcionAbono, setDescripcionAbono] = useState('')

  // 🔄 Cargar clientes
  const cargarClientes = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('usuario_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error al cargar clientes:', error)
      setClientes([])
      return
    }

    console.log('Clientes cargados:', data?.length || 0)
    setClientes(data || [])
  }

  // 🔄 Cargar créditos
  const cargarCreditos = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('creditos')
      .select(`
        *,
        clientes:cliente_id (nombre, email, telefono)
      `)
      .eq('usuario_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error al cargar créditos:', error)
      setCreditos([])
      return
    }

    console.log('Créditos cargados:', data?.length || 0)
    setCreditos(data || [])
  }

  // 🔄 Cargar abonos
  const cargarAbonos = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('abonos')
      .select('*')
      .eq('usuario_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error al cargar abonos:', error)
      setAbonos([])
      return
    }

    console.log('Abonos cargados:', data?.length || 0)
    setAbonos(data || [])
  }

  useEffect(() => {
    const inicializar = async () => {
      setLoading(true)
      await cargarClientes()
      await cargarCreditos()
      await cargarAbonos()
      setLoading(false)
    }
    inicializar()
  }, [])

  // ➕ Crear nuevo cliente
  const crearCliente = async (e) => {
    e.preventDefault()

    if (!nombreCliente) {
      setMensaje('El nombre del cliente es obligatorio')
      setTimeout(() => setMensaje(''), 3000)
      return
    }

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('clientes')
      .insert({
        nombre: nombreCliente,
        email: emailCliente || null,
        telefono: telefonoCliente || null,
        direccion: direccionCliente || null,
        usuario_id: user.id
      })

    setLoading(false)

    if (error) {
      setMensaje('Error al crear el cliente')
      console.error(error)
    } else {
      setMensaje('✅ Cliente creado exitosamente')
      setNombreCliente('')
      setEmailCliente('')
      setTelefonoCliente('')
      setDireccionCliente('')
      setShowModalCliente(false)
      cargarClientes()
    }

    setTimeout(() => setMensaje(''), 3000)
  }

  // ➕ Registrar abono
  const registrarAbono = async (e) => {
    e.preventDefault()

    if (!creditoSeleccionado || !montoAbono) {
      setMensaje('Completa todos los campos')
      setTimeout(() => setMensaje(''), 3000)
      return
    }

    setLoading(true)

    const credito = creditos.find(c => c.id === creditoSeleccionado)
    const monto = parseFloat(montoAbono)
    const { data: { user } } = await supabase.auth.getUser()

    // Validar que no sea mayor al monto pendiente
    if (monto > parseFloat(credito.monto_pendiente)) {
      setMensaje('El abono no puede ser mayor al monto pendiente')
      setLoading(false)
      setTimeout(() => setMensaje(''), 3000)
      return
    }

    // Registrar abono
    const { error: errorAbono } = await supabase
      .from('abonos')
      .insert({
        credito_id: creditoSeleccionado,
        monto,
        metodo_pago: metodoAbono,
        descripcion: descripcionAbono || null,
        usuario_id: user.id
      })

    if (errorAbono) {
      setMensaje('Error al registrar el abono')
      setLoading(false)
      console.error(errorAbono)
      setTimeout(() => setMensaje(''), 3000)
      return
    }

    // Actualizar el crédito
    const nuevoPagado = parseFloat(credito.monto_pagado) + monto
    const nuevoPendiente = parseFloat(credito.monto_total) - nuevoPagado
    const nuevoEstado = nuevoPendiente <= 0 ? 'pagado' : 'parcial'

    const { error: errorCredito } = await supabase
      .from('creditos')
      .update({
        monto_pagado: nuevoPagado,
        monto_pendiente: Math.max(0, nuevoPendiente),
        estado: nuevoEstado
      })
      .eq('id', creditoSeleccionado)

    if (errorCredito) {
      setMensaje('Abono registrado pero error al actualizar el crédito')
      setLoading(false)
      console.error(errorCredito)
      setTimeout(() => setMensaje(''), 3000)
      return
    }

    // 🏦 NUEVO: Registrar movimiento de cuentas (Cuentas por Cobrar → Cuenta de Prueba)
    try {
      const clienteNombre = credito.clientes?.nombre || 'Cliente'
      await registerPaymentTransaction({
        usuarioId: user.id,
        monto,
        descripcion: `Abono crédito de ${clienteNombre}: $${monto.toFixed(2)}`,
        creditoId: creditoSeleccionado
      })
      console.log('✅ Transacción de abono registrada en cuentas')
    } catch (errPayment) {
      console.error('Error registrando transacción de abono:', errPayment)
      // No bloqueamos pero alertamos
      setMensaje('⚠️ Abono registrado pero error al actualizar las cuentas')
      setLoading(false)
      setTimeout(() => setMensaje(''), 3000)
      return
    }

    setLoading(false)
    setMensaje('✅ Abono registrado exitosamente')
    setMontoAbono('')
    setDescripcionAbono('')
    setCreditoSeleccionado('')
    setShowModalAbono(false)
    cargarCreditos()
    cargarAbonos()

    setTimeout(() => setMensaje(''), 3000)
  }

  // 🧮 Calcular totales
  const totalCreditoPendiente = creditos
    .filter(c => c.estado !== 'pagado')
    .reduce((sum, c) => sum + parseFloat(c.monto_pendiente), 0)

  const totalCreditosRegistrados = creditos.reduce((sum, c) => sum + parseFloat(c.monto_total), 0)
  const totalPagado = creditos.reduce((sum, c) => sum + parseFloat(c.monto_pagado), 0)
  
  // Contar créditos por estado
  const creditosPendientes = creditos.filter(c => c.estado === 'pendiente').length
  const creditosParciales = creditos.filter(c => c.estado === 'parcial').length
  const creditosPagados = creditos.filter(c => c.estado === 'pagado').length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-3 md:p-8">
      {/* Fondo decorativo */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-slate-700 to-transparent rounded-full opacity-5 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-slate-700 to-transparent rounded-full opacity-5 blur-3xl"></div>
      </div>

      {/* Mensaje */}
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
        <div className="mb-8">
          <div className="backdrop-blur-md bg-slate-800/30 border border-slate-700 rounded-3xl p-6 md:p-8 mb-6">
            <h1 className="text-3xl md:text-5xl font-black text-slate-100 mb-2">
              💳 Créditos & Clientes
            </h1>
            <p className="text-slate-400 text-sm md:text-lg">Gestiona clientes y sus créditos a plazos</p>
          </div>
        </div>

        {/* Tarjetas de Resumen */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          {/* Total de Clientes */}
          <div className="backdrop-blur-md bg-gradient-to-br from-blue-900/30 to-blue-900/10 border border-blue-700/50 rounded-2xl p-5 md:p-6 shadow-xl hover:shadow-blue-500/20 transition">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-slate-400 text-sm md:text-base font-semibold">Total Clientes</h3>
              <span className="text-2xl md:text-3xl">👥</span>
            </div>
            <p className="text-3xl md:text-4xl font-black text-blue-400">{clientes.length}</p>
            <p className="text-xs md:text-sm text-slate-500 mt-2">Clientes registrados</p>
          </div>
          
          {/* Total Créditos Registrados */}
          <div className="backdrop-blur-md bg-gradient-to-br from-purple-900/30 to-purple-900/10 border border-purple-700/50 rounded-2xl p-5 md:p-6 shadow-xl hover:shadow-purple-500/20 transition">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-slate-400 text-sm md:text-base font-semibold">Total Créditos</h3>
              <span className="text-2xl md:text-3xl">💳</span>
            </div>
            <p className="text-3xl md:text-4xl font-black text-slate-100">${totalCreditosRegistrados.toFixed(2)}</p>
            <p className="text-xs md:text-sm text-slate-500 mt-2">{creditos.length} registros ({creditosPendientes} pendientes, {creditosParciales} parcial, {creditosPagados} pagados)</p>
          </div>

          {/* Total Pagado */}
          <div className="backdrop-blur-md bg-gradient-to-br from-emerald-900/30 to-emerald-900/10 border border-emerald-700/50 rounded-2xl p-5 md:p-6 shadow-xl hover:shadow-emerald-500/20 transition">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-slate-400 text-sm md:text-base font-semibold">Total Pagado</h3>
              <span className="text-2xl md:text-3xl">✅</span>
            </div>
            <p className="text-3xl md:text-4xl font-black text-emerald-400">${totalPagado.toFixed(2)}</p>
            <p className="text-xs md:text-sm text-slate-500 mt-2">Cobrado</p>
          </div>

          {/* Pendiente */}
          <div className="backdrop-blur-md bg-gradient-to-br from-red-900/30 to-red-900/10 border border-red-700/50 rounded-2xl p-5 md:p-6 shadow-xl hover:shadow-red-500/20 transition">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-slate-400 text-sm md:text-base font-semibold">Pendiente</h3>
              <span className="text-2xl md:text-3xl">⏳</span>
            </div>
            <p className="text-3xl md:text-4xl font-black text-red-400">${totalCreditoPendiente.toFixed(2)}</p>
            <p className="text-xs md:text-sm text-slate-500 mt-2">Por cobrar</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setTab('clientes')}
            className={`px-4 md:px-6 py-2 md:py-3 rounded-lg font-bold transition-all text-sm md:text-base ${
              tab === 'clientes'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-700/30 text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            👥 Clientes ({clientes.length})
          </button>
          <button
            onClick={() => setTab('creditos')}
            className={`px-4 md:px-6 py-2 md:py-3 rounded-lg font-bold transition-all text-sm md:text-base ${
              tab === 'creditos'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-700/30 text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            💳 Créditos ({creditos.length})
          </button>
        </div>

        {/* Tab Clientes */}
        {tab === 'clientes' && (
          <div className="backdrop-blur-md bg-slate-800/30 border border-slate-700 rounded-3xl p-6 md:p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-100 flex items-center gap-3">
                <span className="text-3xl">👥</span>
                Clientes
              </h2>
              <button
                onClick={() => setShowModalCliente(true)}
                className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 md:py-3 px-4 md:px-6 rounded-lg transition-all text-xs md:text-base"
              >
                ➕ Nuevo Cliente
              </button>
            </div>

            {clientes.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-500 text-sm md:text-base">No hay clientes registrados</p>
              </div>
            ) : (
              <div className="space-y-3 overflow-x-auto">
                <table className="w-full text-sm md:text-base">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-3 text-slate-400 font-semibold">Nombre</th>
                      <th className="text-left py-3 px-3 text-slate-400 font-semibold">Teléfono</th>
                      <th className="text-left py-3 px-3 text-slate-400 font-semibold">Email</th>
                      <th className="text-left py-3 px-3 text-slate-400 font-semibold">Deuda</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientes.map(cliente => {
                      const deuda = creditos
                        .filter(c => c.cliente_id === cliente.id && c.estado !== 'pagado')
                        .reduce((sum, c) => sum + parseFloat(c.monto_pendiente), 0)
                      
                      return (
                        <tr key={cliente.id} className="border-b border-slate-700 hover:bg-slate-700/20 transition-all">
                          <td className="py-3 px-3 text-slate-100 font-semibold">{cliente.nombre}</td>
                          <td className="py-3 px-3 text-slate-400">{cliente.telefono || '-'}</td>
                          <td className="py-3 px-3 text-slate-400">{cliente.email || '-'}</td>
                          <td className="py-3 px-3">
                            <span className={`font-bold ${deuda > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                              ${deuda.toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab Créditos */}
        {tab === 'creditos' && (
          <div className="space-y-6">
            {creditos.length === 0 ? (
              <div className="backdrop-blur-md bg-slate-800/30 border border-slate-700 rounded-3xl p-6 md:p-8 text-center py-12">
                <p className="text-slate-500 text-sm md:text-base">No hay créditos registrados</p>
              </div>
            ) : (
              creditos.map(credito => (
                <div key={credito.id} className="backdrop-blur-md bg-slate-800/30 border border-slate-700 rounded-2xl p-5 md:p-6 shadow-xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {/* Información del crédito */}
                    <div>
                      <h3 className="text-xl font-bold text-slate-100 mb-3 flex items-center gap-2">
                        <span>👤</span>
                        {credito.clientes?.nombre || 'Cliente desconocido'}
                      </h3>
                      <div className="space-y-2 text-sm">
                        <p className="text-slate-400">
                          📱 {credito.clientes?.telefono || '-'}
                        </p>
                        <p className="text-slate-400">
                          📧 {credito.clientes?.email || '-'}
                        </p>
                        <p className="text-slate-400 mt-3">
                          Fecha: {new Date(credito.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Montos */}
                    <div className="space-y-3">
                      <div className="bg-slate-700/30 rounded-lg p-3">
                        <p className="text-slate-400 text-xs md:text-sm">Total</p>
                        <p className="text-2xl font-black text-slate-100">${parseFloat(credito.monto_total).toFixed(2)}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-emerald-900/20 rounded-lg p-3">
                          <p className="text-emerald-400 text-xs">Pagado</p>
                          <p className="text-lg font-bold text-emerald-400">${parseFloat(credito.monto_pagado).toFixed(2)}</p>
                        </div>
                        <div className="bg-red-900/20 rounded-lg p-3">
                          <p className="text-red-400 text-xs">Pendiente</p>
                          <p className="text-lg font-bold text-red-400">${parseFloat(credito.monto_pendiente).toFixed(2)}</p>
                        </div>
                      </div>
                      <div>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                          credito.estado === 'pagado' ? 'bg-emerald-900/40 text-emerald-300' :
                          credito.estado === 'parcial' ? 'bg-amber-900/40 text-amber-300' :
                          'bg-red-900/40 text-red-300'
                        }`}>
                          {credito.estado === 'pagado' ? '✅ Pagado' :
                           credito.estado === 'parcial' ? '⏳ Parcial' :
                           '❌ Pendiente'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Progreso de pago */}
                  <div className="mt-4">
                    <div className="bg-slate-700/30 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full transition-all"
                        style={{ width: `${(parseFloat(credito.monto_pagado) / parseFloat(credito.monto_total)) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      {((parseFloat(credito.monto_pagado) / parseFloat(credito.monto_total)) * 100).toFixed(1)}% completado
                    </p>
                  </div>

                  {/* Botón de abono */}
                  {credito.estado !== 'pagado' && (
                    <button
                      onClick={() => {
                        setCreditoSeleccionado(credito.id)
                        setShowModalAbono(true)
                      }}
                      className="mt-4 w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition-all text-xs md:text-sm"
                    >
                      💰 Registrar Abono
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Modal Nuevo Cliente */}
      {showModalCliente && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="backdrop-blur-md bg-slate-800/95 border border-slate-700 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold text-slate-100 mb-6">👥 Nuevo Cliente</h2>
            <form onSubmit={crearCliente} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold text-sm mb-2">Nombre *</label>
                <input
                  type="text"
                  value={nombreCliente}
                  onChange={(e) => setNombreCliente(e.target.value)}
                  className="w-full bg-slate-700/30 border border-slate-600 text-slate-100 rounded-lg px-4 py-3 focus:outline-none focus:border-slate-500 text-sm"
                  placeholder="Nombre del cliente"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold text-sm mb-2">Email</label>
                <input
                  type="email"
                  value={emailCliente}
                  onChange={(e) => setEmailCliente(e.target.value)}
                  className="w-full bg-slate-700/30 border border-slate-600 text-slate-100 rounded-lg px-4 py-3 focus:outline-none focus:border-slate-500 text-sm"
                  placeholder="email@ejemplo.com"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold text-sm mb-2">Teléfono</label>
                <input
                  type="tel"
                  value={telefonoCliente}
                  onChange={(e) => setTelefonoCliente(e.target.value)}
                  className="w-full bg-slate-700/30 border border-slate-600 text-slate-100 rounded-lg px-4 py-3 focus:outline-none focus:border-slate-500 text-sm"
                  placeholder="+1234567890"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold text-sm mb-2">Dirección</label>
                <textarea
                  value={direccionCliente}
                  onChange={(e) => setDireccionCliente(e.target.value)}
                  className="w-full bg-slate-700/30 border border-slate-600 text-slate-100 rounded-lg px-4 py-3 focus:outline-none focus:border-slate-500 text-sm h-20"
                  placeholder="Dirección del cliente"
                ></textarea>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModalCliente(false)}
                  className="flex-1 bg-slate-700/30 hover:bg-slate-700/50 text-slate-300 font-bold py-3 rounded-lg transition-all text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50 text-sm"
                >
                  {loading ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registro de Abono */}
      {showModalAbono && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="backdrop-blur-md bg-slate-800/95 border border-slate-700 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold text-slate-100 mb-6">💰 Registro de Abono</h2>
            <form onSubmit={registrarAbono} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold text-sm mb-2">Monto Pendiente</label>
                <input
                  type="text"
                  disabled
                  value={`$${creditos.find(c => c.id === creditoSeleccionado)?.monto_pendiente.toFixed(2) || '0.00'}`}
                  className="w-full bg-slate-700/30 border border-slate-600 text-slate-400 rounded-lg px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold text-sm mb-2">Monto a Abonar *</label>
                <input
                  type="number"
                  step="0.01"
                  value={montoAbono}
                  onChange={(e) => setMontoAbono(e.target.value)}
                  className="w-full bg-slate-700/30 border border-slate-600 text-slate-100 rounded-lg px-4 py-3 focus:outline-none focus:border-slate-500 text-sm"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold text-sm mb-2">Método de Pago</label>
                <select
                  value={metodoAbono}
                  onChange={(e) => setMetodoAbono(e.target.value)}
                  className="w-full bg-slate-700/30 border border-slate-600 text-slate-100 rounded-lg px-4 py-3 focus:outline-none focus:border-slate-500 text-sm"
                >
                  <option value="efectivo">💵 Efectivo</option>
                  <option value="banco">🏦 Banco</option>
                  <option value="tarjeta">💳 Tarjeta</option>
                  <option value="otro">📋 Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-300 font-semibold text-sm mb-2">Descripción (opcional)</label>
                <input
                  type="text"
                  value={descripcionAbono}
                  onChange={(e) => setDescripcionAbono(e.target.value)}
                  className="w-full bg-slate-700/30 border border-slate-600 text-slate-100 rounded-lg px-4 py-3 focus:outline-none focus:border-slate-500 text-sm"
                  placeholder="Ej: Abono parcial"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModalAbono(false)
                    setCreditoSeleccionado('')
                  }}
                  className="flex-1 bg-slate-700/30 hover:bg-slate-700/50 text-slate-300 font-bold py-3 rounded-lg transition-all text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50 text-sm"
                >
                  {loading ? 'Procesando...' : 'Registrar Abono'}
                </button>
              </div>
            </form>
          </div>
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
      `}</style>
    </div>
  )
}
