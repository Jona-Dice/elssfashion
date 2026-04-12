import { GoogleGenerativeAI } from "@google/generative-ai";

const getApiKey = () => {
  return localStorage.getItem('GEMINI_API_KEY') || import.meta.env.VITE_GEMINI_API_KEY || "";
};

export const setGeminiKey = (key) => {
  localStorage.setItem('GEMINI_API_KEY', key);
};

export const hasGeminiKey = () => {
  return !!getApiKey();
};

export const analyzeBusinessData = async (data, moduleType, customPrompt = "") => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("No hay API Key de Gemini configurada.");

  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Lista de modelos a intentar en orden de preferencia (Actualizado para 2026)
  const modelsToTry = [
    "gemini-3-flash", 
    "gemini-2.5-flash", 
    "gemini-1.5-flash", // Legacy fallback
    "gemini-2.0-flash"  // Deprecating fallback
  ];
  
  let lastError = null;

  let systemPrompt = `Eres un experto consultor de negocios y analista financiero para un ERP de una tienda (JonaStudio). 
Tu objetivo es analizar los datos proporcionados y dar recomendaciones accionables, breves y profesionales en español.
Usa un tono premium, alentador y directo.

`;

  const contextData = JSON.stringify(data, null, 2);
  let prompt = "";
  
  switch (moduleType) {
    case 'finance':
      prompt = `Analiza la salud financiera: Ingresos: ${data.ingresosVentas}, Egresos: ${data.egresosOperativos}, Otros Ingresos: ${data.ingresosExtra}, Balance Neto: ${data.balanceNeto}, Dinero por Cobrar: ${data.porCobrar}. Da 3 puntos clave y una recomendación.`;
      break;
    case 'marketing':
      prompt = `Analiza marketing: Top Productos: ${JSON.stringify(data.topProductos)}, Ventas: ${data.totalVentas}, Clientes: ${data.totalClientes || 'N/A'}. Sugiere 2 estrategias y qué publicitar.`;
      break;
    case 'inventory':
      prompt = `Analiza inventario: Valor: ${data.valorInventario}, Agotados: ${data.agotados}, Estancados: ${JSON.stringify(data.productosEstancados)}. Identifica riesgos y qué hacer con lo estancado.`;
      break;
    case 'trends':
      prompt = `Analiza tendencias: Top Recientes: ${JSON.stringify(data.topProductos)}, Estancados: ${JSON.stringify(data.productosEstancados)}. ¿Qué crecerá más?`;
      break;
    case 'chat':
      prompt = `Pregunta: "${customPrompt}"\nDatos:\n${contextData}\nResponde conciso y basado en datos.`;
      break;
    default:
      prompt = customPrompt || "Analiza estos datos de negocio y dame un resumen ejecutivo.";
  }

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent([systemPrompt, prompt]);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.warn(`Error con modelo ${modelName}:`, error);
      lastError = error;
      
      // Si el error es de cuota (429), intentamos el siguiente modelo
      if (error.message?.includes('429') || error.message?.includes('quota')) {
        continue;
      }
      
      // Si es otro tipo de error crítico, lo lanzamos
      throw error;
    }
  }

  // Si llegamos aquí es porque todos los modelos fallaron (probablemente por cuota)
  if (lastError?.message?.includes('429')) {
    throw new Error("Límite de cuota excedido en Google Gemini (Free Tier). Por favor, espera unos minutos o verifica tu cuenta en Google AI Studio. Detalles: " + lastError.message);
  }

  throw lastError || new Error("Error desconocido al contactar con la IA.");
};
