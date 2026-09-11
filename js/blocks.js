/* ============================================================
   R8T · blocks.js
   Registro de TODOS los bloques del repricer.
   Cada bloque define: categoría, puertos, parámetros editables
   (números que el usuario cambia cuanto quiera) y una función
   apply(ctx, p) que transforma el "contexto de precio".

   Variables cubiertas (inspirado en Zentor / Foxie / MargenFull):
   costo, comisión ML, costo fijo, IVA, IIBB, retenciones/percepciones,
   cambios de impuestos, envío, cuotas sin interés, promociones,
   descuentos, liquidación, devoluciones, buybox/competencia,
   stock, demanda, horario, redondeo psicológico, piso/techo.
   ============================================================ */

/* ---------- Helpers de cálculo (compartidos por los bloques) ---------- */
// % de costos que se calculan sobre el precio de venta
function variablePct(ctx) {
  return (ctx.commissionPct || 0) + (ctx.iibbPct || 0) + (ctx.taxExtraPct || 0)
       + (ctx.installmentPct || 0) + (ctx.promoPct || 0) + (ctx.returnReservePct || 0)
       + (ctx.retencionPct || 0);
}
// costos fijos por unidad ($)
function fixedCost(ctx) {
  return (ctx.cost || 0) + (ctx.fixedFee || 0) + (ctx.shipping || 0) + (ctx.packaging || 0);
}
// margen neto (%) a un precio dado
function marginAt(ctx, price) {
  if (!price || price <= 0) return -100;
  const net = price - price * (variablePct(ctx) / 100) - fixedCost(ctx);
  return (net / price) * 100;
}
// precio necesario para lograr cierto margen (%)
function priceForMargin(ctx, marginPct) {
  const denom = 1 - (variablePct(ctx) + marginPct) / 100;
  if (denom <= 0.02) return fixedCost(ctx) * 4; // margen imposible → techo alto
  return fixedCost(ctx) / denom;
}
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function money(n) { return '$' + Math.round(n).toLocaleString('es-AR'); }
function note(ctx, level, text) { ctx.notes.push({ level, text }); }

/* ---------- Metadatos de categorías ---------- */
const CATS = [
  { key: 'producto',    name: 'Inicio',        icon: 'producto',    color: 'var(--cat-producto)' },
  { key: 'competencia', name: 'Competencia',   icon: 'competencia', color: 'var(--cat-competencia)' },
  { key: 'margen',      name: 'Márgenes',      icon: 'margen',      color: 'var(--cat-margen)' },
  { key: 'costos',      name: 'Costos',        icon: 'costos',      color: 'var(--cat-costos)' },
  { key: 'impuestos',   name: 'Impuestos',     icon: 'impuestos',   color: 'var(--cat-impuestos)' },
  { key: 'promos',      name: 'Promociones',   icon: 'promos',      color: 'var(--cat-promos)' },
  { key: 'descuentos',  name: 'Descuentos',    icon: 'descuentos',  color: 'var(--cat-descuentos)' },
  { key: 'envios',      name: 'Envíos',        icon: 'envios',      color: 'var(--cat-envios)' },
  { key: 'cuotas',      name: 'Cuotas',        icon: 'cuotas',      color: 'var(--cat-cuotas)' },
  { key: 'devoluciones',name: 'Devoluciones',  icon: 'devoluciones',color: 'var(--cat-devoluciones)' },
  { key: 'logica',      name: 'Lógica y reglas',icon: 'logica',     color: 'var(--cat-logica)' },
  { key: 'accion',      name: 'Acciones',      icon: 'accion',      color: 'var(--cat-accion)' },
];
const CAT_MAP = Object.fromEntries(CATS.map(c => [c.key, c]));

/* ---------- Definición de bloques ---------- */
const BLOCKS = {

  /* ===== INICIO ===== */
  producto: {
    cat: 'producto', name: 'Producto', icon: 'producto',
    desc: 'Punto de inicio de la estrategia. Toma el producto real (costo, precio actual, stock y precio del competidor) desde la simulación. Conectá bloques a su salida.',
    inputs: 0, outputs: [{ id: 'out' }],
    params: [],
    summary: (p, ctx) => ctx ? [['Costo', money(ctx.cost)], ['Precio', money(ctx.basePrice)], ['Stock', (ctx.stock||0)+' u']] : [['Producto', 'de muestra']],
    apply: () => {},
  },

  /* ===== COMPETENCIA ===== */
  igualar_competencia: {
    cat: 'competencia', name: 'Igualar / superar competencia', icon: 'competencia',
    desc: 'Ajusta tu precio en relación al competidor de referencia (o al ganador del BuyBox).',
    inputs: 1, outputs: [{ id: 'out' }],
    params: [
      { key: 'modo', label: 'Estrategia', type: 'select', value: 'debajo',
        options: [['igualar', 'Igualar precio'], ['debajo', 'Quedar por debajo'], ['encima', 'Quedar por encima']] },
      { key: 'offset', label: 'Diferencia', type: 'number', unit: '$', value: 50, min: 0, max: 100000, step: 10,
        hint: 'Cuánto por debajo/encima del competidor.' },
      { key: 'respetarPiso', label: 'Nunca bajar del piso de rentabilidad', type: 'toggle', value: true },
    ],
    summary: (p) => [[p.modo === 'igualar' ? 'Igualar' : (p.modo === 'debajo' ? 'Debajo' : 'Encima'), p.modo === 'igualar' ? '=' : money(p.offset)]],
    apply: (ctx, p) => {
      if (!ctx.competitor) { note(ctx, 'info', 'Sin precio de competidor: bloque omitido.'); return; }
      let target = ctx.competitor;
      if (p.modo === 'debajo') target = ctx.competitor - p.offset;
      if (p.modo === 'encima') target = ctx.competitor + p.offset;
      if (p.respetarPiso && ctx.floor && target < ctx.floor) {
        target = ctx.floor;
        note(ctx, 'warn', 'El competidor está por debajo de tu piso: se frenó en el piso.');
      } else {
        note(ctx, 'ok', `Posicionado ${p.modo} del competidor (${money(ctx.competitor)}).`);
      }
      ctx.price = target;
    },
  },
  ganar_buybox: {
    cat: 'competencia', name: 'Ganar el BuyBox', icon: 'target',
    desc: 'Intenta ganar el catálogo/BuyBox quedando apenas por debajo del ganador actual, sin perforar tu piso de rentabilidad.',
    inputs: 1, outputs: [{ id: 'out' }],
    params: [
      { key: 'delta', label: 'Ganar por', type: 'number', unit: '$', value: 20, min: 1, max: 10000, step: 5 },
      { key: 'maxIntentos', label: 'Bajar como máximo', type: 'number', unit: '%', value: 8, min: 0, max: 50, step: 1,
        hint: 'Recorte máximo permitido respecto al precio actual.' },
    ],
    summary: (p) => [['Ganar por', money(p.delta)], ['Máx. baja', p.maxIntentos + '%']],
    apply: (ctx, p) => {
      if (!ctx.competitor) { note(ctx, 'info', 'Sin BuyBox de referencia.'); return; }
      let target = ctx.competitor - p.delta;                 // quedar apenas por debajo
      const maxBaja = ctx.price * (1 - p.maxIntentos / 100); // no recortar más de lo permitido
      target = Math.max(target, maxBaja);
      if (ctx.floor) target = Math.max(target, ctx.floor);   // nunca por debajo del piso
      ctx.price = target;
      if (ctx.price <= ctx.competitor) note(ctx, 'ok', `Precio a ${money(ctx.price)}: competitivo para el BuyBox.`);
      else note(ctx, 'warn', 'No se pudo superar al BuyBox sin perder rentabilidad.');
    },
  },

  /* ===== MÁRGENES ===== */
  margen_objetivo: {
    cat: 'margen', name: 'Margen objetivo', icon: 'margen',
    desc: 'Calcula el precio para lograr el margen neto que querés, considerando todos los costos e impuestos cargados.',
    inputs: 1, outputs: [{ id: 'out' }],
    params: [
      { key: 'target', label: 'Margen objetivo', type: 'number', unit: '%', value: 25, min: -20, max: 90, step: 1, slider: true },
      { key: 'modo', label: 'Aplicación', type: 'select', value: 'fijar',
        options: [['fijar', 'Fijar precio al objetivo'], ['minimo', 'Solo si queda por encima']] },
    ],
    summary: (p) => [['Objetivo', p.target + '%']],
    apply: (ctx, p) => {
      const target = priceForMargin(ctx, p.target);
      if (p.modo === 'fijar') { ctx.price = target; note(ctx, 'ok', `Precio calculado para ${p.target}% de margen.`); }
      else if (ctx.price < target) { ctx.price = target; note(ctx, 'warn', `Se subió el precio para alcanzar ${p.target}%.`); }
      ctx.targetMarginPct = p.target;
    },
  },
  piso_rentabilidad: {
    cat: 'margen', name: 'Piso de rentabilidad', icon: 'shield',
    desc: 'Red de seguridad: define el margen MÍNIMO aceptable. Si el precio cae por debajo, se frena ahí. Ningún bloque podrá perforarlo.',
    inputs: 1, outputs: [{ id: 'out' }],
    params: [
      { key: 'min', label: 'Margen mínimo', type: 'number', unit: '%', value: 8, min: -30, max: 80, step: 1, slider: true },
    ],
    summary: (p) => [['Mínimo', p.min + '%']],
    apply: (ctx, p) => {
      ctx.floor = priceForMargin(ctx, p.min);
      ctx.minMarginPct = p.min;
      if (ctx.price < ctx.floor) { ctx.price = ctx.floor; note(ctx, 'warn', `Precio elevado al piso (${p.min}% margen).`); }
      else note(ctx, 'ok', `Piso de rentabilidad fijado en ${money(ctx.floor)}.`);
    },
  },
  techo_precio: {
    cat: 'margen', name: 'Techo de precio', icon: 'scale',
    desc: 'Límite superior de precio para no espantar al comprador ni salirte de mercado.',
    inputs: 1, outputs: [{ id: 'out' }],
    params: [
      { key: 'modo', label: 'Definir por', type: 'select', value: 'margen', options: [['margen', 'Margen máximo'], ['pesos', 'Precio máximo ($)']] },
      { key: 'max', label: 'Valor', type: 'number', unit: '%', value: 45, min: 0, max: 500, step: 1 },
    ],
    summary: (p) => [['Techo', p.modo === 'margen' ? p.max + '%' : money(p.max)]],
    apply: (ctx, p) => {
      ctx.ceiling = p.modo === 'margen' ? priceForMargin(ctx, p.max) : p.max;
      if (ctx.price > ctx.ceiling) { ctx.price = ctx.ceiling; note(ctx, 'info', 'Precio limitado por el techo.'); }
    },
  },

  /* ===== COSTOS ===== */
  comision_ml: {
    cat: 'costos', name: 'Comisión Mercado Libre', icon: 'costos',
    desc: 'Comisión por categoría + costo fijo por venta que cobra Mercado Libre. Base de cualquier cálculo de rentabilidad.',
    inputs: 1, outputs: [{ id: 'out' }],
    params: [
      { key: 'comision', label: 'Comisión por categoría', type: 'number', unit: '%', value: 13, min: 0, max: 40, step: 0.5, slider: true },
      { key: 'costoFijo', label: 'Costo fijo por venta', type: 'number', unit: '$', value: 1095, min: 0, max: 20000, step: 5,
        hint: 'Cargo fijo de ML para productos de bajo precio.' },
    ],
    summary: (p) => [['Comisión', p.comision + '%'], ['Fijo', money(p.costoFijo)]],
    apply: (ctx, p) => { ctx.commissionPct = p.comision; ctx.fixedFee = p.costoFijo; },
  },
  costos_operativos: {
    cat: 'costos', name: 'Costos operativos', icon: 'stock',
    desc: 'Packaging, almacenamiento y gastos operativos que reducen tu margen real.',
    inputs: 1, outputs: [{ id: 'out' }],
    params: [
      { key: 'packaging', label: 'Packaging / unidad', type: 'number', unit: '$', value: 200, min: 0, max: 50000, step: 10 },
      { key: 'operativoPct', label: 'Gasto operativo', type: 'number', unit: '%', value: 2, min: 0, max: 30, step: 0.5 },
    ],
    summary: (p) => [['Packaging', money(p.packaging)], ['Operativo', p.operativoPct + '%']],
    apply: (ctx, p) => { ctx.packaging = (ctx.packaging || 0) + p.packaging; ctx.taxExtraPct += p.operativoPct; },
  },

  /* ===== IMPUESTOS (foco del proyecto) ===== */
  impuestos_generales: {
    cat: 'impuestos', name: 'Impuestos', icon: 'impuestos',
    desc: 'Carga IVA, Ingresos Brutos (IIBB) y otros impuestos. Podés trasladarlos al precio para preservar tu margen neto.',
    inputs: 1, outputs: [{ id: 'out' }],
    params: [
      { key: 'iva', label: 'IVA', type: 'number', unit: '%', value: 21, min: 0, max: 40, step: 0.5 },
      { key: 'iibb', label: 'Ingresos Brutos (IIBB)', type: 'number', unit: '%', value: 3, min: 0, max: 15, step: 0.1 },
      { key: 'otros', label: 'Otros impuestos', type: 'number', unit: '%', value: 0, min: 0, max: 20, step: 0.5 },
      { key: 'trasladar', label: 'Trasladar al precio (mantener margen)', type: 'toggle', value: false },
    ],
    summary: (p) => [['IVA', p.iva + '%'], ['IIBB', p.iibb + '%']],
    apply: (ctx, p) => {
      // IVA es normalmente débito/crédito; a fines de margen contamos IIBB + otros sobre venta.
      ctx.iibbPct = p.iibb; ctx.taxExtraPct += p.otros; ctx.ivaPct = p.iva;
      if (p.trasladar) { ctx.price = priceForMargin(ctx, ctx.targetMarginPct || 20); note(ctx, 'ok', 'Impuestos trasladados al precio.'); }
    },
  },
  cambio_impuesto: {
    cat: 'impuestos', name: 'Cambio de impuesto', icon: 'wand',
    desc: 'Simula o programa un cambio impositivo (suba/baja de IVA, IIBB, percepciones, etc.) y reajusta automáticamente el precio para no perder margen. Ideal para blindarte ante cambios fiscales.',
    inputs: 1, outputs: [{ id: 'out' }],
    params: [
      { key: 'impuesto', label: 'Impuesto afectado', type: 'select', value: 'iibb',
        options: [['iva', 'IVA'], ['iibb', 'Ingresos Brutos'], ['otros', 'Percepción / otro']] },
      { key: 'variacion', label: 'Variación', type: 'number', unit: 'pts%', value: 2, min: -20, max: 20, step: 0.5,
        hint: 'Puntos porcentuales a sumar/restar. Ej: +2 = sube 2 puntos.' },
      { key: 'reajustar', label: 'Reajustar precio automáticamente', type: 'toggle', value: true },
    ],
    summary: (p) => [['Impuesto', p.impuesto.toUpperCase()], ['Variación', (p.variacion >= 0 ? '+' : '') + p.variacion + ' pts']],
    apply: (ctx, p) => {
      const antesMargen = marginAt(ctx, ctx.price);
      if (p.impuesto === 'iva') ctx.ivaPct = (ctx.ivaPct || 21) + p.variacion;
      if (p.impuesto === 'iibb') ctx.iibbPct = (ctx.iibbPct || 0) + p.variacion;
      if (p.impuesto === 'otros') ctx.taxExtraPct = (ctx.taxExtraPct || 0) + p.variacion;
      if (p.reajustar) {
        ctx.price = priceForMargin(ctx, antesMargen);
        note(ctx, 'ok', `Precio reajustado tras cambio de ${p.impuesto.toUpperCase()} (${p.variacion >= 0 ? '+' : ''}${p.variacion} pts).`);
      } else {
        note(ctx, 'warn', `Cambio impositivo aplicado sin reajuste: el margen baja a ${marginAt(ctx, ctx.price).toFixed(1)}%.`);
      }
    },
  },
  retenciones: {
    cat: 'impuestos', name: 'Retenciones y percepciones', icon: 'shield',
    desc: 'Retenciones de AFIP/ARCA y percepciones de IIBB por jurisdicción que impactan tu recaudación neta.',
    inputs: 1, outputs: [{ id: 'out' }],
    params: [
      { key: 'retencion', label: 'Retención', type: 'number', unit: '%', value: 1, min: 0, max: 15, step: 0.1 },
      { key: 'percepcion', label: 'Percepción IIBB', type: 'number', unit: '%', value: 0.5, min: 0, max: 10, step: 0.1 },
    ],
    summary: (p) => [['Retención', p.retencion + '%'], ['Percepción', p.percepcion + '%']],
    apply: (ctx, p) => { ctx.retencionPct = (ctx.retencionPct || 0) + p.retencion + p.percepcion; },
  },

  /* ===== PROMOCIONES ===== */
  promo_ml: {
    cat: 'promos', name: 'Promoción Mercado Libre', icon: 'promos',
    desc: 'Aplica un descuento promocional respetando un margen mínimo durante la promo. Zentor aplica "la mejor promo posible": acá lo controlás vos.',
    inputs: 1, outputs: [{ id: 'out' }],
    params: [
      { key: 'descuento', label: 'Descuento promo', type: 'number', unit: '%', value: 15, min: 0, max: 80, step: 1, slider: true },
      { key: 'pisoPromo', label: 'Margen mínimo en promo', type: 'number', unit: '%', value: 5, min: -20, max: 60, step: 1 },
    ],
    summary: (p) => [['Descuento', p.descuento + '%'], ['Piso', p.pisoPromo + '%']],
    apply: (ctx, p) => {
      const conDesc = ctx.price * (1 - p.descuento / 100);
      const pisoPromo = priceForMargin(ctx, p.pisoPromo);
      ctx.price = Math.max(conDesc, pisoPromo);
      if (conDesc < pisoPromo) note(ctx, 'warn', 'Descuento recortado para respetar margen mínimo de promo.');
      else note(ctx, 'ok', `Promoción del ${p.descuento}% aplicada.`);
    },
  },
  campana: {
    cat: 'promos', name: 'Campaña / Oferta del día', icon: 'rocket',
    desc: 'Descuento extra para campañas puntuales (Hot Sale, Oferta del día) con tope de stock a liquidar.',
    inputs: 1, outputs: [{ id: 'out' }],
    params: [
      { key: 'descuento', label: 'Descuento de campaña', type: 'number', unit: '%', value: 20, min: 0, max: 80, step: 1, slider: true },
      { key: 'soloSiStock', label: 'Stock mínimo para activar', type: 'number', unit: 'u', value: 3, min: 0, max: 9999, step: 1 },
    ],
    summary: (p) => [['Campaña', p.descuento + '%']],
    apply: (ctx, p) => {
      if ((ctx.stock || 0) < p.soloSiStock) { note(ctx, 'info', 'Stock insuficiente: campaña no activada.'); return; }
      ctx.price = ctx.price * (1 - p.descuento / 100);
      note(ctx, 'ok', `Campaña activa: -${p.descuento}%.`);
    },
  },

  /* ===== DESCUENTOS ===== */
  descuento_volumen: {
    cat: 'descuentos', name: 'Descuento por volumen', icon: 'descuentos',
    desc: 'Baja el precio unitario cuando hay mucho stock disponible para acelerar la rotación.',
    inputs: 1, outputs: [{ id: 'out' }],
    params: [
      { key: 'umbral', label: 'Stock a partir de', type: 'number', unit: 'u', value: 50, min: 0, max: 99999, step: 5 },
      { key: 'descuento', label: 'Descuento', type: 'number', unit: '%', value: 7, min: 0, max: 60, step: 1 },
    ],
    summary: (p) => [['Desde', p.umbral + 'u'], ['Baja', p.descuento + '%']],
    apply: (ctx, p) => {
      if ((ctx.stock || 0) >= p.umbral) { ctx.price *= (1 - p.descuento / 100); note(ctx, 'ok', `Descuento por volumen (-${p.descuento}%).`); }
    },
  },
  liquidacion: {
    cat: 'descuentos', name: 'Liquidación de stock', icon: 'bolt',
    desc: 'Modo agresivo para rematar stock: descuento fuerte que puede llegar hasta el punto de equilibrio (margen 0).',
    inputs: 1, outputs: [{ id: 'out' }],
    params: [
      { key: 'descuento', label: 'Descuento', type: 'number', unit: '%', value: 30, min: 0, max: 90, step: 1, slider: true },
      { key: 'hastaMargen', label: 'No perder más allá de', type: 'number', unit: '%', value: 0, min: -30, max: 40, step: 1 },
    ],
    summary: (p) => [['Descuento', p.descuento + '%'], ['Límite', p.hastaMargen + '%']],
    apply: (ctx, p) => {
      const conDesc = ctx.price * (1 - p.descuento / 100);
      const limite = priceForMargin(ctx, p.hastaMargen);
      ctx.price = Math.max(conDesc, limite);
      ctx.floor = Math.min(ctx.floor || Infinity, limite);
      note(ctx, conDesc < limite ? 'warn' : 'ok', `Liquidación: precio a ${money(ctx.price)}.`);
    },
  },

  /* ===== ENVÍOS ===== */
  envio: {
    cat: 'envios', name: 'Costo de envío', icon: 'envios',
    desc: 'Define quién paga el envío. Si lo absorbe el vendedor (envío gratis), se descuenta de tu margen y se puede sumar al precio.',
    inputs: 1, outputs: [{ id: 'out' }],
    params: [
      { key: 'modo', label: 'Quién paga', type: 'select', value: 'vendedor',
        options: [['vendedor', 'Vendedor (envío gratis)'], ['comprador', 'Comprador'], ['mixto', 'Compartido 50/50']] },
      { key: 'costoEnvio', label: 'Costo de envío', type: 'number', unit: '$', value: 2500, min: 0, max: 100000, step: 50 },
      { key: 'trasladar', label: 'Sumar el envío al precio', type: 'toggle', value: false },
    ],
    summary: (p) => [['Envío', p.modo === 'vendedor' ? 'Gratis' : (p.modo === 'mixto' ? '50/50' : 'Comprador')], ['Costo', money(p.costoEnvio)]],
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
    desc: 'Costo financiero de ofrecer cuotas sin interés (lo absorbe el vendedor). Se descuenta del margen.',
    inputs: 1, outputs: [{ id: 'out' }],
    params: [
      { key: 'cuotas', label: 'Cantidad de cuotas', type: 'select', value: '6', options: [['3', '3 cuotas'], ['6', '6 cuotas'], ['9', '9 cuotas'], ['12', '12 cuotas']] },
      { key: 'costoFin', label: 'Costo financiero', type: 'number', unit: '%', value: 12, min: 0, max: 40, step: 0.5, slider: true },
      { key: 'trasladar', label: 'Trasladar al precio', type: 'toggle', value: true },
    ],
    summary: (p) => [['Cuotas', p.cuotas], ['Costo', p.costoFin + '%']],
    apply: (ctx, p) => {
      if (p.trasladar) { ctx.price *= (1 + p.costoFin / 100); note(ctx, 'ok', `${p.cuotas} cuotas sin interés trasladadas al precio.`); }
      else { ctx.installmentPct += p.costoFin; note(ctx, 'info', `Absorbés ${p.costoFin}% por cuotas.`); }
    },
  },

  /* ===== DEVOLUCIONES ===== */
  devoluciones: {
    cat: 'devoluciones', name: 'Reserva por devoluciones', icon: 'devoluciones',
    desc: 'Aparta un % del precio para cubrir devoluciones y cambios según tu tasa histórica. Protege el margen real.',
    inputs: 1, outputs: [{ id: 'out' }],
    params: [
      { key: 'tasa', label: 'Tasa de devolución', type: 'number', unit: '%', value: 4, min: 0, max: 40, step: 0.5 },
      { key: 'costoGestion', label: 'Costo por devolución', type: 'number', unit: '$', value: 1500, min: 0, max: 100000, step: 50 },
    ],
    summary: (p) => [['Tasa', p.tasa + '%']],
    apply: (ctx, p) => {
      ctx.returnReservePct = (ctx.returnReservePct || 0) + p.tasa;
      ctx.packaging = (ctx.packaging || 0) + (p.costoGestion * p.tasa / 100);
      note(ctx, 'info', `Reservado ${p.tasa}% para devoluciones.`);
    },
  },

  /* ===== LÓGICA Y REGLAS ===== */
  condicion: {
    cat: 'logica', name: 'Condición (SI / NO)', icon: 'logica',
    desc: 'Bifurca la estrategia: si se cumple la condición sigue por la salida verde, si no por la roja.',
    inputs: 1, outputs: [{ id: 'si', label: 'SÍ', kind: 'true' }, { id: 'no', label: 'NO', kind: 'false' }],
    params: [
      { key: 'variable', label: 'Variable', type: 'select', value: 'stock',
        options: [['stock', 'Stock'], ['competitor', 'Precio competidor'], ['margen', 'Margen actual %'], ['precio', 'Precio actual'], ['visitas', 'Visitas']] },
      { key: 'op', label: 'Operador', type: 'select', value: 'lt', options: [['lt', 'menor que <'], ['gt', 'mayor que >'], ['eq', 'igual a =']] },
      { key: 'valor', label: 'Valor', type: 'number', unit: '', value: 10, min: -100000, max: 1000000, step: 1 },
    ],
    summary: (p) => [['Si', `${p.variable} ${p.op === 'lt' ? '<' : p.op === 'gt' ? '>' : '='} ${p.valor}`]],
    branch: (ctx, p) => {
      let v = 0;
      if (p.variable === 'stock') v = ctx.stock || 0;
      else if (p.variable === 'competitor') v = ctx.competitor || 0;
      else if (p.variable === 'margen') v = marginAt(ctx, ctx.price);
      else if (p.variable === 'precio') v = ctx.price;
      else if (p.variable === 'visitas') v = ctx.visits || 0;
      const res = p.op === 'lt' ? v < p.valor : p.op === 'gt' ? v > p.valor : Math.abs(v - p.valor) < 0.5;
      note(ctx, 'info', `Condición ${p.variable} ${p.op === 'lt' ? '<' : p.op === 'gt' ? '>' : '='} ${p.valor} → ${res ? 'SÍ' : 'NO'}.`);
      return res ? 'si' : 'no';
    },
    apply: () => {},
  },
  regla_stock: {
    cat: 'logica', name: 'Ajuste por stock', icon: 'stock',
    desc: 'Sube el precio cuando queda poco stock (escasez) y lo baja cuando sobra (rotación).',
    inputs: 1, outputs: [{ id: 'out' }],
    params: [
      { key: 'bajoU', label: 'Poco stock: menos de', type: 'number', unit: 'u', value: 5, min: 0, max: 9999, step: 1 },
      { key: 'bajoAjuste', label: 'Subir precio', type: 'number', unit: '%', value: 5, min: 0, max: 50, step: 1 },
      { key: 'altoU', label: 'Mucho stock: más de', type: 'number', unit: 'u', value: 100, min: 0, max: 99999, step: 5 },
      { key: 'altoAjuste', label: 'Bajar precio', type: 'number', unit: '%', value: 5, min: 0, max: 50, step: 1 },
    ],
    summary: (p) => [['< ' + p.bajoU + 'u', '+' + p.bajoAjuste + '%'], ['> ' + p.altoU + 'u', '-' + p.altoAjuste + '%']],
    apply: (ctx, p) => {
      const s = ctx.stock || 0;
      if (s < p.bajoU) { ctx.price *= (1 + p.bajoAjuste / 100); note(ctx, 'ok', 'Poco stock: precio ajustado al alza.'); }
      else if (s > p.altoU) { ctx.price *= (1 - p.altoAjuste / 100); note(ctx, 'ok', 'Mucho stock: precio a la baja para rotar.'); }
    },
  },
  regla_horario: {
    cat: 'logica', name: 'Regla por horario', icon: 'clock',
    desc: 'Ajusta el precio en franjas de alta o baja demanda (ej: subir en horario pico, bajar de madrugada).',
    inputs: 1, outputs: [{ id: 'out' }],
    params: [
      { key: 'franja', label: 'Franja', type: 'select', value: 'pico', options: [['pico', 'Horario pico (subir)'], ['valle', 'Baja demanda (bajar)']] },
      { key: 'ajuste', label: 'Ajuste', type: 'number', unit: '%', value: 3, min: 0, max: 40, step: 1 },
    ],
    summary: (p) => [[p.franja === 'pico' ? 'Pico +' : 'Valle -', p.ajuste + '%']],
    apply: (ctx, p) => {
      ctx.price *= p.franja === 'pico' ? (1 + p.ajuste / 100) : (1 - p.ajuste / 100);
      note(ctx, 'info', `Ajuste por horario (${p.franja}).`);
    },
  },
  redondeo: {
    cat: 'logica', name: 'Redondeo de precio', icon: 'wand',
    desc: 'Redondeo psicológico del precio final (ej: terminar en .99 o en cifras redondas).',
    inputs: 1, outputs: [{ id: 'out' }],
    params: [
      { key: 'modo', label: 'Tipo', type: 'select', value: 'psy',
        options: [['psy', 'Psicológico (…990)'], ['d100', 'A $100'], ['d1000', 'A $1.000'], ['entero', 'Entero']] },
    ],
    summary: (p) => [['Redondeo', p.modo === 'psy' ? '…990' : p.modo]],
    apply: (ctx, p) => {
      if (p.modo === 'psy') ctx.price = Math.max(0, Math.round(ctx.price / 100) * 100 - 10); // termina en 90
      if (p.modo === 'd100') ctx.price = Math.round(ctx.price / 100) * 100;
      if (p.modo === 'd1000') ctx.price = Math.round(ctx.price / 1000) * 1000;
      if (p.modo === 'entero') ctx.price = Math.round(ctx.price);
      ctx.rounded = true;
    },
  },

  /* ===== ACCIONES (salida) ===== */
  fijar_precio: {
    cat: 'accion', name: 'Fijar precio final', icon: 'precio',
    desc: 'Bloque final: publica el precio calculado en Mercado Libre. Toda estrategia termina acá.',
    inputs: 1, outputs: [],
    terminal: true,
    params: [
      { key: 'frecuencia', label: 'Frecuencia de ajuste', type: 'select', value: '30',
        options: [['15', 'Cada 15 min'], ['30', 'Cada 30 min'], ['60', 'Cada 1 h'], ['360', 'Cada 6 h']] },
    ],
    summary: (p) => [['Actualiza', p.frecuencia + ' min']],
    apply: (ctx) => { ctx.final = true; note(ctx, 'ok', `Precio final: ${money(ctx.price)}.`); },
  },
  alerta: {
    cat: 'accion', name: 'Crear alerta', icon: 'alert',
    desc: 'Envía una notificación cuando se cumple una condición (ej: precio tocó el piso o el competidor bajó fuerte).',
    inputs: 1, outputs: [{ id: 'out' }],
    params: [
      { key: 'canal', label: 'Canal', type: 'select', value: 'push', options: [['push', 'Notificación push'], ['email', 'Email'], ['whatsapp', 'WhatsApp']] },
    ],
    summary: (p) => [['Alerta', p.canal]],
    apply: (ctx) => { note(ctx, 'info', 'Alerta configurada.'); },
  },
};

/* Índice de bloques por categoría (para la paleta) */
function blocksByCat(catKey) {
  return Object.entries(BLOCKS).filter(([, b]) => b.cat === catKey).map(([type, b]) => ({ type, ...b }));
}
