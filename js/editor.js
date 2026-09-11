/* ============================================================
   R8T · editor.js  —  motor del canvas (pan / zoom / nodos / conexiones)
   Sin dependencias externas. Vanilla JS.
   ============================================================ */

const RE = (() => {
  let canvasEl, worldEl, edgesEl, tempPath, hintEl;
  const state = { nodes: [], connections: [], view: { x: 60, y: 40, scale: 1 }, selected: null };
  const cbs = { onSelect: () => {}, onChange: () => {} };
  let uid = 1;
  const MIN_Z = 0.35, MAX_Z = 1.8;

  function def(type) { return BLOCKS[type] || (window.CUSTOM_BLOCKS && window.CUSTOM_BLOCKS[type]); }
  function catColor(type) { const d = def(type); return d ? (CAT_MAP[d.cat] ? CAT_MAP[d.cat].color : 'var(--rt-blue)') : 'var(--rt-blue)'; }
  function newId() { return 'n' + (uid++) + Date.now().toString(36).slice(-3); }

  /* ---------- init ---------- */
  function init(opts) {
    canvasEl = opts.canvas; worldEl = opts.world; edgesEl = opts.edges; hintEl = opts.hint;
    cbs.onSelect = opts.onSelect || cbs.onSelect;
    cbs.onChange = opts.onChange || cbs.onChange;

    tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    tempPath.setAttribute('class', 'edge-temp'); tempPath.style.display = 'none';
    edgesEl.appendChild(tempPath);

    canvasEl.addEventListener('mousedown', onCanvasMouseDown);
    canvasEl.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvasEl.addEventListener('click', onCanvasClick);

    // drop desde la paleta
    canvasEl.addEventListener('dragover', e => { e.preventDefault(); });
    canvasEl.addEventListener('drop', e => {
      e.preventDefault();
      const type = e.dataTransfer.getData('text/r8t-block');
      if (type) { const w = screenToWorld(e.clientX, e.clientY); addNodeAt(type, w.x - 117, w.y - 30); }
    });
    applyTransform();
  }

  /* ---------- coordenadas ---------- */
  function screenToWorld(cx, cy) {
    const r = canvasEl.getBoundingClientRect();
    return { x: (cx - r.left - state.view.x) / state.view.scale, y: (cy - r.top - state.view.y) / state.view.scale };
  }
  function applyTransform() {
    const v = state.view;
    worldEl.style.transform = `translate(${v.x}px, ${v.y}px) scale(${v.scale})`;
    canvasEl.style.backgroundPosition = `${v.x}px ${v.y}px, ${v.x}px ${v.y}px, ${v.x}px ${v.y}px`;
    canvasEl.style.backgroundSize = `${26 * v.scale}px ${26 * v.scale}px, ${130 * v.scale}px ${130 * v.scale}px, ${130 * v.scale}px ${130 * v.scale}px`;
    const zl = document.getElementById('zoomLabel'); if (zl) zl.textContent = Math.round(v.scale * 100) + '%';
  }

  /* ---------- gestos ---------- */
  let gesture = null; // {type:'pan'|'node'|'connect', ...}

  function onCanvasMouseDown(e) {
    const portEl = e.target.closest('.port');
    const nodeEl = e.target.closest('.node');
    if (portEl) { startConnect(e, portEl); return; }
    if (nodeEl && e.target.closest('.node__head')) { startNodeDrag(e, nodeEl); return; }
    if (nodeEl) return; // click dentro del nodo (no header) no paneea
    // pan
    gesture = { type: 'pan', sx: e.clientX, sy: e.clientY, ox: state.view.x, oy: state.view.y, moved: false };
    canvasEl.classList.add('panning');
  }

  function startNodeDrag(e, nodeEl) {
    e.preventDefault();
    const id = nodeEl.dataset.id;
    const node = state.nodes.find(n => n.id === id);
    selectNode(id);
    gesture = { type: 'node', id, sx: e.clientX, sy: e.clientY, ox: node.x, oy: node.y, moved: false, el: nodeEl };
    nodeEl.classList.add('dragging');
  }

  function startConnect(e, portEl) {
    e.preventDefault(); e.stopPropagation();
    const io = portEl.dataset.io;
    if (io === 'in') return; // conexiones salen de output
    gesture = { type: 'connect', fromNode: portEl.dataset.node, fromPort: portEl.dataset.port, portEl };
    canvasEl.classList.add('is-connecting');
    tempPath.style.display = '';
  }

  function onMouseMove(e) {
    if (!gesture) return;
    if (gesture.type === 'pan') {
      state.view.x = gesture.ox + (e.clientX - gesture.sx);
      state.view.y = gesture.oy + (e.clientY - gesture.sy);
      if (Math.abs(e.clientX - gesture.sx) + Math.abs(e.clientY - gesture.sy) > 3) gesture.moved = true;
      applyTransform();
    } else if (gesture.type === 'node') {
      const dx = (e.clientX - gesture.sx) / state.view.scale;
      const dy = (e.clientY - gesture.sy) / state.view.scale;
      if (Math.abs(dx) + Math.abs(dy) > 2) gesture.moved = true;
      const node = state.nodes.find(n => n.id === gesture.id);
      node.x = Math.round((gesture.ox + dx) / 4) * 4;  // snap suave a la grilla
      node.y = Math.round((gesture.oy + dy) / 4) * 4;
      gesture.el.style.left = node.x + 'px'; gesture.el.style.top = node.y + 'px';
      renderEdges();
    } else if (gesture.type === 'connect') {
      const from = portCenterWorld(gesture.fromNode, 'out', gesture.fromPort);
      const to = screenToWorld(e.clientX, e.clientY);
      tempPath.setAttribute('d', bezier(from.x, from.y, to.x, to.y));
      const hov = document.elementFromPoint(e.clientX, e.clientY);
      document.querySelectorAll('.port.hot').forEach(p => p.classList.remove('hot'));
      const hp = hov && hov.closest && hov.closest('.port[data-io="in"]');
      if (hp) hp.classList.add('hot');
    }
  }

  function onMouseUp(e) {
    if (!gesture) return;
    if (gesture.type === 'pan') canvasEl.classList.remove('panning');
    if (gesture.type === 'node') { gesture.el.classList.remove('dragging'); if (gesture.moved) cbs.onChange(); }
    if (gesture.type === 'connect') {
      canvasEl.classList.remove('is-connecting');
      tempPath.style.display = 'none';
      const hov = document.elementFromPoint(e.clientX, e.clientY);
      const hp = hov && hov.closest && hov.closest('.port[data-io="in"]');
      document.querySelectorAll('.port.hot').forEach(p => p.classList.remove('hot'));
      if (hp && hp.dataset.node !== gesture.fromNode) addConnection(gesture.fromNode, gesture.fromPort, hp.dataset.node);
    }
    gesture = null;
  }

  function onCanvasClick(e) {
    if (e.target === canvasEl || e.target === worldEl) {
      if (!gesture || !gesture.moved) { selectNode(null); }
    }
  }

  function onWheel(e) {
    e.preventDefault();
    const r = canvasEl.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const before = state.view.scale;
    const delta = -e.deltaY * 0.0016;
    let scale = Math.min(MAX_Z, Math.max(MIN_Z, before * (1 + delta)));
    // zoom hacia el cursor
    state.view.x = mx - (mx - state.view.x) * (scale / before);
    state.view.y = my - (my - state.view.y) * (scale / before);
    state.view.scale = scale;
    applyTransform();
  }

  /* ---------- conexiones ---------- */
  function addConnection(fromNode, fromPort, toNode) {
    // un input recibe una sola conexión → reemplaza
    state.connections = state.connections.filter(c => c.to.node !== toNode);
    // evitar duplicado exacto
    if (!state.connections.find(c => c.from.node === fromNode && c.from.port === fromPort && c.to.node === toNode)) {
      state.connections.push({ id: 'c' + newId(), from: { node: fromNode, port: fromPort }, to: { node: toNode, port: 'in' } });
    }
    render(); cbs.onChange();
  }
  function removeConnection(id) { state.connections = state.connections.filter(c => c.id !== id); render(); cbs.onChange(); }

  function portCenterWorld(nodeId, io, port) {
    const el = document.getElementById(`port-${nodeId}-${io}-${port}`);
    if (!el) { const n = state.nodes.find(x => x.id === nodeId); return { x: (n ? n.x : 0) + (io === 'out' ? 234 : 0), y: (n ? n.y : 0) + 30 }; }
    const r = el.getBoundingClientRect(), cr = canvasEl.getBoundingClientRect();
    return {
      x: (r.left + r.width / 2 - cr.left - state.view.x) / state.view.scale,
      y: (r.top + r.height / 2 - cr.top - state.view.y) / state.view.scale,
    };
  }
  function bezier(x1, y1, x2, y2) {
    const dx = Math.max(45, Math.abs(x2 - x1) * 0.5);
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  }

  /* ---------- render ---------- */
  function render() {
    // nodos
    worldEl.querySelectorAll('.node').forEach(n => n.remove());
    state.nodes.forEach(renderNode);
    renderEdges();
    if (hintEl) hintEl.style.display = state.nodes.length ? 'none' : '';
  }

  function renderNode(node) {
    const d = def(node.type); if (!d) return;
    const color = catColor(node.type);
    const cat = CAT_MAP[d.cat];
    const el = document.createElement('div');
    el.className = 'node' + (state.selected === node.id ? ' selected' : '');
    el.dataset.id = node.id;
    el.style.left = node.x + 'px'; el.style.top = node.y + 'px';
    el.style.setProperty('--accent', color);

    const p = mergedParams(node);
    let rows = '';
    const summ = d.summary ? d.summary(p, window.__lastCtx) : [];
    if (summ && summ.length) rows = summ.map(r => `<div class="node__row"><span class="k">${r[0]}</span><span class="v accent">${r[1]}</span></div>`).join('');
    else rows = `<div class="node__empty">Sin parámetros</div>`;

    el.innerHTML = `
      <div class="node__bar"></div>
      <div class="node__head">
        <div class="node__icon">${icon(d.icon)}</div>
        <div class="node__titles">
          <div class="node__title">${d.name}</div>
          <div class="node__sub">${cat ? cat.name : ''}</div>
        </div>
        <button class="node__menu" data-menu title="Opciones">${icon('dots')}</button>
      </div>
      <div class="node__body">${rows}</div>`;

    // puertos
    if (d.inputs) el.appendChild(makePort(node.id, 'in', 'in', null, 0.5));
    const outs = d.outputs || [];
    outs.forEach((o, i) => {
      const pos = outs.length === 1 ? 0.5 : (i === 0 ? 0.34 : 0.66);
      el.appendChild(makePort(node.id, 'out', o.id, o, pos));
    });

    worldEl.appendChild(el);

    // posicionar puertos verticalmente según alto real
    requestAnimationFrame(() => positionPorts(el, d));

    el.querySelector('[data-menu]').addEventListener('mousedown', ev => { ev.stopPropagation(); });
    el.querySelector('[data-menu]').addEventListener('click', ev => { ev.stopPropagation(); openNodeMenu(ev, node.id); });
  }

  function makePort(nodeId, io, port, meta, ratio) {
    const el = document.createElement('div');
    let cls = 'port port--' + io;
    if (meta && meta.kind) cls += ' port--' + meta.kind;
    el.className = cls;
    el.id = `port-${nodeId}-${io}-${port}`;
    el.dataset.node = nodeId; el.dataset.io = io; el.dataset.port = port; el.dataset.ratio = ratio;
    if (meta && meta.label) el.innerHTML = `<span class="port__label">${meta.label}</span>`;
    return el;
  }
  function positionPorts(nodeEl, d) {
    const h = nodeEl.offsetHeight;
    nodeEl.querySelectorAll('.port').forEach(p => {
      const ratio = parseFloat(p.dataset.ratio);
      if (p.classList.contains('port--out') && (d.outputs || []).length > 1) p.style.top = (h * ratio - 7.5) + 'px';
      else p.style.top = (h * ratio - 7.5) + 'px';
      p.style.transform = 'none';
    });
    renderEdges();
  }

  function renderEdges() {
    // limpiar (menos temp)
    edgesEl.querySelectorAll('.edge, .edge-hit, .edge-group').forEach(e => e.remove());
    state.connections.forEach(c => {
      const from = portCenterWorld(c.from.node, 'out', c.from.port);
      const to = portCenterWorld(c.to.node, 'in', 'in');
      const dpath = bezier(from.x, from.y, to.x, to.y);
      const hit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      hit.setAttribute('class', 'edge-hit'); hit.setAttribute('d', dpath);
      hit.style.pointerEvents = 'stroke'; hit.style.cursor = 'pointer';
      hit.addEventListener('click', () => { if (confirm('¿Eliminar esta conexión?')) removeConnection(c.id); });
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('class', 'edge edge-flow'); path.setAttribute('d', dpath);
      edgesEl.appendChild(hit); edgesEl.appendChild(path);
    });
  }

  /* ---------- API pública de nodos ---------- */
  function mergedParams(node) {
    const d = def(node.type); const out = {};
    (d.params || []).forEach(pr => { out[pr.key] = (node.params && node.params[pr.key] !== undefined) ? node.params[pr.key] : pr.value; });
    return out;
  }
  function addNodeAt(type, x, y) {
    const d = def(type); if (!d) return;
    // producto/trigger: uno solo
    if (type === 'producto' && state.nodes.some(n => n.type === 'producto')) { window.toast && toast('Ya existe un bloque Producto'); return; }
    const node = { id: newId(), type, x: Math.round(x), y: Math.round(y), params: {} };
    state.nodes.push(node); render(); selectNode(node.id); cbs.onChange();
    return node;
  }
  function addNodeCenter(type) {
    const r = canvasEl.getBoundingClientRect();
    const w = screenToWorld(r.left + r.width / 2, r.top + r.height / 2);
    return addNodeAt(type, w.x - 117, w.y - 40);
  }
  function selectNode(id) {
    state.selected = id;
    worldEl.querySelectorAll('.node').forEach(n => n.classList.toggle('selected', n.dataset.id === id));
    cbs.onSelect(id ? state.nodes.find(n => n.id === id) : null);
  }
  function updateNodeParams(id, params) {
    const n = state.nodes.find(x => x.id === id); if (!n) return;
    n.params = { ...n.params, ...params };
    // refrescar cuerpo del nodo
    const el = worldEl.querySelector(`.node[data-id="${id}"]`);
    if (el) { const d = def(n.type); const body = el.querySelector('.node__body');
      const summ = d.summary ? d.summary(mergedParams(n), window.__lastCtx) : [];
      body.innerHTML = (summ && summ.length) ? summ.map(r => `<div class="node__row"><span class="k">${r[0]}</span><span class="v accent">${r[1]}</span></div>`).join('') : `<div class="node__empty">Sin parámetros</div>`;
      requestAnimationFrame(() => renderEdges());
    }
    cbs.onChange();
  }
  function deleteNode(id) {
    state.nodes = state.nodes.filter(n => n.id !== id);
    state.connections = state.connections.filter(c => c.from.node !== id && c.to.node !== id);
    if (state.selected === id) selectNode(null);
    render(); cbs.onChange();
  }
  function duplicateNode(id) {
    const n = state.nodes.find(x => x.id === id); if (!n) return;
    if (n.type === 'producto') return;
    const copy = { id: newId(), type: n.type, x: n.x + 40, y: n.y + 40, params: { ...n.params } };
    state.nodes.push(copy); render(); selectNode(copy.id); cbs.onChange();
  }

  /* ---------- menú contextual ---------- */
  function openNodeMenu(ev, id) {
    closeCtx();
    const n = state.nodes.find(x => x.id === id);
    const m = document.createElement('div'); m.className = 'ctx-menu'; m.id = 'ctxMenu';
    m.style.left = ev.clientX + 'px'; m.style.top = ev.clientY + 'px';
    m.innerHTML = `
      <button data-a="dup">${icon('copy')} Duplicar</button>
      <button data-a="center">${icon('target')} Centrar</button>
      <hr>
      <button class="danger" data-a="del">${icon('trash')} Eliminar</button>`;
    if (n.type === 'producto') m.querySelector('[data-a="dup"]').remove();
    document.body.appendChild(m);
    m.addEventListener('click', e => {
      const a = e.target.closest('button')?.dataset.a;
      if (a === 'dup') duplicateNode(id);
      if (a === 'del') deleteNode(id);
      if (a === 'center') { const nn = state.nodes.find(x => x.id === id); centerOn(nn); }
      closeCtx();
    });
    setTimeout(() => document.addEventListener('mousedown', closeCtx, { once: true }), 0);
  }
  function closeCtx() { const m = document.getElementById('ctxMenu'); if (m) m.remove(); }

  /* ---------- vista ---------- */
  function centerOn(node) {
    if (!node) return;
    const r = canvasEl.getBoundingClientRect();
    state.view.scale = 1;
    state.view.x = r.width / 2 - (node.x + 117);
    state.view.y = r.height / 2 - (node.y + 40);
    applyTransform();
  }
  function fitView() {
    if (!state.nodes.length) { state.view = { x: 60, y: 40, scale: 1 }; applyTransform(); return; }
    const xs = state.nodes.map(n => n.x), ys = state.nodes.map(n => n.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs) + 234;
    const minY = Math.min(...ys), maxY = Math.max(...ys) + 150;
    const r = canvasEl.getBoundingClientRect();
    const pad = 70;
    const scale = Math.min(MAX_Z, Math.max(MIN_Z, Math.min((r.width - pad * 2) / (maxX - minX), (r.height - pad * 2) / (maxY - minY))));
    state.view.scale = scale;
    state.view.x = pad - minX * scale + (r.width - pad * 2 - (maxX - minX) * scale) / 2;
    state.view.y = pad - minY * scale + (r.height - pad * 2 - (maxY - minY) * scale) / 2;
    applyTransform();
  }
  function zoomBy(f) {
    const r = canvasEl.getBoundingClientRect();
    const mx = r.width / 2, my = r.height / 2, before = state.view.scale;
    const scale = Math.min(MAX_Z, Math.max(MIN_Z, before * f));
    state.view.x = mx - (mx - state.view.x) * (scale / before);
    state.view.y = my - (my - state.view.y) * (scale / before);
    state.view.scale = scale; applyTransform();
  }

  /* ---------- carga / guardado ---------- */
  function loadGraph(g) {
    state.nodes = (g.nodes || []).map(n => ({ ...n, params: n.params || {} }));
    state.connections = (g.connections || []).map(c => ({ ...c, id: c.id || 'c' + newId() }));
    selectNode(null); render();
    setTimeout(fitView, 30);
  }
  function getGraph() { return { nodes: state.nodes.map(n => ({ id: n.id, type: n.type, x: n.x, y: n.y, params: n.params })), connections: state.connections }; }
  function clearGraph() { state.nodes = []; state.connections = []; selectNode(null); render(); cbs.onChange(); }
  function getState() { return state; }
  function refresh() { render(); }

  return { init, loadGraph, getGraph, clearGraph, addNodeCenter, addNodeAt, selectNode, updateNodeParams,
           deleteNode, duplicateNode, fitView, zoomBy, getState, mergedParams, refresh, centerOn,
           deleteSelected: () => state.selected && deleteNode(state.selected) };
})();
