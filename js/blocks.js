/* ============================================================
   R8T · blocks.js  (v2 — modelo apilable vertical)
   Registro de bloques del repricer. Cada bloque:
   - se renderiza como una "tarjeta-frase" con controles en línea
   - narra en lenguaje natural lo que hace (narrate) → barra de explicación
   - transforma el contexto de precio en la simulación (apply / branch)

   Variables cubiertas (Zentor / TheFoxie / MargenFull):
   costo, comisión ML, costo fijo, IVA, IIBB, retenciones/percepciones,
   cambios de impuestos, envío, cuotas sin interés, promociones, descuentos,
   liquidación, devoluciones, buybox/competencia, stock, demanda, horario,
   redondeo psicológico, piso/techo, condiciones (cuando pasa X → hago Y).
   ============================================================ */

/* ---------- Helpers de cálculo (compartidos) ---------- */
function variablePct(ctx) {
  return (ctx.commissionPct || 0) + (ctx.iibbPct || 0) + (ctx.taxExtraPct || 0)
       + (ctx.installmentPct || 0) + (ctx.promoPct || 0) + (ctx.returnReservePct || 0)
       + (ctx.retencionPct || 0);
}
function fixedCost(ctx) {
  return (ctx.cost || 0) + (ctx.fixedFee || 0) + (ctx.shipping || 0) + (ctx.packaging || 0);
}
function marginAt(ctx, price) {
  if (!price || price <= 0) return -999;
  const net = price - price * (variablePct(ctx) / 100) - fixedCost(ctx);
  return (net / price) * 100;
}
function priceForMargin(ctx, marginPct) {
  const denom = 1 - (variablePct(ctx) + marginPct) / 100;
  if (denom <= 0.02) return fixedCost(ctx) * 4;
  return fixedCost(ctx) / denom;
}
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function money(n) { return '$' + Math.round(n || 0).toLocaleString('es-AR'); }
function note(ctx, level, text) { ctx.notes.push({ level, text }); }

/* ---------- Categorías ---------- */
const CATS = [
  { key: 'competencia', name: 'Competencia',   icon: 'competencia', color: 'var(--cat-competencia)' },
  { key: 'margen',      name: 'Márgenes',      icon: 'margen',      color: 'var(--cat-margen)' },
  { key: 'costos',      name: 'Costos',        icon: 'costos',      color: 'var(--cat-costos)' },
  { key: 'impuestos',   name: 'Impuestos',     icon: 'impuestos',   color: 'var(--cat-impuestos)' },
  { key: 'promos',      name: 'Promociones',   icon: 'promos',      color: 'var(--cat-promos)' },
  { key: 'descuentos',  name: 'Descuentos',    icon: 'descuentos',  color: 'var(--cat-descuentos)' },
  { key: 'envios',      name: 'Envíos',        icon: 'envios',      color: 'var(--cat-envios)' },
  { key: 'cuotas',      name: 'Cuotas',        icon: 'cuotas',      color: 'var(--cat-cuotas)' },
  { key: 'devoluciones',name: 'Devoluciones',  icon: 'devoluciones',color: 'var(--cat-devoluciones)' },
  { key: 'logica',      name: 'Condiciones y reglas', icon: 'logica', color: 'var(--cat-logica)' },
  { key: 'accion',      name: 'Acciones',      icon: 'accion',      color: 'var(--cat-accion)' },
];
const CAT_MAP = Object.fromEntries(CATS.map(c => [c.key, c]));

/* Etiquetas legibles para variables de condición */
const VAR_LABEL = { stock: 'el stock', competitor: 'el precio del competidor', margen: 'mi margen actual', precio: 'mi precio', visitas: 'las visitas' };
const OP_LABEL = { lt: 'es menor a', gt: 'es mayor a', eq: 'es igual a' };

/* ---------- Bloques ---------- */
const BLOCKS = {

  /* ===== COMPETENCIA ===== */
  igualar_competencia: {
    cat: 'competencia', name: 'Igualar / superar competencia', icon: 'competencia',
    desc: 'Ajusta tu precio en relación al competidor de referencia (o al ganador del BuyBox).',
    params: [
      { key: 'modo', label: 'Quedar', type: 'select', value: 'debajo',
        options: [['igualar', 'igualando al competidor'], ['debajo', 'por debajo'], ['encima', 'por encima']] },
      { key: 'offset', label: 'Diferencia', type: 'number', unit: '$', value: 50, min: 0, max: 100000, step: 10 },
      { key: 'respetarPiso', label: 'Nunca perforar el piso', type: 'toggle', value: true },
    ],
    narrate: (p) => p.modo === 'igualar' ? 'igualo mi precio al del competidor'
      : `me pongo ${money(p.offset)} ${p.modo === 'debajo' ? 'por debajo' : 'por encima'} del competidor`,
    apply: (ctx, p) => {
      if (!ctx.competitor) { note(ctx, 'info', 'Sin precio de competidor: bloque omitido.'); return; }
      let target = ctx.competitor;
      if (p.modo === 'debajo') target = ctx.competitor - p.offset;
      if (p.modo === 'encima') target = ctx.competitor + p.offset;
      if (p.respetarPiso && ctx.floor && target < ctx.floor) { target = ctx.floor; note(ctx, 'warn', 'El competidor está por debajo de tu piso: se frenó en el piso.'); }
      else note(ctx, 'ok', `Posicionado respecto al competidor (${money(ctx.competitor)}).`);
      ctx.price = target;
    },
  },
  ganar_buybox: {
    cat: 'competencia', name: 'Ganar el BuyBox', icon: 'target',
    desc: 'Intenta ganar el catálogo quedando apenas por debajo del ganador, sin perforar tu piso de rentabilidad.',
    params: [
      { key: 'delta', label: 'Ganar por', type: 'number', unit: '$', value: 20, min: 1, max: 10000, step: 5 },
      { key: 'maxIntentos', label: 'Bajar como máximo', type: 'number', unit: '%', value: 8, min: 0, max: 50, step: 1 },
    ],
    narrate: (p) => `quedo ${money(p.delta)} debajo del BuyBox (bajando ${p.maxIntentos}% como máximo)`,
    apply: (ctx, p) => {
      if (!ctx.competitor) { note(ctx, 'info', 'Sin BuyBox de referencia.'); return; }
      let target = ctx.competitor - p.delta;
      const maxBaja = ctx.price * (1 - p.maxIntentos / 100);
      target = Math.max(target, maxBaja);
      if (ctx.floor) target = Math.max(target, ctx.floor);
      ctx.price = target;
      note(ctx, ctx.price <= ctx.competitor ? 'ok' : 'warn', ctx.price <= ctx.competitor ? `Precio competitivo para el BuyBox (${money(ctx.price)}).` : 'No se pudo superar al BuyBox sin perder rentabilidad.');
    },
  },

  /* ===== MÁRGENES ===== */
  margen_objetivo: {
    cat: 'margen', name: 'Margen objetivo', icon: 'margen',
    desc: 'Calcula el precio para lograr el margen neto que querés, considerando todos los costos e impuestos cargados.',
    params: [
      { key: 'target', label: 'Margen', type: 'number', unit: '%', value: 25, min: -20, max: 90, step: 1, slider: true },
      { key: 'modo', label: 'Modo', type: 'select', value: 'fijar', options: [['fijar', 'fijar en'], ['minimo', 'asegurar al menos']] },
    ],
    narrate: (p) => p.modo === 'fijar' ? `fijo el precio para dejar ${p.target}% de margen` : `me aseguro de dejar al menos ${p.target}% de margen`,
    apply: (ctx, p) => {
      const target = priceForMargin(ctx, p.target);
      if (p.modo === 'fijar') { ctx.price = target; note(ctx, 'ok', `Precio calculado para ${p.target}% de margen.`); }
      else if (ctx.price < target) { ctx.price = target; note(ctx, 'warn', `Se subió el precio para alcanzar ${p.target}%.`); }
      ctx.targetMarginPct = p.target;
    },
  },
  piso_rentabilidad: {
    cat: 'margen', name: 'Piso de rentabilidad', icon: 'shield',
    desc: 'Red de seguridad: define el margen MÍNIMO aceptable. Ningún bloque puede perforarlo.',
    params: [{ key: 'min', label: 'Margen mínimo', type: 'number', unit: '%', value: 10, min: -30, max: 80, step: 1, slider: true }],
    narrate: (p) => `nunca bajo del ${p.min}% de margen`,
    apply: (ctx, p) => {
      ctx.floor = priceForMargin(ctx, p.min); ctx.minMarginPct = p.min;
      if (ctx.price < ctx.floor) { ctx.price = ctx.floor; note(ctx, 'warn', `Precio elevado al piso (${p.min}% margen).`); }
      else note(ctx, 'ok', `Piso de rentabilidad en ${money(ctx.floor)}.`);
    },
  },
  techo_precio: {
    cat: 'margen', name: 'Techo de precio', icon: 'scale',
    desc: 'Límite superior de precio para no salirte de mercado.',
    params: [
      { key: 'modo', label: 'Definir por', type: 'select', value: 'margen', options: [['margen', 'margen máximo'], ['pesos', 'precio máximo $']] },
      { key: 'max', label: 'Valor', type: 'number', unit: '%', value: 45, min: 0, max: 5000000, step: 1 },
    ],
    narrate: (p) => p.modo === 'margen' ? `no supero el ${p.max}% de margen` : `no supero ${money(p.max)}`,
    apply: (ctx, p) => {
      ctx.ceiling = p.modo === 'margen' ? priceForMargin(ctx, p.max) : p.max;
      if (ctx.price > ctx.ceiling) { ctx.price = ctx.ceiling; note(ctx, 'info', 'Precio limitado por el techo.'); }
    },
  },

  /* ===== COSTOS ===== */
  comision_ml: {
    cat: 'costos', name: 'Comisión Mercado Libre', icon: 'costos',
    desc: 'Comisión por categoría + costo fijo por venta de Mercado Libre.',
    params: [
      { key: 'comision', label: 'Comisión', type: 'number', unit: '%', value: 13, min: 0, max: 40, step: 0.5, slider: true },
      { key: 'costoFijo', label: 'Costo fijo', type: 'number', unit: '$', value: 1095, min: 0, max: 20000, step: 5 },
    ],
    narrate: (p) => `descuento la comisión de ML (${p.comision}% + ${money(p.costoFijo)} fijo)`,
    apply: (ctx, p) => { ctx.commissionPct = p.comision; ctx.fixedFee = p.costoFijo; },
  },
  costos_operativos: {
    cat: 'costos', name: 'Costos operativos', icon: 'stock',
    desc: 'Packaging, almacenamiento y gastos operativos.',
    params: [
      { key: 'packaging', label: 'Packaging', type: 'number', unit: '$', value: 200, min: 0, max: 50000, step: 10 },
      { key: 'operativoPct', label: 'Operativo', type: 'number', unit: '%', value: 2, min: 0, max: 30, step: 0.5 },
    ],
    narrate: (p) => `sumo costos operativos (${money(p.packaging)} + ${p.operativoPct}%)`,
    apply: (ctx, p) => { ctx.packaging = (ctx.packaging || 0) + p.packaging; ctx.taxExtraPct += p.operativoPct; },
  },

  /* ===== IMPUESTOS ===== */
  impuestos_generales: {
    cat: 'impuestos', name: 'Impuestos', icon: 'impuestos',
    desc: 'Carga IVA, Ingresos Brutos (IIBB) y otros impuestos.',
    params: [
      { key: 'iva', label: 'IVA', type: 'number', unit: '%', value: 21, min: 0, max: 40, step: 0.5 },
      { key: 'iibb', label: 'IIBB', type: 'number', unit: '%', value: 3, min: 0, max: 15, step: 0.1 },
      { key: 'otros', label: 'Otros', type: 'number', unit: '%', value: 0, min: 0, max: 20, step: 0.5 },
      { key: 'trasladar', label: 'Trasladar al precio', type: 'toggle', value: false },
    ],
    narrate: (p) => `considero impuestos (IVA ${p.iva}%, IIBB ${p.iibb}%)${p.trasladar ? ' y los traslado al precio' : ''}`,
    apply: (ctx, p) => {
      ctx.iibbPct = p.iibb; ctx.taxExtraPct += p.otros; ctx.ivaPct = p.iva;
      if (p.trasladar) { ctx.price = priceForMargin(ctx, ctx.targetMarginPct || 20); note(ctx, 'ok', 'Impuestos trasladados al precio.'); }
    },
  },
  cambio_impuesto: {
    cat: 'impuestos', name: 'Cambio de impuesto', icon: 'wand',
    desc: 'Simula o programa una suba/baja de un impuesto y reajusta el precio para no perder margen.',
    params: [
      { key: 'impuesto', label: 'Impuesto', type: 'select', value: 'iibb', options: [['iva', 'IVA'], ['iibb', 'IIBB'], ['otros', 'Percepción / otro']] },
      { key: 'variacion', label: 'Variación', type: 'number', unit: 'pts', value: 2, min: -20, max: 20, step: 0.5 },
      { key: 'reajustar', label: 'Reajustar el precio automáticamente', type: 'toggle', value: true },
    ],
    narrate: (p) => `si ${p.impuesto.toUpperCase()} ${p.variacion >= 0 ? 'sube' : 'baja'} ${Math.abs(p.variacion)} pts${p.reajustar ? ', reajusto el precio para mantener el margen' : ''}`,
    apply: (ctx, p) => {
      const antesMargen = marginAt(ctx, ctx.price);
      if (p.impuesto === 'iva') ctx.ivaPct = (ctx.ivaPct || 21) + p.variacion;
      if (p.impuesto === 'iibb') ctx.iibbPct = (ctx.iibbPct || 0) + p.variacion;
      if (p.impuesto === 'otros') ctx.taxExtraPct = (ctx.taxExtraPct || 0) + p.variacion;
      if (p.reajustar) { ctx.price = priceForMargin(ctx, antesMargen); note(ctx, 'ok', `Precio reajustado tras cambio de ${p.impuesto.toUpperCase()}.`); }
      else note(ctx, 'warn', `Cambio impositivo sin reajuste: el margen baja a ${marginAt(ctx, ctx.price).toFixed(1)}%.`);
    },
  },
  retenciones: {
    cat: 'impuestos', name: 'Retenciones y percepciones', icon: 'shield',
    desc: 'Retenciones AFIP/ARCA y percepciones de IIBB por jurisdicción.',
    params: [
      { key: 'retencion', label: 'Retención', type: 'number', unit: '%', value: 1, min: 0, max: 15, step: 0.1 },
      { key: 'percepcion', label: 'Percepción', type: 'number', unit: '%', value: 0.5, min: 0, max: 10, step: 0.1 },
    ],
    narrate: (p) => `descuento retenciones (${p.retencion}%) y percepciones (${p.percepcion}%)`,
    apply: (ctx, p) => { ctx.retencionPct = (ctx.retencionPct || 0) + p.retencion + p.percepcion; },
  },

  /* ===== PROMOCIONES ===== */
  promo_ml: {
    cat: 'promos', name: 'Promoción Mercado Libre', icon: 'promos',
    desc: 'Aplica un descuento promocional respetando un margen mínimo.',
    params: [
      { key: 'descuento', label: 'Descuento', type: 'number', unit: '%', value: 15, min: 0, max: 80, step: 1, slider: true },
      { key: 'pisoPromo', label: 'Margen mín. en promo', type: 'number', unit: '%', value: 5, min: -20, max: 60, step: 1 },
    ],
    narrate: (p) => `aplico ${p.descuento}% de descuento (sin bajar del ${p.pisoPromo}% de margen)`,
    apply: (ctx, p) => {
      const conDesc = ctx.price * (1 - p.descuento / 100);
      const pisoPromo = priceForMargin(ctx, p.pisoPromo);
      ctx.price = Math.max(conDesc, pisoPromo);
      note(ctx, conDesc < pisoPromo ? 'warn' : 'ok', conDesc < pisoPromo ? 'Descuento recortado por margen mínimo de promo.' : `Promoción del ${p.descuento}% aplicada.`);
    },
  },
  campana: {
    cat: 'promos', name: 'Campaña / Oferta del día', icon: 'rocket',
    desc: 'Descuento para campañas puntuales (Hot Sale, Oferta del día).',
    params: [
      { key: 'descuento', label: 'Descuento', type: 'number', unit: '%', value: 20, min: 0, max: 80, step: 1, slider: true },
      { key: 'soloSiStock', label: 'Stock mínimo', type: 'number', unit: 'u', value: 3, min: 0, max: 9999, step: 1 },
    ],
    narrate: (p) => `en campaña bajo ${p.descuento}% (si hay ${p.soloSiStock}+ de stock)`,
    apply: (ctx, p) => {
      if ((ctx.stock || 0) < p.soloSiStock) { note(ctx, 'info', 'Stock insuficiente: campaña no activada.'); return; }
      ctx.price *= (1 - p.descuento / 100); note(ctx, 'ok', `Campaña activa: -${p.descuento}%.`);
    },
  },

  /* ===== DESCUENTOS ===== */
  descuento_volumen: {
    cat: 'descuentos', name: 'Descuento por volumen', icon: 'descuentos',
    desc: 'Baja el precio cuando hay mucho stock para acelerar rotación.',
    params: [
      { key: 'umbral', label: 'Stock desde', type: 'number', unit: 'u', value: 50, min: 0, max: 99999, step: 5 },
      { key: 'descuento', label: 'Descuento', type: 'number', unit: '%', value: 7, min: 0, max: 60, step: 1 },
    ],
    narrate: (p) => `si tengo ${p.umbral}+ de stock, bajo ${p.descuento}%`,
    apply: (ctx, p) => { if ((ctx.stock || 0) >= p.umbral) { ctx.price *= (1 - p.descuento / 100); note(ctx, 'ok', `Descuento por volumen (-${p.descuento}%).`); } },
  },
  liquidacion: {
    cat: 'descuentos', name: 'Liquidación de stock', icon: 'bolt',
    desc: 'Modo agresivo para rematar stock hasta el punto de equilibrio.',
    params: [
      { key: 'descuento', label: 'Descuento', type: 'number', unit: '%', value: 30, min: 0, max: 90, step: 1, slider: true },
      { key: 'hastaMargen', label: 'No perder más de', type: 'number', unit: '%', value: 0, min: -30, max: 40, step: 1 },
    ],
    narrate: (p) => `remato con ${p.descuento}% de descuento (tope: ${p.hastaMargen}% de margen)`,
    apply: (ctx, p) => {
      const conDesc = ctx.price * (1 - p.descuento / 100);
      const limite = priceForMargin(ctx, p.hastaMargen);
      ctx.price = Math.max(conDesc, limite); ctx.floor = Math.min(ctx.floor || Infinity, limite);
      note(ctx, conDesc < limite ? 'warn' : 'ok', `Liquidación: precio a ${money(ctx.price)}.`);
    },
  },

  /* ===== ENVÍOS ===== */
  envio: {
    cat: 'envios', name: 'Costo de envío', icon: 'envios',
    desc: 'Define quién paga el envío. Si lo absorbe el vendedor, baja tu margen.',
    params: [
      { key: 'modo', label: 'Paga', type: 'select', value: 'vendedor', options: [['vendedor', 'el vendedor (gratis)'], ['comprador', 'el comprador'], ['mixto', 'compartido 50/50']] },
      { key: 'costoEnvio', label: 'Costo envío', type: 'number', unit: '$', value: 2500, min: 0, max: 100000, step: 50 },
      { key: 'trasladar', label: 'Sumar el envío al precio', type: 'toggle', value: false },
    ],
    narrate: (p) => p.modo === 'comprador' ? 'el envío lo paga el comprador' : `absorbo ${p.modo === 'mixto' ? 'la mitad del' : 'el'} envío (${money(p.costoEnvio)})${p.trasladar ? ' y lo sumo al precio' : ''}`,
    apply: (ctx, p) => {
      let absorbe = p.modo === 'vendedor' ? p.costoEnvio : (p.modo === 'mixto' ? p.costoEnvio / 2 : 0);
      ctx.shipping = (ctx.shipping || 0) + absorbe;
      if (p.trasladar && absorbe > 0) { ctx.price += absorbe; note(ctx, 'ok', 'Costo de envío trasladado al precio.'); }
      else if (absorbe > 0) note(ctx, 'info', `Absorbés ${money(absorbe)} de envío.`);
    },
  },

  /* ===== CUOTAS ===== */
  cuotas: {
    cat: 'cuotas', name: 'Cuotas sin interés', icon: 'cuotas',
    desc: 'Costo financiero de ofrecer cuotas sin interés.',
    params: [
      { key: 'cuotas', label: 'Cuotas', type: 'select', value: '6', options: [['3', '3 cuotas'], ['6', '6 cuotas'], ['9', '9 cuotas'], ['12', '12 cuotas']] },
      { key: 'costoFin', label: 'Costo financiero', type: 'number', unit: '%', value: 12, min: 0, max: 40, step: 0.5, slider: true },
      { key: 'trasladar', label: 'Trasladar al precio', type: 'toggle', value: true },
    ],
    narrate: (p) => `ofrezco ${p.cuotas} cuotas sin interés (costo ${p.costoFin}%${p.trasladar ? ', al precio' : ', lo absorbo'})`,
    apply: (ctx, p) => {
      if (p.trasladar) { ctx.price *= (1 + p.costoFin / 100); note(ctx, 'ok', `${p.cuotas} cuotas trasladadas al precio.`); }
      else { ctx.installmentPct += p.costoFin; note(ctx, 'info', `Absorbés ${p.costoFin}% por cuotas.`); }
    },
  },

  /* ===== DEVOLUCIONES ===== */
  devoluciones: {
    cat: 'devoluciones', name: 'Reserva por devoluciones', icon: 'devoluciones',
    desc: 'Aparta un % del precio para cubrir devoluciones y cambios.',
    params: [
      { key: 'tasa', label: 'Tasa de devolución', type: 'number', unit: '%', value: 4, min: 0, max: 40, step: 0.5 },
      { key: 'costoGestion', label: 'Costo por devolución', type: 'number', unit: '$', value: 1500, min: 0, max: 100000, step: 50 },
    ],
    narrate: (p) => `reservo ${p.tasa}% para devoluciones y cambios`,
    apply: (ctx, p) => {
      ctx.returnReservePct = (ctx.returnReservePct || 0) + p.tasa;
      ctx.packaging = (ctx.packaging || 0) + (p.costoGestion * p.tasa / 100);
      note(ctx, 'info', `Reservado ${p.tasa}% para devoluciones.`);
    },
  },

  /* ===== CONDICIONES Y REGLAS ===== */
  condicion: {
    cat: 'logica', name: 'Cuando… (condición)', icon: 'logica', container: true,
    desc: 'Bifurca la estrategia: los bloques que pongas ADENTRO se ejecutan según se cumpla o no la condición.',
    params: [
      { key: 'variable', label: '', type: 'select', value: 'stock',
        options: [['stock', 'el stock'], ['competitor', 'el precio del competidor'], ['margen', 'mi margen actual'], ['precio', 'mi precio'], ['visitas', 'las visitas']] },
      { key: 'op', label: '', type: 'select', value: 'lt', options: [['lt', 'es menor a'], ['gt', 'es mayor a'], ['eq', 'es igual a']] },
      { key: 'valor', label: '', type: 'number', unit: '', value: 15, min: -100000, max: 10000000, step: 1 },
    ],
    condText: (p) => `${VAR_LABEL[p.variable] || p.variable} ${OP_LABEL[p.op] || p.op} ${p.valor}`,
    narrate: (p) => `cuando ${BLOCKS.condicion.condText(p)}`,
    branch: (ctx, p) => {
      let v = 0;
      if (p.variable === 'stock') v = ctx.stock || 0;
      else if (p.variable === 'competitor') v = ctx.competitor || 0;
      else if (p.variable === 'margen') v = marginAt(ctx, ctx.price);
      else if (p.variable === 'precio') v = ctx.price;
      else if (p.variable === 'visitas') v = ctx.visits || 0;
      const res = p.op === 'lt' ? v < p.valor : p.op === 'gt' ? v > p.valor : Math.abs(v - p.valor) < 0.5;
      note(ctx, 'info', `Condición "${BLOCKS.condicion.condText(p)}" → ${res ? 'SÍ' : 'NO'}.`);
      return res ? 'si' : 'no';
    },
  },
  regla_stock: {
    cat: 'logica', name: 'Ajuste por stock', icon: 'stock',
    desc: 'Sube el precio con poco stock (escasez) y lo baja con mucho (rotación).',
    params: [
      { key: 'bajoU', label: 'Poco: menos de', type: 'number', unit: 'u', value: 5, min: 0, max: 9999, step: 1 },
      { key: 'bajoAjuste', label: 'subir', type: 'number', unit: '%', value: 5, min: 0, max: 50, step: 1 },
      { key: 'altoU', label: 'Mucho: más de', type: 'number', unit: 'u', value: 100, min: 0, max: 99999, step: 5 },
      { key: 'altoAjuste', label: 'bajar', type: 'number', unit: '%', value: 5, min: 0, max: 50, step: 1 },
    ],
    narrate: (p) => `subo ${p.bajoAjuste}% con menos de ${p.bajoU}u y bajo ${p.altoAjuste}% con más de ${p.altoU}u`,
    apply: (ctx, p) => {
      const s = ctx.stock || 0;
      if (s < p.bajoU) { ctx.price *= (1 + p.bajoAjuste / 100); note(ctx, 'ok', 'Poco stock: precio al alza.'); }
      else if (s > p.altoU) { ctx.price *= (1 - p.altoAjuste / 100); note(ctx, 'ok', 'Mucho stock: precio a la baja.'); }
    },
  },
  regla_horario: {
    cat: 'logica', name: 'Regla por horario', icon: 'clock',
    desc: 'Ajusta el precio en franjas de alta o baja demanda.',
    params: [
      { key: 'franja', label: 'En', type: 'select', value: 'pico', options: [['pico', 'horario pico'], ['valle', 'baja demanda']] },
      { key: 'ajuste', label: 'ajusto', type: 'number', unit: '%', value: 3, min: 0, max: 40, step: 1 },
    ],
    narrate: (p) => `en ${p.franja === 'pico' ? 'horario pico subo' : 'baja demanda bajo'} ${p.ajuste}%`,
    apply: (ctx, p) => { ctx.price *= p.franja === 'pico' ? (1 + p.ajuste / 100) : (1 - p.ajuste / 100); note(ctx, 'info', `Ajuste por horario (${p.franja}).`); },
  },
  redondeo: {
    cat: 'logica', name: 'Redondeo de precio', icon: 'wand',
    desc: 'Redondeo psicológico del precio final.',
    params: [{ key: 'modo', label: 'Redondear', type: 'select', value: 'psy', options: [['psy', 'terminación …990'], ['d100', 'a $100'], ['d1000', 'a $1.000'], ['entero', 'a entero']] }],
    narrate: (p) => `redondeo el precio (${p.modo === 'psy' ? 'terminación …990' : p.modo === 'd100' ? 'a $100' : p.modo === 'd1000' ? 'a $1.000' : 'a entero'})`,
    apply: (ctx, p) => {
      if (p.modo === 'psy') ctx.price = Math.max(0, Math.round(ctx.price / 100) * 100 - 10);
      if (p.modo === 'd100') ctx.price = Math.round(ctx.price / 100) * 100;
      if (p.modo === 'd1000') ctx.price = Math.round(ctx.price / 1000) * 1000;
      if (p.modo === 'entero') ctx.price = Math.round(ctx.price);
    },
  },

  /* ===== ACCIONES ===== */
  fijar_precio: {
    cat: 'accion', name: 'Publicar precio', icon: 'precio',
    desc: 'Publica el precio calculado en Mercado Libre con la frecuencia elegida.',
    params: [{ key: 'frecuencia', label: 'Revisar cada', type: 'select', value: '30', options: [['15', '15 min'], ['30', '30 min'], ['60', '1 hora'], ['360', '6 horas']] }],
    narrate: (p) => `publico el precio y lo reviso cada ${p.frecuencia === '360' ? '6 horas' : p.frecuencia === '60' ? '1 hora' : p.frecuencia + ' min'}`,
    apply: (ctx) => { ctx.final = true; note(ctx, 'ok', `Precio final: ${money(ctx.price)}.`); },
  },
  alerta: {
    cat: 'accion', name: 'Crear alerta', icon: 'alert',
    desc: 'Envía una notificación cuando se cumple una condición.',
    params: [{ key: 'canal', label: 'Por', type: 'select', value: 'push', options: [['push', 'notificación'], ['email', 'email'], ['whatsapp', 'WhatsApp']] }],
    narrate: (p) => `me avisás por ${p.canal}`,
    apply: (ctx) => { note(ctx, 'info', 'Alerta configurada.'); },
  },
};

/* Bloques por categoría (para la paleta) */
function blocksByCat(catKey) {
  const out = Object.entries(BLOCKS).filter(([, b]) => b.cat === catKey).map(([type, b]) => ({ type, ...b }));
  Object.entries(window.CUSTOM_BLOCKS || {}).forEach(([type, b]) => { if (b.cat === catKey) out.push({ type, ...b }); });
  return out;
}
function blockDef(type) { return BLOCKS[type] || (window.CUSTOM_BLOCKS && window.CUSTOM_BLOCKS[type]); }
