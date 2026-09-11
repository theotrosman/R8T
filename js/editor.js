/* ============================================================
   R8T · editor.js  (v3)
   Flujo apilable híbrido. Contenedores genéricos por "slots"
   (condición SI/SINO, While, For). Arrastre por puntero.
   ============================================================ */

const RE = (() => {
  let canvasEl, worldEl, flowEl;
  const cbs = { onChange: () => {}, targetHTML: () => '' };
  let program = { target: { mode: 'product', id: 'p1' }, root: [] };
  let scale = 1, selected = null, uid = 1;
  const MINZ = 0.5, MAXZ = 1.5;

  const newId = () => 's' + (uid++) + Date.now().toString(36).slice(-3);

  /* ---------- árbol ---------- */
  function stackByPath(path) {
    if (path === 'root') return program.root;
    const [id, slot] = path.split('.');
    const f = findStep(id); if (!f) return null;
    f.step.branches = f.step.branches || {}; f.step.branches[slot] = f.step.branches[slot] || [];
    return f.step.branches[slot];
  }
  function findStep(id, stack = program.root) {
    for (let i = 0; i < stack.length; i++) {
      const s = stack[i];
      if (s.id === id) return { step: s, arr: stack, index: i };
      if (s.branches) for (const k of Object.keys(s.branches)) { const r = findStep(id, s.branches[k] || []); if (r) return r; }
    }
    return null;
  }
  function collectIds(step, acc = []) { acc.push(step.id); if (step.branches) Object.keys(step.branches).forEach(k => (step.branches[k] || []).forEach(c => collectIds(c, acc))); return acc; }
  function reId(step) { step.id = newId(); if (step.branches) Object.keys(step.branches).forEach(k => (step.branches[k] || []).forEach(reId)); }
  function mergedParams(step) {
    const d = blockDef(step.type); const out = {};
    (d.params || []).forEach(pr => {
      out[pr.key] = (step.params && step.params[pr.key] !== undefined) ? step.params[pr.key] : pr.value;
      if (pr.units && pr.units.length > 1) { const uk = pr.key + 'Unit'; out[uk] = (step.params && step.params[uk] !== undefined) ? step.params[uk] : pr.units[0]; }
    });
    return out;
  }
  function makeStep(type) {
    const d = blockDef(type); const st = { id: newId(), type, params: {} };
    if (d.container) { st.branches = {}; (d.slots || []).forEach(s => st.branches[s.id] = []); }
    return st;
  }

  /* ---------- init ---------- */
  function init(opts) {
    canvasEl = opts.canvas; worldEl = opts.world; flowEl = opts.flow;
    cbs.onChange = opts.onChange || cbs.onChange;
    cbs.targetHTML = opts.targetHTML || cbs.targetHTML;
    flowEl.addEventListener('input', onInput);
    flowEl.addEventListener('change', onChangeCtrl);
    flowEl.addEventListener('click', onClick);
    flowEl.addEventListener('mousedown', onFlowMouseDown);
    canvasEl.addEventListener('mousedown', onPanStart);
    canvasEl.addEventListener('wheel', e => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1); } }, { passive: false });
    document.addEventListener('mousedown', e => { if (!e.target.closest('.addmenu') && !e.target.closest('[data-add]') && !e.target.closest('.sb__menu')) closePop(); });
  }

  /* ---------- pan ---------- */
  function onPanStart(e) {
    if (drag) return;
    if (e.target.closest('.sb, .sc, .stack-add, .ctrl, button, input, select, .addmenu, .grip')) return;
    const sx = e.clientX, sy = e.clientY, sl = canvasEl.scrollLeft, st = canvasEl.scrollTop;
    canvasEl.classList.add('panning');
    const mv = ev => { canvasEl.scrollLeft = sl - (ev.clientX - sx); canvasEl.scrollTop = st - (ev.clientY - sy); };
    const up = () => { canvasEl.classList.remove('panning'); window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
  }

  /* ---------- zoom ---------- */
  function applyZoom() { flowEl.style.zoom = scale; const zl = document.getElementById('zoomLabel'); if (zl) zl.textContent = Math.round(scale * 100) + '%'; }
  function zoomBy(f) { scale = clamp(+(scale * f).toFixed(3), MINZ, MAXZ); applyZoom(); }
  function setZoom(z) { scale = clamp(z, MINZ, MAXZ); applyZoom(); }
  function fitView() {
    flowEl.style.zoom = 1;                       // medir a escala natural
    const fw = flowEl.offsetWidth || 480, fh = flowEl.offsetHeight || 480;
    const cw = Math.max(220, canvasEl.clientWidth - 90), ch = Math.max(220, canvasEl.clientHeight - 90);
    scale = clamp(Math.min(cw / fw, ch / fh), MINZ, 1);
    applyZoom();
    requestAnimationFrame(() => { canvasEl.scrollTop = 0; canvasEl.scrollLeft = Math.max(0, (worldEl.scrollWidth - canvasEl.clientWidth) / 2); });
  }

  /* ---------- historial (deshacer / rehacer) ---------- */
  let hist = [], hidx = -1, snapT = null;
  function resetHistory() { hist = [JSON.stringify(program)]; hidx = 0; }
  function commitSnap() {
    clearTimeout(snapT); snapT = null;
    const s = JSON.stringify(program);
    if (hidx >= 0 && hist[hidx] === s) return;
    hist = hist.slice(0, hidx + 1); hist.push(s);
    if (hist.length > 60) hist.shift();
    hidx = hist.length - 1;
  }
  function pushSnap() { clearTimeout(snapT); snapT = setTimeout(commitSnap, 350); }
  function changed() { pushSnap(); cbs.onChange(); }
  function restore(s) { program = JSON.parse(s); selected = null; render(); cbs.onChange(); }
  function undo() { commitSnap(); if (hidx <= 0) { window.toast && toast('Nada para deshacer'); return; } hidx--; restore(hist[hidx]); }
  function redo() { if (hidx >= hist.length - 1) { window.toast && toast('Nada para rehacer'); return; } hidx++; restore(hist[hidx]); }
  function deleteSelected() { if (selected) deleteStep(selected); }

  /* ---------- render ---------- */
  function render() {
    flowEl.innerHTML = '';
    const head = document.createElement('div'); head.className = 'target-card'; head.innerHTML = cbs.targetHTML(); flowEl.appendChild(head);
    flowEl.appendChild(connector());
    flowEl.appendChild(renderStack(program.root, 'root'));
    if (!program.root.length) {
      const hint = document.createElement('div'); hint.className = 'flow-empty';
      hint.innerHTML = `${icon('sparkles')}<b>Empezá tu estrategia</b><span>Tocá “Agregar bloque”, arrastrá bloques desde la izquierda, o cargá/combiná una estrategia lista desde “Estrategias”.</span>`;
      flowEl.appendChild(hint);
    }
    applyZoom();
  }
  function connector() { const c = document.createElement('div'); c.className = 'connector'; return c; }

  function renderStack(stack, path) {
    const wrap = document.createElement('div');
    wrap.className = 'stack' + (path === 'root' ? ' stack--root' : ''); wrap.dataset.stack = path;
    stack.forEach((step, i) => { if (i > 0) wrap.appendChild(connector()); wrap.appendChild(renderStep(step)); });
    if (stack.length) wrap.appendChild(connector());
    const add = document.createElement('button'); add.className = 'stack-add'; add.dataset.add = path;
    add.innerHTML = icon('plus') + '<span>Agregar bloque</span>'; wrap.appendChild(add);
    return wrap;
  }

  function renderStep(step) {
    const d = blockDef(step.type);
    if (!d) { const e = document.createElement('div'); e.textContent = '¿bloque?'; return e; }
    const color = (CAT_MAP[d.cat] || {}).color || 'var(--rt-blue)';
    const p = mergedParams(step);
    if (d.container) {
      const el = document.createElement('div');
      el.className = 'sc' + (selected === step.id ? ' is-sel' : ''); el.dataset.id = step.id; el.style.setProperty('--accent', color);
      step.branches = step.branches || {}; (d.slots || []).forEach(s => { if (!step.branches[s.id]) step.branches[s.id] = []; });
      const slotsHTML = (d.slots || []).map(s => {
        const ic = s.tone === 'ok' ? 'check' : s.tone === 'muted' ? 'close' : 'play';
        return `<div class="sc__branch"><div class="sc__label sc__label--${s.tone}">${icon(ic)} ${s.label}</div><div data-slot="${s.id}"></div></div>`;
      }).join('');
      el.innerHTML = `
        <div class="sc__head">
          <span class="grip" title="Arrastrar">${icon('drag')}</span>
          <span class="sb__icon" style="background:${color}">${icon(d.icon)}</span>
          <span class="sc__when">${d.headWord || 'Cuando'}</span>
          <span class="sc__cond">${fieldsInline(d, p)}</span>
          ${toolsHTML(step.id)}
        </div>
        <div class="sc__branches">${slotsHTML}</div>`;
      (d.slots || []).forEach(s => el.querySelector(`[data-slot="${s.id}"]`).appendChild(renderStack(step.branches[s.id], step.id + '.' + s.id)));
      return el;
    }
    const el = document.createElement('div');
    el.className = 'sb' + (selected === step.id ? ' is-sel' : ''); el.dataset.id = step.id; el.style.setProperty('--accent', color);
    el.innerHTML = `
      <span class="grip" title="Arrastrar">${icon('drag')}</span>
      <span class="sb__icon" style="background:${color}">${icon(d.icon)}</span>
      <div class="sb__content"><div class="sb__title">${d.name}</div><div class="sb__fields">${fieldsInline(d, p)}</div></div>
      ${toolsHTML(step.id)}`;
    return el;
  }

  /* ---------- controles en línea ---------- */
  function fieldsInline(d, p) { return (d.params || []).map(pr => field(pr, p)).join(''); }
  function field(pr, p) {
    const val = p[pr.key];
    const lbl = pr.label ? `<span class="fld__l">${pr.label}</span>` : '';
    if (pr.type === 'number') {
      const hasU = pr.units && pr.units.length > 1;
      const unitSel = hasU
        ? `<select class="ctrl__u ctrl__u--sel" data-fk="${pr.key}Unit">${pr.units.map(u => `<option value="${u}" ${(p[pr.key + 'Unit'] || pr.units[0]) === u ? 'selected' : ''}>${u}</option>`).join('')}</select>`
        : (pr.unit ? `<span class="ctrl__u">${pr.unit}</span>` : '');
      return `<span class="fld">${lbl}
        <span class="ctrl ctrl--num">
          <button class="ctrl__step" data-step="-1" data-fk="${pr.key}" tabindex="-1">−</button>
          <input class="ctrl__in" type="number" data-fk="${pr.key}" value="${val}" min="${pr.min ?? ''}" max="${pr.max ?? ''}" step="${pr.step ?? 1}">
          ${unitSel}
          <button class="ctrl__step" data-step="1" data-fk="${pr.key}" tabindex="-1">+</button>
        </span></span>`;
    }
    if (pr.type === 'select') return `<span class="fld">${lbl}<select class="ctrl ctrl--sel" data-fk="${pr.key}">${pr.options.map(o => `<option value="${o[0]}" ${String(val) === String(o[0]) ? 'selected' : ''}>${o[1]}</option>`).join('')}</select></span>`;
    if (pr.type === 'toggle') return `<label class="fld fld--tog"><input type="checkbox" class="ctrl ctrl--tog" data-fk="${pr.key}" ${val ? 'checked' : ''}><span class="tgl"></span><span class="fld__l">${pr.label}</span></label>`;
    return '';
  }
  function toolsHTML(id) {
    return `<div class="sb__tools">
      <button class="sb__mv" data-move="up" title="Subir">${icon('chevron')}</button>
      <button class="sb__mv" data-move="down" title="Bajar">${icon('chevron')}</button>
      <button class="sb__menu" data-menu="${id}" title="Opciones">${icon('dots')}</button></div>`;
  }

  /* ---------- eventos de controles ---------- */
  function stepOf(node) { const c = node.closest('[data-id]'); return c ? findStep(c.dataset.id) : null; }
  function onInput(e) {
    if (!e.target.classList.contains('ctrl__in')) return;
    const f = stepOf(e.target); if (!f) return;
    let v = parseFloat(e.target.value); if (isNaN(v)) return;
    f.step.params = f.step.params || {}; f.step.params[e.target.dataset.fk] = v; changed();
  }
  function onChangeCtrl(e) {
    if (e.target.classList.contains('ctrl__u--sel')) { const f = stepOf(e.target); if (!f) return; f.step.params = f.step.params || {}; f.step.params[e.target.dataset.fk] = e.target.value; changed(); return; }
    if (e.target.classList.contains('ctrl--sel')) { const f = stepOf(e.target); if (!f) return; f.step.params = f.step.params || {}; f.step.params[e.target.dataset.fk] = e.target.value; render(); changed(); }
    else if (e.target.classList.contains('ctrl--tog')) { const f = stepOf(e.target); if (!f) return; f.step.params = f.step.params || {}; f.step.params[e.target.dataset.fk] = e.target.checked; render(); changed(); }
    else if (e.target.classList.contains('ctrl__in')) { const f = stepOf(e.target); if (!f) return; const d = blockDef(f.step.type); const pr = d.params.find(x => x.key === e.target.dataset.fk); let v = parseFloat(e.target.value); if (isNaN(v)) v = pr.value; if (pr.min !== undefined) v = Math.max(pr.min, v); if (pr.max !== undefined) v = Math.min(pr.max, v); e.target.value = v; f.step.params[e.target.dataset.fk] = v; changed(); }
  }
  function onClick(e) {
    const step = e.target.closest('.ctrl__step');
    if (step) { const wrap = step.closest('.ctrl--num'); const input = wrap.querySelector('.ctrl__in'); const f = stepOf(step); if (!f) return; const d = blockDef(f.step.type); const pr = d.params.find(x => x.key === step.dataset.fk); let v = (parseFloat(input.value) || 0) + (pr.step || 1) * parseInt(step.dataset.step, 10); if (pr.min !== undefined) v = Math.max(pr.min, v); if (pr.max !== undefined) v = Math.min(pr.max, v); v = Math.round(v * 100) / 100; input.value = v; f.step.params = f.step.params || {}; f.step.params[pr.key] = v; changed(); return; }
    const mv = e.target.closest('[data-move]');
    if (mv) { e.stopPropagation(); const host = mv.closest('[data-id]'); if (host) moveWithin(host.dataset.id, mv.dataset.move === 'up' ? -1 : 1); return; }
    const menu = e.target.closest('[data-menu]');
    if (menu) { e.stopPropagation(); openNodeMenu(menu, menu.dataset.menu); return; }
    const add = e.target.closest('[data-add]');
    if (add) { e.stopPropagation(); openAddMenu(add, add.dataset.add); return; }
    const card = e.target.closest('.sb, .sc');
    if (card) { selected = card.dataset.id; flowEl.querySelectorAll('.is-sel').forEach(x => x.classList.remove('is-sel')); card.classList.add('is-sel'); }
  }

  /* ---------- menús ---------- */
  function openNodeMenu(anchor, id) {
    closePop();
    const r = anchor.getBoundingClientRect();
    const m = document.createElement('div'); m.className = 'addmenu addmenu--node';
    m.style.left = Math.min(r.left, innerWidth - 190) + 'px'; m.style.top = (r.bottom + 4) + 'px';
    m.innerHTML = `<button data-a="up">${icon('chevron')} Subir</button><button data-a="down">${icon('chevron')} Bajar</button><button data-a="dup">${icon('copy')} Duplicar</button><hr><button class="danger" data-a="del">${icon('trash')} Eliminar</button>`;
    document.body.appendChild(m);
    m.querySelector('[data-a="up"] svg').style.transform = 'rotate(180deg)';
    m.addEventListener('click', ev => { const a = ev.target.closest('button')?.dataset.a; if (a === 'del') deleteStep(id); if (a === 'dup') duplicateStep(id); if (a === 'up') moveWithin(id, -1); if (a === 'down') moveWithin(id, 1); closePop(); });
  }
  function deleteStep(id) { const f = findStep(id); if (!f) return; f.arr.splice(f.index, 1); if (selected === id) selected = null; render(); changed(); }
  function duplicateStep(id) { const f = findStep(id); if (!f) return; const clone = JSON.parse(JSON.stringify(f.step)); reId(clone); f.arr.splice(f.index + 1, 0, clone); render(); changed(); }
  function moveWithin(id, dir) { const f = findStep(id); if (!f) return; const ni = f.index + dir; if (ni < 0 || ni >= f.arr.length) return; f.arr.splice(f.index, 1); f.arr.splice(ni, 0, f.step); render(); changed(); }

  function openAddMenu(anchor, path) {
    closePop();
    const r = anchor.getBoundingClientRect();
    const m = document.createElement('div'); m.className = 'addmenu';
    m.style.left = Math.min(r.left, innerWidth - 280) + 'px'; m.style.top = Math.min(r.bottom + 4, innerHeight - 360) + 'px';
    m.innerHTML = `<div class="addmenu__search">${icon('search')}<input placeholder="Buscar bloque…"></div><div class="addmenu__list"></div>`;
    const list = m.querySelector('.addmenu__list');
    const build = (f = '') => {
      list.innerHTML = '';
      CATS.forEach(cat => {
        let items = blocksByCat(cat.key);
        if (f) items = items.filter(b => (b.name + b.desc).toLowerCase().includes(f.toLowerCase()));
        if (!items.length) return;
        const h = document.createElement('div'); h.className = 'addmenu__cat'; h.innerHTML = `<span class="dot" style="background:${cat.color}"></span>${cat.name}`; list.appendChild(h);
        items.forEach(b => { const it = document.createElement('button'); it.className = 'addmenu__item'; it.style.setProperty('--accent', cat.color); it.innerHTML = `<span class="ai" style="background:${cat.color}">${icon(b.icon)}</span><span><b>${b.name}</b><i>${b.desc.slice(0, 52)}</i></span>`; it.addEventListener('click', () => { addBlock(b.type, path); closePop(); }); list.appendChild(it); });
      });
    };
    build();
    m.querySelector('input').addEventListener('input', e => build(e.target.value));
    document.body.appendChild(m);
    setTimeout(() => m.querySelector('input').focus(), 30);
  }
  function closePop() { document.querySelectorAll('.addmenu').forEach(x => x.remove()); }
  function addBlock(type, path = 'root') { const arr = stackByPath(path); if (!arr) return; arr.push(makeStep(type)); render(); changed(); }

  /* ---------- Arrastre por puntero (confiable) ---------- */
  let drag = null;
  function onFlowMouseDown(e) {
    const grip = e.target.closest('.grip');
    if (grip) { const card = grip.closest('[data-id]'); if (card) startDrag(e, { moveId: card.dataset.id }); }
  }
  function startNewBlockDrag(type, e) { startDrag(e, { newType: type }); }
  function startDrag(e, payload) {
    e.preventDefault();
    let label = 'Bloque';
    if (payload.newType) { const d = blockDef(payload.newType); label = d ? d.name : 'Bloque'; }
    else { const f = findStep(payload.moveId); if (f) { const d = blockDef(f.step.type); label = d ? d.name : 'Bloque'; } }
    const g = document.createElement('div'); g.className = 'drag-ghost'; g.textContent = label; document.body.appendChild(g);
    drag = { ...payload, ghost: g };
    if (payload.moveId) { const c = flowEl.querySelector(`.sb[data-id="${payload.moveId}"], .sc[data-id="${payload.moveId}"]`); if (c) c.classList.add('dragging'); }
    moveGhost(e);
    window.addEventListener('mousemove', onDragMove); window.addEventListener('mouseup', onDragUp);
  }
  function moveGhost(e) { if (drag && drag.ghost) { drag.ghost.style.left = (e.clientX + 14) + 'px'; drag.ghost.style.top = (e.clientY + 14) + 'px'; } }
  function onDragMove(e) {
    if (!drag) return; moveGhost(e);
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const stackEl = targetStack(el);
    clearMarker(); if (stackEl) showMarker(stackEl, e.clientY);
  }
  function onDragUp(e) {
    window.removeEventListener('mousemove', onDragMove); window.removeEventListener('mouseup', onDragUp);
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const stackEl = targetStack(el);
    clearMarker(); flowEl.querySelectorAll('.dragging').forEach(x => x.classList.remove('dragging'));
    if (drag && drag.ghost) drag.ghost.remove();
    if (stackEl && drag) {
      const path = stackEl.dataset.stack; const idx = markerIndex(stackEl, e.clientY); const arr = stackByPath(path);
      if (arr) {
        if (drag.newType) { arr.splice(idx, 0, makeStep(drag.newType)); render(); changed(); }
        else if (drag.moveId) {
          const moved = findStep(drag.moveId);
          if (moved) {
            const ids = collectIds(moved.step); const owner = path.split('.')[0];
            if (path !== 'root' && ids.includes(owner)) { window.toast && toast('No podés meter un bloque dentro de sí mismo'); }
            else { let ii = idx; if (moved.arr === arr && moved.index < idx) ii--; moved.arr.splice(moved.index, 1); arr.splice(ii, 0, moved.step); render(); changed(); }
          }
        }
      }
    }
    drag = null;
  }
  function targetStack(el) {
    if (!el || !el.closest) return null;
    let s = el.closest('.stack');
    const br = el.closest('.sc__branch');           // si estoy sobre una rama pero no sobre su pila interna, uso esa pila
    if (br && (!s || !br.contains(s))) s = br.querySelector(':scope > [data-slot] > .stack');
    return s;
  }
  function showMarker(stackEl, y) { clearMarker(); const idx = markerIndex(stackEl, y); const marker = document.createElement('div'); marker.className = 'drop-marker'; const cards = [...stackEl.children].filter(c => c.classList.contains('sb') || c.classList.contains('sc')); if (idx >= cards.length) stackEl.insertBefore(marker, stackEl.querySelector('.stack-add')); else stackEl.insertBefore(marker, cards[idx]); }
  function markerIndex(stackEl, y) { const cards = [...stackEl.children].filter(c => c.classList.contains('sb') || c.classList.contains('sc')); for (let i = 0; i < cards.length; i++) { const r = cards[i].getBoundingClientRect(); if (y < r.top + r.height / 2) return i; } return cards.length; }
  function clearMarker() { flowEl.querySelectorAll('.drop-marker').forEach(x => x.remove()); }

  /* ---------- API ---------- */
  function loadProgram(pg) { program = pg && pg.root ? pg : { target: { mode: 'product', id: 'p1' }, root: [] }; selected = null; render(); resetHistory(); }
  function getProgram() { return program; }
  function setTarget(t) { program.target = t; render(); changed(); }
  function getTarget() { return program.target; }
  function refresh() { render(); }
  function getState() { return { program, selected }; }
  function insertBlocks(steps, path = 'root') { const arr = stackByPath(path); if (!arr) return; steps.forEach(s => { reId(s); arr.push(s); }); render(); changed(); }

  return { init, loadProgram, getProgram, setTarget, getTarget, addBlock, insertBlocks, startNewBlockDrag, zoomBy, setZoom, fitView, refresh, getState, findStep, mergedParams, undo, redo, deleteSelected };
})();
