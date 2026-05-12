// Gemini API - con auto-descubrimiento de modelos disponibles
// En lugar de adivinar nombres, preguntamos a Google cuáles están activos con TU key

const GEMINI_BASE_V1BETA = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_BASE_V1     = "https://generativelanguage.googleapis.com/v1";

// Cache de modelos disponibles (se consulta una vez por sesión)
let _cachedModel = null;

const getApiKey = () =>
  localStorage.getItem('GEMINI_API_KEY') || import.meta.env.VITE_GEMINI_API_KEY || "";

export const setGeminiKey = (key) => {
  localStorage.setItem('GEMINI_API_KEY', key);
  _cachedModel = null; // resetear caché al cambiar key
};

export const clearGeminiKey = () => {
  localStorage.removeItem('GEMINI_API_KEY');
  _cachedModel = null;
};

export const hasGeminiKey = () => !!getApiKey();

/**
 * Descubre qué modelo y endpoint funcionan con la API key actual.
 * Prueba v1beta y v1, y modelos preferidos en orden.
 */
async function discoverWorkingModel(apiKey) {
  if (_cachedModel) return _cachedModel;

  // Modelos de preferencia (de más nuevo a más compatible)
  const preferredModels = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-2.5-flash-preview-04-17",
    "gemini-2.5-pro-preview-05-06",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-pro",
  ];

  // Intentar primero descubrir via ListModels
  for (const base of [GEMINI_BASE_V1BETA, GEMINI_BASE_V1]) {
    try {
      const listUrl = `${base}/models?key=${apiKey}`;
      const res = await fetch(listUrl);
      if (res.ok) {
        const data = await res.json();
        const available = (data.models || [])
          .filter(m => m.supportedGenerationMethods?.includes("generateContent"))
          .map(m => m.name.replace("models/", ""));

        console.log(`📋 Modelos disponibles en ${base}:`, available);

        // Buscar el mejor modelo preferido que esté disponible
        for (const pref of preferredModels) {
          if (available.some(a => a === pref || a.startsWith(pref))) {
            const found = available.find(a => a === pref || a.startsWith(pref));
            _cachedModel = { base, model: found };
            console.log(`✅ Modelo seleccionado: ${found} en ${base}`);
            return _cachedModel;
          }
        }

        // Si no coincide ninguno preferido, usar el primero disponible
        if (available.length > 0) {
          _cachedModel = { base, model: available[0] };
          console.log(`✅ Usando primer modelo disponible: ${available[0]} en ${base}`);
          return _cachedModel;
        }
      }
    } catch (e) {
      console.warn(`⚠️ No se pudo listar modelos en ${base}:`, e.message);
    }
  }

  // Si ListModels no funcionó, probar directamente cada combinación
  for (const base of [GEMINI_BASE_V1BETA, GEMINI_BASE_V1]) {
    for (const model of preferredModels) {
      try {
        const testUrl = `${base}/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(testUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: "hola" }] }] }),
        });
        if (res.ok || res.status === 400) {
          // 400 puede ser error de formato pero el modelo existe
          if (res.ok) {
            _cachedModel = { base, model };
            console.log(`✅ Modelo funcional: ${model} en ${base}`);
            return _cachedModel;
          }
        }
      } catch (_) { /* continuar */ }
    }
  }

  throw new Error(
    "❌ No se encontró ningún modelo disponible con tu API Key.\n\n" +
    "Verifica:\n" +
    "1. Que la key sea de Google AI Studio (aistudio.google.com/app/apikey)\n" +
    "2. Que no sea una key de Google Cloud Console sin la API habilitada\n" +
    "3. Que no hayas excedido el límite gratuito"
  );
}

async function callGemini(base, apiKey, modelName, prompt) {
  const url = `${base}/models/${modelName}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const errMsg = data?.error?.message || `HTTP ${response.status}`;
    const err = new Error(errMsg);
    err.status = response.status;
    throw err;
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Respuesta vacía del modelo.");
  return text;
}

export const analyzeBusinessData = async (data, moduleType, customPrompt = "") => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("No hay API Key de Gemini configurada.");

  const systemPrompt = `Eres un experto consultor de negocios y analista financiero para un ERP de una tienda (JonaStudio). 
Tu objetivo es analizar los datos proporcionados y dar recomendaciones accionables, breves y profesionales en español.
Usa un tono premium, alentador y directo.\n\n`;

  let userPrompt = "";
  const contextData = JSON.stringify(data, null, 2);

  switch (moduleType) {
    case 'finance':
      userPrompt = `Analiza la salud financiera: Ingresos: ${data.ingresosVentas}, Egresos: ${data.egresosOperativos}, Otros Ingresos: ${data.ingresosExtra}, Balance Neto: ${data.balanceNeto}, Dinero por Cobrar: ${data.porCobrar}. Da 3 puntos clave y una recomendación.`;
      break;
    case 'marketing':
      userPrompt = `Analiza marketing: Top Productos: ${JSON.stringify(data.topProductos)}, Ventas: ${data.totalVentas}, Clientes: ${data.totalClientes || 'N/A'}. Sugiere 2 estrategias y qué publicitar.`;
      break;
    case 'inventory':
      userPrompt = `Analiza inventario: Valor: ${data.valorInventario}, Agotados: ${data.agotados}, Estancados: ${JSON.stringify(data.productosEstancados)}. Identifica riesgos y qué hacer con lo estancado.`;
      break;
    case 'trends':
      userPrompt = `Analiza tendencias: Top Recientes: ${JSON.stringify(data.topProductos)}, Estancados: ${JSON.stringify(data.productosEstancados)}. ¿Qué crecerá más?`;
      break;
    case 'chat':
      userPrompt = `Pregunta: "${customPrompt}"\nDatos:\n${contextData}\nResponde conciso y basado en datos.`;
      break;
    default:
      userPrompt = customPrompt || "Analiza estos datos de negocio y dame un resumen ejecutivo.";
  }

  const fullPrompt = systemPrompt + userPrompt;

  // Descubrir el modelo que funciona con esta key
  const { base, model } = await discoverWorkingModel(apiKey);

  try {
    return await callGemini(base, apiKey, model, fullPrompt);
  } catch (err) {
    // Si falla el modelo cacheado, resetear y lanzar error claro
    _cachedModel = null;

    if (err.status === 400 && err.message?.includes("API_KEY_INVALID")) {
      throw new Error("🔑 API Key inválida. Copia la key correctamente desde aistudio.google.com/app/apikey");
    }
    if (err.status === 429) {
      throw new Error("⏳ Límite de uso alcanzado. Espera 1 minuto (Free Tier: ~15 req/min).");
    }
    if (err.status === 403) {
      throw new Error("🚫 Sin permisos. Verifica que tu API Key esté activa.");
    }
    throw new Error("❌ " + err.message);
  }
};
