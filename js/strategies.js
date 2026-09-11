/* ============================================================
   R8T · strategies.js
   Estrategias pre-armadas + productos de muestra para simular.
   ============================================================ */

/* Productos de muestra (datos realistas de Mercado Libre AR) */
const SAMPLE_PRODUCTS = [
  { id: 'p1', name: 'Auriculares Bluetooth',   cost: 8500,  price: 19999,  competitor: 18990,  stock: 45,  visits: 1200 },
  { id: 'p2', name: 'Zapatillas Running',      cost: 32000, price: 74999,  competitor: 71990,  stock: 8,   visits: 640 },
  { id: 'p3', name: 'Cafetera Express',        cost: 55000, price: 119999, competitor: 124990, stock: 120, visits: 300 },
  { id: 'p4', name: 'Smartwatch Deportivo',    cost: 21000, price: 45999,  competitor: 43990,  stock: 3,   visits: 2100 },
  { id: 'p5', name: 'Mochila Notebook 15.6"',  cost: 9800,  price: 24999,  competitor: 23500,  stock: 210, visits: 480 },
];

/* Helper: encadena bloques en línea horizontal y los conecta */
function chain(prefix, steps, opts = {}) {
  const startX = opts.x ?? 120, y = opts.y ?? 240, dx = opts.dx ?? 288;
  const nodes = [], connections = [];
  steps.forEach((s, i) => {
    nodes.push({ id: `${prefix}${i}`, type: s.type, x: startX + i * dx, y, params: s.params || {} });
    if (i > 0) connections.push({ id: `${prefix}e${i}`, from: { node: `${prefix}${i - 1}`, port: prevOut(steps[i - 1]) }, to: { node: `${prefix}${i}`, port: 'in' } });
  });
  return { nodes, connections };
}
function prevOut(step) { const b = BLOCKS[step.type]; return b.outputs && b.outputs[0] ? b.outputs[0].id : 'out'; }

/* Definición de las estrategias */
const STRATEGIES = [
  {
    id: 'crecimiento', name: 'Crecimiento', icon: 'rocket', color: 'var(--cat-producto)',
    tag: 'Agresiva', tagColor: '#16a34a',
    desc: 'Margen bajo para maximizar ventas y visibilidad. Se posiciona por debajo del competidor sin perforar un piso de seguridad.',
    meters: { Rentabilidad: 2, Agresividad: 5, Riesgo: 3 },
    build: () => chain('cre', [
      { type: 'producto' },
      { type: 'comision_ml' },
      { type: 'impuestos_generales' },
      { type: 'piso_rentabilidad', params: { min: 6 } },
      { type: 'igualar_competencia', params: { modo: 'debajo', offset: 100, respetarPiso: true } },
      { type: 'redondeo', params: { modo: 'psy' } },
      { type: 'fijar_precio', params: { frecuencia: '15' } },
    ]),
  },
  {
    id: 'rentabilidad', name: 'Rentabilidad máxima', icon: 'margen', color: 'var(--cat-margen)',
    tag: 'Conservadora', tagColor: '#0353c9',
    desc: 'Protege el margen. Fija el precio para lograr una rentabilidad objetivo alta, con techo para no salirse de mercado.',
    meters: { Rentabilidad: 5, Agresividad: 1, Riesgo: 1 },
    build: () => chain('ren', [
      { type: 'producto' },
      { type: 'comision_ml' },
      { type: 'impuestos_generales' },
      { type: 'margen_objetivo', params: { target: 35, modo: 'fijar' } },
      { type: 'techo_precio', params: { modo: 'margen', max: 55 } },
      { type: 'redondeo', params: { modo: 'psy' } },
      { type: 'fijar_precio', params: { frecuencia: '60' } },
    ]),
  },
  {
    id: 'buybox', name: 'Ganar el BuyBox', icon: 'target', color: 'var(--cat-competencia)',
    tag: 'Competitiva', tagColor: '#0065F3',
    desc: 'Disputa el catálogo quedando apenas por debajo del ganador, respetando siempre tu piso de rentabilidad.',
    meters: { Rentabilidad: 3, Agresividad: 4, Riesgo: 2 },
    build: () => chain('bbx', [
      { type: 'producto' },
      { type: 'comision_ml' },
      { type: 'impuestos_generales' },
      { type: 'piso_rentabilidad', params: { min: 10 } },
      { type: 'ganar_buybox', params: { delta: 20, maxIntentos: 8 } },
      { type: 'redondeo', params: { modo: 'psy' } },
      { type: 'fijar_precio', params: { frecuencia: '15' } },
    ]),
  },
  {
    id: 'liquidacion', name: 'Liquidación de stock', icon: 'bolt', color: 'var(--cat-descuentos)',
    tag: 'Rotación', tagColor: '#ec4899',
    desc: 'Rematá stock que no rota. Descuento fuerte hasta el punto de equilibrio, con redondeo atractivo.',
    meters: { Rentabilidad: 1, Agresividad: 5, Riesgo: 4 },
    build: () => chain('liq', [
      { type: 'producto' },
      { type: 'comision_ml' },
      { type: 'impuestos_generales' },
      { type: 'liquidacion', params: { descuento: 30, hastaMargen: 0 } },
      { type: 'redondeo', params: { modo: 'd100' } },
      { type: 'fijar_precio', params: { frecuencia: '30' } },
    ]),
  },
  {
    id: 'equilibrado', name: 'Equilibrado (IA)', icon: 'sparkles', color: 'var(--cat-cuotas)',
    tag: 'Inteligente', tagColor: '#6366f1',
    desc: 'Balancea margen y competitividad. Si hay poco stock sube el precio; si hay stock, iguala al competidor. Todo con piso de seguridad.',
    meters: { Rentabilidad: 4, Agresividad: 3, Riesgo: 2 },
    build: () => {
      // Cadena base + una bifurcación por condición de stock
      const nodes = [], connections = [];
      const base = [
        { id: 'eq0', type: 'producto', x: 120, y: 260 },
        { id: 'eq1', type: 'comision_ml', x: 408, y: 260 },
        { id: 'eq2', type: 'impuestos_generales', x: 696, y: 260 },
        { id: 'eq3', type: 'piso_rentabilidad', x: 984, y: 260, params: { min: 12 } },
        { id: 'eq4', type: 'condicion', x: 1272, y: 260, params: { variable: 'stock', op: 'lt', valor: 15 } },
        { id: 'eq5', type: 'regla_stock', x: 1560, y: 110, params: { bajoU: 15, bajoAjuste: 8, altoU: 200, altoAjuste: 4 } },
        { id: 'eq6', type: 'igualar_competencia', x: 1560, y: 410, params: { modo: 'debajo', offset: 150, respetarPiso: true } },
        { id: 'eq7', type: 'redondeo', x: 1848, y: 260, params: { modo: 'psy' } },
        { id: 'eq8', type: 'fijar_precio', x: 2136, y: 260, params: { frecuencia: '30' } },
      ];
      nodes.push(...base.map(n => ({ ...n, params: n.params || {} })));
      const c = (from, port, to) => connections.push({ id: 'eqe' + connections.length, from: { node: from, port }, to: { node: to, port: 'in' } });
      c('eq0', 'out', 'eq1'); c('eq1', 'out', 'eq2'); c('eq2', 'out', 'eq3'); c('eq3', 'out', 'eq4');
      c('eq4', 'si', 'eq5'); c('eq4', 'no', 'eq6');
      c('eq5', 'out', 'eq7'); c('eq6', 'out', 'eq7'); c('eq7', 'out', 'eq8');
      return { nodes, connections };
    },
  },
  {
    id: 'blindaje_fiscal', name: 'Blindaje fiscal', icon: 'shield', color: 'var(--cat-impuestos)',
    tag: 'Anti-impuestos', tagColor: '#ef4444',
    desc: 'Mantiene tu margen intacto ante cambios de impuestos. Fija rentabilidad objetivo y reajusta el precio automáticamente si suben IVA o IIBB.',
    meters: { Rentabilidad: 4, Agresividad: 2, Riesgo: 1 },
    build: () => chain('fis', [
      { type: 'producto' },
      { type: 'comision_ml' },
      { type: 'impuestos_generales', params: { iva: 21, iibb: 3 } },
      { type: 'margen_objetivo', params: { target: 28, modo: 'fijar' } },
      { type: 'cambio_impuesto', params: { impuesto: 'iibb', variacion: 2, reajustar: true } },
      { type: 'piso_rentabilidad', params: { min: 18 } },
      { type: 'redondeo', params: { modo: 'psy' } },
      { type: 'fijar_precio', params: { frecuencia: '60' } },
    ]),
  },
];

const STRAT_MAP = Object.fromEntries(STRATEGIES.map(s => [s.id, s]));
