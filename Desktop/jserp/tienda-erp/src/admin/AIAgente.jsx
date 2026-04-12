import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { analyzeBusinessData, hasGeminiKey, setGeminiKey } from '../lib/gemini'

export default function AIAgente() {
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [analizando, setAnalizando] = useState(null) // 'finance', 'marketing', etc.
  const [resultadoAI, setResultadoAI] = useState({
    finance: "",
    marketing: "",
    inventory: "",
    trends: ""
  })
  const [chat, setChat] = useState([])
  const [mensaje, setMensaje] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [showKeyInput, setShowKeyInput] = useState(!hasGeminiKey())
  const chatEndRef = useRef(null)

  useEffect(() => {
    cargarDatos()
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chat])

  const cargarDatos = async () => {
    setCargando(true)
    try {
      const { data: ventas } = await supabase.from('ventas').select('*, detalle_ventas(*, productos(*))').eq('is_deleted', false)
      const { data: productos } = await supabase.from('productos').select('*').eq('is_deleted', false)
      const { data: transacciones } = await supabase.from('transacciones').select('*')
      const { data: creditos } = await supabase.from('creditos').select('*')
      const { data: clientes } = await supabase.from('clientes').select('id')

      procesarDatos(ventas || [], productos || [], transacciones || [], creditos || [], clientes || [])
    } catch (error) {
      console.error('Error al cargar datos:', error)
    } finally {
      setCargando(false)
    }
  }

  const procesarDatos = (ventas, productos, transacciones, creditos, clientes) => {
    const ingresosVentas = ventas.reduce((acc, v) => acc + (parseFloat(v.total) || 0), 0)
    const egresosOperativos = transacciones.filter(t => t.tipo === 'egreso').reduce((acc, t) => acc + (parseFloat(t.monto) || 0), 0)
    const ingresosExtra = transacciones.filter(t => t.tipo === 'ingreso').reduce((acc, t) => acc + (parseFloat(t.monto) || 0), 0)
    const balanceNeto = ingresosVentas + ingresosExtra - egresosOperativos
    
    // Top Productos
    const prodCount = {}
    const ultimaVenta = {}
    ventas.forEach(v => {
      v.detalle_ventas?.forEach(d => {
        const nombre = d.productos?.nombre || '?'
        if (!prodCount[nombre]) prodCount[nombre] = { cantidad: 0, ingresos: 0 }
        prodCount[nombre].cantidad += (d.cantidad || 0)
        prodCount[nombre].ingresos += (parseFloat(d.subtotal) || 0)
        
        const fechaVenta = new Date(v.created_at)
        if (!ultimaVenta[d.producto_id] || fechaVenta > ultimaVenta[d.producto_id]) {
          ultimaVenta[d.producto_id] = fechaVenta
        }
      })
    })

    const topProductos = Object.entries(prodCount)
      .map(([nombre, d]) => ({ nombre, ...d }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5)

    const ahora = new Date()
    const productosEstancados = productos
      .map(p => {
        const fechaLV = ultimaVenta[p.id]
        const dias = fechaLV ? Math.floor((ahora - fechaLV) / 86400000) : 999
        return { nombre: p.nombre, stock: p.stock, diasSinVenta: dias }
      })
      .filter(p => p.diasSinVenta > 30)
      .sort((a, b) => b.diasSinVenta - a.diasSinVenta)
      .slice(0, 5)

    setDatos({
      ingresosVentas,
      egresosOperativos,
      ingresosExtra,
      balanceNeto,
      topProductos,
      productosEstancados,
      valorInventario: productos.reduce((acc, p) => acc + (p.stock * p.precio_venta), 0),
      agotados: productos.filter(p => p.stock <= 0).length,
      porCobrar: creditos.reduce((acc, c) => acc + parseFloat(c.monto_pendiente), 0),
      totalVentas: ventas.length,
      totalClientes: clientes.length
    })
  }

  const ejecutarAnalisis = async (tipo) => {
    if (!hasGeminiKey()) {
      setShowKeyInput(true)
      return
    }
    setAnalizando(tipo)
    try {
      const res = await analyzeBusinessData(datos, tipo)
      setResultadoAI(prev => ({ ...prev, [tipo]: res }))
    } catch (error) {
      setResultadoAI(prev => ({ ...prev, [tipo]: "⚠️ Error: " + error.message }))
    } finally {
      setAnalizando(null)
    }
  }

  const enviarPregunta = async (e) => {
    e.preventDefault()
    if (!mensaje.trim() || !hasGeminiKey()) return
    
    const nuevoMensaje = { role: 'user', content: mensaje }
    setChat(prev => [...prev, nuevoMensaje])
    setMensaje("")
    setAnalizando('chat')

    try {
      const res = await analyzeBusinessData(datos, 'chat', mensaje)
      setChat(prev => [...prev, { role: 'assistant', content: res }])
    } catch (error) {
      setChat(prev => [...prev, { role: 'assistant', content: "Error: " + error.message }])
    } finally {
      setAnalizando(null)
    }
  }

  const handleSaveKey = () => {
    if (apiKey.trim()) {
      setGeminiKey(apiKey)
      setShowKeyInput(false)
    }
  }

  if (cargando) return <div className="p-8 text-center text-slate-400">Escaneando red neuronal del negocio...</div>

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto pb-24">
      
      {showKeyInput && (
        <div className="bg-indigo-600/20 border border-indigo-500/50 p-6 rounded-3xl backdrop-blur-md flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-indigo-100">Configuración Requerida</h3>
            <p className="text-indigo-300 text-sm">Para usar el Agente de IA, ingresa tu Gemini API Key. Se guardará solo en este navegador.</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <input 
              type="password" 
              placeholder="AIzaSy..." 
              className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white flex-1 md:w-64"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <button 
              onClick={handleSaveKey}
              className="bg-indigo-500 hover:bg-indigo-400 text-white px-6 py-2 rounded-xl font-bold transition-all"
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      {/* Grid de Agentes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AgentCard 
          title="Finanzas con IA" 
          desc="Analiza ingresos, gastos y liquidez."
          icon="💰"
          color="emerald"
          onClick={() => ejecutarAnalisis('finance')}
          loading={analizando === 'finance'}
          result={resultadoAI.finance}
        />
        <AgentCard 
          title="Marketing Inteligente" 
          desc="Analiza clientes y promociones."
          icon="📢"
          color="cyan"
          onClick={() => ejecutarAnalisis('marketing')}
          loading={analizando === 'marketing'}
          result={resultadoAI.marketing}
        />
        <AgentCard 
          title="Gestión de Inventario" 
          desc="Optimiza la rotación de stock."
          icon="📦"
          color="amber"
          onClick={() => ejecutarAnalisis('inventory')}
          loading={analizando === 'inventory'}
          result={resultadoAI.inventory}
        />
        <AgentCard 
          title="Tendencias & IA" 
          desc="Proyecta ventas y demanda."
          icon="📈"
          color="rose"
          onClick={() => ejecutarAnalisis('trends')}
          loading={analizando === 'trends'}
          result={resultadoAI.trends}
        />
      </div>

      {/* Chat con el Agente */}
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-3xl overflow-hidden flex flex-col h-[600px] shadow-2xl relative">
        <div className="p-4 bg-slate-800/50 border-b border-slate-700 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-xl animate-pulse">🤖</div>
          <div>
            <h3 className="font-bold text-slate-100">Consultor IA de JonaStudio</h3>
            <p className="text-xs text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span> Conectado a tus datos reales
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chat.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50 space-y-4">
              <span className="text-6xl">💬</span>
              <p className="text-center max-w-xs">Hazle cualquier pregunta a tu asistente sobre ventas, inventario o sugerencias de negocio.</p>
            </div>
          )}
          {chat.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-lg ${
                m.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                  : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {analizando === 'chat' && (
            <div className="flex justify-start">
              <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-none px-4 py-3 flex gap-2 items-center">
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:-.3s]"></div>
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:-.5s]"></div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={enviarPregunta} className="p-4 bg-slate-800/50 border-t border-slate-700 flex gap-2">
          <input 
            type="text" 
            placeholder="Pregúntame algo: ¿Qué producto debería comprar más? ¿Cómo van mis gastos este mes?..."
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 text-sm focus:border-indigo-500 outline-none transition-all shadow-inner"
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
          />
          <button 
            disabled={analizando === 'chat'}
            className="bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white px-6 rounded-xl font-bold transition-all shadow-lg active:scale-95"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  )
}

function AgentCard({ title, desc, icon, color, onClick, loading, result }) {
  const colorMap = {
    emerald: "from-emerald-500/20 to-emerald-900/20 border-emerald-500/30 text-emerald-400",
    cyan: "from-cyan-500/20 to-cyan-900/20 border-cyan-500/30 text-cyan-400",
    amber: "from-amber-500/20 to-amber-900/20 border-amber-500/30 text-amber-400",
    rose: "from-rose-500/20 to-rose-900/20 border-rose-500/30 text-rose-400"
  }

  const btnMap = {
    emerald: "bg-emerald-500 hover:bg-emerald-400",
    cyan: "bg-cyan-500 hover:bg-cyan-400",
    amber: "bg-amber-500 hover:bg-amber-400",
    rose: "bg-rose-500 hover:bg-rose-400"
  }

  return (
    <div className={`bg-gradient-to-br ${colorMap[color]} border rounded-3xl p-6 flex flex-col gap-4 shadow-xl transition-all hover:scale-[1.02] relative overflow-hidden group`}>
      <div className="flex justify-between items-start">
        <span className="text-4xl">{icon}</span>
        {loading && <div className="animate-spin rounded-full h-6 w-6 border-2 border-t-white border-transparent"></div>}
      </div>
      <div>
        <h3 className="font-bold text-lg text-white">{title}</h3>
        <p className="text-xs text-slate-400">{desc}</p>
      </div>
      
      {result ? (
        <div className="mt-2 text-xs text-slate-200 bg-slate-950/50 p-3 rounded-xl border border-white/5 animate-fade-in max-h-40 overflow-y-auto whitespace-pre-wrap">
          {result}
        </div>
      ) : null}

      <button 
        onClick={onClick}
        className={`mt-auto py-2 rounded-xl text-white font-bold text-sm transition-all shadow-md active:scale-95 ${btnMap[color]}`}
      >
        {result ? "Analizar de Nuevo" : "Ejecutar Análisis"}
      </button>
    </div>
  )
}
