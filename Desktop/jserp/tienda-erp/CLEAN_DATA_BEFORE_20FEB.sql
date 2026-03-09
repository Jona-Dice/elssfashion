-- ========================================
-- SCRIPT PARA LIMPIAR DATOS ANTES DEL 20 DE FEBRERO 2026
-- ========================================
-- ADVERTENCIA: Este script marca los registros como eliminados usando is_deleted = true
-- NO borra los registros permanentemente de la base de datos

-- ========================================
-- 1. VERIFICAR CUÁNTOS REGISTROS SE VAN A ELIMINAR (OPCIONAL - SOLO PARA VALIDAR)
-- ========================================

-- Ventas a eliminar
SELECT COUNT(*) as total_ventas_a_eliminar
FROM public.ventas
WHERE created_at < '2026-02-20'::timestamp
AND is_deleted = false;

-- Transacciones a eliminar
SELECT COUNT(*) as total_transacciones_a_eliminar
FROM public.transacciones
WHERE created_at < '2026-02-20'::timestamp
AND is_deleted = false;

-- Detalles de ventas a eliminar (relacionados con ventas)
SELECT COUNT(*) as total_detalles_a_eliminar
FROM public.detalle_ventas dv
INNER JOIN public.ventas v ON dv.venta_id = v.id
WHERE v.created_at < '2026-02-20'::timestamp
AND dv.is_deleted = false;

-- ========================================
-- 2. ELIMINAR (MARCAR COMO DELETED) LOS REGISTROS
-- ========================================

-- Marcar detalles de ventas como eliminados (primero, porque dependen de ventas)
UPDATE public.detalle_ventas
SET is_deleted = true
WHERE venta_id IN (
  SELECT id FROM public.ventas
  WHERE created_at < '2026-02-20'::timestamp
)
AND is_deleted = false;

-- Marcar ventas como eliminadas
UPDATE public.ventas
SET is_deleted = true
WHERE created_at < '2026-02-20'::timestamp
AND is_deleted = false;

-- Marcar transacciones como eliminadas
UPDATE public.transacciones
SET is_deleted = true
WHERE created_at < '2026-02-20'::timestamp
AND is_deleted = false;

-- ========================================
-- 3. CONFIRMAR QUE LOS DATOS SE ELIMINARON (OPCIONAL - SOLO PARA VALIDAR)
-- ========================================

-- Verificar ventas eliminadas
SELECT COUNT(*) as ventas_eliminadas
FROM public.ventas
WHERE created_at < '2026-02-20'::timestamp
AND is_deleted = true;

-- Verificar transacciones eliminadas
SELECT COUNT(*) as transacciones_eliminadas
FROM public.transacciones
WHERE created_at < '2026-02-20'::timestamp
AND is_deleted = true;

-- Verificar detalles de ventas eliminadas
SELECT COUNT(*) as detalles_eliminados
FROM public.detalle_ventas
WHERE is_deleted = true;
