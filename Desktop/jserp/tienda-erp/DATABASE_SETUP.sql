-- Tabla de Cuentas
CREATE TABLE IF NOT EXISTS cuentas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL, -- 'efectivo', 'banco', 'tarjeta', 'otro'
  saldo DECIMAL(15, 2) NOT NULL DEFAULT 0,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Transacciones
CREATE TABLE IF NOT EXISTS transacciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cuenta_id UUID NOT NULL REFERENCES cuentas(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL, -- 'ingreso' o 'egreso'
  monto DECIMAL(15, 2) NOT NULL,
  descripcion VARCHAR(500) NOT NULL,
  saldo_anterior DECIMAL(15, 2) NOT NULL,
  saldo_nuevo DECIMAL(15, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejor rendimiento
CREATE INDEX idx_cuentas_usuario_id ON cuentas(usuario_id);
CREATE INDEX idx_transacciones_cuenta_id ON transacciones(cuenta_id);
CREATE INDEX idx_transacciones_created_at ON transacciones(created_at);

-- Habilitar RLS (Row Level Security)
ALTER TABLE cuentas ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacciones ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para cuentas
CREATE POLICY "Los usuarios pueden ver sus propias cuentas" 
  ON cuentas FOR SELECT 
  USING (auth.uid() = usuario_id);

CREATE POLICY "Los usuarios pueden crear sus propias cuentas" 
  ON cuentas FOR INSERT 
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Los usuarios pueden actualizar sus propias cuentas" 
  ON cuentas FOR UPDATE 
  USING (auth.uid() = usuario_id);

-- Políticas RLS para transacciones
CREATE POLICY "Los usuarios pueden ver transacciones de sus cuentas" 
  ON transacciones FOR SELECT 
  USING (
    cuenta_id IN (
      SELECT id FROM cuentas WHERE usuario_id = auth.uid()
    )
  );

CREATE POLICY "Los usuarios pueden crear transacciones en sus cuentas" 
  ON transacciones FOR INSERT 
  WITH CHECK (
    cuenta_id IN (
      SELECT id FROM cuentas WHERE usuario_id = auth.uid()
    )
  );

-- Tabla de Perfiles para roles de la aplicación
CREATE TABLE IF NOT EXISTS perfiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rol VARCHAR(50) NOT NULL DEFAULT 'vendedor', -- 'admin' o 'vendedor'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_perfiles_user_id ON perfiles(user_id);

ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "El usuario puede ver su perfil" ON perfiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "El usuario puede crear su propio perfil" ON perfiles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "El usuario puede actualizar su perfil" ON perfiles FOR UPDATE USING (user_id = auth.uid());

-- Permitir que usuarios con rol 'admin' gestionen perfiles de otros usuarios
CREATE POLICY "Admins pueden gestionar perfiles" ON perfiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM perfiles p WHERE p.user_id = auth.uid() AND p.rol = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles p WHERE p.user_id = auth.uid() AND p.rol = 'admin'
    )
  );

-- 📱 Tabla de Clientes
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  telefono VARCHAR(20),
  direccion TEXT,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 💳 Tabla de Créditos (Deudas)
CREATE TABLE IF NOT EXISTS creditos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  venta_id UUID,
  monto_total DECIMAL(15, 2) NOT NULL,
  monto_pagado DECIMAL(15, 2) NOT NULL DEFAULT 0,
  monto_pendiente DECIMAL(15, 2) NOT NULL,
  estado VARCHAR(50) NOT NULL DEFAULT 'pendiente', -- 'pendiente', 'parcial', 'pagado'
  fecha_vencimiento DATE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 💰 Tabla de Abonos (Pagos Parciales)
CREATE TABLE IF NOT EXISTS abonos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credito_id UUID NOT NULL REFERENCES creditos(id) ON DELETE CASCADE,
  monto DECIMAL(15, 2) NOT NULL,
  metodo_pago VARCHAR(50) NOT NULL DEFAULT 'efectivo', -- 'efectivo', 'banco', 'tarjeta', 'otro'
  descripcion TEXT,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejor rendimiento
CREATE INDEX idx_clientes_usuario_id ON clientes(usuario_id);
CREATE INDEX idx_creditos_cliente_id ON creditos(cliente_id);
CREATE INDEX idx_creditos_usuario_id ON creditos(usuario_id);
CREATE INDEX idx_creditos_estado ON creditos(estado);
CREATE INDEX idx_abonos_credito_id ON abonos(credito_id);
CREATE INDEX idx_abonos_usuario_id ON abonos(usuario_id);

-- Habilitar RLS
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE creditos ENABLE ROW LEVEL SECURITY;
ALTER TABLE abonos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para clientes
CREATE POLICY "Los usuarios pueden ver sus clientes" 
  ON clientes FOR SELECT 
  USING (auth.uid() = usuario_id);

CREATE POLICY "Los usuarios pueden crear clientes" 
  ON clientes FOR INSERT 
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Los usuarios pueden actualizar sus clientes" 
  ON clientes FOR UPDATE 
  USING (auth.uid() = usuario_id);

-- Políticas RLS para créditos
CREATE POLICY "Los usuarios pueden ver sus créditos" 
  ON creditos FOR SELECT 
  USING (auth.uid() = usuario_id);

CREATE POLICY "Los usuarios pueden crear créditos" 
  ON creditos FOR INSERT 
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Los usuarios pueden actualizar sus créditos" 
  ON creditos FOR UPDATE 
  USING (auth.uid() = usuario_id);

-- Políticas RLS para abonos
CREATE POLICY "Los usuarios pueden ver abonos de sus créditos" 
  ON abonos FOR SELECT 
  USING (
    credito_id IN (
      SELECT id FROM creditos WHERE usuario_id = auth.uid()
    )
  );

CREATE POLICY "Los usuarios pueden crear abonos" 
  ON abonos FOR INSERT 
  WITH CHECK (
    credito_id IN (
      SELECT id FROM creditos WHERE usuario_id = auth.uid()
    )
  );
