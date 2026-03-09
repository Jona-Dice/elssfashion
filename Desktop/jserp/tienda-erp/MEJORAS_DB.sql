-- ========================================
-- SCRIPT DE MEJORAS PARA LA BASE DE DATOS
-- ========================================
-- Este script implementa las mejoras recomendadas en el análisis del sistema

-- ========================================
-- PARTE 1: AGREGAR CAMPO tipo_venta A TABLA ventas
-- ========================================

-- Agregar columna para identificar tipo de venta
ALTER TABLE public.ventas 
ADD COLUMN tipo_venta VARCHAR(50) DEFAULT 'venta';

-- Actualizar valores existentes basados en estado
UPDATE public.ventas 
SET tipo_venta = CASE 
  WHEN estado = 'venta' THEN 'contado'
  WHEN estado = 'apartado' THEN 'apartado'
  ELSE 'venta'
END
WHERE estado IN ('venta', 'apartado');

-- Crear índice para búsquedas por tipo
CREATE INDEX IF NOT EXISTS idx_ventas_tipo_venta ON public.ventas(tipo_venta);

-- ========================================
-- PARTE 2: AGREGAR CAMPOS IMPORTANTES A TABLA creditos
-- ========================================

-- Agregar campo para vincular cliente directamente
ALTER TABLE public.creditos 
ADD COLUMN IF NOT EXISTS cliente_legible VARCHAR(255);

-- Agregar campos de interés
ALTER TABLE public.creditos 
ADD COLUMN IF NOT EXISTS porcentaje_interes DECIMAL(5, 2) DEFAULT 0;

ALTER TABLE public.creditos 
ADD COLUMN IF NOT EXISTS monto_interes DECIMAL(15, 2) DEFAULT 0;

-- Agregar campo de mora
ALTER TABLE public.creditos 
ADD COLUMN IF NOT EXISTS dias_retraso INTEGER DEFAULT 0;

ALTER TABLE public.creditos 
ADD COLUMN IF NOT EXISTS monto_mora DECIMAL(15, 2) DEFAULT 0;

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_creditos_fecha_vencimiento ON public.creditos(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_creditos_venta_id ON public.creditos(venta_id);

-- ========================================
-- PARTE 3: AGREGAR CAMPOS A TABLA abonos
-- ========================================

-- Agregar referencia bancaria
ALTER TABLE public.abonos 
ADD COLUMN IF NOT EXISTS referencia_bancaria VARCHAR(100);

-- Agregar número de comprobante
ALTER TABLE public.abonos 
ADD COLUMN IF NOT EXISTS numero_comprobante VARCHAR(50);

-- Crear índice para búsquedas por fecha
CREATE INDEX IF NOT EXISTS idx_abonos_created_at ON public.abonos(created_at);

-- ========================================
-- PARTE 4: MEJORAR TABLA clientes
-- ========================================

-- Agregar campos de inteligencia de clientes
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS total_compras DECIMAL(15, 2) DEFAULT 0;

ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS total_deuda DECIMAL(15, 2) DEFAULT 0;

ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS estado VARCHAR(50) DEFAULT 'activo'; -- 'activo', 'inactivo', 'suspendido'

ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS limite_credito DECIMAL(15, 2);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_clientes_estado ON public.clientes(estado);
CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON public.clientes(nombre);
CREATE INDEX IF NOT EXISTS idx_clientes_email ON public.clientes(email);

-- ========================================
-- PARTE 5: ACTUALIZAR TABLA transacciones
-- ========================================

-- Agregar referencia a crédito/abono
ALTER TABLE public.transacciones 
ADD COLUMN IF NOT EXISTS credito_id UUID REFERENCES public.creditos(id) ON DELETE SET NULL;

ALTER TABLE public.transacciones 
ADD COLUMN IF NOT EXISTS abono_id UUID REFERENCES public.abonos(id) ON DELETE SET NULL;

ALTER TABLE public.transacciones 
ADD COLUMN IF NOT EXISTS venta_id UUID REFERENCES public.ventas(id) ON DELETE SET NULL;

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_transacciones_created_at ON public.transacciones(created_at);
CREATE INDEX IF NOT EXISTS idx_transacciones_venta_id ON public.transacciones(venta_id);

-- ========================================
-- PARTE 6: CREAR TABLA DE AUDITORÍA (OPCIONAL)
-- ========================================

CREATE TABLE IF NOT EXISTS public.auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabla VARCHAR(100) NOT NULL,
  operacion VARCHAR(50) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  registro_id UUID NOT NULL,
  datos_anterior JSONB,
  datos_nuevo JSONB,
  usuario_id UUID REFERENCES auth.users(id),
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_auditoria_tabla ON public.auditoria(tabla);
CREATE INDEX idx_auditoria_fecha ON public.auditoria(fecha_creacion);

-- ========================================
-- PARTE 7: CREAR VISTA PARA CLIENTES CON DEUDA
-- ========================================

CREATE OR REPLACE VIEW public.clientes_con_deuda AS
SELECT 
  c.id,
  c.nombre,
  c.email,
  c.telefono,
  c.usuario_id,
  COUNT(cr.id) AS total_creditos,
  SUM(cr.monto_total) AS total_otorgado,
  SUM(CASE WHEN cr.estado != 'pagado' THEN cr.monto_pendiente ELSE 0 END) AS deuda_activa,
  SUM(CASE WHEN cr.estado = 'pendiente' THEN 1 ELSE 0 END) AS creditos_pendientes,
  SUM(CASE WHEN cr.estado = 'parcial' THEN 1 ELSE 0 END) AS creditos_parciales
FROM public.clientes c
LEFT JOIN public.creditos cr ON c.id = cr.cliente_id
GROUP BY c.id, c.nombre, c.email, c.telefono, c.usuario_id;

-- ========================================
-- PARTE 8: CREAR VISTA PARA FLUJO DE CAJA COMPLETO
-- ========================================

CREATE OR REPLACE VIEW public.flujo_caja_completo AS
SELECT 
  t.created_at,
  t.cuenta_id,
  t.tipo,
  t.monto,
  t.descripcion,
  CASE 
    WHEN t.venta_id IS NOT NULL THEN 'Venta'
    WHEN t.credito_id IS NOT NULL THEN 'Crédito Estimado'
    WHEN t.abono_id IS NOT NULL THEN 'Abono Crédito'
    ELSE 'Movimiento Manual'
  END AS origen,
  t.saldo_nuevo AS saldo_actual,
  t.created_at AS fecha
FROM public.transacciones t
ORDER BY t.created_at DESC;

-- ========================================
-- PARTE 9: CREAR TABLA DE CONFIGURACIÓN
-- ========================================

CREATE TABLE IF NOT EXISTS public.configuracion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clave VARCHAR(100) NOT NULL,
  valor TEXT,
  descripcion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT configuracion_unique_key UNIQUE (usuario_id, clave)
);

-- Inserciones de ejemplo
INSERT INTO public.configuracion (usuario_id, clave, valor, descripcion)
SELECT 
  id, 
  'porcentaje_interes_default', 
  '0', 
  'Porcentaje de interés por defecto en créditos'
FROM auth.users
ON CONFLICT (usuario_id, clave) DO NOTHING;

-- ========================================
-- PARTE 10: ACTUALIZAR RLS EN TABLAS IMPORTANTES
-- ========================================

-- Verificar que tengan RLS
ALTER TABLE public.detalle_ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abonos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;

-- Políticas para detalle_ventas (ver a través de venta)
CREATE POLICY "Ver detalles de venta propia" ON public.detalle_ventas FOR SELECT
USING (
  venta_id IN (
    SELECT id FROM public.ventas 
    WHERE usuario_id = auth.uid()
  )
);

CREATE POLICY "Crear detalles de venta propia" ON public.detalle_ventas FOR INSERT
WITH CHECK (
  venta_id IN (
    SELECT id FROM public.ventas 
    WHERE usuario_id = auth.uid()
  )
);

-- Políticas para configuración
CREATE POLICY "Ver configuración propia" ON public.configuracion FOR SELECT
USING (auth.uid() = usuario_id);

CREATE POLICY "Actualizar configuración propia" ON public.configuracion FOR UPDATE
USING (auth.uid() = usuario_id);

CREATE POLICY "Crear configuración propia" ON public.configuracion FOR INSERT
WITH CHECK (auth.uid() = usuario_id);

-- ========================================
-- PARTE 11: TRIGGERS PARA ACTUALIZACIÓN AUTOMÁTICA
-- ========================================

-- Trigger para actualizar monto_pendiente cuando se registra un abono
CREATE OR REPLACE FUNCTION actualizar_credito_con_abono()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.creditos
  SET 
    monto_pagado = monto_pagado + NEW.monto,
    monto_pendiente = monto_pendiente - NEW.monto,
    estado = CASE
      WHEN (monto_pagado + NEW.monto) >= monto_total THEN 'pagado'
      WHEN (monto_pagado + NEW.monto) > 0 THEN 'parcial'
      ELSE 'pendiente'
    END
  WHERE id = NEW.credito_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger si no existe
DROP TRIGGER IF EXISTS trigger_abono_actualiza_credito ON public.abonos;
CREATE TRIGGER trigger_abono_actualiza_credito
AFTER INSERT ON public.abonos
FOR EACH ROW
EXECUTE FUNCTION actualizar_credito_con_abono();

-- ========================================
-- PARTE 12: FUNCIONES ÚTILES
-- ========================================

-- Función para calcular días de retraso
CREATE OR REPLACE FUNCTION calcular_dias_retraso(p_fecha_vencimiento DATE)
RETURNS INTEGER AS $$
BEGIN
  RETURN GREATEST(0, EXTRACT(DAY FROM (NOW()::DATE - p_fecha_vencimiento))::INTEGER);
END;
$$ LANGUAGE plpgsql;

-- Función para obtener clientes en mora
CREATE OR REPLACE FUNCTION obtener_clientes_en_mora(p_usuario_id UUID)
RETURNS TABLE (
  cliente_id UUID,
  cliente_nombre VARCHAR,
  dias_retraso INTEGER,
  monto_pendiente DECIMAL,
  fecha_vencimiento DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.nombre,
    calcular_dias_retraso(cr.fecha_vencimiento),
    cr.monto_pendiente,
    cr.fecha_vencimiento
  FROM public.clientes c
  INNER JOIN public.creditos cr ON c.id = cr.cliente_id
  WHERE c.usuario_id = p_usuario_id
    AND cr.estado != 'pagado'
    AND cr.fecha_vencimiento < CURRENT_DATE
  ORDER BY cr.fecha_vencimiento ASC;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- PART 13: SCRIPT DE LIMPIEZA Y VALIDACIÓN
-- ========================================

-- Ver totalización de deudas por usuario
SELECT 
  c.usuario_id,
  COUNT(DISTINCT c.id) AS total_clientes,
  COUNT(DISTINCT cr.id) AS total_creditos,
  SUM(cr.monto_total) AS deuda_total,
  SUM(cr.monto_pagado) AS pagado_total,
  SUM(cr.monto_pendiente) AS pendiente_total
FROM public.clientes c
LEFT JOIN public.creditos cr ON c.id = cr.cliente_id
GROUP BY c.usuario_id;

-- Créditos próximos a vencer (próximos 7 días)
SELECT 
  c.nombre,
  cr.monto_pendiente,
  cr.fecha_vencimiento,
  EXTRACT(DAY FROM (cr.fecha_vencimiento - CURRENT_DATE))::INTEGER AS dias_para_vencer
FROM public.clientes c
INNER JOIN public.creditos cr ON c.id = cr.cliente_id
WHERE cr.estado != 'pagado'
  AND cr.fecha_vencimiento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
ORDER BY cr.fecha_vencimiento ASC;

-- Clientes con mayor deuda
SELECT 
  c.nombre,
  c.email,
  c.telefono,
  SUM(cr.monto_pendiente) AS deuda_total,
  COUNT(cr.id) AS numero_creditos
FROM public.clientes c
INNER JOIN public.creditos cr ON c.id = cr.cliente_id
WHERE cr.estado != 'pagado'
GROUP BY c.id, c.nombre, c.email, c.telefono
ORDER BY deuda_total DESC
LIMIT 20;

-- ========================================
-- PARTE 14: VALIDACIONES Y VERIFICACIONES
-- ========================================

-- Verificar integridad referencial
SELECT 
  'Créditos sin cliente' AS validacion,
  COUNT(*) AS cantidad
FROM public.creditos
WHERE cliente_id NOT IN (SELECT id FROM public.clientes);

SELECT 
  'Abonos sin crédito' AS validacion,
  COUNT(*) AS cantidad
FROM public.abonos
WHERE credito_id NOT IN (SELECT id FROM public.creditos);

-- Verificar saldos inconsistentes
SELECT 
  cr.id,
  cr.monto_total,
  cr.monto_pagado,
  cr.monto_pendiente,
  (cr.monto_pagado + cr.monto_pendiente) AS suma_total,
  CASE 
    WHEN (cr.monto_pagado + cr.monto_pendiente) != cr.monto_total THEN 'INCONSISTENCIA'
    ELSE 'OK'
  END AS estado
FROM public.creditos
WHERE (cr.monto_pagado + cr.monto_pendiente) != cr.monto_total;

-- ========================================
-- FIN DEL SCRIPT
-- ========================================
