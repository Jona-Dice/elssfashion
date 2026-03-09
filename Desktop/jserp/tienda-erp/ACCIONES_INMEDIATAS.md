# 🎯 ACCIONES INMEDIATAS - PRIORIDAD ALTA

## 1. CORRECCIONES DE CÓDIGO (Hoy/Mañana)

### ✅ Tarea 1: Arreglar papelera de Ventas.jsx

**Archivo:** `src/admin/Ventas.jsx` - Línea 243

**Problema:** Sin manejo de errores, puede no funcionar correctamente.

**Solución:** Aplicar patrón de Cuentas.jsx

```javascript
// ❌ ACTUAL
const moverVentaPapelera = async (id) => {
  await supabase.from('ventas').update({ is_deleted: true }).eq('id', id)
  setMensaje('Venta movida a papelera')
  setTimeout(() => setMensaje(''), 3000)
  cargarVentasTrash()
}

// ✅ CORRECTO
const moverVentaPapelera = async (id) => {
  try {
    const { error } = await supabase
      .from('ventas')
      .update({ is_deleted: true })
      .eq('id', id)
    
    if (error) {
      setMensaje('Error al mover venta a papelera')
      console.error('Error:', error)
      return
    }
    
    // Actualizar UI inmediatamente (sin recargar todo)
    setCarrito([]) // Limpiar si es necesario
    setMensaje('Venta movida a papelera')
    setTimeout(() => setMensaje(''), 3000)
    
    // Recargar en segundo plano
    await cargarVentasTrash()
  } catch (error) {
    setMensaje('Error al mover venta a papelera')
    console.error('Error:', error)
  }
}
```

---

### ✅ Tarea 2: Validar cliente obligatorio en crédito

**Archivo:** `src/admin/Ventas.jsx` - Línea ~120

**Problema:** Se puede registrar crédito sin cliente.

**Solución:**

```javascript
// En registrarVenta(), agregar al inicio:
if (tipoVenta === 'credito' && !clienteSeleccionado) {
  setMensaje('❌ Debes seleccionar un cliente para venta a crédito')
  setTimeout(() => setMensaje(''), 3000)
  return
}

// También deshabilitar botón
<button
  onClick={() => registrarVenta(...)}
  disabled={
    loading || 
    carrito.length === 0 || 
    (tipoVenta === 'credito' && !clienteSeleccionado)  // ← Agregar esto
  }
>
```

---

### ✅ Tarea 3: Registrar transacción en cuentas para créditos

**Archivo:** `src/admin/Ventas.jsx` - Línea ~218

**Problema:** Créditos no aparecen en flujo de caja.

**Solución:**

```javascript
// Después de crear crédito, agregar:
if (tipoVenta === 'credito' && clienteSeleccionado) {
  try {
    const clienteNombre = clientes.find(c => c.id === clienteSeleccionado)?.nombre || 'Cliente'
    const descripcionProductos = carrito.map(p => `${p.cantidad}x ${p.nombre}`).join(', ')
    
    await registerAccountTransaction({
      usuarioId: user.id,
      tipo: 'ingreso',
      monto: total,
      descripcion: `Crédito a ${clienteNombre}: ${descripcionProductos}`
    })
  } catch (err) {
    console.error('Error registrando transacción de crédito', err)
    // No bloquear la venta, solo alertar
    setMensaje('⚠️ Venta a crédito registrada pero error en flujo de caja')
  }
}
```

---

## 2. CAMBIOS EN BD (Esta semana)

### ✅ Tarea 4: Agregar campo tipo_venta

**Por qué:** Para saber qué tipo de venta fue cada registro.

```sql
-- En Supabase SQL Editor:
ALTER TABLE public.ventas 
ADD COLUMN tipo_venta VARCHAR(50) DEFAULT 'contado';

-- Actualizar datos existentes
UPDATE public.ventas 
SET tipo_venta = CASE 
  WHEN estado = 'venta' THEN 'contado'
  WHEN estado = 'apartado' THEN 'apartado'
  ELSE 'venta'
END;
```

### ✅ Tarea 5: Ejecutar script MEJORAS_DB.sql

Este script implementa:
- ✅ Campos adicionales en creditos
- ✅ Vistas útiles para reportes
- ✅ Triggers automáticos
- ✅ RLS mejorado
- ✅ Funciones de ayuda

---

## 3. TABLERO DE ESTADO ACTUAL

```
┌─────────────────────────────────────────┐
│      ESTADO DEL SISTEMA - TIENDA ERP    │
├─────────────────────────────────────────┤
│                                         │
│ 📦 PRODUCTOS                   ████████░ 80% │
│   - CRUD completo              ✅        │
│   - Stock                      ✅        │
│   - Categorías                 ✅        │
│   - Falta: Imágenes            ❌        │
│                                         │
│ 🛍️  VENTAS AL CONTADO         ████████░ 85% │
│   - Carrito                    ✅        │
│   - Registro                   ✅        │
│   - Transacciones              ✅        │
│   - Papelera (errores)         ⚠️        │
│                                         │
│ 💳 VENTAS A CRÉDITO            ████░░░░░ 40% │
│   - Crear crédito              ✅        │
│   - Abonos                     ✅        │
│   - Validaciones               ❌        │
│   - Flujo de caja              ❌        │
│   - Comprobante                ❌        │
│   - Reportes                   ❌        │
│                                         │
│ 👥 CLIENTES                    ███░░░░░░ 30% │
│   - Crear                      ✅        │
│   - Leer                       ✅        │
│   - Editar                     ❌        │
│   - Eliminar                   ❌        │
│   - Búsqueda                   ❌        │
│                                         │
│ 💰 CUENTAS/FLUJO DE CAJA       █████░░░░ 50% │
│   - Cuentas básicas            ✅        │
│   - Transacciones              ✅        │
│   - Papelera                   ✅        │
│   - A crédito NO incluido      ❌        │
│   - Reportes                   ❌        │
│                                         │
│ 📊 REPORTES                     ██░░░░░░░ 20% │
│   - Existen plantillas         ✅        │
│   - Ventas                     ❌        │
│   - Créditos                   ❌        │
│   - Flujo de caja              ❌        │
│                                         │
├─────────────────────────────────────────┤
│ ESTADO GENERAL:     ████░░░░░░  52%     │
│                                         │
│ LISTO PARA PRODUCCIÓN:         ⚠️ NO    │
│ APTO PARA PRUEBAS:             ✅ SÍ    │
│                                         │
└─────────────────────────────────────────┘
```

---

## 4. CRONOGRAMA DE IMPLEMENTACIÓN

### 🔴 SEMANA 1 (CRÍTICO)
```
LUN: Arreglar papelera de ventas + validar cliente
MAR: Agregar tipo_venta + registrar transacciones crédito
MIÉ: Ejecutar script MEJORAS_DB.sql
JUE: Pruebas de ventas contado + crédito
VIE: Validaciones y ajustes
```

### 🟠 SEMANA 2 (IMPORTANTE)
```
Editar/eliminar clientes
Comprobante de abono
CRUD completo de clientes
Búsqueda de clientes
```

### 🟡 SEMANA 3 (MEJORAS)
```
Sistema de mora/intereses
Refinanciamiento
Reportes básicos
Dashboard de créditos
```

---

## 5. CHECKLIST PARA HOY

- [ ] Revisar y entender Ventas.jsx completo
- [ ] Aplicar corrección 1: Papelera con errores
- [ ] Aplicar corrección 2: Validar cliente
- [ ] Aplicar corrección 3: Transacciones de crédito
- [ ] Hacer commit con cambios
- [ ] Probar flujo completo de venta al contado
- [ ] Probar flujo completo de venta a crédito

---

## 6. PREGUNTAS PARA VALIDAR

Cuando hayas hecho los cambios, verifica:

1. **Venta al Contado:**
   - ✅ Se registra venta
   - ✅ Stock disminuye
   - ✅ Transacción en cuentas (+monto)
   - ✅ Aparece en historial

2. **Venta a Crédito:**
   - ✅ Obliga a seleccionar cliente
   - ✅ Se registra crédito
   - ✅ Stock disminuye
   - ✅ Monto pendiente = total
   - ✅ Transacción en cuentas (concepto "Crédito a...")

3. **Pago de Crédito:**
   - ✅ Se registra abono
   - ✅ Monto pendiente disminuye
   - ✅ Estado cambia (pendiente → parcial → pagado)
   - ✅ Transacción en cuentas (concepto "Abono de crédito...")

4. **Papelera:**
   - ✅ Venta se mueve a papelera sin errores
   - ✅ Se quita del listado principal
   - ✅ Se ve en sección papelera
   - ✅ Se puede recuperar

---

## 7. COMANDOS SQL PARA VALIDAR

```sql
-- Ver todas las ventas con sus tipos
SELECT id, estado, tipo_venta, total, created_at 
FROM public.ventas 
ORDER BY created_at DESC;

-- Ver créditos activos
SELECT 
  c.nombre,
  cr.monto_total,
  cr.monto_pagado,
  cr.monto_pendiente,
  cr.estado
FROM public.clientes c
INNER JOIN public.creditos cr ON c.id = cr.cliente_id
WHERE cr.estado != 'pagado';

-- Ver transacciones de un cliente
SELECT 
  t.created_at,
  t.tipo,
  t.monto,
  t.descripcion,
  t.saldo_nuevo
FROM public.transacciones t
WHERE t.descripcion LIKE '%[nombre_cliente]%'
ORDER BY t.created_at DESC;
```

---

## 8. RECURSOS ÚTILES CREADOS

✅ **ANALISIS_SISTEMA_COMPLETO.md**
- Análisis detallado de cada módulo
- Problemas identificados
- Recomendaciones por fase
- Diagrama de arquitectura

✅ **MEJORAS_DB.sql**
- Script SQL con mejoras
- Vistas útiles
- Triggers automáticos
- Funciones de ayuda
- Validaciones

✅ **CLEAN_DATA_BEFORE_20FEB.sql**
- Limpieza de datos antiguos
- Script de verificación
- Papelera segura

---

## 9. PRÓXIMAS REUNIONES RECOMENDADAS

1. **Hoy:** Revisar análisis + planificar semana
2. **Mañana:** Implementar cambios críticos
3. **Esta semana:** Pruebas exhaustivas
4. **Próxima semana:** Réplicas y CRUD clientes

---

**¿Por dónde empiezas?**

👉 **Opción A (Recomendado):** 
1. Lee ANALISIS_SISTEMA_COMPLETO.md
2. Aplica las 3 correcciones de código
3. Ejecuta MEJORAS_DB.sql

👉 **Opción B (Rápido):**
1. Haz las 3 correcciones de código YA
2. Prueba ventas contado + crédito
3. Luego síguete con la BD

---

**¿Necesitas que implemente algo de esto en el código? Dime y lo hago.**
