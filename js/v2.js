/* ============================================================
   R8T · v2.js  —  Asistente-first (versión simplificada)
   ------------------------------------------------------------
   Foco en el chatbot para armar estrategias. El editor de
   bloques queda disponible como "modo avanzado" en un panel.
   Reutiliza el motor existente: blocks · strategies · editor (RE)
   · simulate · icons.  NO carga app.js (esta es su propia app).
   ============================================================ */
window.CUSTOM_BLOCKS = window.CUSTOM_BLOCKS || {};
const LS_V2      = 'r8t.v2.strategies';   // estrategias guardadas del usuario
const LS_V2_SAVE = 'r8t.save.v3';         // compartido con el editor completo (index.html)
const LS_V2_RUN  = 'r8t.v2.running';      // estrategias que están "corriendo" (activadas)
const LS_CUSTOM  = 'r8t.custom.v2';       // bloques propios (compartido)

let myStrategies = [];
let running = [];   // [{ id, target:{mode,id}, since }]
let pasadaTarget = { mode: 'product', id: 'p1' };
let editorInited = false, editorCtx = { id: null };

/* ---------- utilidades ---------- */
function toast(msg, type = '') {
  const w = document.getElementById('toasts');
  const t = document.createElement('div');
  t.className = 'toast ' + (type === 'ok' ? 'toast--ok' : '');
  t.innerHTML = (type === 'ok' ? icon('checkc') : icon('info')) + `<span>${msg}</span>`;
  w.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(10px)'; t.style.transition = '.3s'; setTimeout(() => t.remove(), 320); }, 2600);
}
window.toast = toast;
function escapeHtml(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function uid() { return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function initIcons() { document.querySelectorAll('[data-ic]').forEach(el => el.insertAdjacentHTML('afterbegin', icon(el.dataset.ic))); }

/* ---------- persistencia de estrategias del usuario ---------- */
function loadMine() { try { myStrategies = JSON.parse(localStorage.getItem(LS_V2) || '[]'); } catch (e) { myStrategies = []; } }
function persistMine() { try { localStorage.setItem(LS_V2, JSON.stringify(myStrategies)); } catch (e) {} }
function loadCustom() { try { JSON.parse(localStorage.getItem(LS_CUSTOM) || '[]').forEach(sp => window.CUSTOM_BLOCKS[sp.type] = buildCustomDef(sp)); } catch (e) {} }
function persistCustom() { try { localStorage.setItem(LS_CUSTOM, JSON.stringify(Object.values(window.CUSTOM_BLOCKS).map(b => b.__spec).filter(Boolean))); } catch (e) {} }

function saveStrategy(strat) {
  const existing = strat.id ? myStrategies.find(s => s.id === strat.id) : null;
  if (existing) {
    existing.name = strat.name; existing.program = strat.program; existing.tag = strat.tag; existing.updatedAt = Date.now();
  } else {
    strat.id = uid(); strat.updatedAt = Date.now();
    myStrategies.unshift({ id: strat.id, name: strat.name, program: strat.program, tag: strat.tag || 'IA', updatedAt: strat.updatedAt });
  }
  persistMine(); renderMine();
  return strat.id;
}
function deleteStrategy(id) { myStrategies = myStrategies.filter(s => s.id !== id); stopRunning(id, true); persistMine(); renderMine(); }
function clone(o) { return JSON.parse(JSON.stringify(o)); }

/* ---------- "Corriendo" (estrategias activadas) ---------- */
function loadRunning() { try { running = JSON.parse(localStorage.getItem(LS_V2_RUN) || '[]'); } catch (e) { running = []; } }
function persistRunning() { try { localStorage.setItem(LS_V2_RUN, JSON.stringify(running)); } catch (e) {} }
function isRunning(id) { return !!id && running.some(r => r.id === id); }
function startRunning(id, target) {
  if (!id) return;
  const r = running.find(x => x.id === id);
  if (r) r.target = clone(target); else running.push({ id, target: clone(target), since: Date.now() });
  persistRunning();
}
function stopRunning(id, silent) { const before = running.length; running = running.filter(r => r.id !== id); if (running.length !== before) persistRunning(); if (!silent) renderMine(); }

/* ============================================================
   Explicación en lenguaje natural (reutiliza describeProgram)
   ============================================================ */
function explainListHTML(program, max = 0) {
  let steps = describeProgram(program);
  if (!steps.length) return `<div class="explain__empty">Todavía sin bloques.</div>`;
  let extra = '';
  if (max && steps.length > max) { extra = `<div class="qh__more">+${steps.length - max} pasos más</div>`; steps = steps.slice(0, max); }
  return steps.map((s, i) => `<div class="qh__step ${s.cond ? 'cond' : ''}"><span class="qh__num">${i + 1}</span><span>${s.text}</span></div>`).join('') + extra;
}

/* ============================================================
   CHAT (asistente) — igual criterio que v1, con tarjetas de estrategia
   ============================================================ */
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
async function callAssistant(message, history, program) {
  const r = await fetch('/api/assistant', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history, strategy: describeProgram(program).map(s => s.text).join(' '), program }),
  });
  if (!r.ok) throw new Error('http ' + r.status);
  return await r.json();
}

/* Detecta un link de publicación (URL o id MLA…) en el texto del usuario */
function extractLink(text) {
  const m = String(text).match(/https?:\/\/\S+/i) || String(text).match(/\b(ML[A-Z]-?\d{6,})\b/i);
  return m ? m[0].replace(/[)\].,]+$/, '') : '';
}
/* Programa base para "seguir a esta publicación" */
function followRoot(link, off) {
  const seguir = { link, modo: 'debajo', offset: 100, offsetUnit: '$', respetarPiso: true };
  if (off) { seguir.offset = off.offset; seguir.offsetUnit = off.offsetUnit; }
  return [
    { id: uid(), type: 'comision_ml', params: {} },
    { id: uid(), type: 'piso_rentabilidad', params: { min: 10 } },
    { id: uid(), type: 'seguir_competidor', params: seguir },
    { id: uid(), type: 'redondeo', params: { modo: 'psy' } },
    { id: uid(), type: 'fijar_precio', params: { frecuencia: '15' } },
  ];
}
/* Garantiza que, si hay link, el bloque seguir_competidor lo tenga cargado */
function ensureFollowLink(root, link) {
  let found = false;
  const walk = arr => arr.forEach(s => {
    if (s.type === 'seguir_competidor') { found = true; s.params = s.params || {}; if (!s.params.link) s.params.link = link; }
    if (s.branches) Object.values(s.branches).forEach(walk);
  });
  walk(root);
  if (!found) {
    const blk = { id: uid(), type: 'seguir_competidor', params: { link, modo: 'debajo', offset: 100, offsetUnit: '$', respetarPiso: true } };
    const i = root.findIndex(s => s.type === 'fijar_precio');
    if (i >= 0) root.splice(i, 0, blk); else root.push(blk);
  }
  return root;
}

/* ---------- Nombres de estrategia lindos ---------- */
function cleanName(s) {
  s = String(s || '').trim().replace(/^["'“”]+|["'“”]+$/g, '');
  s = s.replace(/([a-záéíóúñ])(\d)/gi, '$1 $2').replace(/(\d)([a-záéíóúñ])/gi, '$1 $2'); // "Bajo0.5%" -> "Bajo 0.5 %"
  s = s.replace(/(\d)\s+%/g, '$1%').replace(/(\d)\.(\d)/g, '$1,$2');                      // "0.5 %" -> "0,5%"
  s = s.replace(/\s+/g, ' ').trim();
  if (s) s = s.charAt(0).toUpperCase() + s.slice(1);
  return s;
}
function isBadName(s) {
  s = String(s || '').trim();
  if (!s || s.length < 3) return true;
  if (/^(estrategia|estrategia sugerida|sin nombre|nueva estrategia|mi estrategia)$/i.test(s)) return true;
  return false;
}
function fmtOffset(p) {
  const u = p.offsetUnit || '$'; const v = +p.offset || 0;
  return u === '%' ? String(v).replace('.', ',') + '%' : money(v);
}
/* Deriva un título claro a partir de los bloques de la estrategia */
function nameFromProgram(root) {
  const flat = []; const walk = a => a.forEach(s => { flat.push(s); if (s.branches) Object.values(s.branches).forEach(walk); }); walk(root || []);
  const find = t => flat.find(s => s.type === t);
  let s;
  if ((s = find('seguir_competidor') || find('igualar_competencia'))) {
    const p = RE.mergedParams(s);
    if (p.modo === 'igualar') return 'Igualar al competidor';
    return `${fmtOffset(p)} ${p.modo === 'encima' ? 'sobre' : 'bajo'} el competidor`;
  }
  if (find('ganar_buybox')) return 'Ganar el BuyBox';
  if (find('liquidacion')) return 'Liquidación de stock';
  if ((s = find('margen_objetivo'))) return `Margen objetivo ${RE.mergedParams(s).target}%`;
  if (find('regla_stock')) return 'Precio según stock';
  if (find('cambio_impuesto')) return 'Blindaje fiscal';
  if (find('techo_precio')) return 'Rentabilidad máxima';
  return 'Estrategia de precios';
}
/* Elige el mejor nombre: el del bot si sirve, si no uno derivado del programa */
function bestName(aiName, root) {
  const clean = cleanName(aiName);
  const derived = nameFromProgram(root);
  if (isBadName(clean)) return derived;
  // si el bot devolvió algo genérico o "pegado", preferimos el derivado
  if (/^bajo\b/i.test(clean) || clean.split(' ').length < 2) return derived;
  return clean;
}
/* Extrae un offset del texto del usuario (ej "0,5% por debajo", "$200 abajo") */
function extractOffset(text) {
  const t = String(text).toLowerCase();
  let m = t.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (m) return { offset: parseFloat(m[1].replace(',', '.')), offsetUnit: '%' };
  m = t.match(/\$\s*(\d+(?:[.,]\d+)?)/) || t.match(/(\d+(?:[.,]\d+)?)\s*(?:pesos|ars|\$)/);
  if (m) return { offset: parseFloat(m[1].replace(/\./g, '').replace(',', '.')), offsetUnit: '$' };
  return null;
}

const chatHistory = [];
function chatScrollDown() { const s = document.getElementById('chatScroll'); if (s) s.scrollTop = s.scrollHeight; }
function chatAdd(role, html) {
  const msgs = document.getElementById('chatMsgs');
  const d = document.createElement('div');
  d.className = 'msg msg--' + role;
  if (typeof html === 'string') d.innerHTML = html; else d.appendChild(html);
  msgs.appendChild(d);
  requestAnimationFrame(chatScrollDown); setTimeout(chatScrollDown, 60);
  return d;
}

/* tarjeta de estrategia dentro del chat / lista */
function strategyCardEl(strat, opts = {}) {
  const tgt = resolveTarget(pasadaTarget);
  const res = simulate(strat.program, tgt.product, 1);
  const card = document.createElement('div');
  card.className = 'scard';
  card.innerHTML = `
    <div class="scard__head">
      <span class="scard__ic">${icon('sparkles')}</span>
      <div style="flex:1;min-width:0">
        <div class="scard__name">${escapeHtml(strat.name)}</div>
        <span class="chip chip--teal">${escapeHtml(strat.tag || 'IA')}</span>
      </div>
    </div>
    <div class="qh">${explainListHTML(strat.program, 3)}</div>
    <div class="scard__price">
      <span class="scard__price-l">Precio sugerido · ${escapeHtml(tgt.product.name)}</span>
      <span class="scard__price-v">${money(res.price)}</span>
    </div>
    <div class="scard__actions">
      <button class="btn btn--primary btn--sm" data-a="pasada">${icon('play')} Ver pasada</button>
      <button class="btn btn--soft btn--sm" data-a="save">${icon('save')} Guardar</button>
      <button class="btn btn--ghost btn--sm" data-a="edit">${icon('edit')} Editar</button>
    </div>`;
  card.querySelector('[data-a="pasada"]').addEventListener('click', () => openPasada(clone(strat)));
  const saveBtn = card.querySelector('[data-a="save"]');
  saveBtn.addEventListener('click', () => {
    const id = saveStrategy({ id: strat.id || null, name: strat.name, program: strat.program, tag: strat.tag });
    strat.id = id; saveBtn.disabled = true; saveBtn.innerHTML = `${icon('checkc')} Guardada`;
    toast(`"${strat.name}" guardada en Mis estrategias`, 'ok');
  });
  card.querySelector('[data-a="edit"]').addEventListener('click', () => openEditor(clone(strat)));
  if (opts.saved) { saveBtn.disabled = true; saveBtn.innerHTML = `${icon('checkc')} Guardada`; }
  return card;
}

function chatFallback(text) {
  const l = text.toLowerCase();
  const id = (l.includes('impuesto') || l.includes('fiscal')) ? 'blindaje_fiscal'
    : (l.includes('margen') || l.includes('rentab')) ? 'rentabilidad'
    : (l.includes('buybox') || l.includes('catálogo') || l.includes('catalogo')) ? 'buybox'
    : (l.includes('liquid') || l.includes('rematar')) ? 'liquidacion'
    : (l.includes('vender') || l.includes('crecer')) ? 'crecimiento' : 'equilibrado';
  const s = STRAT_MAP[id];
  chatAdd('bot', `No pude conectar con la IA en este momento, pero para lo que me contás te recomiendo <b>${escapeHtml(s.name)}</b>:`);
  chatAdd('bot', strategyCardEl({ id: null, name: s.name, program: (function () { const pg = s.build(); pg.target = pasadaTarget; return pg; })(), tag: s.tag }));
}

async function chatSend(text) {
  if (!text.trim()) return;
  hideHero();
  chatAdd('user', escapeHtml(text)); chatHistory.push({ role: 'user', content: text });
  const link = extractLink(text);
  const typing = chatAdd('bot', '<span class="muted">Pensando…</span>');
  try {
    const draftProgram = { target: pasadaTarget, root: [] };
    const res = await callAssistant(text, chatHistory.slice(-8), draftProgram);
    typing.remove();
    const reply = res.reply || 'Listo.';
    chatHistory.push({ role: 'assistant', content: reply });
    let root = res.program ? sanitizeProgram(res.program.root || res.program) : [];
    if (root.length && link) ensureFollowLink(root, link);
    if (!root.length && link) root = followRoot(link, extractOffset(text));   // el modelo no armó nada pero hay link: lo hacemos igual
    if (root.length) {
      chatAdd('bot', escapeHtml(reply));
      const strat = { id: null, name: bestName(res.name, root), program: { target: pasadaTarget, root }, tag: 'IA' };
      chatAdd('bot', strategyCardEl(strat));
    } else {
      chatAdd('bot', escapeHtml(reply));
    }
  } catch (err) {
    typing.remove();
    if (link) {
      const root = followRoot(link, extractOffset(text));
      chatAdd('bot', `No pude conectar con la IA, pero armé una estrategia para <b>seguir esa publicación</b> y posicionarte respecto a su precio:`);
      chatAdd('bot', strategyCardEl({ id: null, name: nameFromProgram(root), program: { target: pasadaTarget, root }, tag: 'IA' }));
    } else {
      chatFallback(text);
    }
  }
}
function hideHero() { const h = document.getElementById('chatHero'); if (h) h.hidden = true; }

function initChat() {
  document.getElementById('chatSend').addEventListener('click', () => { const i = document.getElementById('chatInput'); chatSend(i.value); i.value = ''; });
  document.getElementById('chatInput').addEventListener('keydown', e => { if (e.key === 'Enter') { chatSend(e.target.value); e.target.value = ''; } });
  document.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => chatSend(b.dataset.q)));
}

/* ============================================================
   PANEL DERECHO — Mis estrategias + Recomendadas
   ============================================================ */
function renderMine() {
  const box = document.getElementById('myList');
  if (!myStrategies.length) {
    box.innerHTML = `<div class="empty">
      <div class="empty__ic">${icon('sparkles')}</div>
      <b>Todavía no guardaste estrategias</b>
      <span>Contale al asistente qué querés lograr y guardá la que más te sirva. Van a aparecer acá.</span>
    </div>`;
    return;
  }
  box.innerHTML = '';
  myStrategies.forEach(s => {
    const run = running.find(r => r.id === s.id);
    const runTgt = run ? resolveTarget(run.target) : resolveTarget(pasadaTarget);
    const res = simulate(s.program, runTgt.product, 1);
    const first = (describeProgram(s.program)[0] || {}).text || 'Estrategia personalizada.';
    const item = document.createElement('div');
    item.className = 'mitem' + (run ? ' mitem--running' : '');
    item.innerHTML = `
      <div class="mitem__main">
        <div class="mitem__name">${escapeHtml(s.name)} ${run ? `<span class="run-badge"><i></i>Corriendo</span>` : `<span class="chip chip--gray">${escapeHtml(s.tag || 'IA')}</span>`}</div>
        <div class="mitem__desc">${escapeHtml(first)}</div>
        <div class="mitem__price">${icon(run ? 'play' : 'precio')} ${run ? `Corriendo en ${escapeHtml(runTgt.label)} · ` : 'Sugerido '}${money(res.price)}${run ? '' : ` · ${escapeHtml(runTgt.product.name)}`}</div>
      </div>
      <div class="mitem__tools">
        ${run ? `<button data-a="stop" title="Dejar de correr">${icon('stop')}</button>` : ''}
        <button data-a="edit" title="Editar en el editor de bloques">${icon('edit')}</button>
        <button data-a="del" title="Eliminar">${icon('trash')}</button>
      </div>`;
    item.querySelector('.mitem__main').addEventListener('click', () => openPasada(clone(s)));
    item.querySelector('[data-a="edit"]').addEventListener('click', e => { e.stopPropagation(); openEditor(clone(s)); });
    item.querySelector('[data-a="del"]').addEventListener('click', e => { e.stopPropagation(); if (confirm(`¿Eliminar "${s.name}"?`)) { deleteStrategy(s.id); toast('Estrategia eliminada'); } });
    const stop = item.querySelector('[data-a="stop"]');
    if (stop) stop.addEventListener('click', e => { e.stopPropagation(); stopRunning(s.id); toast(`Dejaste de correr "${s.name}"`); });
    box.appendChild(item);
  });
}

function renderReco() {
  const box = document.getElementById('recoList');
  const bars = (n) => `<div class="reco__bars">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</div>`;
  box.innerHTML = '';
  STRATEGIES.forEach(s => {
    const card = document.createElement('div');
    card.className = 'reco'; card.style.setProperty('--accent', s.color);
    card.innerHTML = `
      <div class="reco__top">
        <span class="reco__ic" style="background:${s.color}">${icon(s.icon)}</span>
        <div style="flex:1;min-width:0"><div class="reco__name">${s.name}</div><span class="reco__tag" style="color:${s.tagColor}">${s.tag}</span></div>
      </div>
      <p class="reco__desc">${s.desc}</p>
      <div class="reco__meta">${Object.entries(s.meters).map(([k, v]) => `<span class="reco__meter">${k} ${bars(v)}</span>`).join('')}</div>`;
    card.addEventListener('click', () => {
      const pg = s.build(); pg.target = pasadaTarget;
      openPasada({ id: null, name: s.name, program: pg, tag: s.tag, preset: true });
    });
    box.appendChild(card);
  });
}

/* ============================================================
   PASADA — vista de "correr" la estrategia (simplificada)
   Sin proyección a futuro ni desglose de impuestos.
   ============================================================ */
let pasadaStrat = null;
function targetPickerHTML() {
  const t = pasadaTarget;
  const list = (t.mode === 'group' ? SAMPLE_GROUPS : SAMPLE_PRODUCTS);
  const opts = list.map(o => `<option value="${o.id}" ${o.id === t.id ? 'selected' : ''}>${o.name}${o.count ? ` (${o.count} publicaciones)` : ''}</option>`).join('');
  return `
    <div class="tpick">
      <span class="tpick__l">Correr sobre</span>
      <span class="tpick__seg">
        <button class="${t.mode === 'product' ? 'on' : ''}" data-mode="product">Un producto</button>
        <button class="${t.mode === 'group' ? 'on' : ''}" data-mode="group">Un grupo</button>
      </span>
      <select class="tpick__sel" id="pasSel">${opts}</select>
    </div>`;
}
function openPasada(strat) {
  pasadaStrat = strat;
  document.getElementById('pasadaSheet').hidden = false;
  document.body.classList.add('sheet-open');
  renderPasada();
}
function closePasada() { document.getElementById('pasadaSheet').hidden = true; document.body.classList.remove('sheet-open'); }

function renderPasada() {
  const strat = pasadaStrat; if (!strat) return;
  const tgt = resolveTarget(pasadaTarget);
  const saved = strat.id && myStrategies.some(s => s.id === strat.id);
  let resultHTML;
  if (tgt.isGroup) {
    const rows = tgt.products.map(p => {
      const r = simulate(strat.program, p, 1);
      const c = r.diff > 1 ? 'cmp-up' : r.diff < -1 ? 'cmp-down' : 'cmp-eq';
      const mc = r.margin < 0 ? 'var(--danger)' : r.margin < 8 ? 'var(--warn)' : 'var(--ok)';
      return `<div class="gp-row"><div class="gp-n">${p.name}<span class="gp-c">costo ${money(p.cost)}</span></div>
        <div class="gp-p">${money(r.price)} <span class="gp-cmp ${c}">${r.diff >= 0 ? '+' : ''}${r.diffPct.toFixed(0)}%</span></div>
        <div class="gp-m" style="color:${mc}">${r.margin.toFixed(0)}%</div></div>`;
    }).join('');
    resultHTML = `
      <div class="gp-banner">${icon('info')}<span>La estrategia se aplica a <b>cada producto con su propio costo</b>. Estos son los precios que dejaría cada publicación.</span></div>
      <div class="section-h">${icon('precio')} Precio sugerido por producto</div>
      <div class="gp-table"><div class="gp-row gp-head"><span>Producto</span><span>Precio</span><span>Margen</span></div>${rows}</div>`;
  } else {
    const res = simulate(strat.program, tgt.product, 1);
    const cmpCls = res.diff > 1 ? 'cmp-up' : res.diff < -1 ? 'cmp-down' : 'cmp-eq';
    const cmpTxt = res.competitor ? `${res.diff >= 0 ? '+' : ''}${res.diffPct.toFixed(1)}% vs competidor (${money(res.competitor)})` : 'Sin competidor de referencia';
    const marginColor = res.margin < 0 ? 'var(--danger)' : res.margin < 8 ? 'var(--warn)' : 'var(--ok)';
    const vIcon = res.verdict.tone === 'ok' ? 'checkc' : res.verdict.tone === 'bad' ? 'x' : res.verdict.tone === 'warn' ? 'alert' : 'info';
    resultHTML = `
      <div class="price-hero">
        <div class="price-hero__label">Precio sugerido</div>
        <div class="price-hero__val">${money(res.price)}</div>
        <div class="price-hero__base">antes ${money(res.basePrice)}</div>
        <div class="price-hero__cmp ${cmpCls}">${cmpTxt}</div>
      </div>
      <div class="verdict verdict--${res.verdict.tone}">${icon(vIcon)}<div><b>${res.verdict.label}</b><span>${res.verdict.text}</span></div></div>
      <div class="tiles">
        <div class="tile"><div class="l">Margen estimado</div><div class="v" style="color:${marginColor}">${res.margin.toFixed(1)}%</div></div>
        <div class="tile"><div class="l">Ganancia / unidad</div><div class="v">${money(res.net)}</div></div>
      </div>`;
  }

  const pane = document.getElementById('pasadaBody');
  pane.innerHTML = `
    <div class="pas">
      <div class="pas__grid">
        <div class="pas__col">
          ${targetPickerHTML()}
          <div class="result__target"><div class="ic">${icon(tgt.isGroup ? 'layers' : 'producto')}</div>
            <div style="flex:1;min-width:0"><div class="n">${tgt.label}</div>
            <div class="m">${tgt.isGroup ? tgt.count + ' publicaciones · muestra representativa' : `Costo ${money(tgt.product.cost)} · actual ${money(tgt.product.price)} · competidor ${money(tgt.product.competitor)}`}</div></div>
          </div>
          <div class="qhbox">
            <div class="qhbox__title">${icon('book')} Qué hace esta estrategia</div>
            <div class="qh qh--full">${explainListHTML(strat.program)}</div>
          </div>
        </div>
        <div class="pas__col">${resultHTML}</div>
      </div>
    </div>`;

  // header
  document.getElementById('pasName').textContent = strat.name;
  document.getElementById('pasTag').textContent = strat.tag || 'IA';
  const saveBtn = document.getElementById('pasSave');
  saveBtn.style.display = saved ? 'none' : '';
  const actBtn = document.getElementById('pasActivate');
  const run = isRunning(strat.id);
  actBtn.classList.toggle('btn--danger', run);
  actBtn.innerHTML = run ? `${icon('stop')} Detener pasada` : `${icon('play')} Activar pasada`;

  // wiring del selector de destino
  pane.querySelectorAll('.tpick__seg button').forEach(b => b.addEventListener('click', () => {
    const mode = b.dataset.mode; const first = (mode === 'group' ? SAMPLE_GROUPS : SAMPLE_PRODUCTS)[0];
    pasadaTarget = { mode, id: first.id }; renderPasada();
  }));
  const sel = pane.querySelector('#pasSel');
  if (sel) sel.addEventListener('change', () => { pasadaTarget = { mode: pasadaTarget.mode, id: sel.value }; renderPasada(); });
}

function initPasada() {
  document.getElementById('pasClose').addEventListener('click', closePasada);
  document.getElementById('pasadaSheet').addEventListener('mousedown', e => { if (e.target.id === 'pasadaSheet') closePasada(); });
  document.getElementById('pasEdit').addEventListener('click', () => { const s = clone(pasadaStrat); closePasada(); openEditor(s); });
  document.getElementById('pasSave').addEventListener('click', () => {
    const id = saveStrategy({ id: pasadaStrat.id || null, name: pasadaStrat.name, program: pasadaStrat.program, tag: pasadaStrat.tag });
    pasadaStrat.id = id; toast(`"${pasadaStrat.name}" guardada`, 'ok'); renderPasada();
  });
  document.getElementById('pasActivate').addEventListener('click', () => {
    // si ya está corriendo, el botón detiene
    if (isRunning(pasadaStrat.id)) { stopRunning(pasadaStrat.id); toast(`Dejaste de correr "${pasadaStrat.name}"`); renderPasada(); return; }
    const tgt = resolveTarget(pasadaTarget);
    const res = simulate(pasadaStrat.program, tgt.product, tgt.scale);
    if (!res.reached) { toast('La estrategia no publica precio: agregá el bloque “Publicar precio” en el editor'); return; }
    if (res.margin < 0) { toast('El margen queda negativo: revisá la estrategia antes de activar'); return; }
    // se guarda (si hace falta) para que quede en "Mis estrategias" y se marca corriendo
    const id = saveStrategy({ id: pasadaStrat.id || null, name: pasadaStrat.name, program: pasadaStrat.program, tag: pasadaStrat.tag });
    pasadaStrat.id = id;
    startRunning(id, pasadaTarget);
    renderMine();
    toast(`Corriendo "${pasadaStrat.name}" en ${tgt.isGroup ? tgt.count + ' productos' : tgt.label}`, 'ok');
    closePasada();
  });
}

/* ============================================================
   EDITOR AVANZADO (overlay) — reutiliza el motor RE
   ============================================================ */
function buildPalette(filter = '') {
  const list = document.getElementById('edPaletteList');
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
function targetHTML() {
  const t = RE.getTarget();
  const opts = (t.mode === 'group' ? SAMPLE_GROUPS : SAMPLE_PRODUCTS)
    .map(o => `<option value="${o.id}" ${o.id === t.id ? 'selected' : ''}>${o.name}${o.count ? ` (${o.count} productos)` : ''}</option>`).join('');
  const info = resolveTarget(t);
  const meta = info.isGroup
    ? `Se aplica a ${info.count} publicaciones. La vista usa un producto representativo.`
    : `Costo ${money(info.product.cost)} · Precio actual ${money(info.product.price)} · Competidor ${money(info.product.competitor)} · Stock ${info.product.stock}`;
  return `
    <div class="target-card__row">
      <div class="target-card__ic">${icon(t.mode === 'group' ? 'layers' : 'producto')}</div>
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
  const flow = document.getElementById('edFlow');
  flow.addEventListener('change', e => { if (e.target.classList.contains('target-select')) { const t = RE.getTarget(); RE.setTarget({ mode: t.mode, id: e.target.value }); } });
  flow.addEventListener('click', e => {
    const b = e.target.closest('.target-mode'); if (!b) return;
    const mode = b.dataset.mode; const first = (mode === 'group' ? SAMPLE_GROUPS : SAMPLE_PRODUCTS)[0];
    RE.setTarget({ mode, id: first.id });
  });
}
function renderEditorExplain() {
  const box = document.getElementById('edExplainSteps');
  const steps = describeProgram(RE.getProgram());
  if (!steps.length) { box.innerHTML = `<div class="explain__empty">Agregá bloques y acá vas a leer, en palabras, exactamente qué hace tu estrategia.</div>`; return; }
  box.innerHTML = steps.map((s, i) => `<div class="explain__step ${s.cond ? 'cond' : ''}"><span class="explain__num">${i + 1}</span><span>${s.text}</span></div>`).join('');
}
function onEditorChange() { renderEditorExplain(); }

function initEditorOnce() {
  if (editorInited) return;
  buildPalette();
  RE.init({
    canvas: document.getElementById('edCanvas'),
    world: document.getElementById('edWorld'),
    flow: document.getElementById('edFlow'),
    onChange: onEditorChange,
    targetHTML,
  });
  wireTargetDelegation();
  document.getElementById('edPaletteSearch').addEventListener('input', e => buildPalette(e.target.value));
  document.getElementById('edZoomIn').addEventListener('click', () => RE.zoomBy(1.1));
  document.getElementById('edZoomOut').addEventListener('click', () => RE.zoomBy(1 / 1.1));
  document.getElementById('edFit').addEventListener('click', () => RE.fitView());
  document.getElementById('edUndo').addEventListener('click', () => RE.undo());
  document.getElementById('edRedo').addEventListener('click', () => RE.redo());
  document.getElementById('edCustom').addEventListener('click', openCustomModal);
  editorInited = true;
}
function starterRoot() {
  return [
    { id: uid(), type: 'comision_ml', params: {} },
    { id: uid(), type: 'igualar_competencia', params: { modo: 'debajo', offset: 100, respetarPiso: true } },
    { id: uid(), type: 'fijar_precio', params: {} },
  ];
}
function openEditor(strat) {
  initEditorOnce();
  editorCtx.id = strat && strat.id ? strat.id : null;
  const program = (strat && strat.program && strat.program.root) ? strat.program : { target: pasadaTarget, root: starterRoot() };
  document.getElementById('edName').value = (strat && strat.name) || 'Mi estrategia';
  const sheet = document.getElementById('editorSheet');
  sheet.hidden = false; document.body.classList.add('sheet-open');
  // render sincrónico (no depende de requestAnimationFrame, que se pausa si la pestaña está oculta);
  // loadProgram ya difiere internamente el fitView para medir el canvas cuando ya es visible.
  RE.loadProgram(clone(program)); renderEditorExplain();
}
function closeEditor() { document.getElementById('editorSheet').hidden = true; document.body.classList.remove('sheet-open'); }
function initEditorChrome() {
  document.getElementById('edCancel').addEventListener('click', closeEditor);
  document.getElementById('edSave').addEventListener('click', () => {
    const name = document.getElementById('edName').value.trim() || 'Mi estrategia';
    const program = RE.getProgram();
    const id = saveStrategy({ id: editorCtx.id, name, program, tag: editorCtx.id ? (myStrategies.find(s => s.id === editorCtx.id) || {}).tag || 'Editada' : 'Editada' });
    editorCtx.id = id;
    // reflejar también en el autosave del editor completo (index.html)
    try { localStorage.setItem(LS_V2_SAVE, JSON.stringify({ name, program })); } catch (e) {}
    toast(`"${name}" guardada`, 'ok'); closeEditor();
  });
  document.getElementById('edNew').addEventListener('click', () => { editorCtx.id = null; document.getElementById('edName').value = 'Mi estrategia'; RE.loadProgram({ target: pasadaTarget, root: starterRoot() }); renderEditorExplain(); toast('Estrategia nueva'); });
}

/* ---------- Bloques propios (modal) ---------- */
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
    window.CUSTOM_BLOCKS[spec.type] = buildCustomDef(spec); persistCustom(); buildPalette(document.getElementById('edPaletteSearch').value);
    toast(`Bloque "${spec.name}" creado`, 'ok'); close();
  });
}

/* ============================================================
   INIT
   ============================================================ */
function init() {
  initIcons(); loadCustom(); loadMine(); loadRunning();
  initChat(); renderMine(); renderReco(); initPasada(); initEditorChrome();

  document.getElementById('btnEditor').addEventListener('click', () => openEditor(null));

  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (!document.getElementById('editorSheet').hidden) closeEditor(); else if (!document.getElementById('pasadaSheet').hidden) closePasada(); }
    const editorOpen = !document.getElementById('editorSheet').hidden;
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName);
    const mod = e.ctrlKey || e.metaKey;
    if (editorOpen && mod && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); RE.undo(); }
    else if (editorOpen && mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); RE.redo(); }
    else if (editorOpen && (e.key === 'Delete' || e.key === 'Backspace') && !typing && RE.getState().selected) { e.preventDefault(); RE.deleteSelected(); }
  });
}
document.addEventListener('DOMContentLoaded', init);
