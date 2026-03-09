-- ============================================================
-- SCRIPT PARA CONFIGURAR REPORTES
-- Adaptado a la estructura real de tu base de datos
-- ============================================================

-- 1) Crear índices para optimizar reportes (si no existen)
CREATE INDEX IF NOT EXISTS idx_productos_categoria_id ON public.productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_detalle_ventas_venta_id ON public.detalle_ventas(venta_id);
CREATE INDEX IF NOT EXISTS idx_detalle_ventas_producto_id ON public.detalle_ventas(producto_id);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON public.ventas(fecha);
CREATE INDEX IF NOT EXISTS idx_cuentas_usuario_id ON public.cuentas(usuario_id);

-- 2) Agregar created_at a ventas si no existe (usando la fecha existente como por defecto)
ALTER TABLE public.ventas 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3) Actualizar created_at con los valores de fecha existentes
UPDATE public.ventas 
SET created_at = fecha 
WHERE created_at IS NULL AND fecha IS NOT NULL;

-- 4) Insertar categorías por defecto si no existen
INSERT INTO public.categorias (nombre, descripcion) VALUES
  ('Sin Categoría', 'Productos sin categoría asignada'),
  ('Electrónica', 'Productos electrónicos'),
  ('Ropa', 'Prendas de vestir'),
  ('Alimentos', 'Productos alimenticios'),
  ('Servicios', 'Servicios diversos')
ON CONFLICT DO NOTHING;

-- ============================================================
-- ¡LISTO!
-- ============================================================
-- Tu base de datos está lista para los reportes
-- 
-- Tablas disponibles:
-- - categorias (con nombre, descripcion)
-- - productos (con categoria_id, imagen_url)
-- - ventas (con fecha, created_at, total, estado)
-- - detalle_ventas (con venta_id, producto_id, cantidad, precio, subtotal)
-- - cuentas (con usuario_id, tipo, saldo)
-- - transacciones (con cuenta_id, monto, descripcion)
-- ============================================================
