-- DB ADMIN-ONLY SEED (mínimo para poder iniciar sesión y usar la app)
-- Uso:
-- 1) Crea el usuario admin en Supabase (Authentication -> Users). Ej: admin@example.com / Admin123!
-- 2) Obtén su id con: SELECT id FROM auth.users WHERE email = 'admin@example.com';
-- 3) Reemplaza <ADMIN_USER_ID> abajo por ese UUID y ejecuta estas sentencias en el SQL editor de Supabase.

-- Crear perfil de admin
INSERT INTO perfiles (user_id, rol)
VALUES ('<ADMIN_USER_ID>', 'admin');

-- (Opcional) Crear una cuenta principal para el admin
INSERT INTO cuentas (nombre, tipo, saldo, usuario_id)
VALUES ('Caja Principal', 'efectivo', 0.00, '<ADMIN_USER_ID>');

-- (Opcional) Crear un cliente demo
INSERT INTO clientes (id, nombre, email, telefono, usuario_id)
VALUES (gen_random_uuid(), 'Cliente Demo', 'cliente@demo.com', '+5491111111111', '<ADMIN_USER_ID>');

-- (Opcional) Un producto de prueba
INSERT INTO productos (nombre, descripcion, precio_venta, stock)
VALUES ('Producto Demo', 'Producto para pruebas', 10.00, 100);

-- NOTA: no se insertan filas en tablas que referencian a `auth.users` sin que el usuario exista.
