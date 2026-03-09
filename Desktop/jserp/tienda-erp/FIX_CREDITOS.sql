-- ========================================
-- FIX: CORREGIR PROBLEMAS CON VENTAS A CREDITO
-- ========================================

-- PASO 1: Corregir el DEFAULT de tipo_venta
ALTER TABLE public.ventas 
ALTER COLUMN tipo_venta SET DEFAULT 'contado';

-- PASO 2: Agregar cliente_id a ventas (si no existe)
ALTER TABLE public.ventas 
ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL;

-- PASO 3: Crear índice para cliente_id en ventas
CREATE INDEX IF NOT EXISTS idx_ventas_cliente_id ON public.ventas(cliente_id);

-- PASO 4: Actualizar ventas existentes que tengan crédito con el cliente_id del crédito
UPDATE public.ventas v
SET cliente_id = (
  SELECT cr.cliente_id FROM public.creditos cr 
  WHERE cr.venta_id = v.id 
  LIMIT 1
)
WHERE v.tipo_venta = 'credito' AND v.cliente_id IS NULL;

-- PASO 5: Verificar RLS - Crear/reemplazar políticas seguras
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Ver ventas propias" ON public.ventas;
DROP POLICY IF EXISTS "Crear ventas propias" ON public.ventas;
DROP POLICY IF EXISTS "Editar ventas propias" ON public.ventas;
DROP POLICY IF EXISTS "Eliminar ventas propias" ON public.ventas;

CREATE POLICY "Ver ventas propias" ON public.ventas 
  FOR SELECT 
  USING (auth.uid() = usuario_id);

CREATE POLICY "Crear ventas propias" ON public.ventas 
  FOR INSERT 
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Editar ventas propias" ON public.ventas 
  FOR UPDATE 
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Eliminar ventas propias" ON public.ventas 
  FOR DELETE 
  USING (auth.uid() = usuario_id);

-- PASO 6: Hacer lo mismo para transacciones que puede estar faltando
ALTER TABLE public.cuentas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Ver cuentas propias" ON public.cuentas;
DROP POLICY IF EXISTS "Crear cuentas propias" ON public.cuentas;

CREATE POLICY "Ver cuentas propias" ON public.cuentas 
  FOR SELECT 
  USING (auth.uid() = usuario_id);

CREATE POLICY "Crear cuentas propias" ON public.cuentas 
  FOR INSERT 
  WITH CHECK (auth.uid() = usuario_id);

ALTER TABLE public.transacciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Ver transacciones de cuentas propias" ON public.transacciones;
DROP POLICY IF EXISTS "Crear transacciones de cuentas propias" ON public.transacciones;

CREATE POLICY "Ver transacciones de cuentas propias" ON public.transacciones 
  FOR SELECT 
  USING (
    EXISTS(
      SELECT 1 FROM public.cuentas c 
      WHERE c.id = cuenta_id 
      AND c.usuario_id = auth.uid()
    )
  );

CREATE POLICY "Crear transacciones de cuentas propias" ON public.transacciones 
  FOR INSERT 
  WITH CHECK (
    EXISTS(
      SELECT 1 FROM public.cuentas c 
      WHERE c.id = cuenta_id 
      AND c.usuario_id = auth.uid()
    )
  );

-- PASO 7: Verificar que las tablas estén sincronizadas
SELECT 'Tabla Ventas' as tabla, COUNT(*) as total
FROM public.ventas
UNION ALL
SELECT 'Créditos', COUNT(*) FROM public.creditos
UNION ALL  
SELECT 'Clientes', COUNT(*) FROM public.clientes
UNION ALL
SELECT 'Cuentas', COUNT(*) FROM public.cuentas
UNION ALL
SELECT 'Transacciones', COUNT(*) FROM public.transacciones;

-- PASO 8: Ver créditos sin venta vinculada (posibles problemas)
SELECT 
  cr.id,
  cr.cliente_id,
  cr.venta_id,
  cr.monto_total,
  cr.estado,
  c.nombre
FROM public.creditos cr
LEFT JOIN public.clientes c ON cr.cliente_id = c.id
WHERE cr.venta_id IS NULL
ORDER BY cr.created_at DESC;

-- ========================================
-- FIN - CORRECCIONES APLICADAS
-- ========================================
