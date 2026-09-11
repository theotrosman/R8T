/* ============================================================
   R8T · inspector.js  —  panel derecho de configuración del nodo
   ============================================================ */
const Inspector = (() => {
  let root;
  function mount(el) { root = el; renderEmpty(); }

  function renderEmpty() {
    root.innerHTML = `
      <div class="inspector-empty">
        ${icon('drag')}
        <h4>Ningún bloque seleccionado</h4>
        <p>Hacé clic en un bloque del lienzo para editar sus números, o arrastrá bloques nuevos desde la paleta.</p>
      </div>`;
  }

  function render(node) {
    if (!node) { renderEmpty(); return; }
    const d = BLOCKS[node.type] || (window.CUSTOM_BLOCKS && window.CUSTOM_BLOCKS[node.type]);
    if (!d) { renderEmpty(); return; }
    const cat = CAT_MAP[d.cat];
    const color = cat ? cat.color : 'var(--rt-blue)';
    const p = RE.mergedParams(node);

    let fields = (d.params || []).map(pr => field(pr, p[pr.key])).join('');
    if (!(d.params || []).length) fields = `<p class="muted" style="font-size:13px;padding:8px 0">Este bloque no tiene parámetros configurables.</p>`;

    root.innerHTML = `
      <div class="insp__head" style="--accent:${color}">
        <div class="insp__icon" style="background:${color}">${icon(d.icon)}</div>
        <div>
          <div class="insp__title">${d.name}</div>
          <div class="insp__cat" style="color:${color}">${cat ? cat.name : ''}</div>
        </div>
      </div>
      <div class="insp__desc">${d.desc || ''}</div>
      <div class="insp__fields" style="--accent:${color}">${fields}</div>
      ${node.type !== 'producto' ? `<div class="insp__actions">
        <button class="btn btn--ghost btn--sm" data-act="dup">${icon('copy')} Duplicar</button>
        <button class="btn btn--ghost btn--sm" data-act="del" style="color:var(--danger)">${icon('trash')} Eliminar</button>
      </div>` : ''}`;

    wire(node, d);
  }

  function field(pr, val) {
    const label = `<div class="field__label"><span>${pr.label}</span>${pr.hint ? `<span class="info" title="${pr.hint}">${icon('info')}</span>` : ''}</div>`;
    let control = '';
    if (pr.type === 'number') {
      control = `
        <div class="num" data-key="${pr.key}">
          <button class="num__btn" data-step="-1" tabindex="-1">−</button>
          <input type="number" value="${val}" min="${pr.min ?? ''}" max="${pr.max ?? ''}" step="${pr.step ?? 1}">
          ${pr.unit ? `<span class="num__unit">${pr.unit}</span>` : ''}
        </div>`;
      if (pr.slider) control += `<input class="slider" type="range" data-key="${pr.key}" min="${pr.min ?? 0}" max="${pr.max ?? 100}" step="${pr.step ?? 1}" value="${val}">`;
    } else if (pr.type === 'select') {
      control = `<select class="control" data-key="${pr.key}">${pr.options.map(o => `<option value="${o[0]}" ${String(val) === String(o[0]) ? 'selected' : ''}>${o[1]}</option>`).join('')}</select>`;
    } else if (pr.type === 'toggle') {
      control = `<label class="toggle"><input type="checkbox" data-key="${pr.key}" ${val ? 'checked' : ''}><span class="toggle__track"></span></label>`;
    } else if (pr.type === 'text') {
      control = `<input class="control" type="text" data-key="${pr.key}" value="${val || ''}">`;
    }
    const wrap = pr.type === 'toggle'
      ? `<div class="field" style="display:flex;align-items:center;justify-content:space-between;gap:12px">${label.replace('field__label', 'field__label" style="margin:0')}${control}</div>`
      : `<div class="field">${label}${control}${pr.hint && pr.type !== 'number' ? `<div class="field__hint">${pr.hint}</div>` : ''}</div>`;
    return wrap;
  }

  function wire(node, d) {
    // números
    root.querySelectorAll('.num').forEach(numEl => {
      const key = numEl.dataset.key;
      const input = numEl.querySelector('input');
      const pr = d.params.find(x => x.key === key);
      const commit = v => {
        let n = parseFloat(v); if (isNaN(n)) n = pr.value;
        if (pr.min !== undefined) n = Math.max(pr.min, n);
        if (pr.max !== undefined) n = Math.min(pr.max, n);
        input.value = n;
        const sl = root.querySelector(`.slider[data-key="${key}"]`); if (sl) sl.value = n;
        RE.updateNodeParams(node.id, { [key]: n });
      };
      input.addEventListener('input', () => commit(input.value));
      numEl.querySelectorAll('.num__btn').forEach(b => b.addEventListener('click', () => {
        const step = (pr.step || 1) * parseInt(b.dataset.step, 10);
        commit((parseFloat(input.value) || 0) + step);
      }));
    });
    // sliders
    root.querySelectorAll('.slider').forEach(sl => {
      const key = sl.dataset.key;
      sl.addEventListener('input', () => {
        const numInput = root.querySelector(`.num[data-key="${key}"] input`); if (numInput) numInput.value = sl.value;
        RE.updateNodeParams(node.id, { [key]: parseFloat(sl.value) });
      });
    });
    // selects
    root.querySelectorAll('select.control').forEach(s => s.addEventListener('change', () => RE.updateNodeParams(node.id, { [s.dataset.key]: s.value })));
    // toggles
    root.querySelectorAll('.toggle input').forEach(t => t.addEventListener('change', () => RE.updateNodeParams(node.id, { [t.dataset.key]: t.checked })));
    // text
    root.querySelectorAll('input.control[type="text"]').forEach(t => t.addEventListener('input', () => RE.updateNodeParams(node.id, { [t.dataset.key]: t.value })));
    // acciones
    const dup = root.querySelector('[data-act="dup"]'); if (dup) dup.addEventListener('click', () => RE.duplicateNode(node.id));
    const del = root.querySelector('[data-act="del"]'); if (del) del.addEventListener('click', () => RE.deleteNode(node.id));
  }

  return { mount, render, renderEmpty };
})();
