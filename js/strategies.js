/* ============================================================
   R8T · strategies.js  (v2 — programas en árbol)
   Estrategias pre-armadas + productos y grupos de muestra.
   ============================================================ */

/* Productos individuales de muestra (datos realistas de ML AR) */
const SAMPLE_PRODUCTS = [
  { id: 'p1', name: 'Auriculares Bluetooth',   cost: 8500,  price: 19999,  competitor: 18990,  stock: 45,  visits: 4800, competitors: 9,  daysNoSale: 1,  salesWeek: 34 },
  { id: 'p2', name: 'Zapatillas Running',      cost: 32000, price: 74999,  competitor: 71990,  stock: 8,   visits: 2600, competitors: 6,  daysNoSale: 3,  salesWeek: 9 },
  { id: 'p3', name: 'Cafetera Express',        cost: 55000, price: 119999, competitor: 124990, stock: 120, visits: 1200, competitors: 4,  daysNoSale: 6,  salesWeek: 5 },
  { id: 'p4', name: 'Smartwatch Deportivo',    cost: 21000, price: 45999,  competitor: 43990,  stock: 3,   visits: 8400, competitors: 12, daysNoSale: 0,  salesWeek: 61 },
  { id: 'p5', name: 'Mochila Notebook 15.6"',  cost: 9800,  price: 24999,  competitor: 23500,  stock: 210, visits: 1900, competitors: 5,  daysNoSale: 9,  salesWeek: 7 },
];

/* Grupos de productos (aplicar la estrategia a todo un conjunto) */
const SAMPLE_GROUPS = [
  { id: 'g1', name: 'Categoría: Electrónica', count: 128, rep: 'p1' },
  { id: 'g2', name: 'Categoría: Indumentaria deportiva', count: 64, rep: 'p2' },
  { id: 'g3', name: 'Categoría: Hogar y cocina', count: 210, rep: 'p3' },
  { id: 'g4', name: 'Todas mis publicaciones', count: 412, rep: 'p1' },
];

function resolveTarget(target) {
  if (target.mode === 'group') {
    const g = SAMPLE_GROUPS.find(x => x.id === target.id) || SAMPLE_GROUPS[0];
    const rep = SAMPLE_PRODUCTS.find(p => p.id === g.rep) || SAMPLE_PRODUCTS[0];
    // usamos los productos de muestra como "muestra representativa" del grupo
    return { product: rep, products: SAMPLE_PRODUCTS, scale: g.count, label: g.name, count: g.count, isGroup: true };
  }
  const p = SAMPLE_PRODUCTS.find(x => x.id === target.id) || SAMPLE_PRODUCTS[0];
  return { product: p, products: [p], scale: 1, label: p.name, count: 1, isGroup: false };
}

/* Builder de programas */
function prog(prefix, root, target) {
  let i = 0;
  const walk = (arr) => arr.map(node => {
    const st = { id: prefix + (i++), type: node.t, params: node.p || {} };
    if (node.si || node.no) st.branches = { si: walk(node.si || []), no: walk(node.no || []) };
    return st;
  });
  return { target: target || { mode: 'product', id: 'p1' }, root: walk(root) };
}

const STRATEGIES = [
  {
    id: 'crecimiento', name: 'Crecimiento', icon: 'rocket', color: 'var(--cat-margen)',
    tag: 'Agresiva', tagColor: '#16a34a',
    desc: 'Margen bajo para vender más y ganar visibilidad, sin perforar un piso de seguridad.',
    meters: { Rentabilidad: 2, Agresividad: 5, Velocidad: 4 },
    build: () => prog('cre', [
      { t: 'comision_ml' }, { t: 'impuestos_generales' },
      { t: 'piso_rentabilidad', p: { min: 6 } },
      { t: 'igualar_competencia', p: { modo: 'debajo', offset: 100, respetarPiso: true } },
      { t: 'redondeo', p: { modo: 'psy' } }, { t: 'fijar_precio', p: { frecuencia: '15' } },
    ]),
  },
  {
    id: 'rentabilidad', name: 'Rentabilidad máxima', icon: 'margen', color: 'var(--cat-competencia)',
    tag: 'Conservadora', tagColor: '#0353c9',
    desc: 'Protege el margen: fija el precio a una rentabilidad objetivo alta, con techo de mercado.',
    meters: { Rentabilidad: 5, Agresividad: 1, Velocidad: 2 },
    build: () => prog('ren', [
      { t: 'comision_ml' }, { t: 'impuestos_generales' },
      { t: 'margen_objetivo', p: { target: 35, modo: 'fijar' } },
      { t: 'techo_precio', p: { modo: 'margen', max: 55 } },
      { t: 'redondeo', p: { modo: 'psy' } }, { t: 'fijar_precio', p: { frecuencia: '60' } },
    ]),
  },
  {
    id: 'buybox', name: 'Ganar el BuyBox', icon: 'target', color: 'var(--cat-competencia)',
    tag: 'Competitiva', tagColor: '#0065F3',
    desc: 'Disputa el catálogo quedando apenas debajo del ganador, respetando tu piso.',
    meters: { Rentabilidad: 3, Agresividad: 4, Velocidad: 5 },
    build: () => prog('bbx', [
      { t: 'comision_ml' }, { t: 'impuestos_generales' },
      { t: 'piso_rentabilidad', p: { min: 10 } },
      { t: 'ganar_buybox', p: { delta: 20, maxIntentos: 8 } },
      { t: 'redondeo', p: { modo: 'psy' } }, { t: 'fijar_precio', p: { frecuencia: '15' } },
    ]),
  },
  {
    id: 'liquidacion', name: 'Liquidación de stock', icon: 'bolt', color: 'var(--cat-descuentos)',
    tag: 'Rotación', tagColor: '#ec4899',
    desc: 'Rematá stock que no rota con descuento fuerte hasta el punto de equilibrio.',
    meters: { Rentabilidad: 1, Agresividad: 5, Velocidad: 5 },
    build: () => prog('liq', [
      { t: 'comision_ml' }, { t: 'impuestos_generales' },
      { t: 'liquidacion', p: { descuento: 30, hastaMargen: 0 } },
      { t: 'redondeo', p: { modo: 'd100' } }, { t: 'fijar_precio', p: { frecuencia: '30' } },
    ]),
  },
  {
    id: 'equilibrado', name: 'Equilibrado (inteligente)', icon: 'sparkles', color: 'var(--cat-cuotas)',
    tag: 'Balanceada', tagColor: '#6366f1',
    desc: 'Si hay poco stock sube el precio; si hay stock, iguala al competidor. Siempre con piso.',
    meters: { Rentabilidad: 4, Agresividad: 3, Velocidad: 3 },
    build: () => prog('eq', [
      { t: 'comision_ml' }, { t: 'impuestos_generales' },
      { t: 'piso_rentabilidad', p: { min: 12 } },
      {
        t: 'condicion', p: { variable: 'stock', op: 'lt', valor: 15 },
        si: [{ t: 'regla_stock', p: { bajoU: 15, bajoAjuste: 8, altoU: 200, altoAjuste: 4 } }],
        no: [{ t: 'igualar_competencia', p: { modo: 'debajo', offset: 150, respetarPiso: true } }],
      },
      { t: 'redondeo', p: { modo: 'psy' } }, { t: 'fijar_precio', p: { frecuencia: '30' } },
    ]),
  },
  {
    id: 'blindaje_fiscal', name: 'Blindaje fiscal', icon: 'shield', color: 'var(--cat-impuestos)',
    tag: 'Anti-impuestos', tagColor: '#ef4444',
    desc: 'Mantiene tu margen ante subas de impuestos: reajusta el precio automáticamente.',
    meters: { Rentabilidad: 4, Agresividad: 2, Velocidad: 2 },
    build: () => prog('fis', [
      { t: 'comision_ml' }, { t: 'impuestos_generales', p: { iva: 21, iibb: 3 } },
      { t: 'margen_objetivo', p: { target: 28, modo: 'fijar' } },
      { t: 'cambio_impuesto', p: { impuesto: 'iibb', variacion: 2, reajustar: true } },
      { t: 'piso_rentabilidad', p: { min: 18 } },
      { t: 'redondeo', p: { modo: 'psy' } }, { t: 'fijar_precio', p: { frecuencia: '60' } },
    ]),
  },
];
const STRAT_MAP = Object.fromEntries(STRATEGIES.map(s => [s.id, s]));

/* ---------- Explicación en lenguaje natural del programa ---------- */
function describeProgram(program) {
  const steps = [];
  const walk = (arr, prefix) => {
    arr.forEach(step => {
      const d = blockDef(step.type); if (!d) return;
      const p = RE.mergedParams(step);
      if (d.container && step.branches) {
        const cond = d.condText ? d.condText(p) : (d.narrate ? d.narrate(p) : '');
        const si = describeList(step.branches.si);
        const no = describeList(step.branches.no);
        let txt = `Cuando ${cond}, ${si || 'no hago nada'}`;
        if (no) txt += `; si no, ${no}`;
        txt += '.';
        steps.push({ text: capitalize(txt), cond: true });
      } else if (d.narrate) {
        steps.push({ text: capitalize(d.narrate(p)) + '.', cond: false });
      }
    });
  };
  const describeList = (arr) => arr.map(s => { const d = blockDef(s.type); return d && d.narrate ? d.narrate(RE.mergedParams(s)) : ''; }).filter(Boolean).join(', y ');
  walk(program.root || []);
  return steps;
}
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
