-- ==========================================
-- SCRIPT DE SEGURIDAD: TRIGGERS Y ROLES
-- ==========================================
-- INSTRUCCIONES: Copia y pega este script completo 
-- en el "SQL Editor" de tu panel de Supabase y ejecútalo.
-- ==========================================

-- 1. Crear la función que se ejecutará al crear un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  assigned_role text;
BEGIN
  -- Si el correo es del administrador principal, forzar rol admin
  IF NEW.email = 'heyjonadice@gmail.com' THEN
    assigned_role := 'admin';
  ELSE
    -- Leer el rol de los metadatos si fue enviado durante el signUp, o por defecto 'vendedor'
    assigned_role := COALESCE(NEW.raw_user_meta_data->>'rol', 'vendedor');
  END IF;

  -- Insertar el perfil
  INSERT INTO public.perfiles (id, rol, email)
  VALUES (NEW.id, assigned_role, NEW.email)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email; -- Si ya existe, solo actualizamos el correo (opcional)

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Asegurarnos de que el trigger exista
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- 3. POLÍTICAS RLS ESTRICTAS PARA "PERFILES"
-- ==========================================

-- Habilitar RLS
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas anteriores
DROP POLICY IF EXISTS "Ver perfiles" ON public.perfiles;
DROP POLICY IF EXISTS "Actualizar perfiles" ON public.perfiles;
DROP POLICY IF EXISTS "Insertar perfiles" ON public.perfiles;

-- Permitir a cualquier usuario autenticado VER los perfiles
CREATE POLICY "Permitir leer perfiles a usuarios autenticados" 
ON public.perfiles FOR SELECT 
TO authenticated 
USING (true);

-- IMPORTANTE: Solo los administradores pueden MODIFICAR perfiles
CREATE POLICY "Solo admins pueden modificar perfiles" 
ON public.perfiles FOR UPDATE 
TO authenticated 
USING (
  (SELECT rol FROM public.perfiles WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT rol FROM public.perfiles WHERE id = auth.uid()) = 'admin'
);

-- Nota: Ya no se necesitan políticas de INSERT para usuarios normales, 
-- porque la inserción la hace automáticamente el TRIGGER (SECURITY DEFINER)
-- ignorando el RLS.

-- ==========================================
-- 4. FIX PARA EL ADMIN ACTUAL (Asegurar que Jona es admin)
-- ==========================================
UPDATE public.perfiles 
SET rol = 'admin' 
WHERE email = 'heyjonadice@gmail.com';
