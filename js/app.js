/* ============================================================
   R8T · app.js  —  bootstrap y cableado de toda la app
   ============================================================ */
window.CUSTOM_BLOCKS = {};
const LS_SAVE = 'r8t.autosave.v1';
const LS_CUSTOM = 'r8t.custom.v1';
let dirty = false, saveTimer = null, simTimer = null;

/* ---------------- Toasts ---------------- */
function toast(msg, type = '') {
  const wrap = document.getElementById('toasts');
  const t = document.createElement('div');
  t.className = 'toast ' + (type === 'ok' ? 'toast--ok' : '');
  t.innerHTML = (type === 'ok' ? icon('checkc') : icon('info')) + `<span>${msg}</span>`;
  wrap.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(10px)'; t.style.transition = '.3s'; setTimeout(() => t.remove(), 320); }, 2600);
}
window.toast = toast;

/* ---------------- Íconos declarativos ---------------- */
function initIcons() {
  document.querySelectorAll('[data-ic]').forEach(el => el.insertAdjacentHTML('afterbegin', icon(el.dataset.ic)));
  document.querySelectorAll('[data-ic-chip]').forEach(el => el.insertAdjacentHTML('afterbegin', icon(el.dataset.icChip)));
}

/* ---------------- Paleta ---------------- */
function buildPalette(filter = '') {
  const list = document.getElementById('paletteList');
  const f = filter.trim().toLowerCase();
  list.innerHTML = '';
  CATS.forEach(cat => {
    let items = blocksByCat(cat.key);
    // sumar bloques propios de esta categoría
    Object.entries(window.CUSTOM_BLOCKS).forEach(([type, b]) => { if (b.cat === cat.key) items.push({ type, ...b }); });
    if (f) items = items.filter(b => (b.name + ' ' + (b.desc || '')).toLowerCase().includes(f));
    if (!items.length) return;
    const sec = document.createElement('div');
    sec.className = 'pcat';
    sec.innerHTML = `
      <button class="pcat__head"><span class="pcat__dot" style="background:${cat.color}"></span>${cat.name}<span class="caret">${icon('chevron')}</span></button>
      <div class="pcat__items"></div>`;
    const itemsWrap = sec.querySelector('.pcat__items');
    items.forEach(b => {
      const el = document.createElement('div');
      el.className = 'pblock'; el.draggable = true; el.style.setProperty('--accent', cat.color);
      el.innerHTML = `
        <div class="pblock__icon" style="background:${cat.color}">${icon(b.icon)}</div>
        <div class="pblock__body">
          <div class="pblock__name">${b.name}${b.custom ? ' <span class="chip chip--lime" style="padding:1px 6px;font-size:9px">propio</span>' : ''}</div>
          <div class="pblock__desc">${(b.desc || '').slice(0, 46)}</div>
        </div>`;
      el.addEventListener('dragstart', e => { e.dataTransfer.setData('text/r8t-block', b.type); el.classList.add('dragging'); });
      el.addEventListener('dragend', () => el.classList.remove('dragging'));
      el.addEventListener('click', () => { RE.addNodeCenter(b.type); toast(`Bloque "${b.name}" agregado`); });
      itemsWrap.appendChild(el);
    });
    sec.querySelector('.pcat__head').addEventListener('click', () => sec.classList.toggle('collapsed'));
    list.appendChild(sec);
  });
  if (!list.children.length) list.innerHTML = `<p class="muted" style="padding:20px;text-align:center;font-size:13px">Sin resultados</p>`;
}

/* ---------------- Tabs panel derecho ---------------- */
function initSideTabs() {
  document.querySelectorAll('.side__tab').forEach(tab => tab.addEventListener('click', () => {
    document.querySelectorAll('.side__tab').forEach(t => t.classList.toggle('is-active', t === tab));
    document.querySelectorAll('.side__pane').forEach(p => p.classList.toggle('is-active', p.id === 'pane-' + tab.dataset.tab));
  }));
}
function goTab(name) { document.querySelector(`.side__tab[data-tab="${name}"]`).click(); }

/* ---------------- Estrategias (presets) ---------------- */
function renderPresets() {
  const pane = document.getElementById('pane-presets');
  const bars = (n) => `<div class="preset__bars">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</div>`;
  pane.innerHTML = `<div class="presets">
    <p class="presets__intro">Cargá una estrategia lista y ajustala a tu gusto. Cada una es un punto de partida editable.</p>
    ${STRATEGIES.map(s => `
      <div class="preset" data-id="${s.id}" style="--accent:${s.color}">
        <div class="preset__top">
          <div class="preset__emoji" style="background:${s.color}">${icon(s.icon)}</div>
          <div style="flex:1">
            <div class="preset__name">${s.name}</div>
            <span class="preset__tag" style="color:${s.tagColor}">${s.tag}</span>
          </div>
        </div>
        <p class="preset__desc">${s.desc}</p>
        <div class="preset__meta">
          ${Object.entries(s.meters).map(([k, v]) => `<span class="preset__meter">${k} ${bars(v)}</span>`).join('')}
        </div>
      </div>`).join('')}
  </div>`;
  pane.querySelectorAll('.preset').forEach(card => card.addEventListener('click', () => {
    const s = STRAT_MAP[card.dataset.id];
    RE.loadGraph(s.build());
    document.getElementById('stratName').value = s.name;
    toast(`Estrategia "${s.name}" cargada`, 'ok');
    goTab('inspector');
    onGraphChange();
  }));
}

/* ---------------- Chat (placeholder fase 2, Groq) ---------------- */
function initChat() {
  const pane = document.getElementById('pane-chat');
  pane.innerHTML = `
    <div class="chat">
      <div class="chat__msgs" id="chatMsgs">
        <div class="chat__msg chat__msg--bot">¡Hola! Soy tu asistente de estrategias R8T 🤖. Cuando conectemos la API de Groq voy a poder armar y ajustar tu estrategia por vos. Por ahora te dejo ideas 👇</div>
      </div>
      <div class="chat__quick">
        <button data-q="Quiero crecer en ventas">Quiero crecer en ventas</button>
        <button data-q="Proteger mi margen">Proteger mi margen</button>
        <button data-q="Ganar el BuyBox">Ganar el BuyBox</button>
        <button data-q="Blindarme ante subas de impuestos">Blindarme de impuestos</button>
      </div>
      <p class="chat__note">${icon('info')} Fase 2: este asistente se conectará a Groq (Llama 3.3) para editar los bloques con lenguaje natural.</p>
      <div class="chat__input"><input id="chatInput" placeholder="Escribí lo que querés lograr…"><button class="btn btn--primary btn--icon" id="chatSend">${icon('play')}</button></div>
    </div>`;
  const msgs = pane.querySelector('#chatMsgs');
  const suggest = { 'Quiero crecer en ventas': 'crecimiento', 'Proteger mi margen': 'rentabilidad', 'Ganar el BuyBox': 'buybox', 'Blindarme ante subas de impuestos': 'blindaje_fiscal' };
  function botReply(text) {
    const key = Object.keys(suggest).find(k => text.toLowerCase().includes(k.toLowerCase().split(' ')[1] || k));
    const stratId = suggest[text] || (text.includes('impuesto') ? 'blindaje_fiscal' : text.includes('margen') || text.includes('rentab') ? 'rentabilidad' : text.includes('buybox') || text.includes('catálogo') ? 'buybox' : text.includes('liquid') ? 'liquidacion' : 'crecimiento');
    const s = STRAT_MAP[stratId];
    const b = document.createElement('div'); b.className = 'chat__msg chat__msg--bot';
    b.innerHTML = `Te recomiendo la estrategia <b>${s.name}</b>: ${s.desc} <br><br><button class="btn btn--soft btn--sm" id="chatLoad">Cargar "${s.name}"</button>`;
    msgs.appendChild(b); msgs.scrollTop = msgs.scrollHeight;
    b.querySelector('#chatLoad').addEventListener('click', () => { RE.loadGraph(s.build()); document.getElementById('stratName').value = s.name; onGraphChange(); toast(`Estrategia "${s.name}" cargada`, 'ok'); });
  }
  function send(text) {
    if (!text.trim()) return;
    const u = document.createElement('div'); u.className = 'chat__msg chat__msg--user'; u.textContent = text;
    msgs.appendChild(u); msgs.scrollTop = msgs.scrollHeight;
    setTimeout(() => botReply(text), 400);
  }
  pane.querySelectorAll('.chat__quick button').forEach(b => b.addEventListener('click', () => send(b.dataset.q)));
  pane.querySelector('#chatSend').addEventListener('click', () => { const i = pane.querySelector('#chatInput'); send(i.value); i.value = ''; });
  pane.querySelector('#chatInput').addEventListener('keydown', e => { if (e.key === 'Enter') { send(e.target.value); e.target.value = ''; } });
}

/* ---------------- Simulación ---------------- */
function currentProduct() {
  const id = document.getElementById('simProduct').value;
  return SAMPLE_PRODUCTS.find(p => p.id === id) || SAMPLE_PRODUCTS[0];
}
function runSim() {
  const res = simulate(RE.getGraph(), currentProduct());
  // precio
  document.getElementById('simPrice').textContent = money(res.price);
  const cmp = document.getElementById('simCmp');
  if (res.competitor) {
    const up = res.diff >= 0;
    cmp.className = 'cmp ' + (up ? 'sim-cmp-up' : 'sim-cmp-down');
    cmp.textContent = `${up ? '+' : ''}${res.diffPct.toFixed(1)}% vs competidor`;
  } else cmp.textContent = '';
  // margen / ganancia
  const m = document.getElementById('simMargin');
  m.textContent = res.margin.toFixed(1) + '%';
  m.style.color = res.margin < 0 ? 'var(--danger)' : res.margin < 8 ? 'var(--warn)' : 'var(--ok)';
  document.getElementById('simProfit').textContent = money(res.net);
  // salud
  const fill = document.getElementById('simHealthFill');
  fill.style.width = res.health + '%';
  fill.style.background = res.health >= 66 ? 'var(--ok)' : res.health >= 40 ? 'var(--warn)' : 'var(--danger)';
  document.getElementById('simHealthTxt').textContent = res.health + '%';
  // notas
  const notes = document.getElementById('simNotes');
  notes.innerHTML = (res.notes || []).slice(-5).map(n => {
    const ic = n.level === 'ok' ? 'checkc' : n.level === 'warn' ? 'alert' : n.level === 'bad' ? 'x' : 'info';
    return `<div class="sim-note ${n.level}">${icon(ic)}<span>${n.text}</span></div>`;
  }).join('') || `<div class="sim-note"><span class="muted">Conectá bloques para ver el cálculo.</span></div>`;
  // refrescar nodo producto y gamificación
  refreshProducto();
  updateXP(res);
}
function refreshProducto() {
  const st = RE.getState();
  const pn = st.nodes.find(n => n.type === 'producto'); if (!pn) return;
  const el = document.querySelector(`.node[data-id="${pn.id}"] .node__body`); if (!el) return;
  const summ = BLOCKS.producto.summary({}, window.__lastCtx) || [];
  el.innerHTML = summ.map(r => `<div class="node__row"><span class="k">${r[0]}</span><span class="v accent">${r[1]}</span></div>`).join('');
}

/* ---------------- Gamificación (nivel / XP) ---------------- */
const LEVELS = [[0, 'Aprendiz'], [45, 'Vendedor'], [60, 'Estratega'], [75, 'Experto'], [88, 'Maestro repricer']];
function updateXP(res) {
  const nodes = RE.getState().nodes.length;
  const health = res.health || 0;
  // score = salud + bonus por complejidad
  const score = Math.min(100, Math.round(health * 0.8 + Math.min(nodes, 10) * 2));
  let lvl = 1, title = 'Aprendiz';
  LEVELS.forEach((l, i) => { if (score >= l[0]) { lvl = i + 1; title = l[1]; } });
  document.getElementById('xpRing').style.setProperty('--xp', score + '%');
  document.getElementById('xpLvl').textContent = lvl;
  document.getElementById('xpTitle').textContent = title;
  document.getElementById('xpHealth').textContent = 'Salud ' + health + '%';
}

/* ---------------- Guardado ---------------- */
function markDirty() { dirty = true; const s = document.getElementById('saveState'); s.classList.add('is-dirty'); document.getElementById('saveText').textContent = 'Sin guardar'; }
function markSaved() { dirty = false; const s = document.getElementById('saveState'); s.classList.remove('is-dirty'); document.getElementById('saveText').textContent = 'Guardado'; }
function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(saveAll, 900); }
function saveAll() {
  try {
    localStorage.setItem(LS_SAVE, JSON.stringify({ name: document.getElementById('stratName').value, graph: RE.getGraph() }));
    markSaved();
  } catch (e) { /* almacenamiento no disponible */ }
}
function loadCustom() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_CUSTOM) || '[]');
    raw.forEach(spec => { window.CUSTOM_BLOCKS[spec.type] = buildCustomDef(spec); });
  } catch (e) {}
}
function persistCustom() {
  const specs = Object.values(window.CUSTOM_BLOCKS).map(b => b.__spec).filter(Boolean);
  try { localStorage.setItem(LS_CUSTOM, JSON.stringify(specs)); } catch (e) {}
}

/* ---------------- Bloques propios ---------------- */
const EFFECTS = {
  baja_pct: { label: 'Bajar el precio un %', unit: '%', apply: (ctx, v) => { ctx.price *= (1 - v / 100); note(ctx, 'ok', 'Bloque propio: precio bajado.'); } },
  sube_pct: { label: 'Subir el precio un %', unit: '%', apply: (ctx, v) => { ctx.price *= (1 + v / 100); note(ctx, 'ok', 'Bloque propio: precio subido.'); } },
  margen: { label: 'Fijar margen objetivo', unit: '%', apply: (ctx, v) => { ctx.price = priceForMargin(ctx, v); note(ctx, 'ok', 'Bloque propio: margen fijado.'); } },
  piso: { label: 'Piso de rentabilidad', unit: '%', apply: (ctx, v) => { ctx.floor = priceForMargin(ctx, v); if (ctx.price < ctx.floor) ctx.price = ctx.floor; } },
  costo: { label: 'Sumar un costo fijo ($)', unit: '$', apply: (ctx, v) => { ctx.packaging = (ctx.packaging || 0) + v; } },
};
function buildCustomDef(spec) {
  const eff = EFFECTS[spec.effect];
  const def = {
    cat: spec.cat, name: spec.name, icon: (CAT_MAP[spec.cat] || {}).icon || 'wand', custom: true, __spec: spec,
    desc: spec.desc || eff.label, inputs: 1, outputs: [{ id: 'out' }],
    params: [{ key: 'valor', label: eff.label, type: 'number', value: spec.value, unit: eff.unit, min: spec.min, max: spec.max, step: spec.step, slider: true }],
    summary: (p) => [[eff.label.split(' ')[0], p.valor + eff.unit]],
    apply: (ctx, p) => eff.apply(ctx, p.valor),
  };
  return def;
}
function openCustomModal() {
  const catOpts = CATS.filter(c => c.key !== 'producto' && c.key !== 'accion').map(c => `<option value="${c.key}">${c.name}</option>`).join('');
  const effOpts = Object.entries(EFFECTS).map(([k, e]) => `<option value="${k}">${e.label}</option>`).join('');
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal__head">${icon('wand')}<h3>Crear bloque propio</h3><button class="close" data-x>${icon('close')}</button></div>
      <div class="modal__body">
        <p class="modal__sub">Definí una regla reutilizable con los parámetros que quieras. Aparecerá en la paleta para arrastrarla a cualquier estrategia.</p>
        <div class="field"><div class="field__label">Nombre</div><input class="control" id="cbName" placeholder="Ej: Descuento fin de semana"></div>
        <div class="field"><div class="field__label">Categoría</div><select class="control" id="cbCat">${catOpts}</select></div>
        <div class="field"><div class="field__label">Qué hace (regla)</div><select class="control" id="cbEffect">${effOpts}</select></div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
          <div class="field"><div class="field__label">Valor</div><input class="control" type="number" id="cbValue" value="10"></div>
          <div class="field"><div class="field__label">Mín</div><input class="control" type="number" id="cbMin" value="0"></div>
          <div class="field"><div class="field__label">Máx</div><input class="control" type="number" id="cbMax" value="100"></div>
        </div>
        <div class="field"><div class="field__label">Descripción (opcional)</div><input class="control" id="cbDesc" placeholder="Para qué sirve este bloque"></div>
      </div>
      <div class="modal__foot">
        <button class="btn btn--ghost" data-x>Cancelar</button>
        <button class="btn btn--primary" id="cbCreate">${icon('plus')} Crear bloque</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelectorAll('[data-x]').forEach(b => b.addEventListener('click', close));
  modal.addEventListener('mousedown', e => { if (e.target === modal) close(); });
  modal.querySelector('#cbCreate').addEventListener('click', () => {
    const name = modal.querySelector('#cbName').value.trim() || 'Bloque propio';
    const spec = {
      type: 'custom_' + Date.now().toString(36),
      name, cat: modal.querySelector('#cbCat').value, effect: modal.querySelector('#cbEffect').value,
      value: parseFloat(modal.querySelector('#cbValue').value) || 0,
      min: parseFloat(modal.querySelector('#cbMin').value) || 0,
      max: parseFloat(modal.querySelector('#cbMax').value) || 100,
      step: 1, desc: modal.querySelector('#cbDesc').value.trim(),
    };
    window.CUSTOM_BLOCKS[spec.type] = buildCustomDef(spec);
    persistCustom(); buildPalette(document.getElementById('paletteSearch').value);
    toast(`Bloque "${name}" creado`, 'ok'); close();
  });
}

/* ---------------- Exportar ---------------- */
function openExportModal() {
  const data = JSON.stringify({ name: document.getElementById('stratName').value, graph: RE.getGraph() }, null, 2);
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal__head">${icon('download')}<h3>Exportar estrategia</h3><button class="close" data-x>${icon('close')}</button></div>
      <div class="modal__body">
        <p class="modal__sub">Copiá este JSON para guardar o compartir tu estrategia. (En producción se guardará en tu cuenta de Real Trends.)</p>
        <textarea class="control" style="height:220px;font-family:monospace;font-size:12px" readonly>${data.replace(/</g, '&lt;')}</textarea>
      </div>
      <div class="modal__foot">
        <button class="btn btn--ghost" data-x>Cerrar</button>
        <button class="btn btn--primary" id="expCopy">${icon('copy')} Copiar</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelectorAll('[data-x]').forEach(b => b.addEventListener('click', close));
  modal.addEventListener('mousedown', e => { if (e.target === modal) close(); });
  modal.querySelector('#expCopy').addEventListener('click', () => {
    navigator.clipboard && navigator.clipboard.writeText(data).then(() => toast('Copiado al portapapeles', 'ok'));
  });
}

/* ---------------- Activar ---------------- */
function activateStrategy() {
  const res = simulate(RE.getGraph(), currentProduct());
  if (!RE.getState().nodes.some(n => n.type === 'producto')) { toast('Falta el bloque Producto'); return; }
  if (!res.reached) { toast('La estrategia no llega a "Fijar precio final"'); return; }
  if (res.margin < 0) { toast('⚠ El margen es negativo, revisá la estrategia'); return; }
  toast('✓ Estrategia activada — aplicando a tus publicaciones', 'ok');
}

/* ---------------- New ---------------- */
function newStrategy() {
  if (dirty && !confirm('Tenés cambios sin guardar. ¿Empezar una estrategia nueva igual?')) return;
  RE.loadGraph({ nodes: [{ id: 'start', type: 'producto', x: 160, y: 260, params: {} }], connections: [] });
  document.getElementById('stratName').value = 'Mi estrategia';
  onGraphChange();
}

/* ---------------- onChange central ---------------- */
function onGraphChange() { markDirty(); scheduleSave(); clearTimeout(simTimer); simTimer = setTimeout(runSim, 120); }

/* ---------------- Init ---------------- */
function init() {
  initIcons();
  loadCustom();
  buildPalette();
  initSideTabs();
  renderPresets();
  initChat();

  // simulador: opciones de producto
  const sel = document.getElementById('simProduct');
  sel.innerHTML = SAMPLE_PRODUCTS.map(p => `<option value="${p.id}">${p.name} · costo ${money(p.cost)}</option>`).join('');
  sel.addEventListener('change', runSim);

  Inspector.mount(document.getElementById('pane-inspector'));

  RE.init({
    canvas: document.getElementById('canvas'),
    world: document.getElementById('world'),
    edges: document.getElementById('edges'),
    hint: document.getElementById('canvasHint'),
    onSelect: node => Inspector.render(node),
    onChange: onGraphChange,
  });

  // header
  document.getElementById('btnNew').addEventListener('click', newStrategy);
  document.getElementById('btnSave').addEventListener('click', () => { saveAll(); toast('Estrategia guardada', 'ok'); });
  document.getElementById('btnExport').addEventListener('click', openExportModal);
  document.getElementById('btnActivate').addEventListener('click', activateStrategy);
  document.getElementById('btnCustom').addEventListener('click', openCustomModal);
  document.getElementById('stratName').addEventListener('input', () => { markDirty(); scheduleSave(); });

  // paleta buscador
  document.getElementById('paletteSearch').addEventListener('input', e => buildPalette(e.target.value));

  // controles canvas
  document.getElementById('zoomIn').addEventListener('click', () => RE.zoomBy(1.2));
  document.getElementById('zoomOut').addEventListener('click', () => RE.zoomBy(1 / 1.2));
  document.getElementById('fitView').addEventListener('click', () => RE.fitView());
  document.getElementById('simToggle').addEventListener('click', () => document.getElementById('simbar').classList.toggle('collapsed'));

  // atajos
  window.addEventListener('keydown', e => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && RE.getState().selected && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA' && document.activeElement.tagName !== 'SELECT') { RE.deleteSelected(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveAll(); toast('Guardado', 'ok'); }
  });

  // cargar autosave o estrategia por defecto
  let loaded = false;
  try {
    const raw = JSON.parse(localStorage.getItem(LS_SAVE) || 'null');
    if (raw && raw.graph && raw.graph.nodes && raw.graph.nodes.length) {
      RE.loadGraph(raw.graph);
      document.getElementById('stratName').value = raw.name || 'Mi estrategia';
      loaded = true;
    }
  } catch (e) {}
  if (!loaded) { RE.loadGraph(STRAT_MAP.crecimiento.build()); document.getElementById('stratName').value = 'Crecimiento'; }

  setTimeout(() => { runSim(); markSaved(); }, 120);
}

document.addEventListener('DOMContentLoaded', init);
