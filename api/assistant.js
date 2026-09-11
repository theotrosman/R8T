/* ============================================================
   R8T · api/assistant.js  —  Función serverless (Vercel)
   Proxy al chat de Groq. Arma la estrategia (programa de bloques)
   que el front carga directamente en el editor.
   Requiere la env var GROQ_API_KEY (ya configurada en Vercel).
   ============================================================ */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
// Se prueban en orden hasta encontrar uno disponible para la cuenta (podés forzar con GROQ_MODEL)
const MODELS = [process.env.GROQ_MODEL, 'llama-3.3-70b-versatile', 'meta-llama/llama-4-maverick-17b-128e-instruct', 'openai/gpt-oss-120b', 'llama-3.1-8b-instant', 'gemma2-9b-it'].filter(Boolean);

const SYSTEM = `Sos el asistente de R8T, un repricer visual para vendedores de Mercado Libre (Argentina), dentro de Real Trends.
El usuario te pide una estrategia de precios y vos la CONSTRUÍS como un PROGRAMA de bloques.

Respondé SIEMPRE con un ÚNICO JSON válido (sin texto afuera) con esta forma exacta:
{"reply":"explicación corta en español rioplatense (2-3 frases)","name":"Nombre corto","program":{"root":[ ...bloques... ]}}

Cada bloque es {"type":"<tipo>","params":{...}}. Los contenedores además llevan "branches".
Usá SOLO estos tipos y params:
- comision_ml {comision:%, costoFijo:$}
- costos_operativos {packaging:$, operativoPct:%}
- impuestos_generales {iva:%, iibb:%, otros:%, trasladar:bool}
- impuesto_importacion {derechos:%, estadistica:%, divisa:%}
- cambio_impuesto {impuesto:"iva"|"iibb"|"otros", variacion:pts, reajustar:bool}
- retenciones {retencion:%, percepcion:%}
- igualar_competencia {modo:"igualar"|"debajo"|"encima", offset:num, offsetUnit:"$"|"%", respetarPiso:bool}
- ganar_buybox {delta:num, deltaUnit:"$"|"%", maxIntentos:%}
- margen_objetivo {target:%, modo:"fijar"|"minimo"}
- piso_rentabilidad {min:%}
- techo_precio {max:num, maxUnit:"%"|"$"}
- promo_ml {descuento:num, descuentoUnit:"%"|"$", pisoPromo:%}
- campana {descuento:num, descuentoUnit:"%"|"$", soloSiStock:u}
- descuento_volumen {umbral:u, descuento:num, descuentoUnit:"%"|"$"}
- liquidacion {descuento:num, descuentoUnit:"%"|"$", hastaMargen:%}
- envio {modo:"vendedor"|"comprador"|"mixto", costoEnvio:$, trasladar:bool}
- cuotas {cuotas:"3"|"6"|"9"|"12", costoFin:%, trasladar:bool}
- devoluciones {tasa:%, costoGestion:$}
- regla_stock {bajoU:u, bajoAjuste:num, bajoAjusteUnit:"%"|"$", altoU:u, altoAjuste:num, altoAjusteUnit:"%"|"$"}
- regla_horario {franja:"pico"|"valle", ajuste:num, ajusteUnit:"%"|"$"}
- redondeo {modo:"psy"|"d100"|"d1000"|"entero"}
- fijar_precio {frecuencia:"5"|"15"|"30"|"60"|"120"|"180"|"360"|"720"|"1440"|"2880"}
- alerta {canal:"push"|"email"|"whatsapp"}
- pausar {modo:"temporal"|"definitivo", mail:bool}
Contenedores (llevan "branches"):
- condicion {variable, op, valor} con "branches":{"si":[...],"no":[...]}
- repetir_mientras {variable, op, valor, maxIter} con "branches":{"do":[...]}
- repetir_n {veces} con "branches":{"do":[...]}
variable ∈ dif_competidor|competitor|margen|precio|costo|stock|visitas|competidores|dias_sin_venta|ventas_semana
op ∈ gt|lt|gte|lte|eq|neq|absgt|abslt   (absgt = difiere en más de ±valor; útil con dif_competidor)

Reglas:
- Empezá normalmente con comision_ml e impuestos_generales, incluí piso_rentabilidad para proteger el margen, y TERMINÁ con fijar_precio.
- Sé realista y conservador para Mercado Libre AR. Todo desde la óptica del vendedor.
- No inventes tipos ni params que no estén en la lista.`;

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body || '{}'); } catch (e) { return {}; } }
  return await new Promise((resolve) => { let d = ''; req.on('data', c => d += c); req.on('end', () => { try { resolve(JSON.parse(d || '{}')); } catch (e) { resolve({}); } }); req.on('error', () => resolve({})); });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  // La env var puede estar como GROQ_API_KEY o groq_api_key (los nombres distinguen mayúsculas)
  const key = process.env.GROQ_API_KEY || process.env.groq_api_key || process.env.Groq_Api_Key;
  if (!key) { res.status(500).json({ error: 'Falta la API key de Groq en el entorno (GROQ_API_KEY o groq_api_key).' }); return; }

  try {
    const body = await readBody(req);
    const userMsg = String(body.message || '').slice(0, 2000);
    const strategy = String(body.strategy || '').slice(0, 2000);
    const history = Array.isArray(body.history) ? body.history.slice(-8) : [];

    const messages = [
      { role: 'system', content: SYSTEM + (strategy ? `\n\nEstrategia actual del usuario: ${strategy}` : '') },
      ...history.filter(m => m && m.role && m.content).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content).slice(0, 2000) })),
      { role: 'user', content: userMsg },
    ];

    let data = null, lastErr = '';
    for (const model of MODELS) {
      const groqRes = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, temperature: 0.4, max_tokens: 1600, response_format: { type: 'json_object' } }),
      });
      if (groqRes.ok) { data = await groqRes.json(); break; }
      lastErr = await groqRes.text();
      // si el modelo no existe, probamos el siguiente; otro error, cortamos
      if (!/model_not_found|does not exist|decommission/i.test(lastErr)) break;
    }
    if (!data) { res.status(502).json({ error: 'Groq error', detail: lastErr.slice(0, 500) }); return; }
    const content = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : '{}';
    let parsed; try { parsed = JSON.parse(content); } catch (e) { parsed = { reply: content }; }
    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: 'Fallo interno', detail: String(err).slice(0, 300) });
  }
};
