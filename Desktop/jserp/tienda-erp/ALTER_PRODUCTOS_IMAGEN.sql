-- Agregar columna imagen_url a la tabla productos
ALTER TABLE productos ADD COLUMN IF NOT EXISTS imagen_url TEXT;

-- Comentario para describir la columna
COMMENT ON COLUMN productos.imagen_url IS 'URL de la imagen del producto almacenada en Supabase Storage';
