-- ============================================================
-- SCRIPT PARA LIMPIAR DATOS DE PRUEBA
-- Elimina toda la información de prueba pero MANTIENE los usuarios
-- ============================================================

-- Desactivar restricciones de FK temporalmente
ALTER TABLE public.transacciones DISABLE TRIGGER ALL;
ALTER TABLE public.detalle_ventas DISABLE TRIGGER ALL;
ALTER TABLE public.ventas DISABLE TRIGGER ALL;
ALTER TABLE public.cuentas DISABLE TRIGGER ALL;
ALTER TABLE public.productos DISABLE TRIGGER ALL;
ALTER TABLE public.categorias DISABLE TRIGGER ALL;

-- ============================================================
-- PASO 1: Limpiar transacciones (sin dependencias)
-- ============================================================
DELETE FROM public.transacciones;
ALTER SEQUENCE public.transacciones_id_seq RESTART WITH 1;

-- ============================================================
-- PASO 2: Limpiar detalles de ventas
-- ============================================================
DELETE FROM public.detalle_ventas;
ALTER SEQUENCE public.detalle_ventas_id_seq RESTART WITH 1;

-- ============================================================
-- PASO 3: Limpiar ventas
-- ============================================================
DELETE FROM public.ventas;
ALTER SEQUENCE public.ventas_id_seq RESTART WITH 1;

-- ============================================================
-- PASO 4: Limpiar cuentas (EXCEPTO las de usuarios principales)
-- ============================================================
DELETE FROM public.cuentas 
WHERE usuario_id NOT IN (SELECT id FROM public.usuarios);

-- ============================================================
-- PASO 5: Limpiar productos
-- ============================================================
DELETE FROM public.productos;
ALTER SEQUENCE public.productos_id_seq RESTART WITH 1;

-- ============================================================
-- PASO 6: Limpiar categorías
-- ============================================================
DELETE FROM public.categorias;
ALTER SEQUENCE public.categorias_id_seq RESTART WITH 1;

-- ============================================================
-- Reactivar restricciones de FK
-- ============================================================
ALTER TABLE public.categorias ENABLE TRIGGER ALL;
ALTER TABLE public.productos ENABLE TRIGGER ALL;
ALTER TABLE public.cuentas ENABLE TRIGGER ALL;
ALTER TABLE public.ventas ENABLE TRIGGER ALL;
ALTER TABLE public.detalle_ventas ENABLE TRIGGER ALL;
ALTER TABLE public.transacciones ENABLE TRIGGER ALL;

-- ============================================================
-- ¡LISTO!
-- ============================================================
-- ✓ Transacciones: Eliminadas
-- ✓ Detalles de ventas: Eliminados
-- ✓ Ventas: Eliminadas
-- ✓ Productos: Eliminados
-- ✓ Categorías: Eliminadas
-- ✓ Cuentas: Limpias (asociadas a usuarios válidos)
-- ✓ Usuarios: INTACTOS
-- 
-- Ahora puedes insertar datos nuevos sin conflictos de prueba anterior.
-- ============================================================
