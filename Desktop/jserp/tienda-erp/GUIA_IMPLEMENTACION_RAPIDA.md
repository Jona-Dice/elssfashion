# 🔧 GUÍA DE IMPLEMENTACIÓN - CÓDIGO LISTO PARA COPIAR

## CORRECCIÓN 1: Papelera de Ventas con Manejo de Errores

**Ubicación:** [src/admin/Ventas.jsx](src/admin/Ventas.jsx#L243)

**Reemplaza esta función:**

```javascript
// ❌ ACTUAL (SIN ERRORES)
const moverVentaPapelera = async (id) => {
  await supabase.from('ventas').update({ is_deleted: true }).eq('id', id)
  setMensaje('Venta movida a papelera')
  setTimeout(() => setMensaje(''), 3000)
  cargarVentasTrash()
}
```

**Por esta:**

```javascript
// ✅ MEJORADO (CON ERRORES)
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
```

---

## CORRECCIÓN 2: Validar Cliente Obligatorio en Crédito

**Ubicación:** [src/admin/Ventas.jsx](src/admin/Ventas.jsx#L130) - función `registrarVenta`

**Agrega al inicio de la función:**

```javascript
const registrarVenta = async (tipo) => {
  // 🆕 NUEVA VALIDACIÓN
  if (carrito.length === 0) {
    setMensaje('El carrito está vacío')
    setTimeout(() => setMensaje(''), 3000)
    return
  }

  // 🆕 NUEVA VALIDACIÓN - CLIENTE OBLIGATORIO EN CRÉDITO
  if (tipoVenta === 'credito' && !clienteSeleccionado) {
    setMensaje('❌ Debes seleccionar un cliente para venta a crédito')
    setTimeout(() => setMensaje(''), 3000)
    return
  }

  setLoading(true)
  // ... resto de la función
```

**También deshabilita el botón cuando no hay cliente:**

Encuentra este botón:
```jsx
<button
  onClick={() => {
    if (tipoVenta === 'credito') {
      registrarVenta('credito')
    } else {
      registrarVenta('venta')
    }
  }}
  disabled={loading || carrito.length === 0}  // ← AQUÍ
  className="..."
>
```

Y reemplázalo por:
```jsx
<button
  onClick={() => {
    if (tipoVenta === 'credito') {
      registrarVenta('credito')
    } else {
      registrarVenta('venta')
    }
  }}
  disabled={
    loading || 
    carrito.length === 0 || 
    (tipoVenta === 'credito' && !clienteSeleccionado)  // 🆕 NUEVO
  }
  className="..."
>
```

---

## CORRECCIÓN 3: Registrar Transacción para Ventas a Crédito

**Ubicación:** [src/admin/Ventas.jsx](src/admin/Ventas.jsx#L218) - después de crear crédito

**Encuentra esta sección:**

```javascript
// 💳 Si es venta a crédito, crear registro en tabla creditos
if (tipoVenta === 'credito' && clienteSeleccionado) {
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
    // ... error checking
}

// 🔄 Recargar productos
await cargarProductos()

// 💳 IMPORTANTE: Solo para contado
if (tipoVenta === 'contado') {
  // Registrar transacción...
}
```

**Reemplázalo por:**

```javascript
// 💳 Si es venta a crédito, crear registro en tabla creditos
if (tipoVenta === 'credito' && clienteSeleccionado) {
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

  if (errorCredito) {
    console.error(errorCredito)
    setMensaje('Venta registrada pero error al crear el crédito')
    setLoading(false)
    setTimeout(() => setMensaje(''), 3000)
    return
  }
}

// 🔄 Recargar productos
await cargarProductos()

// 💳 NUEVO: Registrar en cuentas TANTO para contado como para crédito
if (tipoVenta === 'contado') {
  // Venta al contado - registrar como ingreso
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
} else if (tipoVenta === 'credito' && clienteSeleccionado) {
  // 🆕 NUEVO: Venta a crédito - registrar como ingreso estimado
  const clienteNombre = clientes.find(c => c.id === clienteSeleccionado)?.nombre || 'Cliente'
  const descripcionProductos = carrito.map(p => `${p.cantidad}x ${p.nombre}`).join(', ')
  
  try {
    await registerAccountTransaction({
      usuarioId: user.id,
      tipo: 'ingreso',
      monto: total,
      descripcion: `Crédito a ${clienteNombre} - Venta ${venta.id}: ${descripcionProductos}`
    })
  } catch (err) {
    console.error('Error registrando transacción de crédito', err)
    // No bloqueamos la venta, solo alertamos
    setMensaje('⚠️ Venta a crédito registrada pero error en flujo de caja')
    setTimeout(() => setMensaje(''), 3000)
  }
}

// Limpiar carrito y notificar
setCarrito([])
setLoading(false)
setMensaje(`Venta ${tipo === 'venta' ? 'realizada' : 'apartada'} correctamente`)
setTimeout(() => setMensaje(''), 3000)
```

---

## MEJORA DE BASE DE DATOS (OPCIONAL AHORA, RECOMENDADO ESTA SEMANA)

### Paso 1: Agregar campo tipo_venta

Abre **Supabase SQL Editor** y ejecuta:

```sql
-- Agregar columna
ALTER TABLE public.ventas 
ADD COLUMN tipo_venta VARCHAR(50) DEFAULT 'contado';

-- Actualizar valores existentes
UPDATE public.ventas 
SET tipo_venta = 'contado'
WHERE tipo_venta = 'contado' OR tipo_venta IS NULL;

CREATE INDEX idx_ventas_tipo_venta ON public.ventas(tipo_venta);
```

### Paso 2: Ejecutar el script MEJORAS_DB.sql

1. Copia el contenido de `MEJORAS_DB.sql`
2. En **Supabase SQL Editor**, pega todo
3. **Ejecuta por partes** (no todo junto):
   - Primero PARTE 1-5 (campos nuevos)
   - Luego PARTE 6-10 (vistas y RLS)
   - Finalmente PARTE 11-14 (triggers y validaciones)

---

## ✅ CHECKLIST DE VERIFICACIÓN

Después de implementar, verifica esto:

### Prueba 1: Venta al Contado
- [ ] Agrego 2 productos al carrito
- [ ] Selecciono "Al Contado"
- [ ] Hago clic en "Completar Venta"
- [ ] Aparece mensaje de éxito ✅
- [ ] Carrito se limpia
- [ ] Stock disminuye
- [ ] En Cuentas → Transacciones aparece el movimiento

### Prueba 2: Venta a Crédito
- [ ] Agrego 2 productos al carrito
- [ ] Selecciono "A Crédito"
- [ ] Botón dice "Registrar a Crédito"
- [ ] Si NO selecciono cliente, botón está **deshabilitado**
- [ ] Selecciono cliente
- [ ] Botón se habilita
- [ ] Hago clic
- [ ] Aparece mensaje de éxito ✅
- [ ] En Créditos aparece el crédito nuevo
- [ ] En Cuentas → Transacciones aparece como "Crédito a [Cliente]"

### Prueba 3: Pago de Crédito
- [ ] En Créditos, busco el crédito nuevo
- [ ] Hago clic en "Registrar Abono"
- [ ] Ingreso monto menor al pendiente
- [ ] Hago clic en "Registrar Abono"
- [ ] Monto pendiente **disminuye**
- [ ] Estado cambia (pendiente → parcial)
- [ ] En Cuentas → Transacciones aparece "Abono de crédito"

### Prueba 4: Papelera
- [ ] En Ventas, hago clic en 🗑️ de una venta
- [ ] Aparece mensaje "Venta movida a papelera" ✅
- [ ] Ven venta desaparece del listado
- [ ] Hago clic en "🗑️ Papelera"
- [ ] Aparece la venta eliminada
- [ ] Hago clic en ↩️
- [ ] Venta regresa al listado principal

---

## 🐛 SI ALGO FALLA

### Error 1: "Cliente no definido"
**Causa:** No pasaste la variable de clientes correctamente
**Solución:** Verifica que `clientes` esté en useState

### Error 2: "No se registra transacción en cuentas"
**Causa:** `registerAccountTransaction` no existe o está mal importado
**Solución:** Verifica que esté importado al inicio del archivo:
```javascript
import { registerAccountTransaction } from '../lib/account'
```

### Error 3: "updateCredito no se actualiza"
**Causa:** El trigger SQL no ejecutó correctamente
**Solución:** Ejecuta el script `MEJORAS_DB.sql` de nuevo, parte 11

### Error 4: "RLS impide ver datos"
**Causa:** Políticas de seguridad bloqueando vistas
**Solución:** Verifica que usuario esté autenticado con: `supabase.auth.getUser()`

---

## 📝 RESUMEN DEL CAMINO

| Paso | Qué | Dónde | Tiempo |
|------|-----|-------|--------|
| 1 | Copiar corrección papelera | Ventas.jsx L243 | 5 min |
| 2 | Agregar validación cliente | Ventas.jsx L130 | 5 min |
| 3 | Registrar transacción crédito | Ventas.jsx L218 | 10 min |
| 4 | Probar flujos (checklist) | Tu navegador | 15 min |
| 5 | Ejecutar script BD (opcional) | Supabase | 10 min |
| **TOTAL** | **FUNCIONAL** | **45 min** | ✅ |

---

¡**Listo para implementar?** 🚀

Siguiente paso:
1. Copia las 3 correcciones de código
2. Reemplaza en Ventas.jsx
3. Haz commit y push
4. Prueba con el checklist
5. Avísame si necesitas help
