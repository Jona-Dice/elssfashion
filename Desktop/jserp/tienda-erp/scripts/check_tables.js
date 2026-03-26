import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rfkxdxlczlyfanngbeng.supabase.co';
const supabaseKey = 'sb_publishable_6hpygO-vWcl1CPF8G2bczw_mOXxs-xe';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('--- INSPECCIÓN DE BASES DE DATOS ---');
  
  // Revisar Ventas sin filtros
  const { data: ventasT, error: err1 } = await supabase.from('ventas').select('*');
  console.log(`Ventas totales (sin filtro is_deleted):`, ventasT?.length, err1 ? `Error: ${err1.message}` : '');
  
  if (ventasT && ventasT.length > 0) {
    console.log('Sample Venta:', ventasT[0]);
  }

  // Revisar Detalle Ventas
  const { data: detT, error: errDet } = await supabase.from('detalle_ventas').select('*');
  console.log(`Detalles Ventas totales:`, detT?.length, errDet ? `Error: ${errDet.message}` : '');

  // Revisar Transacciones
  const { data: transT, error: err2 } = await supabase.from('transacciones').select('*');
  console.log(`Transacciones totales:`, transT?.length, err2 ? `Error: ${err2.message}` : '');
  
  // Revisar Clientes
  const { data: clientes, error: err3 } = await supabase.from('clientes').select('*');
  console.log(`Clientes totales:`, clientes?.length, err3 ? `Error: ${err3.message}` : '');
  
}

checkTables().catch(console.error);
