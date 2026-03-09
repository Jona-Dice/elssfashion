import { supabase } from './supabase'

export async function getOrCreateMainAccount(userId) {
  if (!userId) return null

  try {
    // 🎯 Buscar primero "cuenta de prueba" (la cuenta específica del usuario)
    let { data, error } = await supabase
      .from('cuentas')
      .select('*')
      .ilike('nombre', '%cuenta de prueba%')
      .eq('usuario_id', userId)
      .limit(1)

    if (error) console.error(error)
    if (data && data.length > 0) {
      console.log('✅ Usando cuenta de prueba:', data[0].nombre)
      return data[0]
    }

    // Intentar buscar 'principal'
    let res = await supabase
      .from('cuentas')
      .select('*')
      .ilike('nombre', '%principal%')
      .eq('usuario_id', userId)
      .limit(1)

    if (res.data && res.data.length > 0) {
      console.log('✅ Usando cuenta principal:', res.data[0].nombre)
      return res.data[0]
    }

    // Intentar buscar 'caja'
    res = await supabase
      .from('cuentas')
      .select('*')
      .ilike('nombre', '%caja%')
      .eq('usuario_id', userId)
      .limit(1)

    if (res.data && res.data.length > 0) {
      console.log('✅ Usando cuenta caja:', res.data[0].nombre)
      return res.data[0]
    }

    // Intentar devolver la primera cuenta del usuario
    res = await supabase
      .from('cuentas')
      .select('*')
      .eq('usuario_id', userId)
      .limit(1)

    if (res.data && res.data.length > 0) {
      console.log('✅ Usando primera cuenta disponible:', res.data[0].nombre)
      return res.data[0]
    }

    // Crear una cuenta "cuenta de prueba" por defecto
    const { data: created, error: errCreate } = await supabase
      .from('cuentas')
      .insert({ nombre: 'cuenta de prueba', tipo: 'efectivo', saldo: 0, usuario_id: userId })
      .select()
      .single()

    if (errCreate) {
      console.error(errCreate)
      return null
    }

    console.log('✅ Cuenta de prueba creada automáticamente')
    return created
  } catch (err) {
    console.error(err)
    return null
  }
}

// 💳 CUENTA PARA DINERO ESPERADO (Créditos)
export async function getOrCreateAccountsReceivable(userId) {
  if (!userId) return null

  try {
    // Buscar "Cuentas por Cobrar"
    let { data, error } = await supabase
      .from('cuentas')
      .select('*')
      .ilike('nombre', '%cuentas por cobrar%')
      .eq('usuario_id', userId)
      .limit(1)

    if (error) console.error(error)
    if (data && data.length > 0) {
      console.log('✅ Usando Cuentas por Cobrar:', data[0].nombre)
      return data[0]
    }

    // Crear "Cuentas por Cobrar" si no existe
    const { data: created, error: errCreate } = await supabase
      .from('cuentas')
      .insert({ 
        nombre: 'Cuentas por Cobrar', 
        tipo: 'credito', 
        saldo: 0, 
        usuario_id: userId 
      })
      .select()
      .single()

    if (errCreate) {
      console.error(errCreate)
      return null
    }

    console.log('✅ Cuentas por Cobrar creada automáticamente')
    return created
  } catch (err) {
    console.error(err)
    return null
  }
}

export async function registerAccountTransaction({ usuarioId, tipo = 'ingreso', monto = 0, descripcion = '', esCredito = false }) {
  if (!usuarioId) throw new Error('usuarioId requerido')
  monto = parseFloat(monto) || 0

  // 🎯 Seleccionar la cuenta correcta
  let cuenta
  if (esCredito) {
    cuenta = await getOrCreateAccountsReceivable(usuarioId)
    console.log('📊 Registrando en Cuentas por Cobrar (crédito)')
  } else {
    cuenta = await getOrCreateMainAccount(usuarioId)
    console.log('💰 Registrando en Cuenta de Prueba (contado)')
  }

  if (!cuenta) {
    throw new Error(esCredito ? 'No se encontró ni pudo crearse una cuenta de cuentas por cobrar' : 'No se encontró ni pudo crearse una cuenta principal')
  }

  const saldoAnterior = parseFloat(cuenta.saldo || 0)
  const nuevoSaldo = tipo === 'ingreso' ? saldoAnterior + monto : saldoAnterior - monto

  if (nuevoSaldo < 0 && !esCredito) {
    throw new Error('Saldo insuficiente en la cuenta principal')
  }

  // Insertar transacción
  const { error: errT } = await supabase
    .from('transacciones')
    .insert({
      cuenta_id: cuenta.id,
      tipo,
      monto,
      descripcion: descripcion || (tipo === 'ingreso' ? 'Ingreso automático' : 'Egreso automático'),
      saldo_anterior: saldoAnterior,
      saldo_nuevo: nuevoSaldo
    })

  if (errT) {
    console.error(errT)
    throw errT
  }

  // Actualizar saldo de la cuenta
  const { error: errC } = await supabase
    .from('cuentas')
    .update({ saldo: nuevoSaldo })
    .eq('id', cuenta.id)

  if (errC) {
    console.error(errC)
    throw errC
  }

  return { cuentaId: cuenta.id, saldoAnterior, nuevoSaldo }
}

// 🏦 REGISTRAR ABONO (Movimiento de Cuentas por Cobrar → Cuenta de Prueba)
export async function registerPaymentTransaction({ usuarioId, monto = 0, descripcion = '', creditoId = null }) {
  if (!usuarioId) throw new Error('usuarioId requerido')
  monto = parseFloat(monto) || 0

  // 1️⃣ RESTAR de "Cuentas por Cobrar"
  const cuentasCobrar = await getOrCreateAccountsReceivable(usuarioId)
  if (!cuentasCobrar) throw new Error('No se encontró cuenta de cuentas por cobrar')

  const saldoAnteriorCobrar = parseFloat(cuentasCobrar.saldo || 0)
  const nuevoSaldoCobrar = saldoAnteriorCobrar - monto

  // 2️⃣ SUMAR a "Cuenta de Prueba" (dinero real recibido)
  const cuentaPrincipal = await getOrCreateMainAccount(usuarioId)
  if (!cuentaPrincipal) throw new Error('No se encontró cuenta principal')

  const saldoAnteriorPrincipal = parseFloat(cuentaPrincipal.saldo || 0)
  const nuevoSaldoPrincipal = saldoAnteriorPrincipal + monto

  // 3️⃣ RESTAR transacción en Cuentas por Cobrar
  const { error: errCobrar } = await supabase
    .from('transacciones')
    .insert({
      cuenta_id: cuentasCobrar.id,
      tipo: 'egreso',
      monto,
      descripcion: descripcion || `Pago de crédito recibido`,
      saldo_anterior: saldoAnteriorCobrar,
      saldo_nuevo: nuevoSaldoCobrar
    })

  if (errCobrar) {
    console.error(errCobrar)
    throw errCobrar
  }

  // 4️⃣ SUMAR transacción en Cuenta de Prueba
  const { error: errPrincipal } = await supabase
    .from('transacciones')
    .insert({
      cuenta_id: cuentaPrincipal.id,
      tipo: 'ingreso',
      monto,
      descripcion: descripcion || `Pago de crédito recibido`,
      saldo_anterior: saldoAnteriorPrincipal,
      saldo_nuevo: nuevoSaldoPrincipal
    })

  if (errPrincipal) {
    console.error(errPrincipal)
    throw errPrincipal
  }

  // 5️⃣ Actualizar saldo de Cuentas por Cobrar
  const { error: errUpdateCobrar } = await supabase
    .from('cuentas')
    .update({ saldo: nuevoSaldoCobrar })
    .eq('id', cuentasCobrar.id)

  if (errUpdateCobrar) {
    console.error(errUpdateCobrar)
    throw errUpdateCobrar
  }

  // 6️⃣ Actualizar saldo de Cuenta de Prueba
  const { error: errUpdatePrincipal } = await supabase
    .from('cuentas')
    .update({ saldo: nuevoSaldoPrincipal })
    .eq('id', cuentaPrincipal.id)

  if (errUpdatePrincipal) {
    console.error(errUpdatePrincipal)
    throw errUpdatePrincipal
  }

  console.log('✅ Abono registrado: Cuentas por Cobrar → Cuenta de Prueba')
  return { 
    montoMovido: monto,
    cuentasCobrar: { saldoAnterior: saldoAnteriorCobrar, saldoNuevo: nuevoSaldoCobrar },
    cuentaPrincipal: { saldoAnterior: saldoAnteriorPrincipal, saldoNuevo: nuevoSaldoPrincipal }
  }
}

