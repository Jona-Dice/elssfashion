// IA de Negocios usando Groq (gratuito, rápido, disponible en Latinoamérica)
// Groq es una plataforma de IA que ofrece acceso gratuito a modelos como Llama 3.3
// Registrate en console.groq.com para obtener tu API Key gratuita (gsk_...)

const GROQ_BASE = "https://api.groq.com/openai/v1/chat/completions";

// Modelos de Groq ordenados por preferencia
const MODELOS_GROQ = [
  "llama-3.3-70b-versatile",   // Más potente y capaz
  "llama-3.1-8b-instant",      // Más rápido, buen fallback
  "mixtral-8x7b-32768",        // Excelente para análisis largo
];

let _modeloFuncional = null;

// ── Manejo de la API Key ─────────────────────────────────────────────────────

const getApiKey = () =>
  localStorage.getItem('GROQ_API_KEY') || import.meta.env.VITE_GROQ_API_KEY || "";

export const setGeminiKey = (key) => {
  // Mantenemos el nombre de la función por compatibilidad con el resto del código
  localStorage.setItem('GROQ_API_KEY', key.trim());
  _modeloFuncional = null;
};

export const clearGeminiKey = () => {
  localStorage.removeItem('GROQ_API_KEY');
  _modeloFuncional = null;
};

export const hasGeminiKey = () => !!getApiKey();

// ── Llamada a la API de Groq ─────────────────────────────────────────────────

async function callGroq(apiKey, modelName, systemPrompt, userPrompt) {
  const response = await fetch(GROQ_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  const data = await response.json();

  // Log de diagnóstico (útil para detectar problemas)
  if (!response.ok) {
    console.warn(`⚠️ Groq [${modelName}] HTTP ${response.status}:`, data?.error?.message);
    const err = new Error(data?.error?.message || `HTTP ${response.status}`);
    err.status = response.status;
    throw err;
  }

  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Respuesta vacía del modelo.");
  return text;
}

// ── Función con fallback automático entre modelos ────────────────────────────

async function callConFallback(apiKey, systemPrompt, userPrompt) {
  // Si ya sabemos qué modelo funciona, usarlo directamente
  if (_modeloFuncional) {
    try {
      return await callGroq(apiKey, _modeloFuncional, systemPrompt, userPrompt);
    } catch (err) {
      if (err.status === 429 || err.status === 401) throw err;
      _modeloFuncional = null; // Resetear si el modelo deja de funcionar
    }
  }

  // Probar cada modelo hasta encontrar uno disponible
  let lastError = null;
  for (const modelo of MODELOS_GROQ) {
    try {
      const result = await callGroq(apiKey, modelo, systemPrompt, userPrompt);
      _modeloFuncional = modelo;
      console.log(`✅ Groq IA activa usando: ${modelo}`);
      return result;
    } catch (err) {
      lastError = err;
      if (err.status === 401 || err.status === 429) throw err;
      console.warn(`⚠️ Modelo ${modelo} no disponible, probando siguiente...`);
    }
  }

  throw lastError || new Error("No se pudo conectar con ningún modelo de Groq.");
}

// ── Función principal exportada ───────────────────────────────────────────────

export const analyzeBusinessData = async (data, moduleType, customPrompt = "") => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("No hay API Key de Groq configurada.");

  const systemPrompt = `Eres un experto consultor de negocios y analista financiero para un ERP de una tienda llamada JonaStudio. 
Tu objetivo es analizar los datos proporcionados y dar recomendaciones accionables, breves y profesionales en español.
Usa un tono premium, alentador y directo. Sé conciso y práctico.`;

  let userPrompt = "";
  const contextData = JSON.stringify(data, null, 2);

  switch (moduleType) {
    case 'finance':
      userPrompt = `Analiza la salud financiera de JonaStudio:
- Ingresos por Ventas: ${data.ingresosVentas}
- Egresos Operativos: ${data.egresosOperativos}
- Otros Ingresos: ${data.ingresosExtra}
- Balance Neto: ${data.balanceNeto}
- Dinero por Cobrar (Créditos): ${data.porCobrar}

Da exactamente 3 puntos clave de la situación financiera y 1 recomendación de acción inmediata.`;
      break;
    case 'marketing':
      userPrompt = `Analiza la estrategia de marketing de JonaStudio:
- Top 5 Productos más vendidos: ${JSON.stringify(data.topProductos)}
- Total Ventas realizadas: ${data.totalVentas}
- Total Clientes: ${data.totalClientes || 'N/A'}

Sugiere 2 estrategias concretas de marketing y cuáles productos publicitar primero.`;
      break;
    case 'inventory':
      userPrompt = `Analiza el inventario de JonaStudio:
- Valor total del inventario: ${data.valorInventario}
- Productos agotados: ${data.agotados}
- Productos sin ventas en más de 30 días: ${JSON.stringify(data.productosEstancados)}

Identifica los mayores riesgos y qué hacer con los productos estancados.`;
      break;
    case 'trends':
      userPrompt = `Analiza las tendencias de ventas de JonaStudio:
- Productos más vendidos recientemente: ${JSON.stringify(data.topProductos)}
- Productos estancados: ${JSON.stringify(data.productosEstancados)}

¿Cuáles productos tienen más potencial de crecimiento? ¿Qué tendencias ves?`;
      break;
    case 'chat':
      userPrompt = `El dueño de JonaStudio te hace esta pregunta: "${customPrompt}"
      
Datos actuales del negocio:
${contextData}

Responde de forma concisa, práctica y basada en los datos reales del negocio.`;
      break;
    default:
      userPrompt = customPrompt || "Analiza estos datos de negocio y dame un resumen ejecutivo en 5 puntos.";
  }

  try {
    return await callConFallback(apiKey, systemPrompt, userPrompt);
  } catch (err) {
    if (err.status === 429) {
      throw new Error("⏳ Límite de tasa alcanzado. Espera un momento e intenta de nuevo (Free Tier: ~30 req/min).");
    }
    if (err.status === 401) {
      throw new Error("🔑 API Key inválida. Cópiala correctamente desde console.groq.com → API Keys.");
    }
    if (err.status === 400) {
      throw new Error("❌ Error en la solicitud. Intenta de nuevo.");
    }
    throw new Error("❌ " + err.message);
  }
};
