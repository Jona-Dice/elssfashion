-- ========================================
-- SCRIPT COMBINADO: SETUP + MEJORAS
-- ========================================
-- Primero crea las tablas base, luego agrega las mejoras
-- Seguro para ejecutar incluso si algunas tablas ya existen

-- ========================================
-- PARTE 0: CREAR TABLAS BASE SI NO EXISTEN
-- ========================================
-- ORDEN CRÍTICO: Primero las tablas independientes, luego las que tienen FK

-- 📱 Tabla de Clientes (REQUERIDA) - PRIMERO porque otros la referencian
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  telefono VARCHAR(20),
  direccion TEXT,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 📁 Tabla de Categorías (REQUERIDA)
CREATE TABLE IF NOT EXISTS public.categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  fecha_creacion TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false
);

-- 🛍️ Tabla de Ventas (REQUERIDA)
CREATE TABLE IF NOT EXISTS public.ventas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  total NUMERIC,
  estado TEXT CHECK (estado = ANY (ARRAY['venta'::text, 'apartado'::text])),
  usuario_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false
);

-- 💳 Tabla de Créditos (REQUERIDA) - DESPUÉS de clientes
CREATE TABLE IF NOT EXISTS public.creditos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  venta_id UUID,
  monto_total DECIMAL(15, 2) NOT NULL,
  monto_pagado DECIMAL(15, 2) NOT NULL DEFAULT 0,
  monto_pendiente DECIMAL(15, 2) NOT NULL,
  estado VARCHAR(50) NOT NULL DEFAULT 'pendiente',
  fecha_vencimiento DATE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 💰 Tabla de Abonos (REQUERIDA) - DESPUÉS de creditos
CREATE TABLE IF NOT EXISTS public.abonos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credito_id UUID NOT NULL REFERENCES public.creditos(id) ON DELETE CASCADE,
  monto DECIMAL(15, 2) NOT NULL,
  metodo_pago VARCHAR(50) NOT NULL DEFAULT 'efectivo',
  descripcion TEXT,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 📦 Tabla de Productos (REQUERIDA)
CREATE TABLE IF NOT EXISTS public.productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  precio_costo NUMERIC,
  precio_venta NUMERIC,
  stock INTEGER DEFAULT 0,
  estado TEXT DEFAULT 'disponible',
  categoria_id UUID REFERENCES public.categorias(id),
  fecha_creacion TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  imagen_url TEXT,
  is_deleted BOOLEAN DEFAULT false
);

-- 📝 Tabla de Detalle Ventas (REQUERIDA) - DESPUÉS de ventas y productos
CREATE TABLE IF NOT EXISTS public.detalle_ventas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id UUID REFERENCES public.ventas(id),
  producto_id UUID REFERENCES public.productos(id),
  cantidad INTEGER,
  precio NUMERIC,
  subtotal NUMERIC,
  is_deleted BOOLEAN DEFAULT false
);

-- 💳 Tabla de Cuentas Contables (REQUERIDA)
CREATE TABLE IF NOT EXISTS public.cuentas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  saldo NUMERIC NOT NULL DEFAULT 0,
  usuario_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false
);

-- 📊 Tabla de Transacciones (REQUERIDA)
CREATE TABLE IF NOT EXISTS public.transacciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cuenta_id UUID NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  monto NUMERIC NOT NULL,
  descripcion VARCHAR(255) NOT NULL,
  saldo_anterior NUMERIC NOT NULL,
  saldo_nuevo NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false
);

-- ========================================
-- PARTE 1: AGREGAR CAMPO tipo_venta A TABLA ventas
-- ========================================

ALTER TABLE public.ventas 
ADD COLUMN IF NOT EXISTS tipo_venta VARCHAR(50) DEFAULT 'contado';

UPDATE public.ventas 
SET tipo_venta = CASE 
  WHEN estado = 'venta' THEN 'contado'
  WHEN estado = 'apartado' THEN 'apartado'
  ELSE 'venta'
END
WHERE tipo_venta IS NULL OR tipo_venta = 'contado';

CREATE INDEX IF NOT EXISTS idx_ventas_tipo_venta ON public.ventas(tipo_venta);

-- ========================================
-- PARTE 2: AGREGAR CAMPOS A TABLA creditos
-- ========================================

ALTER TABLE public.creditos 
ADD COLUMN IF NOT EXISTS cliente_legible VARCHAR(255);

ALTER TABLE public.creditos 
ADD COLUMN IF NOT EXISTS porcentaje_interes DECIMAL(5, 2) DEFAULT 0;

ALTER TABLE public.creditos 
ADD COLUMN IF NOT EXISTS monto_interes DECIMAL(15, 2) DEFAULT 0;

ALTER TABLE public.creditos 
ADD COLUMN IF NOT EXISTS dias_retraso INTEGER DEFAULT 0;

ALTER TABLE public.creditos 
ADD COLUMN IF NOT EXISTS monto_mora DECIMAL(15, 2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_creditos_fecha_vencimiento ON public.creditos(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_creditos_venta_id ON public.creditos(venta_id);

-- ========================================
-- PARTE 3: AGREGAR CAMPOS A TABLA abonos
-- ========================================

ALTER TABLE public.abonos 
ADD COLUMN IF NOT EXISTS referencia_bancaria VARCHAR(100);

ALTER TABLE public.abonos 
ADD COLUMN IF NOT EXISTS numero_comprobante VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_abonos_created_at ON public.abonos(created_at);

-- ========================================
-- PARTE 4: MEJORAR TABLA clientes
-- ========================================

ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS total_compras DECIMAL(15, 2) DEFAULT 0;

ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS total_deuda DECIMAL(15, 2) DEFAULT 0;

ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS estado VARCHAR(50) DEFAULT 'activo';

ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS limite_credito DECIMAL(15, 2);

CREATE INDEX IF NOT EXISTS idx_clientes_estado ON public.clientes(estado);
CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON public.clientes(nombre);
CREATE INDEX IF NOT EXISTS idx_clientes_email ON public.clientes(email);

-- ========================================
-- PARTE 5: ACTUALIZAR TABLA transacciones
-- ========================================

ALTER TABLE public.transacciones 
ADD COLUMN IF NOT EXISTS credito_id UUID REFERENCES public.creditos(id) ON DELETE SET NULL;

ALTER TABLE public.transacciones 
ADD COLUMN IF NOT EXISTS abono_id UUID REFERENCES public.abonos(id) ON DELETE SET NULL;

ALTER TABLE public.transacciones 
ADD COLUMN IF NOT EXISTS venta_id UUID REFERENCES public.ventas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transacciones_created_at ON public.transacciones(created_at);
CREATE INDEX IF NOT EXISTS idx_transacciones_venta_id ON public.transacciones(venta_id);

-- ========================================
-- PARTE 6: CREAR TABLA DE AUDITORÍA
-- ========================================

CREATE TABLE IF NOT EXISTS public.auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabla VARCHAR(100) NOT NULL,
  operacion VARCHAR(50) NOT NULL,
  registro_id UUID NOT NULL,
  datos_anterior JSONB,
  datos_nuevo JSONB,
  usuario_id UUID REFERENCES auth.users(id),
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_tabla ON public.auditoria(tabla);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON public.auditoria(fecha_creacion);

-- ========================================
-- PARTE 7: CREAR VISTAS
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
-- PARTE 8: CREAR TABLA DE CONFIGURACIÓN
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

-- ========================================
-- PARTE 9: HABILITAR RLS
-- ========================================

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creditos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abonos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalle_ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;

-- ========================================
-- PARTE 10: CREAR POLÍTICAS RLS
-- ========================================

-- Políticas para clientes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'clientes' AND policyname = 'Ver clientes propios'
  ) THEN
    CREATE POLICY "Ver clientes propios" ON public.clientes FOR SELECT USING (auth.uid() = usuario_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'clientes' AND policyname = 'Crear clientes propios'
  ) THEN
    CREATE POLICY "Crear clientes propios" ON public.clientes FOR INSERT WITH CHECK (auth.uid() = usuario_id);
  END IF;
END $$;

-- Políticas para creditos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'creditos' AND policyname = 'Ver creditos propios'
  ) THEN
    CREATE POLICY "Ver creditos propios" ON public.creditos FOR SELECT USING (auth.uid() = usuario_id);
  END IF;
END $$;

-- Políticas para abonos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'abonos' AND policyname = 'Ver abonos propios'
  ) THEN
    CREATE POLICY "Ver abonos propios" ON public.abonos FOR SELECT USING (auth.uid() = usuario_id);
  END IF;
END $$;

-- ========================================
-- PARTE 11: CREAR TRIGGERS
-- ========================================

CREATE OR REPLACE FUNCTION actualizar_credito_con_abono()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.creditos
  SET 
    monto_pagado = monto_pagado + NEW.monto,
    monto_pendiente = GREATEST(0, monto_pendiente - NEW.monto),
    estado = CASE
      WHEN (monto_pagado + NEW.monto) >= monto_total THEN 'pagado'
      WHEN (monto_pagado + NEW.monto) > 0 THEN 'parcial'
      ELSE 'pendiente'
    END,
    updated_at = NOW()
  WHERE id = NEW.credito_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_abono_actualiza_credito ON public.abonos;
CREATE TRIGGER trigger_abono_actualiza_credito
AFTER INSERT ON public.abonos
FOR EACH ROW
EXECUTE FUNCTION actualizar_credito_con_abono();

-- ========================================
-- PARTE 12: CREAR FUNCIONES ÚTILES
-- ========================================

CREATE OR REPLACE FUNCTION calcular_dias_retraso(p_fecha_vencimiento DATE)
RETURNS INTEGER AS $$
BEGIN
  RETURN GREATEST(0, EXTRACT(DAY FROM (NOW()::DATE - p_fecha_vencimiento))::INTEGER);
END;
$$ LANGUAGE plpgsql;

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
    c.nombre::VARCHAR,
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
-- PARTE 13: VALIDACIONES
-- ========================================

-- Ver detalles de la configuración
SELECT 
  'SETUP COMPLETADO' as status,
  'Todas las tablas creadas' as detalle,
  'Todas las mejoras aplicadas' as mejoras;

-- Contar registros por tabla
SELECT 
  'clientes' as tabla,
  COUNT(*) as cantidad
FROM public.clientes
UNION ALL
SELECT 'creditos', COUNT(*) FROM public.creditos
UNION ALL
SELECT 'abonos', COUNT(*) FROM public.abonos
UNION ALL
SELECT 'productos', COUNT(*) FROM public.productos
UNION ALL
SELECT 'categorias', COUNT(*) FROM public.categorias
UNION ALL
SELECT 'ventas', COUNT(*) FROM public.ventas
UNION ALL
SELECT 'transacciones', COUNT(*) FROM public.transacciones;

-- ========================================
-- FIN - SCRIPT COMPLETADO
-- ========================================
