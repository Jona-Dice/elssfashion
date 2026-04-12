-- ============================================
-- CREAR BUCKET DE ALMACENAMIENTO PARA IMÁGENES
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================

-- 1. Crear el bucket 'productos-imagenes' como público
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'productos-imagenes',
  'productos-imagenes',
  true,
  5242880, -- 5MB máximo
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

-- 2. Política: cualquier usuario autenticado puede subir imágenes
CREATE POLICY "Usuarios autenticados pueden subir imagenes"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'productos-imagenes');

-- 3. Política: cualquiera puede ver las imágenes (son públicas)
CREATE POLICY "Imagenes de productos son publicas"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'productos-imagenes');

-- 4. Política: usuarios autenticados pueden actualizar/eliminar sus imágenes
CREATE POLICY "Usuarios autenticados pueden actualizar imagenes"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'productos-imagenes');

CREATE POLICY "Usuarios autenticados pueden eliminar imagenes"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'productos-imagenes');
