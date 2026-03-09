-- ============================================================
-- SCRIPT DE REVERSIÓN - REMOVER SISTEMA is_hidden
-- Ejecuta ESTO en tu base de datos para revertir los cambios
-- ============================================================

-- 1) PRODUCTOS
ALTER TABLE public.productos
DROP COLUMN IF EXISTS is_hidden;

-- 2) CATEGORÍAS
ALTER TABLE public.categorias
DROP COLUMN IF EXISTS is_hidden;

-- 3) VENTAS
ALTER TABLE public.ventas
DROP COLUMN IF EXISTS is_hidden;

-- 4) DETALLES DE VENTAS
ALTER TABLE public.detalle_ventas
DROP COLUMN IF EXISTS is_hidden;

-- 5) CUENTAS
ALTER TABLE public.cuentas
DROP COLUMN IF EXISTS is_hidden;

-- 6) TRANSACCIONES
ALTER TABLE public.transacciones
DROP COLUMN IF EXISTS is_hidden;

-- ============================================================
-- ¡Listo! Todo ha sido revertido a su estado original
-- ============================================================
