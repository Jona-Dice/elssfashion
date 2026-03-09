-- ============================================================
-- MIGRATION: Cambiar de is_hidden a is_deleted (Sistema Papelera)
-- ============================================================

-- 1) CATEGORIAS - Renombrar columna
ALTER TABLE public.categorias
RENAME COLUMN is_hidden TO is_deleted;

-- 2) PRODUCTOS - Renombrar columna
ALTER TABLE public.productos
RENAME COLUMN is_hidden TO is_deleted;

-- 3) VENTAS - Renombrar columna
ALTER TABLE public.ventas
RENAME COLUMN is_hidden TO is_deleted;

-- 4) DETALLE_VENTAS - Agregar columna si no existe
ALTER TABLE public.detalle_ventas
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- 5) CUENTAS - Renombrar columna
ALTER TABLE public.cuentas
RENAME COLUMN is_hidden TO is_deleted;

-- 6) TRANSACCIONES - Renombrar columna
ALTER TABLE public.transacciones
RENAME COLUMN is_hidden TO is_deleted;

-- 7) Crear índices para mejorar performance en queries de filtrado
CREATE INDEX IF NOT EXISTS idx_categorias_is_deleted ON public.categorias(is_deleted);
CREATE INDEX IF NOT EXISTS idx_productos_is_deleted ON public.productos(is_deleted);
CREATE INDEX IF NOT EXISTS idx_ventas_is_deleted ON public.ventas(is_deleted);
CREATE INDEX IF NOT EXISTS idx_detalle_ventas_is_deleted ON public.detalle_ventas(is_deleted);
CREATE INDEX IF NOT EXISTS idx_cuentas_is_deleted ON public.cuentas(is_deleted);
CREATE INDEX IF NOT EXISTS idx_transacciones_is_deleted ON public.transacciones(is_deleted);

-- ============================================================
-- VERIFICACIÓN - Ver estado actual
-- ============================================================

SELECT 'CATEGORIAS' as Tabla, COUNT(*) as Total, 
COUNT(*) FILTER (WHERE is_deleted = false) as Activas,
COUNT(*) FILTER (WHERE is_deleted = true) as Eliminadas
FROM public.categorias

UNION ALL

SELECT 'PRODUCTOS', COUNT(*), 
COUNT(*) FILTER (WHERE is_deleted = false),
COUNT(*) FILTER (WHERE is_deleted = true)
FROM public.productos

UNION ALL

SELECT 'VENTAS', COUNT(*), 
COUNT(*) FILTER (WHERE is_deleted = false),
COUNT(*) FILTER (WHERE is_deleted = true)
FROM public.ventas

UNION ALL

SELECT 'CUENTAS', COUNT(*), 
COUNT(*) FILTER (WHERE is_deleted = false),
COUNT(*) FILTER (WHERE is_deleted = true)
FROM public.cuentas

UNION ALL

SELECT 'TRANSACCIONES', COUNT(*), 
COUNT(*) FILTER (WHERE is_deleted = false),
COUNT(*) FILTER (WHERE is_deleted = true)
FROM public.transacciones;

-- ============================================================
-- ¡Listo! Ahora las tablas están preparadas para el sistema de papelera
-- ============================================================
