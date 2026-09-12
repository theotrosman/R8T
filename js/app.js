/* ============================================================
   R8T · app.js  (v2)
   ============================================================ */
window.CUSTOM_BLOCKS = {};
const LS_SAVE = 'r8t.save.v3';
const LS_CUSTOM = 'r8t.custom.v2';
let dirty = false, saveTimer = null, simTimer = null;

/* ---------- Toast ---------- */
function toast(msg, type = '') {
  const w = document.getElementById('toasts');
  const t = document.createElement('div');
  t.className = 'toast ' + (type === 'ok' ? 'toast--ok' : '');
  t.innerHTML = (type === 'ok' ? icon('checkc') : icon('info')) + `<span>${msg}</span>`;
  w.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(10px)'; t.style.transition = '.3s'; setTimeout(() => t.remove(), 320); }, 2600);
}
window.toast = toast;

/* ---------- Íconos ---------- */
function initIcons() {
  document.querySelectorAll('[data-ic]').forEach(el => el.insertAdjacentHTML('afterbegin', icon(el.dataset.ic)));
  document.querySelectorAll('[data-ic-chip]').forEach(el => el.insertAdjacentHTML('afterbegin', icon(el.dataset.icChip)));
}

/* ---------- Paleta ---------- */
function buildPalette(filter = '') {
  const list = document.getElementById('paletteList');
  const f = filter.trim().toLowerCase();
  list.innerHTML = '';
  CATS.forEach(cat => {
    let items = blocksByCat(cat.key);
    if (f) items = items.filter(b => (b.name + ' ' + (b.desc || '')).toLowerCase().includes(f));
    if (!items.length) return;
    const sec = document.createElement('div');
    sec.className = 'pcat';
    sec.innerHTML = `<button class="pcat__head"><span class="pcat__dot" style="background:${cat.color}"></span>${cat.name}<span class="caret">${icon('chevron')}</span></button><div class="pcat__items"></div>`;
    const wrap = sec.querySelector('.pcat__items');
    items.forEach(b => {
      const el = document.createElement('div');
      el.className = 'pblock'; el.style.setProperty('--accent', cat.color);
      el.innerHTML = `<div class="pblock__icon" style="background:${cat.color}">${icon(b.icon)}</div>
        <div style="min-width:0"><div class="pblock__name">${b.name}${b.custom ? ' <span class="chip chip--lime" style="padding:1px 6px;font-size:9px">propio</span>' : ''}</div>
        <div class="pblock__desc">${(b.desc || '').slice(0, 44)}</div></div>`;
      el.title = 'Arrastrá al flujo, o doble clic para agregar al final';
      el.addEventListener('mousedown', e => { if (e.button === 0) RE.startNewBlockDrag(b.type, e); });
      el.addEventListener('dblclick', () => { RE.addBlock(b.type, 'root'); toast(`"${b.name}" agregado`); });
      wrap.appendChild(el);
    });
    sec.querySelector('.pcat__head').addEventListener('click', () => sec.classList.toggle('collapsed'));
    list.appendChild(sec);
  });
  if (!list.children.length) list.innerHTML = `<p class="muted" style="padding:20px;text-align:center;font-size:13px">Sin resultados</p>`;
}

/* ---------- Tabs ---------- */
function initSideTabs() {
  document.querySelectorAll('.side__tab').forEach(tab => tab.addEventListener('click', () => {
    document.querySelectorAll('.side__tab').forEach(t => t.classList.toggle('is-active', t === tab));
    document.querySelectorAll('.side__pane').forEach(p => p.classList.toggle('is-active', p.id === 'pane-' + tab.dataset.tab));
  }));
}
function goTab(name) { document.querySelector(`.side__tab[data-tab="${name}"]`).click(); }

/* ---------- Destino (producto / grupo) ---------- */
function targetHTML() {
  const t = RE.getTarget();
  const opts = (t.mode === 'group' ? SAMPLE_GROUPS : SAMPLE_PRODUCTS)
    .map(o => `<option value="${o.id}" ${o.id === t.id ? 'selected' : ''}>${o.name}${o.count ? ` (${o.count} productos)` : ''}</option>`).join('');
  const info = resolveTarget(t);
  const meta = info.isGroup
    ? `Se aplica a ${info.count} publicaciones. La simulación usa un producto representativo × ${info.count}.`
    : `Costo ${money(info.product.cost)} · Precio actual ${money(info.product.price)} · Competidor ${money(info.product.competitor)} · Stock ${info.product.stock}`;
  return `
    <div class="target-card__row">
      <div class="target-card__ic">${icon('producto')}</div>
      <div style="flex:1;min-width:0">
        <div class="target-card__l">Aplicar la estrategia a</div>
        <div style="display:flex;gap:8px;align-items:center;margin-top:5px;flex-wrap:wrap">
          <span class="target-card__seg">
            <button class="target-mode ${t.mode === 'product' ? 'on' : ''}" data-mode="product">Un producto</button>
            <button class="target-mode ${t.mode === 'group' ? 'on' : ''}" data-mode="group">Un grupo</button>
          </span>
          <select class="target-select">${opts}</select>
        </div>
      </div>
    </div>
    <div class="target-card__meta">${meta}</div>`;
}
function wireTargetDelegation() {
  const flow = document.getElementById('flow');
  flow.addEventListener('change', e => {
    if (e.target.classList.contains('target-select')) { const t = RE.getTarget(); RE.setTarget({ mode: t.mode, id: e.target.value }); }
  });
  flow.addEventListener('click', e => {
    const b = e.target.closest('.target-mode'); if (!b) return;
    const mode = b.dataset.mode; const first = (mode === 'group' ? SAMPLE_GROUPS : SAMPLE_PRODUCTS)[0];
    RE.setTarget({ mode, id: first.id });
  });
}

/* ---------- Barra de explicación ---------- */
function renderExplain() {
  const box = document.getElementById('explainSteps');
  const steps = describeProgram(RE.getProgram());
  if (!steps.length) { box.innerHTML = `<div class="explain__empty">Agregá bloques y acá vas a leer, en palabras, exactamente qué hace tu estrategia.</div>`; return; }
  box.innerHTML = steps.map((s, i) => `<div class="explain__step ${s.cond ? 'cond' : ''}"><span class="explain__num">${i + 1}</span><span>${s.text}</span></div>`).join('');
}

/* ---------- Estrategias (presets) ---------- */
function renderPresets() {
  const pane = document.getElementById('pane-presets');
  const bars = (n) => `<div class="preset__bars">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</div>`;
  pane.innerHTML = `<div class="presets">
    <p class="presets__intro">Cargá una estrategia lista y ajustala a tu gusto. Cada una es un punto de partida editable.</p>
    ${STRATEGIES.map(s => `
      <div class="preset" data-id="${s.id}" style="--accent:${s.color}">
        <div class="preset__top">
          <div class="preset__emoji" style="background:${s.color}">${icon(s.icon)}</div>
          <div style="flex:1"><div class="preset__name">${s.name}</div><span class="preset__tag" style="color:${s.tagColor}">${s.tag}</span></div>
        </div>
        <p class="preset__desc">${s.desc}</p>
        <div class="preset__meta">${Object.entries(s.meters).map(([k, v]) => `<span class="preset__meter">${k} ${bars(v)}</span>`).join('')}</div>
        <div class="preset__actions"><button class="btn btn--soft btn--sm" data-act="load">Cargar</button><button class="btn btn--ghost btn--sm" data-act="insert">+ Combinar</button></div>
      </div>`).join('')}
  </div>`;
  const loadPreset = (id) => {
    const s = STRAT_MAP[id]; if (!s) return;
    const pg = s.build(); pg.target = RE.getTarget();       // conserva el destino elegido
    RE.loadProgram(pg);
    document.getElementById('stratName').value = s.name;
    toast(`Estrategia "${s.name}" cargada`, 'ok');
    goTab('result'); onGraphChange();
  };
  const insertPreset = (id) => {
    const s = STRAT_MAP[id]; if (!s) return;
    RE.insertBlocks(s.build().root);
    toast(`Bloques de "${s.name}" combinados`, 'ok');
    goTab('result');
  };
  // toda la tarjeta carga (intuitivo); los botones siguen funcionando
  pane.querySelectorAll('.preset').forEach(card => card.addEventListener('click', () => loadPreset(card.dataset.id)));
  pane.querySelectorAll('.preset [data-act="load"]').forEach(btn => btn.addEventListener('click', e => { e.stopPropagation(); loadPreset(btn.closest('.preset').dataset.id); }));
  pane.querySelectorAll('.preset [data-act="insert"]').forEach(btn => btn.addEventListener('click', e => { e.stopPropagation(); insertPreset(btn.closest('.preset').dataset.id); }));
}

/* ---------- Asistente IA (Groq vía /api/assistant) ---------- */
function escapeHtml(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function sanitizeProgram(root) {
  if (!Array.isArray(root)) return [];
  const out = [];
  root.forEach(s => {
    const d = s && blockDef(s.type); if (!d) return;
    const step = { id: 'ai' + Math.random().toString(36).slice(2, 8), type: s.type, params: {} };
    (d.params || []).forEach(pr => {
      if (s.params && s.params[pr.key] !== undefined) step.params[pr.key] = s.params[pr.key];
      if (pr.units && s.params && s.params[pr.key + 'Unit'] !== undefined) step.params[pr.key + 'Unit'] = s.params[pr.key + 'Unit'];
    });
    if (d.container) { step.branches = {}; (d.slots || []).forEach(sl => { step.branches[sl.id] = sanitizeProgram((s.branches && s.branches[sl.id]) || []); }); }
    out.push(step);
  });
  return out;
}
async function callAssistant(message, history) {
  const r = await fetch('/api/assistant', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history, strategy: describeProgram(RE.getProgram()).map(s => s.text).join(' '), program: RE.getProgram() }),
  });
  if (!r.ok) throw new Error('http ' + r.status);
  return await r.json();
}
function initChat() {
  const pane = document.getElementById('pane-chat');
  pane.innerHTML = `
    <div class="chat">
      <div class="chat__msgs" id="chatMsgs">
        <div class="chat__msg chat__msg--bot">Hola 👋 Soy el asistente de R8T. Contame qué querés lograr (ej: “ganar el BuyBox sin bajar del 12% de margen”) y te <b>armo la estrategia directo en el editor</b>.</div>
      </div>
      <div class="chat__quick">
        <button data-q="Explicame en palabras qué hace mi estrategia actual">Explicá mi estrategia</button>
        <button data-q="Mirá mi estrategia actual y sugerime mejoras concretas">Sugerí mejoras</button>
        <button data-q="Quiero vender más sin perder plata">Vender más</button>
        <button data-q="Ganar el BuyBox">Ganar BuyBox</button>
        <button data-q="Blindarme de subas de impuestos">Blindaje fiscal</button>
      </div>
      <div class="chat__input"><input id="chatInput" placeholder="Escribí lo que querés lograr…"><button class="btn btn--primary btn--icon" id="chatSend">${icon('play')}</button></div>
    </div>`;
  const msgs = pane.querySelector('#chatMsgs');
  const history = [];
  const scrollDown = () => { msgs.scrollTop = msgs.scrollHeight; const sb = document.querySelector('.side__body'); if (sb) sb.scrollTop = sb.scrollHeight; };
  const add = (role, html) => { const d = document.createElement('div'); d.className = 'chat__msg chat__msg--' + role; d.innerHTML = html; msgs.appendChild(d); requestAnimationFrame(scrollDown); setTimeout(scrollDown, 60); return d; };
  function fallback(text) {
    const l = text.toLowerCase();
    const id = (l.includes('impuesto') || l.includes('fiscal')) ? 'blindaje_fiscal' : (l.includes('margen') || l.includes('rentab')) ? 'rentabilidad' : (l.includes('buybox') || l.includes('catálogo') || l.includes('catalogo')) ? 'buybox' : (l.includes('liquid') || l.includes('rematar')) ? 'liquidacion' : (l.includes('vender') || l.includes('crecer')) ? 'crecimiento' : 'equilibrado';
    const s = STRAT_MAP[id];
    const b = add('bot', `Te recomiendo <b>${s.name}</b>: ${escapeHtml(s.desc)}<br><button class="btn btn--soft btn--sm" id="cl">Cargar "${s.name}"</button>`);
    b.querySelector('#cl').addEventListener('click', () => { const pg = s.build(); pg.target = RE.getTarget(); RE.loadProgram(pg); document.getElementById('stratName').value = s.name; onGraphChange(); toast(`Estrategia "${s.name}" cargada`, 'ok'); goTab('result'); });
  }
  async function send(text) {
    if (!text.trim()) return;
    add('user', escapeHtml(text)); history.push({ role: 'user', content: text });
    const typing = add('bot', '<span class="muted">Pensando…</span>');
    try {
      const res = await callAssistant(text, history.slice(-8));
      typing.remove();
      const reply = res.reply || 'Listo.';
      history.push({ role: 'assistant', content: reply });
      const root = res.program ? sanitizeProgram(res.program.root || res.program) : [];
      if (root.length) {
        RE.loadProgram({ target: RE.getTarget(), root });
        if (res.name) document.getElementById('stratName').value = res.name;
        onGraphChange(); goTab('result');
        add('bot', `${escapeHtml(reply)}<div class="chat__ok">${icon('checkc')} Estrategia aplicada en el editor</div>`);
        toast('Estrategia aplicada por el asistente', 'ok');
      } else {
        add('bot', escapeHtml(reply));   // solo charla, no toca el editor
      }
    } catch (err) {
      typing.remove();
      add('bot', '<span class="muted">No pude conectar con la IA acá; te sugiero una estrategia lista:</span>');
      fallback(text);
    }
  }
  pane.querySelectorAll('.chat__quick button').forEach(b => b.addEventListener('click', () => send(b.dataset.q)));
  pane.querySelector('#chatSend').addEventListener('click', () => { const i = pane.querySelector('#chatInput'); send(i.value); i.value = ''; });
  pane.querySelector('#chatInput').addEventListener('keydown', e => { if (e.key === 'Enter') { send(e.target.value); e.target.value = ''; } });
}

/* ---------- Simulación + Resultado ---------- */
/* ---------- Validación (sobria) ---------- */
function validateProgram(program) {
  const root = program.root || [];
  if (!root.length) return ['Tu estrategia está vacía: agregá bloques o cargá una lista desde “Estrategias”.'];
  const issues = [];
  const types = [];
  const walkTypes = arr => arr.forEach(s => { types.push(s.type); if (s.branches) Object.values(s.branches).forEach(walkTypes); });
  walkTypes(root);
  if (!types.includes('fijar_precio')) issues.push('Falta el bloque “Publicar precio”: la estrategia calcula pero no publica el precio.');
  const walkEmpty = arr => arr.forEach(s => {
    const d = blockDef(s.type);
    if (d && d.container && s.branches) {
      const empty = (d.slots || []).every(sl => !((s.branches[sl.id] || []).length));
      if (empty) issues.push(`El bloque “${d.name}” no tiene nada adentro (no hace nada).`);
      Object.values(s.branches).forEach(walkEmpty);
    }
  });
  walkEmpty(root);
  return issues;
}
function validationHTML() {
  const issues = validateProgram(RE.getProgram());
  if (!issues.length) return '';
  return `<div class="valid">${icon('alert')}<div class="valid__body"><b>${issues.length} ${issues.length === 1 ? 'aviso' : 'avisos'} para revisar</b>${issues.map(i => `<span>${i}</span>`).join('')}</div></div>`;
}

function runSim() {
  const tgt = resolveTarget(RE.getTarget());
  if (tgt.isGroup) renderGroupResult(RE.getProgram(), tgt);
  else renderResult(simulate(RE.getProgram(), tgt.product, 1), tgt);
  renderExplain();
}
function projChartHTML(weeks) {
  const maxP = Math.max(...weeks.map(w => Math.max(0, w.profit)), 1);
  return weeks.map(w => {
    const dim = w.units === 0;
    const h = Math.max(3, (Math.max(0, w.profit) / maxP) * 74);
    return `<div class="proj__bar ${dim ? 'dim' : ''}" title="Semana ${w.week}: ${w.units} u · ${money(w.profit)}"><i style="height:${h}px"></i><span>S${w.week}</span></div>`;
  }).join('');
}
function renderGroupResult(program, tgt) {
  const pane = document.getElementById('pane-result');
  const results = tgt.products.map(p => ({ p, r: simulate(program, p, 1) }));
  const factor = tgt.count / tgt.products.length;
  const weeks = [];
  for (let w = 0; w < 8; w++) {
    let profit = 0, units = 0; results.forEach(({ r }) => { profit += r.weeks[w].profit; units += r.weeks[w].units; });
    weeks.push({ week: w + 1, profit: profit * factor, units: Math.round(units * factor) });
  }
  const totalUnits = Math.round(results.reduce((s, { r }) => s + r.totalUnits, 0) * factor);
  const totalRevenue = results.reduce((s, { r }) => s + r.totalRevenue, 0) * factor;
  const totalProfit = results.reduce((s, { r }) => s + r.totalProfit, 0) * factor;
  const avgMargin = results.reduce((s, { r }) => s + r.margin, 0) / results.length;
  const rentables = results.filter(({ r }) => r.margin >= 5 && r.net > 0).length;
  const mColor = avgMargin < 0 ? 'var(--danger)' : avgMargin < 8 ? 'var(--warn)' : 'var(--ok)';
  const rows = results.map(({ p, r }) => {
    const c = r.diff > 1 ? 'cmp-up' : r.diff < -1 ? 'cmp-down' : 'cmp-eq';
    const mc = r.margin < 0 ? 'var(--danger)' : r.margin < 8 ? 'var(--warn)' : 'var(--ok)';
    return `<div class="gp-row"><div class="gp-n">${p.name}<span class="gp-c">costo ${money(p.cost)}</span></div>
      <div class="gp-p">${money(r.price)} <span class="gp-cmp ${c}">${r.diff >= 0 ? '+' : ''}${r.diffPct.toFixed(0)}%</span></div>
      <div class="gp-m" style="color:${mc}">${r.margin.toFixed(0)}%</div></div>`;
  }).join('');
  pane.innerHTML = `
    <div class="result">
      <div class="result__target"><div class="ic">${icon('layers')}</div><div style="flex:1;min-width:0"><div class="n">${tgt.label}</div><div class="m">${tgt.count} publicaciones · muestra de ${tgt.products.length}</div></div></div>
      <div class="gp-banner">${icon('info')}<span>La estrategia se aplica a <b>cada producto con su propio costo</b>. No hay un precio único: acá ves el precio sugerido de cada uno.</span></div>
      ${validationHTML()}
      <div class="tiles">
        <div class="tile"><div class="l">Margen promedio</div><div class="v" style="color:${mColor}">${avgMargin.toFixed(1)}%</div></div>
        <div class="tile"><div class="l">Rentables</div><div class="v">${rentables}/${results.length}</div></div>
      </div>
      <div class="section-h">${icon('precio')} Precio sugerido por producto</div>
      <div class="gp-table"><div class="gp-row gp-head"><span>Producto</span><span>Precio</span><span>Margen</span></div>${rows}</div>
      <div class="section-h">${icon('chart')} Proyección del grupo a 8 semanas <span class="est">estimación</span></div>
      <div class="proj">
        <div class="proj__chart">${projChartHTML(weeks)}</div>
        <div class="proj__totals">
          <div class="proj__t"><div class="l">Unidades</div><div class="v">${totalUnits.toLocaleString('es-AR')}</div></div>
          <div class="proj__t"><div class="l">Facturación</div><div class="v">${money(totalRevenue)}</div></div>
          <div class="proj__t"><div class="l">Ganancia</div><div class="v" style="color:${totalProfit < 0 ? 'var(--danger)' : 'var(--ok)'}">${money(totalProfit)}</div></div>
        </div>
      </div>
    </div>`;
}
function renderResult(res, tgt) {
  const pane = document.getElementById('pane-result');
  const cmpCls = res.diff > 1 ? 'cmp-up' : res.diff < -1 ? 'cmp-down' : 'cmp-eq';
  const cmpTxt = res.competitor ? `${res.diff >= 0 ? '+' : ''}${res.diffPct.toFixed(1)}% vs competidor (${money(res.competitor)})` : 'Sin competidor de referencia';
  const maxProfit = Math.max(...res.weeks.map(w => w.profit), 1);
  const bars = res.weeks.map(w => {
    const dim = w.units === 0;
    const h = Math.max(3, (w.profit / maxProfit) * 74);
    return `<div class="proj__bar ${dim ? 'dim' : ''}" title="Semana ${w.week}: ${w.units} u · ${money(w.profit)}"><i style="height:${h}px"></i><span>S${w.week}</span></div>`;
  }).join('');
  const marginColor = res.margin < 0 ? 'var(--danger)' : res.margin < 8 ? 'var(--warn)' : 'var(--ok)';
  const vIcon = res.verdict.tone === 'ok' ? 'checkc' : res.verdict.tone === 'bad' ? 'x' : res.verdict.tone === 'warn' ? 'alert' : 'info';

  pane.innerHTML = `
    <div class="result">
      <div class="result__target">
        <div class="ic">${icon(tgt.isGroup ? 'layers' : 'producto')}</div>
        <div style="flex:1;min-width:0"><div class="n">${tgt.label}</div><div class="m">${tgt.isGroup ? tgt.count + ' publicaciones' : 'Producto individual'}</div></div>
      </div>

      <div class="price-hero">
        <div class="price-hero__label">Precio sugerido</div>
        <div class="price-hero__val">${money(res.price)}</div>
        <div class="price-hero__base">antes ${money(res.basePrice)}</div>
        <div class="price-hero__cmp ${cmpCls}">${cmpTxt}</div>
      </div>

      <div class="verdict verdict--${res.verdict.tone}">
        ${icon(vIcon)}
        <div><b>${res.verdict.label}</b><span>${res.verdict.text}</span></div>
      </div>
      ${validationHTML()}

      <div class="tiles">
        <div class="tile"><div class="l">Margen neto</div><div class="v" style="color:${marginColor}">${res.margin.toFixed(1)}%</div></div>
        <div class="tile"><div class="l">Ganancia / unidad</div><div class="v">${money(res.net)}</div></div>
        <div class="tile"><div class="l">Costos por unidad</div><div class="v">${money(res.fixedUnit)}</div></div>
        <div class="tile"><div class="l">Ventas estimadas</div><div class="v">${res.unitsWeek}<span style="font-size:11px;font-weight:700;color:var(--rt-gray-400)"> /sem</span></div></div>
      </div>

      <div class="section-h">${icon('chart')} Proyección a 8 semanas <span class="est">estimación</span></div>
      <div class="proj">
        <div class="proj__chart">${bars}</div>
        <div class="proj__totals">
          <div class="proj__t"><div class="l">Unidades</div><div class="v">${res.totalUnits.toLocaleString('es-AR')}</div></div>
          <div class="proj__t"><div class="l">Facturación</div><div class="v">${money(res.totalRevenue)}</div></div>
          <div class="proj__t"><div class="l">Ganancia</div><div class="v" style="color:${res.totalProfit < 0 ? 'var(--danger)' : 'var(--ok)'}">${money(res.totalProfit)}</div></div>
        </div>
        ${res.noSales ? `<div class="proj__note">${icon('alert')}<span>A este precio casi no vas a vender: estás ${res.diffPct.toFixed(0)}% por encima del competidor.</span></div>` : ''}
        ${res.stockoutWeek ? `<div class="proj__note">${icon('alert')}<span>Con estas ventas, el stock se agota alrededor de la semana ${res.stockoutWeek}.</span></div>` : ''}
      </div>

      <details class="calc"${res.notes.length ? '' : ' style="display:none"'}>
        <summary>Ver detalle del cálculo (${res.notes.length})</summary>
        ${res.notes.map(n => { const ic = n.level === 'ok' ? 'checkc' : n.level === 'warn' ? 'alert' : n.level === 'bad' ? 'x' : 'info'; return `<div class="calc-note ${n.level}">${icon(ic)}<span>${n.text}</span></div>`; }).join('')}
      </details>
    </div>`;
}

/* ---------- Guardado ---------- */
function markDirty() { dirty = true; const s = document.getElementById('saveState'); s.classList.add('is-dirty'); document.getElementById('saveText').textContent = 'Sin guardar'; }
function markSaved() { dirty = false; const s = document.getElementById('saveState'); s.classList.remove('is-dirty'); document.getElementById('saveText').textContent = 'Guardado'; }
function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(saveAll, 900); }
function saveAll() {
  try { localStorage.setItem(LS_SAVE, JSON.stringify({ name: document.getElementById('stratName').value, program: RE.getProgram() })); markSaved(); } catch (e) {}
}
function loadCustom() { try { JSON.parse(localStorage.getItem(LS_CUSTOM) || '[]').forEach(sp => window.CUSTOM_BLOCKS[sp.type] = buildCustomDef(sp)); } catch (e) {} }
function persistCustom() { try { localStorage.setItem(LS_CUSTOM, JSON.stringify(Object.values(window.CUSTOM_BLOCKS).map(b => b.__spec).filter(Boolean))); } catch (e) {} }

/* ---------- Bloques propios ---------- */
const EFFECTS = {
  baja_pct: { label: 'Bajar el precio', unit: '%', apply: (ctx, v) => { ctx.price *= (1 - v / 100); note(ctx, 'ok', 'Bloque propio: precio bajado.'); } },
  sube_pct: { label: 'Subir el precio', unit: '%', apply: (ctx, v) => { ctx.price *= (1 + v / 100); note(ctx, 'ok', 'Bloque propio: precio subido.'); } },
  margen: { label: 'Fijar margen', unit: '%', apply: (ctx, v) => { ctx.price = priceForMargin(ctx, v); note(ctx, 'ok', 'Bloque propio: margen fijado.'); } },
  piso: { label: 'Piso de rentabilidad', unit: '%', apply: (ctx, v) => { ctx.floor = priceForMargin(ctx, v); if (ctx.price < ctx.floor) ctx.price = ctx.floor; } },
  costo: { label: 'Sumar costo fijo', unit: '$', apply: (ctx, v) => { ctx.packaging = (ctx.packaging || 0) + v; } },
};
function buildCustomDef(spec) {
  const eff = EFFECTS[spec.effect];
  return {
    cat: spec.cat, name: spec.name, icon: (CAT_MAP[spec.cat] || {}).icon || 'wand', custom: true, __spec: spec,
    desc: spec.desc || eff.label, params: [{ key: 'valor', label: eff.label, type: 'number', value: spec.value, unit: eff.unit, min: spec.min, max: spec.max, step: 1, slider: true }],
    narrate: (p) => `${eff.label.toLowerCase()} ${p.valor}${eff.unit}`,
    apply: (ctx, p) => eff.apply(ctx, p.valor),
  };
}
function openCustomModal() {
  const catOpts = CATS.filter(c => c.key !== 'accion').map(c => `<option value="${c.key}">${c.name}</option>`).join('');
  const effOpts = Object.entries(EFFECTS).map(([k, e]) => `<option value="${k}">${e.label}</option>`).join('');
  const m = document.createElement('div'); m.className = 'modal-backdrop';
  m.innerHTML = `<div class="modal">
    <div class="modal__head">${icon('wand')}<h3>Crear bloque propio</h3><button class="close" data-x>${icon('close')}</button></div>
    <div class="modal__body">
      <p class="modal__sub">Definí una regla reutilizable. Va a aparecer en la paleta para usarla en cualquier estrategia.</p>
      <div class="field"><div class="field__label">Nombre</div><input class="control" id="cbName" placeholder="Ej: Descuento fin de semana"></div>
      <div class="field"><div class="field__label">Categoría</div><select class="control" id="cbCat">${catOpts}</select></div>
      <div class="field"><div class="field__label">Qué hace</div><select class="control" id="cbEffect">${effOpts}</select></div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
        <div class="field"><div class="field__label">Valor</div><input class="control" type="number" id="cbValue" value="10"></div>
        <div class="field"><div class="field__label">Mín</div><input class="control" type="number" id="cbMin" value="0"></div>
        <div class="field"><div class="field__label">Máx</div><input class="control" type="number" id="cbMax" value="100"></div>
      </div>
    </div>
    <div class="modal__foot"><button class="btn btn--ghost" data-x>Cancelar</button><button class="btn btn--primary" id="cbCreate">${icon('plus')} Crear</button></div>
  </div>`;
  document.body.appendChild(m);
  const close = () => m.remove();
  m.querySelectorAll('[data-x]').forEach(b => b.addEventListener('click', close));
  m.addEventListener('mousedown', e => { if (e.target === m) close(); });
  m.querySelector('#cbCreate').addEventListener('click', () => {
    const spec = { type: 'custom_' + Date.now().toString(36), name: m.querySelector('#cbName').value.trim() || 'Bloque propio', cat: m.querySelector('#cbCat').value, effect: m.querySelector('#cbEffect').value, value: parseFloat(m.querySelector('#cbValue').value) || 0, min: parseFloat(m.querySelector('#cbMin').value) || 0, max: parseFloat(m.querySelector('#cbMax').value) || 100, desc: '' };
    window.CUSTOM_BLOCKS[spec.type] = buildCustomDef(spec); persistCustom(); buildPalette(document.getElementById('paletteSearch').value);
    toast(`Bloque "${spec.name}" creado`, 'ok'); close();
  });
}

/* ---------- Exportar ---------- */
function openExportModal() {
  const data = JSON.stringify({ name: document.getElementById('stratName').value, program: RE.getProgram() }, null, 2);
  const m = document.createElement('div'); m.className = 'modal-backdrop';
  m.innerHTML = `<div class="modal">
    <div class="modal__head">${icon('download')}<h3>Exportar estrategia</h3><button class="close" data-x>${icon('close')}</button></div>
    <div class="modal__body"><p class="modal__sub">Copiá este JSON para guardar o compartir. (En producción se guarda en tu cuenta de Real Trends.)</p>
      <textarea class="control" style="height:220px;font-family:monospace;font-size:12px" readonly>${data.replace(/</g, '&lt;')}</textarea></div>
    <div class="modal__foot"><button class="btn btn--ghost" data-x>Cerrar</button><button class="btn btn--primary" id="expCopy">${icon('copy')} Copiar</button></div>
  </div>`;
  document.body.appendChild(m);
  const close = () => m.remove();
  m.querySelectorAll('[data-x]').forEach(b => b.addEventListener('click', close));
  m.addEventListener('mousedown', e => { if (e.target === m) close(); });
  m.querySelector('#expCopy').addEventListener('click', () => { navigator.clipboard && navigator.clipboard.writeText(data).then(() => toast('Copiado', 'ok')); });
}

/* ---------- Activar / Nueva ---------- */
function activateStrategy() {
  const tgt = resolveTarget(RE.getTarget());
  const res = simulate(RE.getProgram(), tgt.product, tgt.scale);
  if (!res.reached) { toast('Agregá un bloque “Publicar precio” al final'); return; }
  if (res.margin < 0) { toast('El margen es negativo: revisá la estrategia'); return; }
  toast(`Estrategia activada para ${tgt.isGroup ? tgt.count + ' productos' : tgt.label}`, 'ok');
}
function starterRoot() {
  return [
    { id: 'st' + Date.now().toString(36) + 'a', type: 'comision_ml', params: {} },
    { id: 'st' + Date.now().toString(36) + 'b', type: 'impuestos_generales', params: {} },
    { id: 'st' + Date.now().toString(36) + 'c', type: 'fijar_precio', params: {} },
  ];
}
function newStrategy() {
  const t = RE.getTarget() || { mode: 'product', id: 'p1' };
  RE.loadProgram({ target: t, root: starterRoot() });
  document.getElementById('stratName').value = 'Mi estrategia';
  const el = document.getElementById('stratName'); el.focus(); el.select();   // para que se note: quedás editando el nombre
  onGraphChange();
  toast('Nueva estrategia creada', 'ok');
}

/* ---------- onChange ---------- */
function onGraphChange() { markDirty(); scheduleSave(); clearTimeout(simTimer); simTimer = setTimeout(runSim, 100); }

/* ---------- Init ---------- */
function init() {
  initIcons(); loadCustom(); buildPalette(); initSideTabs(); renderPresets(); initChat();

  RE.init({
    canvas: document.getElementById('canvas'),
    world: document.getElementById('world'),
    flow: document.getElementById('flow'),
    onChange: onGraphChange,
    targetHTML,
  });
  wireTargetDelegation();

  document.getElementById('btnNew').addEventListener('click', newStrategy);
  document.getElementById('btnSave').addEventListener('click', () => { saveAll(); toast('Guardado', 'ok'); });
  document.getElementById('btnExport').addEventListener('click', openExportModal);
  document.getElementById('btnActivate').addEventListener('click', activateStrategy);
  document.getElementById('btnCustom').addEventListener('click', openCustomModal);
  document.getElementById('stratName').addEventListener('input', () => { markDirty(); scheduleSave(); });
  document.getElementById('paletteSearch').addEventListener('input', e => buildPalette(e.target.value));
  document.getElementById('zoomIn').addEventListener('click', () => RE.zoomBy(1.1));
  document.getElementById('zoomOut').addEventListener('click', () => RE.zoomBy(1 / 1.1));
  document.getElementById('fitView').addEventListener('click', () => RE.fitView());
  document.getElementById('undoBtn').addEventListener('click', () => RE.undo());
  document.getElementById('redoBtn').addEventListener('click', () => RE.redo());
  window.addEventListener('keydown', e => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName);
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); saveAll(); toast('Guardado', 'ok'); }
    else if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); RE.undo(); }
    else if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); RE.redo(); }
    else if ((e.key === 'Delete' || e.key === 'Backspace') && !typing && RE.getState().selected) { e.preventDefault(); RE.deleteSelected(); }
  });

  // cargar autosave si existe; si no, arrancar en un proyecto nuevo (vacío)
  let loaded = false;
  try {
    const raw = JSON.parse(localStorage.getItem(LS_SAVE) || 'null');
    if (raw && raw.program && raw.program.root) { RE.loadProgram(raw.program); document.getElementById('stratName').value = raw.name || 'Mi estrategia'; loaded = true; }
  } catch (e) {}
  if (!loaded) { RE.loadProgram({ target: { mode: 'product', id: 'p1' }, root: starterRoot() }); document.getElementById('stratName').value = 'Mi estrategia'; }

  setTimeout(() => { runSim(); markSaved(); }, 120);
}
document.addEventListener('DOMContentLoaded', init);
