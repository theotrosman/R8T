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

Respondé SIEMPRE con un ÚNICO JSON válido (sin texto afuera):
{"reply":"texto corto en español rioplatense","name":"Nombre corto de la estrategia","program":{"root":[ ...bloques... ]}}
El campo "program" (y "name") es OPCIONAL: incluilo SOLO cuando el usuario pida CREAR o MODIFICAR la estrategia.
Si el usuario solo saluda, agradece, pregunta qué podés hacer, o hace charla, respondé ÚNICAMENTE con "reply" (sin "program" ni "name").

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
- regla_horario {franja:"pico"|"valle", direccion:"subir"|"bajar", ajuste:num, ajusteUnit:"%"|"$"}
- redondeo {modo:"psy"|"d100"|"d1000"|"entero"}
- fijar_precio {frecuencia:"5"|"15"|"30"|"60"|"120"|"180"|"360"|"720"|"1440"|"2880"}
- alerta {canal:"push"|"email"|"whatsapp"}
- pausar {modo:"temporal"|"definitivo", mail:bool}
Contenedores (llevan "branches"):
- condicion {variable, op, valor, combinar?:"no"|"y"|"o", variable2?, op2?, valor2?} con "branches":{"si":[...],"no":[...]}
- repetir_mientras {variable, op, valor, combinar?, variable2?, op2?, valor2?, maxIter} con "branches":{"do":[...]}
- repetir_n {veces} con "branches":{"do":[...]}
variable ∈ dif_competidor|competitor|margen|precio|costo|stock|reputacion|visitas|competidores|dias_sin_venta|ventas_semana
op ∈ gt|lt|gte|lte|eq|neq|absgt|abslt   (absgt = difiere en más de ±valor; útil con dif_competidor)
combinar "y"/"o" activa una 2ª condición (variable2/op2/valor2); "no" = una sola.

Reglas:
- Sos un asistente de PRECIOS y AUTOMATIZACIÓN para Mercado Libre. Podés saludar y explicar qué hacés.
  Si te preguntan algo ajeno a precios/repricing/automatización, respondé amable que solo ayudás con eso (sin program).
- Si te piden EXPLICAR la estrategia actual o SUGERIR mejoras, respondé en "reply" (claro y breve) leyendo el
  "Programa actual"; NO incluyas "program" salvo que además te pidan APLICAR los cambios.
- Si te piden un cambio puntual (ej. "subí el piso a 15%", "sumá 3% al IVA"), devolvé el "program" completo pero
  cambiando SOLO ese valor sobre el "Programa actual"; el resto idéntico.
- Cuando MODIFIQUES la estrategia, partí del "Programa actual" que te paso y cambiá SOLO lo que el usuario pide;
  el resto dejalo IDÉNTICO. No repitas cambios ya hechos (ej: si el IVA ya está en 24, no le sumes otra vez).
- Al CREAR una estrategia de cero: empezá con comision_ml e impuestos_generales, incluí piso_rentabilidad y TERMINÁ con fijar_precio.
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
    const program = body.program && typeof body.program === 'object' ? body.program : null;
    const history = Array.isArray(body.history) ? body.history.slice(-8) : [];

    let ctx = '';
    if (strategy) ctx += `\n\nEstrategia actual (en palabras): ${strategy}`;
    if (program) { try { ctx += `\n\nPrograma actual (JSON — editá SOBRE esto, cambiando solo lo pedido): ${JSON.stringify(program).slice(0, 6000)}`; } catch (e) {} }

    const messages = [
      { role: 'system', content: SYSTEM + ctx },
      ...history.filter(m => m && m.role && m.content).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content).slice(0, 2000) })),
      { role: 'user', content: userMsg },
    ];

    const ask = async (model, useJson) => {
      const b = { model, messages, temperature: 0.35, max_tokens: 4000 };
      if (useJson) b.response_format = { type: 'json_object' };
      return fetch(GROQ_URL, { method: 'POST', headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
    };
    let data = null, lastErr = '';
    // 1) modo JSON estricto, probando modelos disponibles
    for (const model of MODELS) {
      const r = await ask(model, true);
      if (r.ok) { data = await r.json(); break; }
      lastErr = await r.text();
      // ante error recuperable (modelo inexistente, JSON inválido, rate limit, 5xx) probamos el siguiente
      if (!/model_not_found|does not exist|decommission|json_validate_failed|rate_limit|429|internal|5\d\d/i.test(lastErr)) break;
    }
    // 2) fallback: texto plano y extraemos el JSON (evita json_validate_failed en estrategias grandes)
    if (!data) {
      for (const model of MODELS.slice(0, 3)) {
        const r = await ask(model, false);
        if (r.ok) { data = await r.json(); break; }
        lastErr = await r.text();
      }
    }
    if (!data) { res.status(502).json({ error: 'Groq error', detail: lastErr.slice(0, 400) }); return; }

    let content = (data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : '') || '';
    content = content.replace(/```json/gi, '').replace(/```/g, '').trim();
    let parsed;
    try { parsed = JSON.parse(content); }
    catch (e) {
      const a = content.indexOf('{'), z = content.lastIndexOf('}');
      if (a >= 0 && z > a) { try { parsed = JSON.parse(content.slice(a, z + 1)); } catch (e2) { parsed = { reply: content.slice(0, 800) }; } }
      else parsed = { reply: content.slice(0, 800) || 'No pude generar la estrategia, probá reformulando.' };
    }
    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: 'Fallo interno', detail: String(err).slice(0, 300) });
  }
};
