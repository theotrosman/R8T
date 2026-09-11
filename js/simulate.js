/* ============================================================
   R8T · simulate.js  (v2)
   Recorre el programa (árbol) aplicando cada bloque al contexto
   de precio, y devuelve métricas serias + proyección a futuro.
   ============================================================ */

function seedCtx(product) {
  return {
    cost: product.cost, basePrice: product.price, price: product.price,
    competitor: product.competitor, stock: product.stock, visits: product.visits,
    competitors: product.competitors ?? 6, daysNoSale: product.daysNoSale ?? 0, salesWeek: product.salesWeek ?? 0,
    commissionPct: 13, fixedFee: 1095, ivaPct: 21, iibbPct: 0, taxExtraPct: 0,
    installmentPct: 0, promoPct: 0, returnReservePct: 0, retencionPct: 0,
    shipping: 0, packaging: 0, floor: 0, ceiling: Infinity,
    targetMarginPct: null, minMarginPct: null, final: false, paused: null, notes: [],
  };
}

function execStack(stack, ctx, depth) {
  if (depth > 60) return;
  for (const step of stack) {
    const d = blockDef(step.type); if (!d) continue;
    const p = RE.mergedParams(step);
    if (d.container && d.exec) {
      d.exec(ctx, p, (slot) => execStack((step.branches && step.branches[slot]) || [], ctx, depth + 1));
    } else if (d.apply) {
      d.apply(ctx, p);
    }
    if (ctx.floor) ctx.price = Math.max(ctx.price, ctx.floor);
    if (ctx.ceiling && ctx.ceiling !== Infinity) ctx.price = Math.min(ctx.price, ctx.ceiling);
  }
}

function simulate(program, product, scale = 1) {
  const ctx = seedCtx(product);
  execStack(program.root || [], ctx, 0);

  const price = Math.max(0, ctx.price || product.price);
  const varPct = variablePct(ctx);
  const net = price - price * (varPct / 100) - fixedCost(ctx);   // ganancia por unidad
  const margin = price > 0 ? (net / price) * 100 : -999;
  const competitor = ctx.competitor || product.competitor;
  const diff = price - competitor;
  const diffPct = competitor ? (diff / competitor) * 100 : 0;

  /* ---------- Proyección a futuro (8 semanas) ---------- */
  const weeklyVisits = (product.visits || 400) / 4;
  const ratio = competitor > 0 ? competitor / price : 1;
  const conv = clamp(0.03 * Math.pow(ratio, 2.2), 0.002, 0.30);   // más barato ⇒ más conversión
  const unitsWeekOne = ctx.paused ? 0 : Math.max(0, weeklyVisits * conv) * scale;
  const stockTotal = (product.stock || 0) * scale;

  const weeks = []; let cum = 0, soldTotal = 0, stockoutWeek = null;
  for (let w = 1; w <= 8; w++) {
    let u = unitsWeekOne;
    if (stockTotal > 0 && soldTotal + u > stockTotal) { u = Math.max(0, stockTotal - soldTotal); if (stockoutWeek === null && u < unitsWeekOne) stockoutWeek = w; }
    soldTotal += u; const profit = u * net; cum += profit;
    weeks.push({ week: w, units: Math.round(u), revenue: u * price, profit });
  }
  const totalUnits = Math.round(soldTotal);
  const totalRevenue = soldTotal * price;
  const totalProfit = cum;

  /* ---------- Diagnóstico (serio, sin "salud") ---------- */
  const minM = ctx.minMarginPct != null ? ctx.minMarginPct : 5;
  const tgtM = ctx.targetMarginPct != null ? ctx.targetMarginPct : 20;
  let verdict;
  if (ctx.paused) verdict = { key: 'pausa', label: ctx.paused === 'definitivo' ? 'Pausada (definitiva)' : 'Pausada (temporal)', tone: 'warn', text: 'La publicación se pausa: no genera ventas mientras esté pausada.' };
  else if (margin < minM || net <= 0) verdict = { key: 'riesgo', label: 'No rentable', tone: 'bad', text: `El margen (${margin.toFixed(1)}%) queda por debajo de tu mínimo.` };
  else if (competitor && diffPct > 12) verdict = { key: 'caro', label: 'Poco competitivo', tone: 'warn', text: `Estás ${diffPct.toFixed(0)}% más caro que el competidor: vas a vender poco.` };
  else if (competitor && price <= competitor && margin >= tgtM) verdict = { key: 'optima', label: 'Óptima', tone: 'ok', text: 'Competitiva y rentable: buen equilibrio.' };
  else verdict = { key: 'ok', label: 'Aceptable', tone: 'info', text: 'Precio razonable; revisá margen y competitividad.' };

  return {
    price, basePrice: product.price, cost: product.cost, competitor,
    net, margin, varPct, fixedUnit: fixedCost(ctx), diff, diffPct,
    unitsWeek: Math.round(unitsWeekOne), weeks, totalUnits, totalRevenue, totalProfit, stockoutWeek, stockTotal,
    verdict, notes: ctx.notes, reached: ctx.final, paused: ctx.paused,
  };
}
