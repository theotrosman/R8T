/* ============================================================
   R8T · app.js  (v2)
   ============================================================ */
window.CUSTOM_BLOCKS = {};
const LS_SAVE = 'r8t.save.v2';
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
      el.className = 'pblock'; el.draggable = true; el.style.setProperty('--accent', cat.color);
      el.innerHTML = `<div class="pblock__icon" style="background:${cat.color}">${icon(b.icon)}</div>
        <div style="min-width:0"><div class="pblock__name">${b.name}${b.custom ? ' <span class="chip chip--lime" style="padding:1px 6px;font-size:9px">propio</span>' : ''}</div>
        <div class="pblock__desc">${(b.desc || '').slice(0, 44)}</div></div>`;
      el.addEventListener('dragstart', e => { e.dataTransfer.setData('text/r8t-block', b.type); e.dataTransfer.effectAllowed = 'copy'; el.classList.add('dragging'); });
      el.addEventListener('dragend', () => el.classList.remove('dragging'));
      el.addEventListener('click', () => { RE.addBlock(b.type, 'root'); toast(`"${b.name}" agregado`); });
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
      </div>`).join('')}
  </div>`;
  pane.querySelectorAll('.preset').forEach(card => card.addEventListener('click', () => {
    const s = STRAT_MAP[card.dataset.id];
    const pg = s.build(); pg.target = RE.getTarget();       // conserva el destino elegido
    RE.loadProgram(pg);
    document.getElementById('stratName').value = s.name;
    toast(`Estrategia "${s.name}" cargada`, 'ok');
    goTab('result'); onGraphChange();
  }));
}

/* ---------- Asistente (placeholder Groq) ---------- */
function initChat() {
  const pane = document.getElementById('pane-chat');
  pane.innerHTML = `
    <div class="chat">
      <div class="chat__msgs" id="chatMsgs">
        <div class="chat__msg chat__msg--bot">Hola 👋 Soy el asistente de R8T. Contame qué querés lograr y te armo la estrategia. (Pronto voy a poder editar los bloques por vos con IA.)</div>
      </div>
      <div class="chat__quick">
        <button data-q="Quiero vender más">Vender más</button>
        <button data-q="Proteger mi margen">Proteger margen</button>
        <button data-q="Ganar el BuyBox">Ganar BuyBox</button>
        <button data-q="Blindarme de subas de impuestos">Blindaje fiscal</button>
      </div>
      <div class="chat__note">${icon('info')} <span>Fase 2: el asistente se conectará a Groq (Llama 3.3) para editar los bloques con lenguaje natural.</span></div>
      <div class="chat__input"><input id="chatInput" placeholder="Escribí lo que querés lograr…"><button class="btn btn--primary btn--icon" id="chatSend">${icon('play')}</button></div>
    </div>`;
  const msgs = pane.querySelector('#chatMsgs');
  const pick = (text) => {
    const l = text.toLowerCase();
    if (l.includes('impuesto') || l.includes('fiscal')) return 'blindaje_fiscal';
    if (l.includes('margen') || l.includes('rentab') || l.includes('ganar plata')) return 'rentabilidad';
    if (l.includes('buybox') || l.includes('catálogo') || l.includes('catalogo')) return 'buybox';
    if (l.includes('liquid') || l.includes('rematar') || l.includes('stock')) return 'liquidacion';
    if (l.includes('vender') || l.includes('crecer')) return 'crecimiento';
    return 'equilibrado';
  };
  function bot(text) {
    const s = STRAT_MAP[pick(text)];
    const b = document.createElement('div'); b.className = 'chat__msg chat__msg--bot';
    b.innerHTML = `Te recomiendo <b>${s.name}</b>: ${s.desc}<br><button class="btn btn--soft btn--sm" id="cl">Cargar "${s.name}"</button>`;
    msgs.appendChild(b); msgs.scrollTop = msgs.scrollHeight;
    b.querySelector('#cl').addEventListener('click', () => { const pg = s.build(); pg.target = RE.getTarget(); RE.loadProgram(pg); document.getElementById('stratName').value = s.name; onGraphChange(); toast(`Estrategia "${s.name}" cargada`, 'ok'); });
  }
  function send(text) { if (!text.trim()) return; const u = document.createElement('div'); u.className = 'chat__msg chat__msg--user'; u.textContent = text; msgs.appendChild(u); msgs.scrollTop = msgs.scrollHeight; setTimeout(() => bot(text), 350); }
  pane.querySelectorAll('.chat__quick button').forEach(b => b.addEventListener('click', () => send(b.dataset.q)));
  pane.querySelector('#chatSend').addEventListener('click', () => { const i = pane.querySelector('#chatInput'); send(i.value); i.value = ''; });
  pane.querySelector('#chatInput').addEventListener('keydown', e => { if (e.key === 'Enter') { send(e.target.value); e.target.value = ''; } });
}

/* ---------- Simulación + Resultado ---------- */
function runSim() {
  const tgt = resolveTarget(RE.getTarget());
  const res = simulate(RE.getProgram(), tgt.product, tgt.scale);
  renderResult(res, tgt);
  renderExplain();
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
function newStrategy() {
  const t = RE.getTarget();
  RE.loadProgram({ target: t, root: [{ id: 's0', type: 'comision_ml', params: {} }, { id: 's1', type: 'fijar_precio', params: {} }] });
  document.getElementById('stratName').value = 'Mi estrategia'; onGraphChange();
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
  window.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveAll(); toast('Guardado', 'ok'); } });

  // cargar autosave o estrategia por defecto (Equilibrado, para ver el anidado)
  let loaded = false;
  try {
    const raw = JSON.parse(localStorage.getItem(LS_SAVE) || 'null');
    if (raw && raw.program && raw.program.root && raw.program.root.length) { RE.loadProgram(raw.program); document.getElementById('stratName').value = raw.name || 'Mi estrategia'; loaded = true; }
  } catch (e) {}
  if (!loaded) { RE.loadProgram(STRAT_MAP.equilibrado.build()); document.getElementById('stratName').value = 'Equilibrado (inteligente)'; }

  setTimeout(() => { runSim(); markSaved(); }, 120);
}
document.addEventListener('DOMContentLoaded', init);
