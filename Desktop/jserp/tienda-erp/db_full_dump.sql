-- DB FULL DUMP (schema + seed instructions)
-- INSTRUCCIONES:
-- 1) Este archivo crea el esquema usado por la app. No intenta insertar filas que dependan de
--    `auth.users` (usuarios de Supabase) porque ese esquema lo gestiona Supabase.
-- 2) Para ejecutar los seeds que requieren un usuario (campos `usuario_id`) primero crea el usuario
--    administrador en Supabase (ver instrucciones más abajo), obtén su `id` y reemplaza <ADMIN_USER_ID>
--    en las sentencias INSERT marcadas como "REQUIRES_ADMIN_ID" y ejecútalas.
-- 3) Puedes ejecutar este archivo entero en una instancia de Postgres (p. ej. la SQL editor de Supabase)

-- ------------------------------------------------------------
-- Esquema (existing DATABASE_SETUP.sql content + tablas usadas por la app)
-- ------------------------------------------------------------

-- Tabla de Cuentas
CREATE TABLE IF NOT EXISTS cuentas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  saldo DECIMAL(15, 2) NOT NULL DEFAULT 0,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Transacciones
CREATE TABLE IF NOT EXISTS transacciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cuenta_id UUID NOT NULL REFERENCES cuentas(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL,
  monto DECIMAL(15, 2) NOT NULL,
  descripcion VARCHAR(500) NOT NULL,
  saldo_anterior DECIMAL(15, 2) NOT NULL,
  saldo_nuevo DECIMAL(15, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Perfiles
CREATE TABLE IF NOT EXISTS perfiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rol VARCHAR(50) NOT NULL DEFAULT 'vendedor',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Productos (usada en Ventas)
CREATE TABLE IF NOT EXISTS productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  precio_venta DECIMAL(12,2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Ventas
CREATE TABLE IF NOT EXISTS ventas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total DECIMAL(12,2) NOT NULL,
  estado VARCHAR(50) NOT NULL, -- 'venta', 'apartado', 'credito'
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Detalle de Venta
CREATE TABLE IF NOT EXISTS detalle_ventas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
  cantidad INTEGER NOT NULL,
  precio DECIMAL(12,2) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL
);

-- Tabla de Clientes
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

-- Tabla de Créditos (Deudas)
CREATE TABLE IF NOT EXISTS creditos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
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

-- Tabla de Abonos (Pagos Parciales)
CREATE TABLE IF NOT EXISTS abonos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credito_id UUID NOT NULL REFERENCES creditos(id) ON DELETE CASCADE,
  monto DECIMAL(15, 2) NOT NULL,
  metodo_pago VARCHAR(50) NOT NULL DEFAULT 'efectivo',
  descripcion TEXT,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_cuentas_usuario_id ON cuentas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_cuenta_id ON transacciones(cuenta_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_created_at ON transacciones(created_at);
CREATE INDEX IF NOT EXISTS idx_perfiles_user_id ON perfiles(user_id);
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos(nombre);
CREATE INDEX IF NOT EXISTS idx_ventas_usuario_id ON ventas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_creditos_cliente_id ON creditos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_abonos_credito_id ON abonos(credito_id);

-- Habilitar RLS (si tu proyecto usa RLS):
ALTER TABLE IF EXISTS cuentas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transacciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS creditos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS abonos ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- SEEDS (ejemplos). WARNING: las sentencias que requieren `usuario_id`
-- tienen placeholder <ADMIN_USER_ID> que debes reemplazar por el id real
-- del usuario admin creado en Supabase.
-- ------------------------------------------------------------

-- Ejemplo: insertar productos (no dependen de auth.users)
INSERT INTO productos (nombre, descripcion, precio_venta, stock)
VALUES
  ('Remera Negra', 'Remera algodón negra', 25.00, 10),
  ('Pantalón Azul', 'Jean clásico', 45.00, 5),
  ('Zapatos Deportivos', 'Talla 42', 60.00, 3);

-- Para insertar una cuenta (REQUIRES ADMIN USER ID):
-- INSERT INTO cuentas (nombre, tipo, saldo, usuario_id) VALUES ('Caja Principal','efectivo',0, '<ADMIN_USER_ID>');

-- Para insertar un perfil admin (REQUIRES ADMIN USER ID):
-- INSERT INTO perfiles (user_id, rol) VALUES ('<ADMIN_USER_ID>', 'admin');

-- Ejemplo de venta (REQUIRES ADMIN USER ID):
-- INSERT INTO ventas (id, total, estado, usuario_id) VALUES (gen_random_uuid(), 100.00, 'venta', '<ADMIN_USER_ID>');
-- INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio, subtotal)
--   VALUES ('<VENTA_ID>', '<PRODUCTO_ID>', 2, 25.00, 50.00);

-- Ejemplo de cliente + crédito (REQUIRES ADMIN USER ID):
-- INSERT INTO clientes (id, nombre, email, telefono, usuario_id) VALUES (gen_random_uuid(), 'Cliente Demo','cli@demo.com','+5491111111111','<ADMIN_USER_ID>');
-- INSERT INTO creditos (cliente_id, venta_id, monto_total, monto_pagado, monto_pendiente, estado, usuario_id)
--   VALUES ('<CLIENTE_ID>', '<VENTA_ID>', 100.00, 0, 100.00, 'pendiente', '<ADMIN_USER_ID>');

-- Ejemplo de abono (REQUIRES ADMIN USER ID):
-- INSERT INTO abonos (credito_id, monto, metodo_pago, descripcion, usuario_id) VALUES ('<CREDITO_ID>', 20.00, 'efectivo', 'Primer abono', '<ADMIN_USER_ID>');

-- ------------------------------------------------------------
-- INSTRUCCIONES PARA CREAR UN ADMIN EN SUPABASE Y APLICAR SEEDS
-- 1) Ve a https://app.supabase.com y entra a tu proyecto.
-- 2) En la sección "Authentication" -> "Users" crea un nuevo usuario (Sign up) con email y contraseña.
--    - Email: admin@example.com (ejemplo)
--    - Password: Admin123!
-- 3) En la sección SQL, ejecuta la consulta para obtener el id del usuario creado:
--      SELECT id FROM auth.users WHERE email = 'admin@example.com';
--    Copia el id resultante (será un UUID).
-- 4) Reemplaza <ADMIN_USER_ID> en las sentencias seed anteriores por ese UUID y ejecútalas en el SQL editor.

-- Fin del volcado completo.
