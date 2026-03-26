import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Productos() {
  const [categorias, setCategorias] = useState([])
  const [nombre, setNombre] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [showTrash, setShowTrash] = useState(false)
  const [categoriasTrash, setCategoriasTrash] = useState([])
  const [productosTrash, setProductosTrash] = useState([])
  const [agruparPorCategoria, setAgruparPorCategoria] = useState(true)
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null)
  const [loading, setLoading] = useState(false)

  // Estado para editar producto
  const [showModalEditar, setShowModalEditar] = useState(false)
  const [productoEditando, setProductoEditando] = useState(null)

  const cargarCategorias = async () => {
    const { data } = await supabase.from('categorias').select('*').eq('is_deleted', false).order('nombre')
    setCategorias(data || [])
  }

  const cargarCategoriasTrash = async () => {
    const { data } = await supabase.from('categorias').select('*').eq('is_deleted', true).order('nombre')
    setCategoriasTrash(data || [])
  }

  const crearCategoria = async () => {
    if (!nombre.trim()) {
      setMensaje('El nombre de la categoría es requerido')
      setTimeout(() => setMensaje(''), 3000)
      return
    }
    await supabase.from('categorias').insert({ nombre, is_deleted: false })
    setNombre('')
    setMensaje('Categoría creada correctamente')
    setTimeout(() => setMensaje(''), 3000)
    cargarCategorias()
  }

  const moverCategoriaPapelera = async (id) => {
    await supabase.from('categorias').update({ is_deleted: true }).eq('id', id)
    setMensaje('Categoría movida a papelera')
    setTimeout(() => setMensaje(''), 3000)
    cargarCategorias()
    cargarCategoriasTrash()
  }

  const recuperarCategoria = async (id) => {
    await supabase.from('categorias').update({ is_deleted: false }).eq('id', id)
    setMensaje('Categoría restaurada')
    setTimeout(() => setMensaje(''), 3000)
    cargarCategorias()
    cargarCategoriasTrash()
  }

  useEffect(() => {
    cargarCategorias()
    cargarCategoriasTrash()
  }, [])

  useEffect(() => {
    cargarProductos()
    cargarProductosTrash()
  }, [])

  const [productos, setProductos] = useState([])
  const [producto, setProducto] = useState({
    nombre: '',
    precio_venta: '',
    stock: '',
    categoria_id: '',
    imagen: null,
    previewImage: null
  })

  const cargarProductos = async () => {
    const { data } = await supabase
      .from('productos')
      .select('*, categorias(nombre)')
      .eq('is_deleted', false)
      .order('nombre')
    setProductos(data || [])
  }

  const cargarProductosTrash = async () => {
    const { data } = await supabase
      .from('productos')
      .select('*, categorias(nombre)')
      .eq('is_deleted', true)
      .order('nombre')
    setProductosTrash(data || [])
  }

  // 📸 Función reutilizable para subir imagen
  const subirImagen = async (archivo) => {
    if (!archivo) return null
    
    const timestamp = Date.now()
    const ext = archivo.name.split('.').pop().toLowerCase()
    const nombreArchivo = `${timestamp}.${ext}`
    const BUCKET = 'productos-imagenes'
    
    // Intentar subir la imagen
    let { error } = await supabase.storage
      .from(BUCKET)
      .upload(`public/${nombreArchivo}`, archivo, {
        cacheControl: '3600',
        upsert: false
      })
    
    // Si el bucket no existe, crearlo y reintentar
    if (error && (error.message?.includes('Bucket not found') || error.statusCode === '404')) {
      const { error: bucketError } = await supabase.storage.createBucket(BUCKET, {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
        fileSizeLimit: 5242880 // 5MB
      })
      
      if (bucketError && !bucketError.message?.includes('already exists')) {
        throw new Error(`No se pudo crear el almacenamiento: ${bucketError.message}`)
      }
      
      // Reintentar la subida
      const retry = await supabase.storage
        .from(BUCKET)
        .upload(`public/${nombreArchivo}`, archivo, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (retry.error) throw retry.error
    } else if (error) {
      throw error
    }
    
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(`public/${nombreArchivo}`)
    
    return urlData.publicUrl
  }

  const crearProducto = async () => {
    if (!producto.nombre.trim() || !producto.precio_venta || !producto.stock || !producto.categoria_id) {
      setMensaje('Todos los campos son requeridos')
      setTimeout(() => setMensaje(''), 3000)
      return
    }

    setLoading(true)
    let imagenUrl = null
    
    if (producto.imagen) {
      try {
        imagenUrl = await subirImagen(producto.imagen)
      } catch (error) {
        setMensaje('Error al subir la imagen: ' + error.message)
        setTimeout(() => setMensaje(''), 5000)
        setLoading(false)
        return
      }
    }

    const { error } = await supabase.from('productos').insert({
      nombre: producto.nombre,
      precio_venta: parseFloat(producto.precio_venta),
      stock: parseInt(producto.stock),
      categoria_id: producto.categoria_id,
      imagen_url: imagenUrl,
      is_deleted: false
    })

    if (error) {
      setMensaje('Error al crear producto: ' + error.message)
      setTimeout(() => setMensaje(''), 5000)
      setLoading(false)
      return
    }

    setProducto({ nombre: '', precio_venta: '', stock: '', categoria_id: '', imagen: null, previewImage: null })
    setMensaje('✅ Producto creado correctamente')
    setTimeout(() => setMensaje(''), 3000)
    await cargarProductos()
    setLoading(false)
  }

  // ✏️ Abrir modal de edición
  const abrirEdicion = (p) => {
    setProductoEditando({
      id: p.id,
      nombre: p.nombre,
      precio_venta: p.precio_venta,
      stock: p.stock,
      categoria_id: p.categoria_id,
      imagen_url: p.imagen_url,
      imagen: null,
      previewImage: p.imagen_url || null
    })
    setShowModalEditar(true)
  }

  // 💾 Guardar edición
  const guardarEdicion = async () => {
    if (!productoEditando.nombre.trim() || !productoEditando.precio_venta || !productoEditando.stock || !productoEditando.categoria_id) {
      setMensaje('Todos los campos son requeridos')
      setTimeout(() => setMensaje(''), 3000)
      return
    }

    setLoading(true)
    let imagenUrl = productoEditando.imagen_url

    // Si se seleccionó una imagen nueva, subirla
    if (productoEditando.imagen) {
      try {
        imagenUrl = await subirImagen(productoEditando.imagen)
      } catch (error) {
        setMensaje('Error al subir la imagen: ' + error.message)
        setTimeout(() => setMensaje(''), 5000)
        setLoading(false)
        return
      }
    }

    const { error } = await supabase
      .from('productos')
      .update({
        nombre: productoEditando.nombre,
        precio_venta: parseFloat(productoEditando.precio_venta),
        stock: parseInt(productoEditando.stock),
        categoria_id: productoEditando.categoria_id,
        imagen_url: imagenUrl
      })
      .eq('id', productoEditando.id)

    if (error) {
      setMensaje('Error al actualizar producto: ' + error.message)
      setTimeout(() => setMensaje(''), 5000)
      setLoading(false)
      return
    }

    setShowModalEditar(false)
    setProductoEditando(null)
    setMensaje('✅ Producto actualizado correctamente')
    setTimeout(() => setMensaje(''), 3000)
    await cargarProductos()
    setLoading(false)
  }

  const moverProductoPapelera = async (id) => {
    await supabase.from('productos').update({ is_deleted: true }).eq('id', id)
    setMensaje('Producto movido a papelera')
    setTimeout(() => setMensaje(''), 3000)
    cargarProductos()
    cargarProductosTrash()
  }

  const recuperarProducto = async (id) => {
    await supabase.from('productos').update({ is_deleted: false }).eq('id', id)
    setMensaje('Producto restaurado')
    setTimeout(() => setMensaje(''), 3000)
    cargarProductos()
    cargarProductosTrash()
  }

  const agruparProductosPorCategoria = () => {
    const agrupados = {}
    productos.forEach(p => {
      const nombreCategoria = p.categorias?.nombre || 'Sin categoría'
      if (!agrupados[nombreCategoria]) {
        agrupados[nombreCategoria] = []
      }
      agrupados[nombreCategoria].push(p)
    })
    return agrupados
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-3 md:p-8">
      {/* Fondo decorativo sutil */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-slate-700 to-transparent rounded-full opacity-5 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-slate-700 to-transparent rounded-full opacity-5 blur-3xl"></div>
      </div>

      {/* Mensaje de alerta mejorado */}
      {mensaje && (
        <div className="fixed top-4 right-4 backdrop-blur-md bg-slate-800/60 border border-slate-700 text-slate-100 px-4 md:px-6 py-3 md:py-4 rounded-2xl shadow-2xl z-50 animate-slide-in-right text-xs md:text-base">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-slate-400 rounded-full animate-pulse"></div>
            <span className="font-medium">{mensaje}</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header Premium */}
        <div className="mb-8 md:mb-12">
          <div className="backdrop-blur-md bg-slate-800/30 border border-slate-700 rounded-3xl p-6 md:p-8 mb-6 md:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-slate-100 mb-2 md:mb-3">
                  📊 Gestión de Productos
                </h1>
                <p className="text-slate-400 text-xs sm:text-sm md:text-lg font-light">Administra categorías y productos con un diseño profesional</p>
              </div>
              <button
                onClick={() => setShowTrash(!showTrash)}
                className={`font-bold px-4 md:px-6 py-2 md:py-3 rounded-xl transition transform hover:scale-105 active:scale-95 shadow-lg text-xs sm:text-base whitespace-nowrap ${showTrash ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
              >
                {showTrash ? '📁 Productos' : '🗑️ Papelera'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {/* Sección de Categorías */}
          <div className="backdrop-blur-md bg-slate-800/30 border border-slate-700 rounded-3xl p-6 md:p-8 shadow-2xl h-fit">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-100 mb-6 md:mb-8 flex items-center gap-2 md:gap-3">
              <span className="text-3xl md:text-4xl">🏷️</span>
              <span>Categorías</span>
            </h2>

            <div className="mb-6">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4">
                <input
                  className="flex-1 backdrop-blur-sm bg-slate-700/30 border border-slate-600 text-slate-100 placeholder-slate-500 rounded-xl px-3 sm:px-4 py-2 sm:py-3 focus:outline-none focus:border-slate-500 transition text-xs sm:text-base"
                  placeholder="Nueva categoría"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && crearCategoria()}
                />
                <button
                  onClick={crearCategoria}
                  className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-4 sm:px-6 py-2 sm:py-3 rounded-xl transition transform hover:scale-105 active:scale-95 shadow-lg text-xs sm:text-base"
                >
                  + Agregar
                </button>
              </div>
            </div>

            {categorias.length === 0 ? (
              <div className="text-center py-8 md:py-12">
                <div className="text-3xl md:text-4xl mb-2 md:mb-3 opacity-30">📭</div>
                <p className="text-slate-500 text-xs md:text-sm">No hay categorías creadas</p>
              </div>
            ) : (
              <div className="space-y-2 md:space-y-3 max-h-80 md:max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                {categorias.map(cat => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between backdrop-blur-sm border border-slate-600 bg-slate-700/30 rounded-xl p-3 md:p-4 hover:bg-slate-700/50 transition-all group text-xs md:text-base"
                  >
                    <span className="font-semibold text-slate-100 group-hover:text-slate-50 truncate">{cat.nombre}</span>
                    <button
                      onClick={() => moverCategoriaPapelera(cat.id)}
                      className="text-slate-500 hover:text-slate-300 font-bold transition transform hover:scale-110 active:scale-90 flex-shrink-0 text-sm md:text-base"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sección de Crear Producto */}
          <div className="backdrop-blur-md bg-slate-800/30 border border-slate-700 rounded-3xl p-6 md:p-8 shadow-2xl h-fit">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-100 mb-6 md:mb-8 flex items-center gap-2 md:gap-3">
              <span className="text-3xl md:text-4xl">➕</span>
              <span>Nuevo Producto</span>
            </h2>

            <div className="space-y-3 md:space-y-4 mb-6">
              <input
                className="w-full backdrop-blur-sm bg-slate-700/30 border border-slate-600 text-slate-100 placeholder-slate-500 rounded-xl px-3 sm:px-4 py-2 sm:py-3 focus:outline-none focus:border-slate-500 transition text-xs sm:text-base"
                placeholder="Nombre del producto"
                value={producto.nombre}
                onChange={e => setProducto({ ...producto, nombre: e.target.value })}
              />
              <input
                className="w-full backdrop-blur-sm bg-slate-700/30 border border-slate-600 text-slate-100 placeholder-slate-500 rounded-xl px-3 sm:px-4 py-2 sm:py-3 focus:outline-none focus:border-slate-500 transition text-xs sm:text-base"
                placeholder="Precio de venta"
                type="number"
                step="0.01"
                value={producto.precio_venta}
                onChange={e => setProducto({ ...producto, precio_venta: e.target.value })}
              />
              <input
                className="w-full backdrop-blur-sm bg-slate-700/30 border border-slate-600 text-slate-100 placeholder-slate-500 rounded-xl px-3 sm:px-4 py-2 sm:py-3 focus:outline-none focus:border-slate-500 transition text-xs sm:text-base"
                placeholder="Stock disponible"
                type="number"
                value={producto.stock}
                onChange={e => setProducto({ ...producto, stock: e.target.value })}
              />
              <select
                className="w-full backdrop-blur-sm bg-slate-700/30 border border-slate-600 text-slate-100 rounded-xl px-3 sm:px-4 py-2 sm:py-3 focus:outline-none focus:border-slate-500 transition text-xs sm:text-base"
                value={producto.categoria_id}
                onChange={e => setProducto({ ...producto, categoria_id: e.target.value })}
              >
                <option value="" className="bg-slate-800">Selecciona una categoría</option>
                {categorias.map(cat => (
                  <option key={cat.id} value={cat.id} className="bg-slate-800">{cat.nombre}</option>
                ))}
              </select>

              {/* Input para imagen */}
              <div className="relative">
                <label className="block text-slate-300 text-xs md:text-sm font-semibold mb-2">Imagen del producto</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0]
                    if (file) {
                      setProducto({
                        ...producto,
                        imagen: file,
                        previewImage: URL.createObjectURL(file)
                      })
                    }
                  }}
                  className="w-full backdrop-blur-sm bg-slate-700/30 border border-slate-600 text-slate-100 placeholder-slate-500 rounded-xl px-3 sm:px-4 py-2 sm:py-3 focus:outline-none focus:border-slate-500 transition text-xs sm:text-sm file:bg-slate-600 file:border-0 file:text-slate-100 file:px-3 file:py-1 file:rounded-lg file:cursor-pointer hover:file:bg-slate-500"
                />
              </div>

              {/* Preview de la imagen */}
              {producto.previewImage && (
                <div className="relative">
                  <img
                    src={producto.previewImage}
                    alt="Preview"
                    className="w-full h-40 object-cover rounded-xl border border-slate-600"
                  />
                  <button
                    type="button"
                    onClick={() => setProducto({ ...producto, imagen: null, previewImage: null })}
                    className="absolute top-2 right-2 bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-bold transition"
                  >
                    ✕ Remover
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={crearProducto}
              disabled={loading}
              className="w-full relative overflow-hidden group bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 md:py-4 px-6 rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-lg text-xs sm:text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <span className="relative">{loading ? '⏳ Creando...' : '✓ Crear Producto'}</span>
            </button>
          </div>
        </div>

        {/* Lista de Productos */}
        <div className="mt-8 md:mt-8 backdrop-blur-md bg-slate-800/30 border border-slate-700 rounded-3xl p-6 md:p-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-100 flex items-center gap-2 md:gap-3">
              <span className="text-3xl md:text-4xl">📦</span>
              <span>Productos Registrados</span>
              {productos.length > 0 && (
                <span className="ml-0 sm:ml-auto bg-slate-700 text-slate-100 text-xs md:text-sm font-bold px-3 md:px-4 py-1 md:py-2 rounded-full">
                  {productos.length} productos
                </span>
              )}
            </h2>
            {productos.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => setAgruparPorCategoria(true)}
                  className={`font-bold px-4 md:px-6 py-2 md:py-3 rounded-xl transition transform hover:scale-105 active:scale-95 shadow-lg text-xs sm:text-base whitespace-nowrap ${
                    agruparPorCategoria
                      ? 'bg-blue-600 hover:bg-blue-500 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-white'
                  }`}
                >
                  🏷️ Por Categoría
                </button>
                <button
                  onClick={() => setAgruparPorCategoria(false)}
                  className={`font-bold px-4 md:px-6 py-2 md:py-3 rounded-xl transition transform hover:scale-105 active:scale-95 shadow-lg text-xs sm:text-base whitespace-nowrap ${
                    !agruparPorCategoria
                      ? 'bg-blue-600 hover:bg-blue-500 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-white'
                  }`}
                >
                  📋 Ver Todos
                </button>
              </div>
            )}
          </div>

          {/* Selector de categoría cuando está en vista agrupada */}
          {agruparPorCategoria && productos.length > 0 && (
            <div className="mb-6 flex gap-2 items-center">
              <label className="text-slate-300 text-sm font-semibold whitespace-nowrap">Filtrar por:</label>
              <select
                value={categoriaSeleccionada || ''}
                onChange={(e) => setCategoriaSeleccionada(e.target.value || null)}
                className="flex-1 backdrop-blur-sm bg-slate-700/30 border border-slate-600 text-slate-100 rounded-xl px-3 sm:px-4 py-2 sm:py-3 focus:outline-none focus:border-slate-500 transition text-xs sm:text-base"
              >
                <option value="" className="bg-slate-800">📂 Todas las categorías</option>
                {categorias.map(cat => (
                  <option key={cat.id} value={cat.id} className="bg-slate-800">
                    📁 {cat.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {productos.length === 0 ? (
            <div className="text-center py-12 md:py-16">
              <div className="text-5xl md:text-6xl mb-3 md:mb-4 opacity-30">📦</div>
              <p className="text-slate-500 text-xs md:text-lg">No hay productos registrados aún</p>
            </div>
          ) : agruparPorCategoria ? (
            // Vista agrupada por categoría
            <div className="space-y-8">
              {Object.entries(agruparProductosPorCategoria())
                .filter(([categoria]) => !categoriaSeleccionada || categoria === categorias.find(c => c.id.toString() === categoriaSeleccionada)?.nombre)
                .map(([categoria, prods]) => (
                <div key={categoria}>
                  <h3 className="text-lg md:text-xl font-bold text-slate-100 mb-4 flex items-center gap-2 pb-3 border-b border-slate-700">
                    <span className="text-2xl">📂</span>
                    <span>{categoria}</span>
                    <span className="ml-auto bg-slate-700 text-slate-100 text-xs md:text-sm font-bold px-3 md:px-4 py-1 md:py-2 rounded-full">
                      {prods.length} {prods.length === 1 ? 'producto' : 'productos'}
                    </span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {prods.map(p => (
                      <div
                        key={p.id}
                        className="group relative overflow-hidden backdrop-blur-sm border border-slate-600 bg-slate-700/20 rounded-2xl shadow-lg transition-all duration-300 flex flex-col text-xs md:text-sm hover:border-slate-500 hover:shadow-2xl hover:shadow-slate-700/20 hover:scale-105"
                      >
                        {/* Glow Effect */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-slate-600/10 to-slate-600/5 transition-opacity duration-300"></div>

                        {/* Imagen de referencia */}
                        <div className="relative z-10 w-full h-32 md:h-48 bg-gradient-to-br from-slate-600/30 to-slate-700/30 border-b border-slate-600 flex items-center justify-center overflow-hidden">
                          {p.imagen_url ? (
                            <>
                              <img
                                src={p.imagen_url}
                                alt={p.nombre}
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent"></div>
                            </>
                          ) : (
                            <div className="flex flex-col items-center justify-center text-slate-500">
                              <span className="text-3xl md:text-4xl mb-2">🖼️</span>
                              <span className="text-xs md:text-sm">Sin imagen</span>
                            </div>
                          )}
                        </div>

                        {/* Contenido */}
                        <div className="relative z-10 p-4 md:p-5 flex-1 flex flex-col">
                          <div className="flex justify-between items-start mb-3 md:mb-4">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-slate-100 text-sm md:text-lg mb-1 group-hover:text-slate-50 transition-colors line-clamp-2">{p.nombre}</h3>
                              <p className="text-xs text-slate-400 line-clamp-1">{p.categorias?.nombre}</p>
                            </div>
                            <div className="flex gap-1 flex-shrink-0 ml-2">
                              <button
                                onClick={() => abrirEdicion(p)}
                                className="text-slate-500 hover:text-blue-300 hover:bg-blue-600/20 font-bold px-2 py-1 rounded-lg transition-all transform hover:scale-110 active:scale-90"
                                title="Editar"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => moverProductoPapelera(p.id)}
                                className="text-slate-500 hover:text-slate-300 hover:bg-slate-600/30 font-bold px-2 py-1 rounded-lg transition-all transform hover:scale-110 active:scale-90"
                                title="Eliminar"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>

                          <div className="space-y-2 md:space-y-3 mb-3 md:mb-4 flex-1">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400 text-xs md:text-sm">Precio:</span>
                              <span className="font-bold text-slate-100 text-base md:text-lg">${p.precio_venta}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400 text-xs md:text-sm">Stock:</span>
                              <span className={`font-bold text-sm md:text-lg ${
                                p.stock > 5 ? 'text-slate-100' : p.stock > 0 ? 'text-slate-200' : 'text-slate-400'
                              }`}>
                                {p.stock}
                              </span>
                            </div>
                          </div>

                          <div className={`text-xs md:text-xs font-semibold rounded-lg px-2 md:px-3 py-1 md:py-2 text-center ${
                            p.stock > 5
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : p.stock > 0
                              ? 'bg-red-500/20 text-red-300'
                              : 'bg-red-600/20 text-red-400'
                          }`}>
                            {p.stock > 5 ? '✓ Stock disponible' : p.stock > 0 ? '⚠️ Stock bajo' : '❌ Sin stock'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {Object.entries(agruparProductosPorCategoria())
                .filter(([categoria]) => !categoriaSeleccionada || categoria === categorias.find(c => c.id.toString() === categoriaSeleccionada)?.nombre)
                .length === 0 && categoriaSeleccionada && (
                <div className="text-center py-12 md:py-16">
                  <div className="text-5xl md:text-6xl mb-3 md:mb-4 opacity-30">📂</div>
                  <p className="text-slate-500 text-xs md:text-lg">No hay productos en esta categoría</p>
                </div>
              )}
            </div>
          ) : (
            // Vista de todos los productos
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {productos.map(p => (
                <div
                  key={p.id}
                  className="group relative overflow-hidden backdrop-blur-sm border border-slate-600 bg-slate-700/20 rounded-2xl shadow-lg transition-all duration-300 flex flex-col text-xs md:text-sm hover:border-slate-500 hover:shadow-2xl hover:shadow-slate-700/20 hover:scale-105"
                >
                  {/* Glow Effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-slate-600/10 to-slate-600/5 transition-opacity duration-300"></div>

                  {/* Imagen de referencia */}
                  <div className="relative z-10 w-full h-32 md:h-48 bg-gradient-to-br from-slate-600/30 to-slate-700/30 border-b border-slate-600 flex items-center justify-center overflow-hidden">
                    {p.imagen_url ? (
                      <>
                        <img
                          src={p.imagen_url}
                          alt={p.nombre}
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent"></div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <span className="text-3xl md:text-4xl mb-2">🖼️</span>
                        <span className="text-xs md:text-sm">Sin imagen</span>
                      </div>
                    )}
                  </div>

                  {/* Contenido */}
                  <div className="relative z-10 p-4 md:p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-3 md:mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-100 text-sm md:text-lg mb-1 group-hover:text-slate-50 transition-colors line-clamp-2">{p.nombre}</h3>
                        <p className="text-xs text-slate-400 line-clamp-1">{p.categorias?.nombre}</p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0 ml-2">
                        <button
                          onClick={() => abrirEdicion(p)}
                          className="text-slate-500 hover:text-blue-300 hover:bg-blue-600/20 font-bold px-2 py-1 rounded-lg transition-all transform hover:scale-110 active:scale-90"
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => moverProductoPapelera(p.id)}
                          className="text-slate-500 hover:text-slate-300 hover:bg-slate-600/30 font-bold px-2 py-1 rounded-lg transition-all transform hover:scale-110 active:scale-90"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 md:space-y-3 mb-3 md:mb-4 flex-1">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-xs md:text-sm">Precio:</span>
                        <span className="font-bold text-slate-100 text-base md:text-lg">${p.precio_venta}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-xs md:text-sm">Stock:</span>
                        <span className={`font-bold text-sm md:text-lg ${
                          p.stock > 5 ? 'text-slate-100' : p.stock > 0 ? 'text-slate-200' : 'text-slate-400'
                        }`}>
                          {p.stock}
                        </span>
                      </div>
                    </div>

                    <div className={`text-xs md:text-xs font-semibold rounded-lg px-2 md:px-3 py-1 md:py-2 text-center ${
                      p.stock > 5
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : p.stock > 0
                        ? 'bg-red-500/20 text-red-300'
                        : 'bg-red-600/20 text-red-400'
                    }`}>
                      {p.stock > 5 ? '✓ Stock disponible' : p.stock > 0 ? '⚠️ Stock bajo' : '❌ Sin stock'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PAPELERA */}
      {showTrash && (
        <div className="mt-8 md:mt-12 backdrop-blur-md bg-slate-800/30 border border-slate-700 rounded-3xl p-6 md:p-8 shadow-2xl">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-100 mb-6 md:mb-8 flex items-center gap-3">
            <span className="text-3xl">🗑️</span>
            <span>Papelera</span>
            {(categoriasTrash.length > 0 || productosTrash.length > 0) && (
              <span className="ml-auto bg-red-600 text-white text-xs md:text-sm font-bold px-3 md:px-4 py-1 md:py-2 rounded-full">
                {categoriasTrash.length + productosTrash.length} elementos
              </span>
            )}
          </h2>

          {categoriasTrash.length === 0 && productosTrash.length === 0 ? (
            <div className="text-center py-12 md:py-16">
              <div className="text-5xl md:text-6xl mb-3 md:mb-4 opacity-30">📦</div>
              <p className="text-slate-500 text-sm md:text-lg">Papelera vacía</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Categorías eliminadas */}
              {categoriasTrash.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3">📁 Categorías ({categoriasTrash.length})</h3>
                  <div className="space-y-2">
                    {categoriasTrash.map(cat => (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between backdrop-blur-sm border border-red-500/30 bg-red-500/10 rounded-xl p-3 md:p-4 hover:bg-red-500/20 transition-all group"
                      >
                        <span className="font-semibold text-slate-100 truncate">{cat.nombre}</span>
                        <button
                          onClick={() => recuperarCategoria(cat.id)}
                          className="text-slate-500 hover:text-slate-300 font-bold transition transform hover:scale-110 active:scale-90 text-sm md:text-base"
                        >
                          ↩️
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Productos eliminados */}
              {productosTrash.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3">📦 Productos ({productosTrash.length})</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {productosTrash.map(p => (
                      <div
                        key={p.id}
                        className="group relative overflow-hidden backdrop-blur-sm border border-red-500/30 bg-red-500/10 rounded-xl p-4 text-xs md:text-sm hover:bg-red-500/20 transition-all"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-100 line-clamp-2">{p.nombre}</h4>
                            <p className="text-xs text-slate-400">{p.categorias?.nombre}</p>
                          </div>
                          <button
                            onClick={() => recuperarProducto(p.id)}
                            className="text-slate-500 hover:text-slate-300 font-bold transition transform hover:scale-110 active:scale-90 flex-shrink-0 ml-2"
                          >
                            ↩️
                          </button>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span>💰 ${p.precio_venta}</span>
                          <span>📦 {p.stock} stock</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal Editar Producto */}
      {showModalEditar && productoEditando && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="backdrop-blur-md bg-slate-800/95 border border-slate-700 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-slate-100 mb-6 flex items-center gap-2">✏️ Editar Producto</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold text-sm mb-2">Nombre *</label>
                <input
                  type="text"
                  value={productoEditando.nombre}
                  onChange={e => setProductoEditando({ ...productoEditando, nombre: e.target.value })}
                  className="w-full bg-slate-700/30 border border-slate-600 text-slate-100 placeholder-slate-500 rounded-xl px-4 py-3 focus:outline-none focus:border-slate-500 transition text-sm"
                  placeholder="Nombre del producto"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold text-sm mb-2">Precio de venta *</label>
                <input
                  type="number"
                  step="0.01"
                  value={productoEditando.precio_venta}
                  onChange={e => setProductoEditando({ ...productoEditando, precio_venta: e.target.value })}
                  className="w-full bg-slate-700/30 border border-slate-600 text-slate-100 placeholder-slate-500 rounded-xl px-4 py-3 focus:outline-none focus:border-slate-500 transition text-sm"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold text-sm mb-2">Stock *</label>
                <input
                  type="number"
                  value={productoEditando.stock}
                  onChange={e => setProductoEditando({ ...productoEditando, stock: e.target.value })}
                  className="w-full bg-slate-700/30 border border-slate-600 text-slate-100 placeholder-slate-500 rounded-xl px-4 py-3 focus:outline-none focus:border-slate-500 transition text-sm"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold text-sm mb-2">Categoría *</label>
                <select
                  value={productoEditando.categoria_id}
                  onChange={e => setProductoEditando({ ...productoEditando, categoria_id: e.target.value })}
                  className="w-full bg-slate-700/30 border border-slate-600 text-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:border-slate-500 transition text-sm"
                >
                  <option value="" className="bg-slate-800">Selecciona una categoría</option>
                  {categorias.map(cat => (
                    <option key={cat.id} value={cat.id} className="bg-slate-800">{cat.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Imagen actual */}
              <div>
                <label className="block text-slate-300 font-semibold text-sm mb-2">Imagen del producto</label>
                {productoEditando.previewImage && (
                  <div className="relative mb-3">
                    <img
                      src={productoEditando.previewImage}
                      alt="Preview"
                      className="w-full h-40 object-cover rounded-xl border border-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => setProductoEditando({ ...productoEditando, imagen: null, previewImage: null, imagen_url: null })}
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-bold transition"
                    >
                      ✕ Remover
                    </button>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0]
                    if (file) {
                      setProductoEditando({
                        ...productoEditando,
                        imagen: file,
                        previewImage: URL.createObjectURL(file)
                      })
                    }
                  }}
                  className="w-full backdrop-blur-sm bg-slate-700/30 border border-slate-600 text-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:border-slate-500 transition text-xs sm:text-sm file:bg-slate-600 file:border-0 file:text-slate-100 file:px-3 file:py-1 file:rounded-lg file:cursor-pointer hover:file:bg-slate-500"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-6">
              <button
                type="button"
                onClick={() => { setShowModalEditar(false); setProductoEditando(null) }}
                className="flex-1 bg-slate-700/30 hover:bg-slate-700/50 text-slate-300 font-bold py-3 rounded-xl transition-all text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={guardarEdicion}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {loading ? '⏳ Guardando...' : '💾 Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .animate-slide-in-right {
          animation: slide-in-right 0.4s ease-out;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.2);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.4);
        }
      `}</style>
    </div>
  )
}
