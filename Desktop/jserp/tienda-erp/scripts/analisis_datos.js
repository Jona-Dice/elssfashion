import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://rfkxdxlczlyfanngbeng.supabase.co',
  'sb_publishable_6hpygO-vWcl1CPF8G2bczw_mOXxs-xe'
);

async function analizarDatos() {
  console.log('Iniciando obtención de datos...');
  
  // 1. Obtener Ventas y Detalles
  const { data: ventas, error: ventasErr } = await supabase
    .from('ventas')
    .select('id, total, tipo_venta, estado, created_at, detalle_ventas(cantidad, precio, subtotal, productos(nombre, precio_venta))')
    .eq('is_deleted', false);
    
  if (ventasErr) console.error('Error ventas:', ventasErr);

  // 2. Obtener Productos
  const { data: productos, error: prodErr } = await supabase
    .from('productos')
    .select('id, nombre, stock, precio_venta')
    .eq('is_deleted', false);
    
  if (prodErr) console.error('Error productos:', prodErr);

  // 3. Obtener Transacciones (Egresos e Ingresos extra)
  const { data: transacciones, error: transErr } = await supabase
    .from('transacciones')
    .select('monto, tipo, created_at');
    // .eq('is_deleted', false) // is_deleted does not exist in transacciones schema
    
  if (transErr) console.error('Error transacciones:', transErr);

  // 4. Obtener Créditos (Deuda pendiente)
  const { data: creditos, error: credErr } = await supabase
    .from('creditos')
    .select('monto_total, monto_pagado, monto_pendiente, estado');
    
  if (credErr) console.error('Error creditos:', credErr);

  console.log('\n--- PROCESANDO ANÁLISIS ---');
  
  // --- A. Análisis de Ventas ---
  const totalVentas = ventas?.length || 0;
  const ingresosBrutosVentas = ventas?.reduce((acc, v) => acc + Number(v.total || 0), 0) || 0;
  
  console.log(`\n📊 1. Resumen de Ventas Generales`);
  console.log(`- Total de tickets/ventas: ${totalVentas}`);
  console.log(`- Ingresos Brutos Totales: $${ingresosBrutosVentas.toFixed(2)}`);

  // --- B. Productos más vendidos ---
  const productoVentas = {};

  ventas?.forEach(v => {
    v.detalle_ventas?.forEach(d => {
      const pName = d.productos?.nombre || 'Desconocido';
      const cantidad = Number(d.cantidad || 0);
      const sub = Number(d.subtotal || 0);
            
      if(!productoVentas[pName]) productoVentas[pName] = { cantidad: 0, ingresos: 0 };
      productoVentas[pName].cantidad += cantidad;
      productoVentas[pName].ingresos += sub;
    });
  });

  const topVendidos = Object.entries(productoVentas)
    .sort((a,b) => b[1].cantidad - a[1].cantidad)
    .slice(0, 10);
    
  console.log(`\n📦 2. Top 10 Productos Más Vendidos`);
  topVendidos.forEach(([nombre, stats], i) => {
    console.log(`   ${i+1}. ${nombre} | Qty: ${stats.cantidad} | Ingreso: $${stats.ingresos.toFixed(2)}`);
  });

  // --- C. Rentabilidad y Gastos ---
  const egresosTotales = transacciones
    ?.filter(t => t.tipo === 'egreso')
    .reduce((acc, t) => acc + Number(t.monto || 0), 0) || 0;
    
  const ingresosExtra = transacciones
    ?.filter(t => t.tipo === 'ingreso')
    .reduce((acc, t) => acc + Number(t.monto || 0), 0) || 0;

  console.log(`\n💰 3. Movimientos Operacionales`);
  console.log(`- Ingresos Ventas: $${ingresosBrutosVentas.toFixed(2)}`);
  console.log(`- Otros Ingresos (Transacciones): $${ingresosExtra.toFixed(2)}`);
  console.log(`- Egresos Registrados: $${egresosTotales.toFixed(2)}`);
  console.log(`- Balance General (Ingresos Totales - Egresos): $${(ingresosBrutosVentas + ingresosExtra - egresosTotales).toFixed(2)}`);
  
  // --- D. Deudas (Si hay ventas no cobradas) ---
  const creditosPendientes = creditos?.reduce((acc, c) => acc + Number(c.monto_pendiente || 0), 0) || 0;
  const creditosCobrados = creditos?.reduce((acc, c) => acc + Number(c.monto_pagado || 0), 0) || 0;
  
  console.log(`\n💳 4. Cartera Vencida / Créditos`);
  console.log(`- Dinero pendiente por cobrar (Créditos): $${creditosPendientes.toFixed(2)}`);
  console.log(`- Dinero ya cobrado de créditos: $${creditosCobrados.toFixed(2)}`);

  // --- E. Salud del Inventario ---
  const valorInventario = productos?.reduce((acc, p) => acc + (Number(p.stock||0) * Number(p.precio_venta||0)), 0) || 0;
  const stockCero = productos?.filter(p => Number(p.stock||0) === 0).length || 0;
  
  console.log(`\n🏪 5. Salud del Inventario`);
  console.log(`- Valor Estimado del Inventario a Precio de Venta: $${valorInventario.toFixed(2)}`);
  console.log(`- Total de Productos distintos: ${productos?.length || 0}`);
  console.log(`- Productos Agotados (Stock cero): ${stockCero}`);

}

analizarDatos().catch(console.error);
