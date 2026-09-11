/* ============================================================
   R8T · simulate.js
   Recorre el grafo desde el bloque Producto aplicando cada
   bloque al "contexto de precio" y devuelve el resultado.
   ============================================================ */

function seedCtx(product) {
  return {
    cost: product.cost, basePrice: product.price, price: product.price,
    competitor: product.competitor, stock: product.stock, visits: product.visits,
    commissionPct: 13, fixedFee: 0, ivaPct: 21, iibbPct: 0, taxExtraPct: 0,
    installmentPct: 0, promoPct: 0, returnReservePct: 0, retencionPct: 0,
    shipping: 0, packaging: 0, floor: 0, ceiling: Infinity,
    targetMarginPct: null, minMarginPct: null, rounded: false, final: false,
    notes: [],
  };
}

function simulate(graph, product) {
  const ctx = seedCtx(product);
  window.__lastCtx = ctx;
  const nodes = graph.nodes, conns = graph.connections;
  const outConn = (nid, port) => conns.find(c => c.from.node === nid && c.from.port === port);

  const start = nodes.find(n => n.type === 'producto');
  const result = { ctx, ok: false, reached: false, path: [] };

  if (!start) { result.error = 'Falta el bloque Producto (inicio).'; return finalize(result, ctx, product); }

  let cur = start, steps = 0;
  const seen = new Set();
  while (cur && steps++ < 120) {
    if (seen.has(cur.id)) { note(ctx, 'warn', 'Se detectó un bucle: la ejecución se detuvo.'); break; }
    seen.add(cur.id);
    result.path.push(cur.id);
    const d = BLOCKS[cur.type] || (window.CUSTOM_BLOCKS && window.CUSTOM_BLOCKS[cur.type]);
    if (!d) break;
    const p = RE.mergedParams(cur);
    let port;
    if (d.branch) port = d.branch(ctx, p);
    else { if (d.apply) d.apply(ctx, p); port = (d.outputs && d.outputs[0]) ? d.outputs[0].id : null; }
    // clamps de seguridad
    if (ctx.floor) ctx.price = Math.max(ctx.price, ctx.floor);
    if (ctx.ceiling && ctx.ceiling !== Infinity) ctx.price = Math.min(ctx.price, ctx.ceiling);
    if (d.terminal) { result.reached = true; break; }
    if (!port) break;
    const c = outConn(cur.id, port);
    if (!c) { if (cur.type !== 'producto' || nodes.length > 1) note(ctx, 'info', `El bloque "${d.name}" no tiene salida conectada.`); break; }
    cur = nodes.find(n => n.id === c.to.node);
  }
  result.ok = true;
  return finalize(result, ctx, product);
}

function finalize(result, ctx, product) {
  const price = Math.max(0, ctx.price || product.price);
  const margin = marginAt(ctx, price);
  const net = price - price * (variablePct(ctx) / 100) - fixedCost(ctx);
  const diff = price - (ctx.competitor || product.competitor);
  const diffPct = ctx.competitor ? (diff / ctx.competitor) * 100 : 0;

  // --- salud (0-100) ---
  const target = ctx.targetMarginPct || 25;
  const marginScore = clamp((margin / target) * 100, 0, 100);
  let compScore = 100;
  if (ctx.competitor) {
    if (price <= ctx.competitor) compScore = 100;
    else compScore = clamp(100 - (diffPct / 10) * 100, 0, 100);
  }
  const validScore = result.reached ? 100 : 40;
  const health = Math.round(0.5 * marginScore + 0.3 * compScore + 0.2 * validScore);

  return {
    ...result,
    price, basePrice: product.price, margin, net, competitor: ctx.competitor,
    diff, diffPct, health,
    reached: result.reached, notes: ctx.notes,
    blockCount: (RE.getState().nodes || []).length,
  };
}
