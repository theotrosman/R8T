/* ============================================================
   R8T · blocks.js  (v3)
   Registro de bloques del repricer. Todo desde la óptica del VENDEDOR.
   - tarjeta-frase con controles en línea (números con unidad % ↔ $ conmutable)
   - narrate(): frase en lenguaje natural → barra de explicación
   - apply(ctx,p) transforma el contexto de precio; branch() para condiciones
   ============================================================ */

/* ---------- Helpers de cálculo ---------- */
function variablePct(ctx) {
  return (ctx.commissionPct || 0) + (ctx.iibbPct || 0) + (ctx.taxExtraPct || 0)
       + (ctx.installmentPct || 0) + (ctx.promoPct || 0) + (ctx.returnReservePct || 0)
       + (ctx.retencionPct || 0);
}
function fixedCost(ctx) { return (ctx.cost || 0) + (ctx.fixedFee || 0) + (ctx.shipping || 0) + (ctx.packaging || 0); }
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

/* Convierte un valor con unidad (% o $) a pesos, según la base dada */
function amt(p, key, base) { const u = p[key + 'Unit'] || '$'; const v = +p[key] || 0; return u === '%' ? base * (v / 100) : v; }
/* Muestra un valor con su unidad como texto */
function umt(p, key) { const u = p[key + 'Unit'] || '$'; const v = +p[key] || 0; return u === '%' ? `${v}%` : money(v); }
/* Frecuencia legible a partir de minutos */
function freqTxt(min) { const m = +min; if (m < 60) return `${m} min`; if (m < 1440) return `${m / 60} h`.replace('.5', '½'); return `${m / 1440} día${m / 1440 > 1 ? 's' : ''}`; }
const FREQ_OPTS = [['5', 'cada 5 min'], ['15', 'cada 15 min'], ['30', 'cada 30 min'], ['60', 'cada 1 hora'], ['120', 'cada 2 horas'], ['180', 'cada 3 horas'], ['360', 'cada 6 horas'], ['720', 'cada 12 horas'], ['1440', 'cada 1 día'], ['2880', 'cada 2 días']];

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

/* Variables y operadores para condiciones */
const VAR_LABEL = { stock: 'el stock', competitor: 'el precio del competidor', dif_competidor: 'mi diferencia % con el competidor', margen: 'mi margen actual', precio: 'mi precio', visitas: 'las visitas', costo: 'mi costo', competidores: 'la cantidad de competidores', dias_sin_venta: 'los días sin vender', ventas_semana: 'las ventas de la semana', reputacion: 'mi reputación' };
const VAR_OPTS = [['dif_competidor', 'mi diferencia % con el competidor'], ['competitor', 'el precio del competidor'], ['margen', 'mi margen actual'], ['precio', 'mi precio'], ['costo', 'mi costo'], ['stock', 'el stock'], ['reputacion', 'mi reputación (%)'], ['visitas', 'las visitas'], ['competidores', 'cantidad de competidores'], ['dias_sin_venta', 'días sin vender'], ['ventas_semana', 'ventas de la semana']];
const OP_LABEL = { lt: 'es menor a', lte: 'es menor o igual a', gt: 'es mayor a', gte: 'es mayor o igual a', eq: 'es igual a', neq: 'es distinto de', absgt: 'difiere en más de (±)', abslt: 'está dentro de (±)' };
const OP_OPTS = [['gt', 'es mayor a'], ['lt', 'es menor a'], ['gte', 'es mayor o igual a'], ['lte', 'es menor o igual a'], ['eq', 'es igual a'], ['neq', 'es distinto de'], ['absgt', 'difiere en más de (±)'], ['abslt', 'está dentro de (±)']];
function condValue(ctx, v) {
  switch (v) {
    case 'stock': return ctx.stock || 0;
    case 'competitor': return ctx.competitor || 0;
    case 'dif_competidor': return ctx.competitor ? ((ctx.price - ctx.competitor) / ctx.competitor) * 100 : 0;
    case 'margen': return marginAt(ctx, ctx.price);
    case 'precio': return ctx.price;
    case 'costo': return ctx.cost || 0;
    case 'visitas': return ctx.visits || 0;
    case 'competidores': return ctx.competitors || 0;
    case 'dias_sin_venta': return ctx.daysNoSale || 0;
    case 'ventas_semana': return ctx.salesWeek || 0;
    case 'reputacion': return ctx.reputation != null ? ctx.reputation : 100;
  }
  return 0;
}
function condCmp(op, a, b) {
  switch (op) {
    case 'lt': return a < b; case 'lte': return a <= b; case 'gt': return a > b; case 'gte': return a >= b;
    case 'eq': return Math.abs(a - b) < 0.5; case 'neq': return Math.abs(a - b) >= 0.5;
    case 'absgt': return Math.abs(a) > b; case 'abslt': return Math.abs(a) <= b;
  }
  return false;
}
function condText(p) { return `${VAR_LABEL[p.variable] || p.variable} ${OP_LABEL[p.op] || p.op} ${p.valor}${(p.variable === 'dif_competidor' || p.variable === 'reputacion') ? '%' : ''}`; }
// Condición con segunda cláusula opcional combinada (Y / O)
function condTextFull(p) {
  let t = condText(p);
  if (p.combinar && p.combinar !== 'no') t += (p.combinar === 'y' ? ' Y ' : ' O ') + condText({ variable: p.variable2, op: p.op2, valor: p.valor2 });
  return t;
}
function evalCond(ctx, p) {
  const r1 = condCmp(p.op, condValue(ctx, p.variable), +p.valor);
  if (!p.combinar || p.combinar === 'no') return r1;
  const r2 = condCmp(p.op2, condValue(ctx, p.variable2), +p.valor2);
  return p.combinar === 'y' ? (r1 && r2) : (r1 || r2);
}

/* ---------- Bloques ---------- */
const BLOCKS = {

  /* ===== COMPETENCIA ===== */
  igualar_competencia: {
    cat: 'competencia', name: 'Igualar / superar competencia', icon: 'competencia',
    desc: 'Ajusta tu precio en relación al competidor de referencia (o al ganador del BuyBox).',
    params: [
      { key: 'modo', label: 'Quedar', type: 'select', value: 'debajo', options: [['igualar', 'igualando al competidor'], ['debajo', 'por debajo'], ['encima', 'por encima']] },
      { key: 'offset', label: 'Diferencia', type: 'number', units: ['$', '%'], value: 50, min: 0, max: 10000000, step: 10 },
      { key: 'respetarPiso', label: 'Nunca perforar mi piso', type: 'toggle', value: true },
    ],
    narrate: (p) => p.modo === 'igualar' ? 'igualo mi precio al del competidor' : `me pongo ${umt(p, 'offset')} ${p.modo === 'debajo' ? 'por debajo' : 'por encima'} del competidor`,
    apply: (ctx, p) => {
      if (!ctx.competitor) { note(ctx, 'info', 'Sin precio de competidor: bloque omitido.'); return; }
      const off = amt(p, 'offset', ctx.competitor);
      let target = ctx.competitor + (p.modo === 'debajo' ? -off : p.modo === 'encima' ? off : 0);
      if (p.respetarPiso && ctx.floor && target < ctx.floor) { target = ctx.floor; note(ctx, 'warn', 'El competidor está por debajo de tu piso: se frenó en el piso.'); }
      else note(ctx, 'ok', `Posicionado respecto al competidor (${money(ctx.competitor)}).`);
      ctx.price = target;
    },
  },
  ganar_buybox: {
    cat: 'competencia', name: 'Ganar el BuyBox', icon: 'target',
    desc: 'Intenta ganar el catálogo quedando apenas por debajo del ganador, sin perforar tu piso.',
    params: [
      { key: 'delta', label: 'Ganar por', type: 'number', units: ['$', '%'], value: 20, min: 1, max: 10000000, step: 5 },
      { key: 'maxIntentos', label: 'Bajar como máximo', type: 'number', unit: '%', value: 8, min: 0, max: 50, step: 1 },
    ],
    narrate: (p) => `quedo ${umt(p, 'delta')} debajo del BuyBox (bajando ${p.maxIntentos}% como máximo)`,
    apply: (ctx, p) => {
      if (!ctx.competitor) { note(ctx, 'info', 'Sin BuyBox de referencia.'); return; }
      let target = ctx.competitor - amt(p, 'delta', ctx.competitor);
      target = Math.max(target, ctx.price * (1 - p.maxIntentos / 100));
      if (ctx.floor) target = Math.max(target, ctx.floor);
      ctx.price = target;
      note(ctx, ctx.price <= ctx.competitor ? 'ok' : 'warn', ctx.price <= ctx.competitor ? `Precio competitivo para el BuyBox (${money(ctx.price)}).` : 'No se pudo superar al BuyBox sin perder rentabilidad.');
    },
  },

  /* ===== MÁRGENES ===== */
  margen_objetivo: {
    cat: 'margen', name: 'Margen objetivo', icon: 'margen',
    desc: 'Calcula el precio para lograr el margen neto que querés, con todos los costos e impuestos.',
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
    desc: 'Red de seguridad: margen MÍNIMO aceptable. Ningún bloque puede perforarlo.',
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
      { key: 'max', label: 'No superar', type: 'number', units: ['%', '$'], value: 45, min: 0, max: 100000000, step: 1 },
    ],
    narrate: (p) => (p.maxUnit === '$') ? `no supero ${money(p.max)}` : `no supero el ${p.max}% de margen`,
    apply: (ctx, p) => {
      ctx.ceiling = (p.maxUnit === '$') ? p.max : priceForMargin(ctx, p.max);
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
    desc: 'Packaging, almacenamiento y gastos operativos (los paga el vendedor).',
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
  impuesto_importacion: {
    cat: 'impuestos', name: 'Impuestos de importación / divisas', icon: 'wand',
    desc: 'Para productos importados: derechos de importación, tasa estadística y percepción por compra de divisas. Encarecen tu costo.',
    params: [
      { key: 'derechos', label: 'Derechos de importación', type: 'number', unit: '%', value: 16, min: 0, max: 100, step: 0.5 },
      { key: 'estadistica', label: 'Tasa estadística', type: 'number', unit: '%', value: 3, min: 0, max: 20, step: 0.5 },
      { key: 'divisa', label: 'Percepción por divisas', type: 'number', unit: '%', value: 30, min: 0, max: 100, step: 1 },
    ],
    narrate: (p) => `sumo impuestos de importación al costo (derechos ${p.derechos}%, divisas ${p.divisa}%)`,
    apply: (ctx, p) => {
      const inc = (p.derechos + p.estadistica + p.divisa) / 100;
      ctx.cost = (ctx.cost || 0) * (1 + inc);
      note(ctx, 'info', `Costo encarecido ${(inc * 100).toFixed(0)}% por importación/divisas.`);
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
    desc: 'Aplica un descuento respetando un margen mínimo durante la promo.',
    params: [
      { key: 'descuento', label: 'Descuento', type: 'number', units: ['%', '$'], value: 15, min: 0, max: 10000000, step: 1 },
      { key: 'pisoPromo', label: 'Margen mín. en promo', type: 'number', unit: '%', value: 5, min: -20, max: 60, step: 1 },
    ],
    narrate: (p) => `aplico ${umt(p, 'descuento')} de descuento (sin bajar del ${p.pisoPromo}% de margen)`,
    apply: (ctx, p) => {
      const conDesc = ctx.price - amt(p, 'descuento', ctx.price);
      const pisoPromo = priceForMargin(ctx, p.pisoPromo);
      ctx.price = Math.max(conDesc, pisoPromo);
      note(ctx, conDesc < pisoPromo ? 'warn' : 'ok', conDesc < pisoPromo ? 'Descuento recortado por margen mínimo de promo.' : `Promoción aplicada (${umt(p, 'descuento')}).`);
    },
  },
  campana: {
    cat: 'promos', name: 'Campaña / Oferta del día', icon: 'rocket',
    desc: 'Descuento para campañas puntuales (Hot Sale, Oferta del día).',
    params: [
      { key: 'descuento', label: 'Descuento', type: 'number', units: ['%', '$'], value: 20, min: 0, max: 10000000, step: 1 },
      { key: 'soloSiStock', label: 'Stock mínimo', type: 'number', unit: 'u', value: 3, min: 0, max: 9999, step: 1 },
    ],
    narrate: (p) => `en campaña bajo ${umt(p, 'descuento')} (si hay ${p.soloSiStock}+ de stock)`,
    apply: (ctx, p) => {
      if ((ctx.stock || 0) < p.soloSiStock) { note(ctx, 'info', 'Stock insuficiente: campaña no activada.'); return; }
      ctx.price -= amt(p, 'descuento', ctx.price); note(ctx, 'ok', `Campaña activa: -${umt(p, 'descuento')}.`);
    },
  },

  /* ===== DESCUENTOS ===== */
  descuento_volumen: {
    cat: 'descuentos', name: 'Descuento por volumen', icon: 'descuentos',
    desc: 'Baja el precio cuando hay mucho stock para acelerar rotación.',
    params: [
      { key: 'umbral', label: 'Stock desde', type: 'number', unit: 'u', value: 50, min: 0, max: 99999, step: 5 },
      { key: 'descuento', label: 'Descuento', type: 'number', units: ['%', '$'], value: 7, min: 0, max: 10000000, step: 1 },
    ],
    narrate: (p) => `si tengo ${p.umbral}+ de stock, bajo ${umt(p, 'descuento')}`,
    apply: (ctx, p) => { if ((ctx.stock || 0) >= p.umbral) { ctx.price -= amt(p, 'descuento', ctx.price); note(ctx, 'ok', `Descuento por volumen (-${umt(p, 'descuento')}).`); } },
  },
  liquidacion: {
    cat: 'descuentos', name: 'Liquidación de stock', icon: 'bolt',
    desc: 'Modo agresivo para rematar stock hasta el punto de equilibrio.',
    params: [
      { key: 'descuento', label: 'Descuento', type: 'number', units: ['%', '$'], value: 30, min: 0, max: 10000000, step: 1 },
      { key: 'hastaMargen', label: 'No perder más de', type: 'number', unit: '%', value: 0, min: -30, max: 40, step: 1 },
    ],
    narrate: (p) => `remato con ${umt(p, 'descuento')} de descuento (tope: ${p.hastaMargen}% de margen)`,
    apply: (ctx, p) => {
      const conDesc = ctx.price - amt(p, 'descuento', ctx.price);
      const limite = priceForMargin(ctx, p.hastaMargen);
      ctx.price = Math.max(conDesc, limite); ctx.floor = Math.min(ctx.floor || Infinity, limite);
      note(ctx, conDesc < limite ? 'warn' : 'ok', `Liquidación: precio a ${money(ctx.price)}.`);
    },
  },

  /* ===== ENVÍOS ===== */
  envio: {
    cat: 'envios', name: 'Costo de envío', icon: 'envios',
    desc: 'Quién paga el envío. Si lo pagás vos (envío gratis para el comprador), te sale MÁS caro y baja tu margen.',
    params: [
      { key: 'modo', label: 'Lo paga', type: 'select', value: 'vendedor', options: [['vendedor', 'yo (gratis para el comprador)'], ['comprador', 'el comprador'], ['mixto', 'lo compartimos 50/50']] },
      { key: 'costoEnvio', label: 'Costo del envío', type: 'number', unit: '$', value: 2500, min: 0, max: 100000, step: 50 },
      { key: 'trasladar', label: 'Sumar el envío al precio', type: 'toggle', value: false },
    ],
    narrate: (p) => p.modo === 'comprador' ? 'el envío lo paga el comprador' : `pago ${p.modo === 'mixto' ? 'la mitad del' : 'el'} envío (${money(p.modo === 'mixto' ? p.costoEnvio / 2 : p.costoEnvio)})${p.trasladar ? ' y lo sumo al precio' : ', me sale de mi margen'}`,
    apply: (ctx, p) => {
      const absorbe = p.modo === 'vendedor' ? p.costoEnvio : (p.modo === 'mixto' ? p.costoEnvio / 2 : 0);
      ctx.shipping = (ctx.shipping || 0) + absorbe;
      if (p.trasladar && absorbe > 0) { ctx.price += absorbe; note(ctx, 'ok', 'Costo de envío trasladado al precio.'); }
      else if (absorbe > 0) note(ctx, 'info', `Te sale ${money(absorbe)} de tu bolsillo por envío.`);
    },
  },

  /* ===== CUOTAS ===== */
  cuotas: {
    cat: 'cuotas', name: 'Cuotas sin interés', icon: 'cuotas',
    desc: 'Costo financiero de ofrecer cuotas sin interés (lo paga el vendedor).',
    params: [
      { key: 'cuotas', label: 'Cuotas', type: 'select', value: '6', options: [['3', '3 cuotas'], ['6', '6 cuotas'], ['9', '9 cuotas'], ['12', '12 cuotas']] },
      { key: 'costoFin', label: 'Costo financiero', type: 'number', unit: '%', value: 12, min: 0, max: 40, step: 0.5, slider: true },
      { key: 'trasladar', label: 'Trasladar al precio', type: 'toggle', value: true },
    ],
    narrate: (p) => `ofrezco ${p.cuotas} cuotas sin interés (costo ${p.costoFin}%${p.trasladar ? ', al precio' : ', lo pago yo'})`,
    apply: (ctx, p) => {
      if (p.trasladar) { ctx.price *= (1 + p.costoFin / 100); note(ctx, 'ok', `${p.cuotas} cuotas trasladadas al precio.`); }
      else { ctx.installmentPct += p.costoFin; note(ctx, 'info', `Pagás ${p.costoFin}% por cuotas.`); }
    },
  },

  /* ===== DEVOLUCIONES ===== */
  devoluciones: {
    cat: 'devoluciones', name: 'Reserva por devoluciones', icon: 'devoluciones',
    desc: 'Aparta un % del precio para cubrir devoluciones y cambios (los paga el vendedor).',
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
    cat: 'logica', name: 'Cuando… (condición)', icon: 'logica', container: true, headWord: 'Cuando',
    slots: [{ id: 'si', label: 'Entonces', tone: 'ok' }, { id: 'no', label: 'Si no', tone: 'muted' }],
    desc: 'Bifurca la estrategia: los bloques ADENTRO se ejecutan según se cumpla o no la condición. Ej: "cuando mi diferencia con el competidor difiere en más de ±15%".',
    params: [
      { key: 'variable', label: '', type: 'select', value: 'dif_competidor', options: VAR_OPTS },
      { key: 'op', label: '', type: 'select', value: 'absgt', options: OP_OPTS },
      { key: 'valor', label: '', type: 'number', unit: '', value: 15, min: -100000, max: 100000000, step: 1 },
      { key: 'combinar', label: '', type: 'select', value: 'no', options: [['no', '(una condición)'], ['y', 'Y (las dos)'], ['o', 'O (alguna)']] },
      { key: 'variable2', label: '', type: 'select', value: 'stock', options: VAR_OPTS, showIf: (p) => p.combinar && p.combinar !== 'no' },
      { key: 'op2', label: '', type: 'select', value: 'lt', options: OP_OPTS, showIf: (p) => p.combinar && p.combinar !== 'no' },
      { key: 'valor2', label: '', type: 'number', unit: '', value: 5, min: -100000, max: 100000000, step: 1, showIf: (p) => p.combinar && p.combinar !== 'no' },
    ],
    condText: (p) => condTextFull(p),
    narrate: (p) => `cuando ${condTextFull(p)}`,
    narrateContainer: (p, ds) => { const si = ds('si'), no = ds('no'); let t = `cuando ${condTextFull(p)}, ${si || 'no hago nada'}`; if (no) t += `; si no, ${no}`; return t; },
    exec: (ctx, p, run) => { const r = evalCond(ctx, p); note(ctx, 'info', `Condición "${condTextFull(p)}" → ${r ? 'SÍ' : 'NO'}.`); run(r ? 'si' : 'no'); },
  },
  repetir_mientras: {
    cat: 'logica', name: 'Repetir mientras se cumpla', icon: 'logica', container: true, headWord: 'Mientras',
    slots: [{ id: 'do', label: 'Repetir', tone: 'accent' }],
    desc: 'Repite los bloques de adentro MIENTRAS se cumpla la condición (con un tope de repeticiones por seguridad).',
    params: [
      { key: 'variable', label: '', type: 'select', value: 'margen', options: VAR_OPTS },
      { key: 'op', label: '', type: 'select', value: 'gt', options: OP_OPTS },
      { key: 'valor', label: '', type: 'number', unit: '', value: 40, min: -100000, max: 100000000, step: 1 },
      { key: 'combinar', label: '', type: 'select', value: 'no', options: [['no', '(una condición)'], ['y', 'Y (las dos)'], ['o', 'O (alguna)']] },
      { key: 'variable2', label: '', type: 'select', value: 'stock', options: VAR_OPTS, showIf: (p) => p.combinar && p.combinar !== 'no' },
      { key: 'op2', label: '', type: 'select', value: 'gt', options: OP_OPTS, showIf: (p) => p.combinar && p.combinar !== 'no' },
      { key: 'valor2', label: '', type: 'number', unit: '', value: 0, min: -100000, max: 100000000, step: 1, showIf: (p) => p.combinar && p.combinar !== 'no' },
      { key: 'maxIter', label: 'máx.', type: 'number', unit: 'x', value: 5, min: 1, max: 50, step: 1 },
    ],
    narrate: (p) => `mientras ${condTextFull(p)}`,
    narrateContainer: (p, ds) => `mientras ${condTextFull(p)}, repito: ${ds('do') || '(vacío)'}`,
    exec: (ctx, p, run) => { let i = 0; const max = Math.min(+p.maxIter || 5, 50); while (evalCond(ctx, p) && i < max) { run('do'); i++; } note(ctx, 'info', `"Mientras ${condTextFull(p)}" corrió ${i} vez/veces.`); },
  },
  repetir_n: {
    cat: 'logica', name: 'Repetir varias veces', icon: 'logica', container: true, headWord: 'Repetir',
    slots: [{ id: 'do', label: 'Repetir', tone: 'accent' }],
    desc: 'Ejecuta los bloques de adentro una cantidad fija de veces.',
    params: [{ key: 'veces', label: '', type: 'number', unit: 'veces', value: 3, min: 1, max: 100, step: 1 }],
    narrate: (p) => `repito ${p.veces} veces`,
    narrateContainer: (p, ds) => `repito ${p.veces} veces: ${ds('do') || '(vacío)'}`,
    exec: (ctx, p, run) => { const n = Math.min(+p.veces || 1, 100); for (let i = 0; i < n; i++) run('do'); },
  },
  regla_stock: {
    cat: 'logica', name: 'Ajustar precio por stock', icon: 'stock',
    desc: 'Con poco stock (escasez) conviene subir el precio; con mucho stock (para rotar) conviene bajarlo.',
    params: [
      { key: 'bajoU', label: 'Si me queda menos de', type: 'number', unit: 'u', value: 5, min: 0, max: 9999, step: 1 },
      { key: 'bajoAjuste', label: '→ subir el precio', type: 'number', units: ['%', '$'], value: 5, min: 0, max: 10000000, step: 1 },
      { key: 'altoU', label: 'Si tengo más de', type: 'number', unit: 'u', value: 100, min: 0, max: 99999, step: 5 },
      { key: 'altoAjuste', label: '→ bajar el precio', type: 'number', units: ['%', '$'], value: 5, min: 0, max: 10000000, step: 1 },
    ],
    narrate: (p) => `si me queda menos de ${p.bajoU}u subo ${umt(p, 'bajoAjuste')}, y si tengo más de ${p.altoU}u bajo ${umt(p, 'altoAjuste')}`,
    apply: (ctx, p) => {
      const s = ctx.stock || 0;
      if (s < p.bajoU) { ctx.price += amt(p, 'bajoAjuste', ctx.price); note(ctx, 'ok', 'Poco stock: precio al alza.'); }
      else if (s > p.altoU) { ctx.price -= amt(p, 'altoAjuste', ctx.price); note(ctx, 'ok', 'Mucho stock: precio a la baja.'); }
    },
  },
  regla_horario: {
    cat: 'logica', name: 'Regla por horario', icon: 'clock',
    desc: 'Ajusta el precio en franjas de alta o baja demanda.',
    params: [
      { key: 'franja', label: 'En', type: 'select', value: 'pico', options: [['pico', 'horario pico'], ['valle', 'baja demanda']] },
      { key: 'ajuste', label: 'ajusto', type: 'number', units: ['%', '$'], value: 3, min: 0, max: 10000000, step: 1 },
    ],
    narrate: (p) => `en ${p.franja === 'pico' ? 'horario pico subo' : 'baja demanda bajo'} ${umt(p, 'ajuste')}`,
    apply: (ctx, p) => { const d = amt(p, 'ajuste', ctx.price); ctx.price += p.franja === 'pico' ? d : -d; note(ctx, 'info', `Ajuste por horario (${p.franja}).`); },
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
    desc: 'Publica el precio calculado en Mercado Libre y lo revisa con la frecuencia elegida.',
    params: [{ key: 'frecuencia', label: 'Revisar', type: 'select', value: '360', options: FREQ_OPTS }],
    narrate: (p) => `publico el precio y lo reviso ${(FREQ_OPTS.find(o => o[0] === String(p.frecuencia)) || ['', 'seguido'])[1]}`,
    apply: (ctx) => { ctx.final = true; note(ctx, 'ok', `Precio final: ${money(ctx.price)}.`); },
  },
  pausar: {
    cat: 'accion', name: 'Pausar publicación', icon: 'lock',
    desc: 'Frena la publicación (temporal o definitivamente). Útil dentro de una condición: “si pasa X, pauso”.',
    params: [
      { key: 'modo', label: 'Pausar', type: 'select', value: 'temporal', options: [['temporal', 'temporalmente'], ['definitivo', 'definitivamente']] },
      { key: 'mail', label: 'Avisarme por mail', type: 'toggle', value: true },
    ],
    narrate: (p) => `pauso la publicación ${p.modo === 'temporal' ? 'temporalmente' : 'definitivamente'}${p.mail ? ' y te aviso por mail' : ''}`,
    apply: (ctx, p) => { ctx.paused = p.modo; note(ctx, 'bad', `Publicación pausada ${p.modo === 'temporal' ? 'temporalmente' : 'definitivamente'}.`); if (p.mail) note(ctx, 'info', 'Se envía aviso por mail.'); },
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
