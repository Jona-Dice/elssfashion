import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Cuentas() {
  const [cuentas, setCuentas] = useState([])
  const [transacciones, setTransacciones] = useState([])
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [filtro, setFiltro] = useState('todas')
  const [showTrash, setShowTrash] = useState(false)
  const [cuentasTrash, setCuentasTrash] = useState([])
  const [transaccionesTrash, setTransaccionesTrash] = useState([])
  
  // Modal para nueva cuenta
  const [showModalCuenta, setShowModalCuenta] = useState(false)
  const [nombreCuenta, setNombreCuenta] = useState('')
  const [saldoInicial, setSaldoInicial] = useState('')
  const [tipoCuenta, setTipoCuenta] = useState('efectivo')

  // Modal para transacción
  const [showModalTransaccion, setShowModalTransaccion] = useState(false)
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState('')
  const [tipoTransaccion, setTipoTransaccion] = useState('ingreso')
  const [montoTransaccion, setMontoTransaccion] = useState('')
  const [descripcionTransaccion, setDescripcionTransaccion] = useState('')

  // 🔄 Cargar cuentas
  const cargarCuentas = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.warn('No hay usuario autenticado')
      return
    }

    const { data, error } = await supabase
      .from('cuentas')
      .select('*')
      .eq('usuario_id', user.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error al cargar cuentas:', error)
      setCuentas([])
      return
    }

    console.log('Cuentas cargadas:', data?.length || 0)
    const processed = (data || []).map(c => ({ ...c, saldo: parseFloat(c.saldo) || 0 }))
    setCuentas(processed)
  }

  // 🔄 Cargar transacciones
  const cargarTransacciones = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.warn('No hay usuario autenticado')
      setTransacciones([])
      return
    }

    // Primero obtenemos las cuentas del usuario
    const { data: cuentasUser } = await supabase
      .from('cuentas')
      .select('id')
      .eq('usuario_id', user.id)
      .eq('is_deleted', false)

    const cuentasIds = (cuentasUser || []).map(c => c.id)

    if (cuentasIds.length === 0) {
      console.log('No hay cuentas para este usuario')
      setTransacciones([])
      return
    }

    // Luego traemos las transacciones de esas cuentas
    const { data, error } = await supabase
      .from('transacciones')
      .select('*')
      .in('cuenta_id', cuentasIds)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error al cargar transacciones:', error)
      setTransacciones([])
      return
    }

    if (data && data.length > 0) {
      // Obtener información de las cuentas para mostrar nombres
      const { data: cuentasData } = await supabase
        .from('cuentas')
        .select('id, nombre, tipo')
      
      const cuentasMap = {}
      if (cuentasData) {
        cuentasData.forEach(c => {
          cuentasMap[c.id] = { nombre: c.nombre, tipo: c.tipo }
        })
      }

      const processed = (data || []).map(t => ({
        ...t,
        monto: parseFloat(t.monto) || 0,
        cuentas: cuentasMap[t.cuenta_id] || { nombre: 'Cuenta desconocida', tipo: 'otro' }
      }))
      console.log('Transacciones cargadas:', processed.length)
      setTransacciones(processed)
    } else {
      console.log('No hay transacciones')
      setTransacciones([])
    }
  }

  // 🗑️ Cargar cuentas en papelera
  const cargarCuentasTrash = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return

    const { data } = await supabase
      .from('cuentas')
      .select('*')
      .eq('usuario_id', user.id)
      .eq('is_deleted', true)
      .order('created_at', { ascending: false })

    setCuentasTrash(data || [])
  }

  // 🗑️ Cargar transacciones en papelera
  const cargarTransaccionesTrash = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return

    // Primero obtenemos todas las cuentas (incluyendo eliminadas)
    const { data: cuentasUser } = await supabase
      .from('cuentas')
      .select('id')
      .eq('usuario_id', user.id)

    const cuentasIds = (cuentasUser || []).map(c => c.id)

    if (cuentasIds.length === 0) {
      setTransaccionesTrash([])
      return
    }

    // Traemos las transacciones eliminadas
    const { data } = await supabase
      .from('transacciones')
      .select('*')
      .in('cuenta_id', cuentasIds)
      .eq('is_deleted', true)
      .order('created_at', { ascending: false })

    setTransaccionesTrash(data || [])
  }

  // 🗑️ Mover cuenta a papelera
  const moverCuentaPapelera = async (id) => {
    try {
      const { error } = await supabase.from('cuentas').update({ is_deleted: true }).eq('id', id)
      
      if (error) {
        setMensaje('Error al mover cuenta a papelera')
        console.error('Error:', error)
        return
      }
      
      // Actualizar estado local de forma inmediata
      setCuentas(cuentas.filter(c => c.id !== id))
      
      // Recargar datos en segundo plano
      await cargarCuentasTrash()
      await cargarTransacciones()
      
      setMensaje('Cuenta movida a papelera')
      setTimeout(() => setMensaje(''), 3000)
    } catch (error) {
      setMensaje('Error al mover cuenta a papelera')
      console.error('Error:', error)
    }
  }

  // ↩️ Recuperar cuenta
  const recuperarCuenta = async (id) => {
    try {
      const { error } = await supabase.from('cuentas').update({ is_deleted: false }).eq('id', id)
      
      if (error) {
        setMensaje('Error al restaurar cuenta')
        console.error('Error:', error)
        return
      }
      
      // Recargar datos
      await cargarCuentas()
      await cargarCuentasTrash()
      await cargarTransacciones()
      
      setMensaje('Cuenta restaurada')
      setTimeout(() => setMensaje(''), 3000)
    } catch (error) {
      setMensaje('Error al restaurar cuenta')
      console.error('Error:', error)
    }
  }

  // 🗑️ Mover transacción a papelera
  const moverTransaccionPapelera = async (id) => {
    try {
      const { error } = await supabase.from('transacciones').update({ is_deleted: true }).eq('id', id)
      
      if (error) {
        setMensaje('Error al mover transacción a papelera')
        console.error('Error:', error)
        return
      }
      
      // Actualizar estado local de forma inmediata
      setTransacciones(transacciones.filter(t => t.id !== id))
      
      // Recargar datos en segundo plano
      await cargarTransaccionesTrash()
      
      setMensaje('Transacción movida a papelera')
      setTimeout(() => setMensaje(''), 3000)
    } catch (error) {
      setMensaje('Error al mover transacción a papelera')
      console.error('Error:', error)
    }
  }

  // ↩️ Recuperar transacción
  const recuperarTransaccion = async (id) => {
    try {
      const { error } = await supabase.from('transacciones').update({ is_deleted: false }).eq('id', id)
      
      if (error) {
        setMensaje('Error al restaurar transacción')
        console.error('Error:', error)
        return
      }
      
      // Recargar datos
      await cargarTransacciones()
      await cargarTransaccionesTrash()
      
      setMensaje('Transacción restaurada')
      setTimeout(() => setMensaje(''), 3000)
    } catch (error) {
      setMensaje('Error al restaurar transacción')
      console.error('Error:', error)
    }
  }

  useEffect(() => {
    const inicializar = async () => {
      setLoading(true)
      await cargarCuentas()
      await cargarTransacciones()
      await cargarCuentasTrash()
      await cargarTransaccionesTrash()
      setLoading(false)
    }
    inicializar()
  }, [])

  // Recargar datos cuando se cierren los modales
  useEffect(() => {
    if (!showModalCuenta && !showModalTransaccion) {
      cargarCuentas()
      cargarTransacciones()
    }
  }, [showModalCuenta, showModalTransaccion])

  // ➕ Crear nueva cuenta
  const crearCuenta = async (e) => {
    e.preventDefault()
    
    if (!nombreCuenta || !saldoInicial) {
      setMensaje('Completa todos los campos')
      setTimeout(() => setMensaje(''), 3000)
      return
    }

    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('cuentas')
      .insert({
        nombre: nombreCuenta,
        saldo: parseFloat(saldoInicial),
        tipo: tipoCuenta,
        usuario_id: user.id
      })

    setLoading(false)

    if (error) {
      setMensaje('Error al crear la cuenta')
      console.error(error)
    } else {
      setMensaje('✅ Cuenta creada exitosamente')
      setNombreCuenta('')
      setSaldoInicial('')
      setTipoCuenta('efectivo')
      setShowModalCuenta(false)
      cargarCuentas()
      cargarTransacciones()
    }

    setTimeout(() => setMensaje(''), 3000)
  }

  // ➕ Registrar transacción
  const registrarTransaccion = async (e) => {
    e.preventDefault()

    if (!cuentaSeleccionada || !montoTransaccion || !descripcionTransaccion) {
      setMensaje('Completa todos los campos')
      setTimeout(() => setMensaje(''), 3000)
      return
    }

    setLoading(true)

    const cuenta = cuentas.find(c => c.id === cuentaSeleccionada)
    const monto = parseFloat(montoTransaccion)
    const saldoActual = parseFloat(cuenta?.saldo || 0)
    const nuevoSaldo = tipoTransaccion === 'ingreso'
      ? saldoActual + monto
      : saldoActual - monto

    // Validar que no sea negativo
    if (nuevoSaldo < 0) {
      setMensaje('Saldo insuficiente')
      setLoading(false)
      setTimeout(() => setMensaje(''), 3000)
      return
    }

    // Registrar transacción
    const { error: errorTransaccion } = await supabase
      .from('transacciones')
      .insert({
        cuenta_id: cuentaSeleccionada,
        tipo: tipoTransaccion,
        monto,
        descripcion: descripcionTransaccion,
        saldo_anterior: cuenta.saldo,
        saldo_nuevo: nuevoSaldo,
        is_deleted: false
      })

    // Actualizar saldo de la cuenta
    const { error: errorCuenta } = await supabase
      .from('cuentas')
      .update({ saldo: nuevoSaldo })
      .eq('id', cuentaSeleccionada)

    setLoading(false)

    if (errorTransaccion || errorCuenta) {
      setMensaje('Error al registrar la transacción')
      console.error(errorTransaccion || errorCuenta)
    } else {
      setMensaje('✅ Transacción registrada')
      setMontoTransaccion('')
      setDescripcionTransaccion('')
      setCuentaSeleccionada('')
      setShowModalTransaccion(false)
      cargarCuentas()
      cargarTransacciones()
    }

    setTimeout(() => setMensaje(''), 3000)
  }

  // 🧮 Calcular totales
  const totalActivos = cuentas.reduce((sum, c) => sum + (parseFloat(c.saldo) || 0), 0)
  
  const ahora = new Date()
  const mesActual = ahora.getMonth()
  const anoActual = ahora.getFullYear()

  const ingresosMes = transacciones
    .filter(t => {
      if (t.tipo !== 'ingreso') return false
      const fecha = new Date(t.created_at)
      return fecha.getMonth() === mesActual && fecha.getFullYear() === anoActual
    })
    .reduce((sum, t) => sum + (parseFloat(t.monto) || 0), 0)

  const egresosMes = transacciones
    .filter(t => {
      if (t.tipo !== 'egreso') return false
      const fecha = new Date(t.created_at)
      return fecha.getMonth() === mesActual && fecha.getFullYear() === anoActual
    })
    .reduce((sum, t) => sum + (parseFloat(t.monto) || 0), 0)

  // Filtrar transacciones
  const transaccionesFiltradas = filtro === 'todas' 
    ? transacciones 
    : transacciones.filter(t => t.tipo === filtro)

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
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-3xl md:text-5xl font-black text-slate-100">
                📊 Contabilidad & Cuentas
              </h1>
              <button
                onClick={() => setShowTrash(!showTrash)}
                className={`font-bold px-4 md:px-6 py-2 md:py-3 rounded-xl transition transform hover:scale-105 active:scale-95 shadow-lg text-xs sm:text-base whitespace-nowrap ${showTrash ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
              >
                {showTrash ? '📊 Cuentas' : '🗑️ Papelera'}
              </button>
            </div>
            <p className="text-slate-400 text-sm md:text-lg">Gestiona todas tus cuentas y transacciones</p>
          </div>
        </div>

        {/* Tarjetas de Resumen */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
          {/* Total de Activos */}
          <div className="backdrop-blur-md bg-slate-800/30 border border-slate-700 rounded-2xl p-5 md:p-6 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-slate-400 text-sm md:text-base font-semibold">Total Activos</h3>
              <span className="text-2xl md:text-3xl">💰</span>
            </div>
            <p className="text-3xl md:text-4xl font-black text-slate-100">${totalActivos.toFixed(2)}</p>
            <p className="text-xs md:text-sm text-slate-500 mt-2">{cuentas.length} cuentas</p>
          </div>

          {/* Ingresos del Mes */}
          <div className="backdrop-blur-md bg-gradient-to-br from-emerald-900/30 to-emerald-900/10 border border-emerald-700/50 rounded-2xl p-5 md:p-6 shadow-xl hover:shadow-emerald-500/20 transition">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-slate-400 text-sm md:text-base font-semibold">Activos (Mes)</h3>
              <span className="text-2xl md:text-3xl">📈</span>
            </div>
            <p className="text-3xl md:text-4xl font-black text-emerald-400">${ingresosMes.toFixed(2)}</p>
            <p className="text-xs md:text-sm text-slate-500 mt-2">Entradas este mes</p>
          </div>

          {/* Egresos del Mes */}
          <div className="backdrop-blur-md bg-gradient-to-br from-red-900/30 to-red-900/10 border border-red-700/50 rounded-2xl p-5 md:p-6 shadow-xl hover:shadow-red-500/20 transition">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-slate-400 text-sm md:text-base font-semibold">Salidas (Mes)</h3>
              <span className="text-2xl md:text-3xl">📉</span>
            </div>
            <p className="text-3xl md:text-4xl font-black text-red-400">${egresosMes.toFixed(2)}</p>
            <p className="text-xs md:text-sm text-slate-500 mt-2">Gastos este mes</p>
          </div>
        </div>

        {/* Contenido Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Cuentas */}
          <div className="lg:col-span-2">
            <div className="backdrop-blur-md bg-slate-800/30 border border-slate-700 rounded-3xl p-6 md:p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-slate-100 flex items-center gap-3">
                  <span className="text-3xl">🏦</span>
                  Cuentas
                </h2>
                <button
                  onClick={() => setShowModalCuenta(true)}
                  className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 md:py-3 px-4 md:px-6 rounded-lg transition-all text-xs md:text-base"
                >
                  ➕ Nueva Cuenta
                </button>
              </div>

              {cuentas.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-500 text-sm md:text-base">No hay cuentas creadas</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cuentas.map(cuenta => (
                    <div key={cuenta.id} className="backdrop-blur-sm bg-slate-700/30 border border-slate-600 rounded-xl p-4 hover:bg-slate-700/50 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="text-slate-100 font-bold text-sm md:text-base">{cuenta.nombre}</h3>
                          <p className="text-xs text-slate-400 mt-1">
                            {cuenta.tipo === 'efectivo' && '💵 Efectivo'}
                            {cuenta.tipo === 'banco' && '🏦 Banco'}
                            {cuenta.tipo === 'tarjeta' && '💳 Tarjeta'}
                            {cuenta.tipo === 'otro' && '📋 Otro'}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-2xl md:text-3xl font-black text-slate-100">${parseFloat(cuenta.saldo || 0).toFixed(2)}</p>
                          </div>
                          <button
                            onClick={() => moverCuentaPapelera(cuenta.id)}
                            className="text-slate-500 hover:text-slate-300 font-bold transition transform hover:scale-110 active:scale-90"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Botón Nueva Transacción */}
          <div>
            <button
              onClick={() => setShowModalTransaccion(true)}
              className="w-full backdrop-blur-md bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 md:py-6 rounded-3xl transition-all shadow-2xl text-base md:text-xl mb-6 transform hover:scale-105 active:scale-95"
            >
              ➕ Nueva Transacción
            </button>

            {/* Resumen Rápido */}
            <div className="backdrop-blur-md bg-slate-800/30 border border-slate-700 rounded-2xl p-5 md:p-6 shadow-2xl">
              <h3 className="text-slate-100 font-bold mb-4 text-sm md:text-base">📋 Resumen Rápido</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-xs md:text-sm">
                  <span className="text-slate-400">Cuentas activas:</span>
                  <span className="text-slate-100 font-bold">{cuentas.length}</span>
                </div>
                <div className="flex justify-between text-xs md:text-sm">
                  <span className="text-slate-400">Total transacciones:</span>
                  <span className="text-slate-100 font-bold">{transacciones.length}</span>
                </div>
                <div className="border-t border-slate-700 pt-3">
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-emerald-400">Ingresos:</span>
                    <span className="text-emerald-400 font-bold">${ingresosMes.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs md:text-sm mt-2">
                    <span className="text-red-400">Egresos:</span>
                    <span className="text-red-400 font-bold">-${egresosMes.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs md:text-sm mt-2 pt-2 border-t border-slate-700">
                    <span className="text-slate-300">Neto:</span>
                    <span className={`font-bold ${(ingresosMes - egresosMes) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      ${(ingresosMes - egresosMes).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transacciones */}
        <div className="mt-8">
          <div className="backdrop-blur-md bg-slate-800/30 border border-slate-700 rounded-3xl p-6 md:p-8 shadow-2xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-100 flex items-center gap-3">
                <span className="text-3xl">📝</span>
                Historial de Transacciones
              </h2>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setFiltro('todas')}
                  className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all ${
                    filtro === 'todas' 
                      ? 'bg-slate-700 text-white' 
                      : 'bg-slate-700/30 text-slate-300 hover:bg-slate-700/50'
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setFiltro('ingreso')}
                  className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all ${
                    filtro === 'ingreso' 
                      ? 'bg-emerald-700 text-white' 
                      : 'bg-emerald-700/20 text-emerald-300 hover:bg-emerald-700/30'
                  }`}
                >
                  Ingresos
                </button>
                <button
                  onClick={() => setFiltro('egreso')}
                  className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all ${
                    filtro === 'egreso' 
                      ? 'bg-red-700 text-white' 
                      : 'bg-red-700/20 text-red-300 hover:bg-red-700/30'
                  }`}
                >
                  Egresos
                </button>
              </div>
            </div>

            {transaccionesFiltradas.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-500 text-sm md:text-base">No hay transacciones registradas</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {transaccionesFiltradas.map(transaccion => (
                  <div key={transaccion.id} className="backdrop-blur-sm bg-slate-700/30 border border-slate-600 rounded-xl p-4 hover:bg-slate-700/50 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="text-xl md:text-2xl">
                          {transaccion.tipo === 'ingreso' ? '📈' : '📉'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-slate-100 font-bold text-xs md:text-sm line-clamp-1">{transaccion.descripcion}</h4>
                          <p className="text-xs text-slate-400 mt-1">
                            {transaccion.cuentas?.nombre} • {new Date(transaccion.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 ml-4">
                        <div className="text-right">
                          <p className={`text-lg md:text-2xl font-black ${
                            transaccion.tipo === 'ingreso' ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            {transaccion.tipo === 'ingreso' ? '+' : '-'}${parseFloat(transaccion.monto || 0).toFixed(2)}
                          </p>
                        </div>
                        <button
                          onClick={() => moverTransaccionPapelera(transaccion.id)}
                          className="text-slate-500 hover:text-slate-300 font-bold transition transform hover:scale-110 active:scale-90"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Nueva Cuenta */}
      {showModalCuenta && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="backdrop-blur-md bg-slate-800/95 border border-slate-700 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold text-slate-100 mb-6">🏦 Nueva Cuenta</h2>
            <form onSubmit={crearCuenta} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold text-sm mb-2">Nombre</label>
                <input
                  type="text"
                  value={nombreCuenta}
                  onChange={(e) => setNombreCuenta(e.target.value)}
                  className="w-full bg-slate-700/30 border border-slate-600 text-slate-100 rounded-lg px-4 py-3 focus:outline-none focus:border-slate-500 text-sm"
                  placeholder="Ej: Caja Principal"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold text-sm mb-2">Tipo</label>
                <select
                  value={tipoCuenta}
                  onChange={(e) => setTipoCuenta(e.target.value)}
                  className="w-full bg-slate-700/30 border border-slate-600 text-slate-100 rounded-lg px-4 py-3 focus:outline-none focus:border-slate-500 text-sm"
                >
                  <option value="efectivo">💵 Efectivo</option>
                  <option value="banco">🏦 Banco</option>
                  <option value="tarjeta">💳 Tarjeta</option>
                  <option value="otro">📋 Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-300 font-semibold text-sm mb-2">Saldo Inicial</label>
                <input
                  type="number"
                  step="0.01"
                  value={saldoInicial}
                  onChange={(e) => setSaldoInicial(e.target.value)}
                  className="w-full bg-slate-700/30 border border-slate-600 text-slate-100 rounded-lg px-4 py-3 focus:outline-none focus:border-slate-500 text-sm"
                  placeholder="0.00"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModalCuenta(false)}
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

      {/* Modal Nueva Transacción */}
      {showModalTransaccion && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="backdrop-blur-md bg-slate-800/95 border border-slate-700 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold text-slate-100 mb-6">📝 Nueva Transacción</h2>
            <form onSubmit={registrarTransaccion} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold text-sm mb-2">Cuenta</label>
                <select
                  value={cuentaSeleccionada}
                  onChange={(e) => setCuentaSeleccionada(e.target.value)}
                  className="w-full bg-slate-700/30 border border-slate-600 text-slate-100 rounded-lg px-4 py-3 focus:outline-none focus:border-slate-500 text-sm"
                >
                  <option value="">Selecciona una cuenta</option>
                  {cuentas.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-300 font-semibold text-sm mb-2">Tipo</label>
                <select
                  value={tipoTransaccion}
                  onChange={(e) => setTipoTransaccion(e.target.value)}
                  className="w-full bg-slate-700/30 border border-slate-600 text-slate-100 rounded-lg px-4 py-3 focus:outline-none focus:border-slate-500 text-sm"
                >
                  <option value="ingreso">📈 Ingreso</option>
                  <option value="egreso">📉 Egreso</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-300 font-semibold text-sm mb-2">Monto</label>
                <input
                  type="number"
                  step="0.01"
                  value={montoTransaccion}
                  onChange={(e) => setMontoTransaccion(e.target.value)}
                  className="w-full bg-slate-700/30 border border-slate-600 text-slate-100 rounded-lg px-4 py-3 focus:outline-none focus:border-slate-500 text-sm"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold text-sm mb-2">Descripción</label>
                <input
                  type="text"
                  value={descripcionTransaccion}
                  onChange={(e) => setDescripcionTransaccion(e.target.value)}
                  className="w-full bg-slate-700/30 border border-slate-600 text-slate-100 rounded-lg px-4 py-3 focus:outline-none focus:border-slate-500 text-sm"
                  placeholder="Ej: Pago de servicios"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModalTransaccion(false)}
                  className="flex-1 bg-slate-700/30 hover:bg-slate-700/50 text-slate-300 font-bold py-3 rounded-lg transition-all text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50 text-sm"
                >
                  {loading ? 'Registrando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAPELERA */}
      {showTrash && (
        <div className="mt-8 md:mt-12 backdrop-blur-md bg-slate-800/30 border border-slate-700 rounded-3xl p-6 md:p-8 shadow-2xl">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-100 mb-6 md:mb-8 flex items-center gap-3">
            <span className="text-3xl">🗑️</span>
            <span>Papelera</span>
            {(cuentasTrash.length > 0 || transaccionesTrash.length > 0) && (
              <span className="ml-auto bg-red-600 text-white text-xs md:text-sm font-bold px-3 md:px-4 py-1 md:py-2 rounded-full">
                {cuentasTrash.length + transaccionesTrash.length} elementos
              </span>
            )}
          </h2>

          {cuentasTrash.length === 0 && transaccionesTrash.length === 0 ? (
            <div className="text-center py-12 md:py-16">
              <div className="text-5xl md:text-6xl mb-3 md:mb-4 opacity-30">🗑️</div>
              <p className="text-slate-500 text-sm md:text-lg">Papelera vacía</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Cuentas eliminadas */}
              {cuentasTrash.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3">🏦 Cuentas ({cuentasTrash.length})</h3>
                  <div className="space-y-2">
                    {cuentasTrash.map(cuenta => (
                      <div
                        key={cuenta.id}
                        className="flex items-center justify-between backdrop-blur-sm border border-red-500/30 bg-red-500/10 rounded-xl p-4 hover:bg-red-500/20 transition-all"
                      >
                        <div>
                          <h4 className="font-bold text-slate-100">{cuenta.nombre}</h4>
                          <p className="text-xs text-slate-400 mt-1">
                            {cuenta.tipo === 'efectivo' && '💵 Efectivo'}
                            {cuenta.tipo === 'banco' && '🏦 Banco'}
                            {cuenta.tipo === 'tarjeta' && '💳 Tarjeta'}
                            {cuenta.tipo === 'otro' && '📋 Otro'}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-2xl font-black text-slate-100">${parseFloat(cuenta.saldo || 0).toFixed(2)}</span>
                          <button
                            onClick={() => recuperarCuenta(cuenta.id)}
                            className="text-slate-500 hover:text-slate-300 font-bold transition transform hover:scale-110 active:scale-90"
                          >
                            ↩️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transacciones eliminadas */}
              {transaccionesTrash.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3">📝 Transacciones ({transaccionesTrash.length})</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {transaccionesTrash.map(trans => (
                      <div
                        key={trans.id}
                        className="flex items-center justify-between backdrop-blur-sm border border-red-500/30 bg-red-500/10 rounded-xl p-4 hover:bg-red-500/20 transition-all"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-lg">{trans.tipo === 'ingreso' ? '📈' : '📉'}</span>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-100 text-xs md:text-sm line-clamp-1">{trans.descripcion}</h4>
                            <p className="text-xs text-slate-400">{new Date(trans.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 ml-4">
                          <span className={`text-lg font-black ${trans.tipo === 'ingreso' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {trans.tipo === 'ingreso' ? '+' : '-'}${parseFloat(trans.monto || 0).toFixed(2)}
                          </span>
                          <button
                            onClick={() => recuperarTransaccion(trans.id)}
                            className="text-slate-500 hover:text-slate-300 font-bold transition transform hover:scale-110 active:scale-90"
                          >
                            ↩️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
          background: transparent;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(100, 116, 139, 0.5);
          border-radius: 3px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(100, 116, 139, 0.7);
        }
      `}</style>
    </div>
  )
}
