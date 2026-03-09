-- ========================================
-- FIX ADICIONAL: POLÍTICAS RLS FALTANTES
-- ========================================

-- Asegurar que creditos tenga RLS habilitado
ALTER TABLE public.creditos ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas antiguas si existen
DROP POLICY IF EXISTS "Ver creditos propios" ON public.creditos;
DROP POLICY IF EXISTS "Crear creditos" ON public.creditos;
DROP POLICY IF EXISTS "Editar creditos propios" ON public.creditos;
DROP POLICY IF EXISTS "Eliminar creditos propios" ON public.creditos;

-- CREAR políticas completas para creditos
CREATE POLICY "Ver creditos propios" ON public.creditos 
  FOR SELECT 
  USING (auth.uid() = usuario_id);

CREATE POLICY "Crear creditos propios" ON public.creditos 
  FOR INSERT 
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Editar creditos propios" ON public.creditos 
  FOR UPDATE 
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Eliminar creditos propios" ON public.creditos 
  FOR DELETE 
  USING (auth.uid() = usuario_id);

-- Lo mismo para abonos
ALTER TABLE public.abonos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ver abonos propios" ON public.abonos;
DROP POLICY IF EXISTS "Crear abonos" ON public.abonos;
DROP POLICY IF EXISTS "Editar abonos propios" ON public.abonos;

CREATE POLICY "Ver abonos propios" ON public.abonos 
  FOR SELECT 
  USING (auth.uid() = usuario_id);

CREATE POLICY "Crear abonos propios" ON public.abonos 
  FOR INSERT 
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Editar abonos propios" ON public.abonos 
  FOR UPDATE 
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

-- Lo mismo para clientes
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ver clientes propios" ON public.clientes;
DROP POLICY IF EXISTS "Crear clientes propios" ON public.clientes;
DROP POLICY IF EXISTS "Editar clientes propios" ON public.clientes;

CREATE POLICY "Ver clientes propios" ON public.clientes 
  FOR SELECT 
  USING (auth.uid() = usuario_id);

CREATE POLICY "Crear clientes propios" ON public.clientes 
  FOR INSERT 
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Editar clientes propios" ON public.clientes 
  FOR UPDATE 
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

-- Lo mismo para detalle_ventas
ALTER TABLE public.detalle_ventas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ver detalle ventas" ON public.detalle_ventas;
DROP POLICY IF EXISTS "Crear detalle ventas" ON public.detalle_ventas;

CREATE POLICY "Ver detalle ventas" ON public.detalle_ventas 
  FOR SELECT 
  USING (
    EXISTS(
      SELECT 1 FROM public.ventas v 
      WHERE v.id = venta_id 
      AND v.usuario_id = auth.uid()
    )
  );

CREATE POLICY "Crear detalle ventas" ON public.detalle_ventas 
  FOR INSERT 
  WITH CHECK (
    EXISTS(
      SELECT 1 FROM public.ventas v 
      WHERE v.id = venta_id 
      AND v.usuario_id = auth.uid()
    )
  );

-- ========================================
-- VERIFICACIÓN
-- ========================================

-- Ver todas las políticas RLS
SELECT schemaname, tablename, policyname, permissive, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Contar registros
SELECT 'Ventas' as tabla, COUNT(*) as total FROM public.ventas
UNION ALL
SELECT 'Créditos', COUNT(*) FROM public.creditos
UNION ALL
SELECT 'Clientes', COUNT(*) FROM public.clientes
UNION ALL
SELECT 'Abonos', COUNT(*) FROM public.abonos;

-- ========================================
-- FIN
-- ========================================
