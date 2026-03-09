-- ========================================
-- DIAGNÓSTICO: DESHABILITAR RLS TEMPORALMENTE
-- ========================================
-- 🔴 IMPORTANTE: Esto es SOLO para diagnóstico
-- Después lo habilitaremos nuevamente

-- Ver estado actual de RLS
SELECT 
  schemaname,
  tablename, 
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('ventas', 'creditos', 'clientes', 'abonos', 'transacciones', 'cuentas')
ORDER BY tablename;

-- Deshabilitar RLS temporalmente en creditos
ALTER TABLE public.creditos DISABLE ROW LEVEL SECURITY;

-- Ver creditos ahora (sin RLS)
SELECT 
  id,
  cliente_id,
  venta_id,
  monto_total,
  estado,
  usuario_id,
  created_at
FROM public.creditos
ORDER BY created_at DESC
LIMIT 10;

-- Ver estadísticas
SELECT 
  'creditos' as tabla,
  COUNT(*) as total_registros,
  COUNT(DISTINCT usuario_id) as usuarios_diferentes
FROM public.creditos
UNION ALL
SELECT 'ventas', COUNT(*), COUNT(DISTINCT usuario_id) FROM public.ventas
UNION ALL
SELECT 'clientes', COUNT(*), COUNT(DISTINCT usuario_id) FROM public.clientes;

-- Y ver los datos de tu usuario actual
SELECT 
  auth.uid() as tu_usuario_id;

-- Ver creditos del usuario actual
SELECT 
  cr.id,
  cr.cliente_id,
  cr.monto_total,
  cr.estado,
  c.nombre as cliente_nombre
FROM public.creditos cr
LEFT JOIN public.clientes c ON c.id = cr.cliente_id
WHERE cr.usuario_id = auth.uid()
ORDER BY cr.created_at DESC;

-- ========================================
-- RESUMEN
-- ========================================
-- Si NO ves creditos incluso con RLS deshabilitado:
--   → Problema: No hay créditos guardados
--   → Solución: Vender nuevamente a crédito
--
-- Si VES creditos sin RLS pero NO con RLS:
--   → Problema: Las RLS policies están mal
--   → Solución: Necesito corregir las policies
-- ========================================
