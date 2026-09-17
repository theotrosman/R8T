/* ============================================================
   R8T · v3.js  —  versión "Lite": asistente guiado por 3 pasos
   Sin chat, sin estrategias abstractas de "agresividad".
   El usuario elige destino → objetivo (con selectores) → su piso,
   y obtiene una frase clara de qué va a hacer R8T. Vanilla JS.

   Autónomo: sólo depende de icons.js (icon()). Datos de muestra
   espejan los de strategies.js para mantener coherencia.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Datos de muestra (mismos que strategies.js) ---------- */
  const PRODUCTS = [
    { id: 'p1', name: 'Auriculares Bluetooth',   price: 19999,  stock: 45,  daysNoSale: 1 },
    { id: 'p2', name: 'Zapatillas Running',      price: 74999,  stock: 8,   daysNoSale: 3 },
    { id: 'p3', name: 'Cafetera Express',        price: 119999, stock: 120, daysNoSale: 6 },
    { id: 'p4', name: 'Smartwatch Deportivo',    price: 45999,  stock: 3,   daysNoSale: 0 },
    { id: 'p5', name: 'Mochila Notebook 15.6"',  price: 24999,  stock: 210, daysNoSale: 9 },
  ];
  const GROUPS = [
    { id: 'g1', name: 'Categoría: Electrónica', count: 128 },
    { id: 'g2', name: 'Categoría: Indumentaria deportiva', count: 64 },
    { id: 'g3', name: 'Categoría: Hogar y cocina', count: 210 },
    { id: 'g4', name: 'Todas mis publicaciones', count: 412 },
  ];
  // "Dump" = diferencial de Real Trends: publicaciones de la competencia.
  const DUMP = [
    { id: 'd1', name: 'Auriculares Bluetooth TWS Pro', price: 18990, seller: 'TechnoStore' },
    { id: 'd2', name: 'Zapatillas Running Ultra', price: 71990, seller: 'DeporMax' },
    { id: 'd3', name: 'Cafetera Express 20 Bar', price: 124990, seller: 'HogarYa' },
    { id: 'd4', name: 'Smartwatch Deportivo GPS', price: 43990, seller: 'GadgetPoint' },
    { id: 'd5', name: 'Mochila Notebook Antirrobo', price: 23500, seller: 'UrbanBags' },
    { id: 'd6', name: 'Auriculares Inalámbricos Gamer', price: 21490, seller: 'GamerZone' },
  ];

  const GOALS = {
    buybox:       { icon: 'target',      label: 'Ganar la Buy Box' },
    competidor:   { icon: 'competencia', label: 'Ganarle a un competidor' },
    rentabilidad: { icon: 'margen',      label: 'Cuidar mi rentabilidad' },
    liquidar:     { icon: 'stock',       label: 'Liquidar stock parado' },
  };

  const STORE = 'r8t.v3.strategies';
  const money = n => '$' + Math.round(Number(n) || 0).toLocaleString('es-AR');

  /* ---------- Estado del asistente ---------- */
  const blank = () => ({
    step: 1,
    target: { mode: null, id: null, link: '' },       // product | group
    goal: null,                                         // buybox | competidor | ...
    comp: { source: 'link', link: '', dumpId: null, delta: 200 },
    rentTarget: 20,
    liqMax: 15,
    promos: false,
    stockRule: { on: false, qty: 5, pct: 8 },
    minPrice: null,
  });
  let S = blank();

  /* ---------- Helpers DOM ---------- */
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  function hydrateIcons(root) {
    (root || document).querySelectorAll('[data-ic]').forEach(el => {
      if (el.dataset.icDone) return;
      el.insertAdjacentHTML('afterbegin', icon(el.dataset.ic));
      el.dataset.icDone = '1';
    });
  }
  function toast(msg, ic) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = icon(ic || 'check') + '<span>' + msg + '</span>';
    $('#toasts').appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(8px)'; setTimeout(() => t.remove(), 250); }, 2600);
  }

  /* ---------- Persistencia ---------- */
  function loadSaved() { try { return JSON.parse(localStorage.getItem(STORE) || '[]'); } catch { return []; } }
  function saveSaved(list) { try { localStorage.setItem(STORE, JSON.stringify(list)); } catch {} }

  /* ============================================================
     NAVEGACIÓN DEL WIZARD
     ============================================================ */
  function showWizard() {
    $('#emptyState').hidden = true;
    $('#wizard').hidden = false;
    S = blank();
    renderStep();
    $('#v3scroll').scrollTop = 0;
  }
  function showEmpty() {
    $('#wizard').hidden = true;
    $('#emptyState').hidden = false;
    renderSaved();
    $('#v3scroll').scrollTop = 0;
  }

  function renderStep() {
    // paneles
    $$('.pane').forEach(p => p.classList.toggle('is-active', +p.dataset.pane === S.step));
    // progreso
    $$('#steps .steps__item').forEach(it => {
      const n = +it.dataset.step;
      it.classList.toggle('is-active', n === S.step);
      it.classList.toggle('is-done', n < S.step);
      const dot = it.querySelector('.steps__dot');
      dot.innerHTML = n < S.step ? icon('check') : String(n);
    });
    // botones
    $('#btnBack').style.visibility = S.step === 1 ? 'hidden' : 'visible';
    const last = S.step === 4;
    $('#btnNext').classList.toggle('hidden', last);
    $('#btnActivate').classList.toggle('hidden', !last);
    clearError();
    if (S.step === 4) renderSummary();
    $('#v3scroll').scrollTop = 0;
  }

  function showError(msg) {
    $('#navErrorTxt').textContent = msg;
    $('#navError').classList.add('show');
  }
  function clearError() { $('#navError').classList.remove('show'); }

  function validateStep() {
    if (S.step === 1) {
      if (!S.target.mode) return 'Elegí si es una publicación o un grupo.';
      if (S.target.mode === 'product' && !S.target.id && !S.target.link.trim())
        return 'Elegí una publicación o pegá un link.';
      if (S.target.mode === 'group' && !S.target.id) return 'Elegí un grupo de publicaciones.';
    }
    if (S.step === 2) {
      if (!S.goal) return 'Elegí qué querés lograr.';
      if (S.goal === 'competidor') {
        if (S.comp.source === 'link' && !S.comp.link.trim()) return 'Pegá el link del competidor a seguir.';
        if (S.comp.source === 'dump' && !S.comp.dumpId) return 'Elegí una publicación del dump.';
      }
    }
    if (S.step === 3) {
      if (!(Number(S.minPrice) > 0)) return 'Poné tu precio mínimo de venta.';
    }
    return null;
  }

  function next() {
    const err = validateStep();
    if (err) { showError(err); return; }
    if (S.step < 4) { S.step++; renderStep(); }
  }
  function back() { if (S.step > 1) { S.step--; renderStep(); } }

  /* ============================================================
     PASO 1 — DESTINO
     ============================================================ */
  function selectMode(mode) {
    S.target = { mode, id: null, link: '', };
    $$('#targetMode .opt').forEach(o => o.classList.toggle('is-sel', o.dataset.mode === mode));
    renderTargetPicker();
  }

  function renderTargetPicker() {
    const host = $('#targetPicker');
    if (!S.target.mode) { host.innerHTML = ''; return; }

    if (S.target.mode === 'product') {
      host.innerHTML = `
        <div class="reveal" style="border-style:solid">
          <div class="reveal__title"><span data-ic="producto"></span> Elegí una publicación de tu catálogo</div>
          <div class="picker">
            <div class="picker__search"><span data-ic="search"></span><input id="prodSearch" placeholder="Buscar en mi catálogo…" spellcheck="false"></div>
            <div class="picker__list" id="prodList"></div>
          </div>
          <div class="field">
            <label class="field__label">…o pegá el link de tu publicación de Mercado Libre</label>
            <input class="input" id="prodLink" placeholder="https://articulo.mercadolibre.com.ar/MLA-..." spellcheck="false" value="${S.target.link || ''}">
          </div>
        </div>`;
      hydrateIcons(host);
      renderProdList('');
      $('#prodSearch').addEventListener('input', e => renderProdList(e.target.value));
      $('#prodLink').addEventListener('input', e => {
        S.target.link = e.target.value;
        if (e.target.value.trim()) { S.target.id = null; renderProdList($('#prodSearch').value); }
        clearError();
      });
    } else {
      host.innerHTML = `
        <div class="reveal" style="border-style:solid">
          <div class="reveal__title"><span data-ic="layers"></span> Elegí el grupo</div>
          <div class="picker"><div class="picker__list" id="groupList"></div></div>
        </div>`;
      hydrateIcons(host);
      renderGroupList();
    }
  }

  function renderProdList(q) {
    const list = $('#prodList'); if (!list) return;
    const items = PRODUCTS.filter(p => p.name.toLowerCase().includes((q || '').toLowerCase()));
    list.innerHTML = items.map(p => `
      <button class="pick ${S.target.id === p.id ? 'is-sel' : ''}" data-id="${p.id}">
        <span class="pick__thumb" data-ic="producto"></span>
        <span class="pick__main">
          <span class="pick__name">${p.name}</span>
          <span class="pick__meta">${money(p.price)} · ${p.stock} en stock</span>
        </span>
        <span class="pick__check" data-ic="checkc"></span>
      </button>`).join('') || '<div style="padding:16px;color:var(--rt-gray-400);font-size:13px">Sin resultados.</div>';
    hydrateIcons(list);
    list.querySelectorAll('.pick').forEach(b => b.addEventListener('click', () => {
      S.target.id = b.dataset.id; S.target.link = '';
      const pl = $('#prodLink'); if (pl) pl.value = '';
      renderProdList(q); clearError();
    }));
  }

  function renderGroupList() {
    const list = $('#groupList'); if (!list) return;
    list.innerHTML = GROUPS.map(g => `
      <button class="pick ${S.target.id === g.id ? 'is-sel' : ''}" data-id="${g.id}">
        <span class="pick__thumb" data-ic="layers"></span>
        <span class="pick__main">
          <span class="pick__name">${g.name}</span>
          <span class="pick__meta">${g.count} publicaciones</span>
        </span>
        <span class="pick__check" data-ic="checkc"></span>
      </button>`).join('');
    hydrateIcons(list);
    list.querySelectorAll('.pick').forEach(b => b.addEventListener('click', () => {
      S.target.id = b.dataset.id; renderGroupList(); clearError();
    }));
  }

  /* ============================================================
     PASO 2 — OBJETIVO + EXTRAS
     ============================================================ */
  function selectGoal(goal) {
    S.goal = goal;
    $$('#goalList .opt').forEach(o => o.classList.toggle('is-sel', o.dataset.goal === goal));
    $('#revCompetidor').classList.toggle('hidden', goal !== 'competidor');
    $('#revRentabilidad').classList.toggle('hidden', goal !== 'rentabilidad');
    $('#revLiquidar').classList.toggle('hidden', goal !== 'liquidar');
    clearError();
  }

  function initStep2() {
    $$('#goalList .opt').forEach(o => o.addEventListener('click', () => selectGoal(o.dataset.goal)));

    // fuente competidor (link / dump)
    $$('#compSource button').forEach(b => b.addEventListener('click', () => {
      S.comp.source = b.dataset.src;
      $$('#compSource button').forEach(x => x.classList.toggle('is-on', x === b));
      $('#compLinkField').classList.toggle('hidden', b.dataset.src !== 'link');
      $('#compDumpField').classList.toggle('hidden', b.dataset.src !== 'dump');
      clearError();
    }));
    $('#compLink').addEventListener('input', e => { S.comp.link = e.target.value; clearError(); });
    $('#compDelta').addEventListener('input', e => { S.comp.delta = e.target.value; });
    $('#dumpSearch').addEventListener('input', e => renderDump(e.target.value));
    renderDump('');

    $('#rentTarget').addEventListener('input', e => { S.rentTarget = e.target.value; });
    $('#liqMax').addEventListener('input', e => { S.liqMax = e.target.value; });

    // extras
    $$('.switch').forEach(sw => sw.addEventListener('click', () => {
      const key = sw.dataset.switch;
      const on = !sw.classList.contains('is-on');
      sw.classList.toggle('is-on', on);
      const card = sw.closest('.addon'); card.classList.toggle('is-on', on);
      if (key === 'promos') S.promos = on;
      if (key === 'stock') S.stockRule.on = on;
    }));
    $('#stockQty').addEventListener('input', e => { S.stockRule.qty = e.target.value; });
    $('#stockPct').addEventListener('input', e => { S.stockRule.pct = e.target.value; });
  }

  function renderDump(q) {
    const list = $('#dumpList'); if (!list) return;
    const items = DUMP.filter(d => d.name.toLowerCase().includes((q || '').toLowerCase()));
    list.innerHTML = items.map(d => `
      <button class="pick ${S.comp.dumpId === d.id ? 'is-sel' : ''}" data-id="${d.id}">
        <span class="pick__thumb" data-ic="competencia"></span>
        <span class="pick__main">
          <span class="pick__name">${d.name}</span>
          <span class="pick__meta">${money(d.price)} · ${d.seller}</span>
        </span>
        <span class="pick__check" data-ic="checkc"></span>
      </button>`).join('') || '<div style="padding:16px;color:var(--rt-gray-400);font-size:13px">Sin resultados en el dump.</div>';
    hydrateIcons(list);
    list.querySelectorAll('.pick').forEach(b => b.addEventListener('click', () => {
      S.comp.dumpId = b.dataset.id; renderDump(q); clearError();
    }));
  }

  /* ============================================================
     PASO 3 — PISO
     ============================================================ */
  function initStep3() {
    $('#minPrice').addEventListener('input', e => { S.minPrice = e.target.value; clearError(); });
  }

  /* ============================================================
     PASO 4 — RESUMEN EN LENGUAJE NATURAL
     ============================================================ */
  function targetLabel() {
    if (S.target.mode === 'group') {
      const g = GROUPS.find(x => x.id === S.target.id);
      return g ? g.name + ' (' + g.count + ' publicaciones)' : 'un grupo';
    }
    if (S.target.link && S.target.link.trim()) return 'la publicación del link';
    const p = PRODUCTS.find(x => x.id === S.target.id);
    return p ? p.name : 'una publicación';
  }

  function competitorLabel() {
    if (S.comp.source === 'dump') {
      const d = DUMP.find(x => x.id === S.comp.dumpId);
      return d ? d.name + ' (' + d.seller + ')' : 'un competidor del dump';
    }
    return 'la publicación del link';
  }

  function goalPhrase() {
    switch (S.goal) {
      case 'buybox':
        return 'ganes la <b>Buy Box</b> del catálogo';
      case 'competidor':
        return 'le ganes a <b>' + competitorLabel() + '</b>, quedando <b>' + money(S.comp.delta) + ' por debajo</b>';
      case 'rentabilidad':
        return 'cuides tu <b>rentabilidad</b> con un margen de al menos <b>' + (Number(S.rentTarget) || 0) + '%</b>';
      case 'liquidar':
        return 'liquides el <b>stock parado</b>, bajando el precio hasta un <b>' + (Number(S.liqMax) || 0) + '%</b>';
      default: return 'gestiones tu precio';
    }
  }

  function buildSentence() {
    let s = 'Dale, vamos a gestionar que ' + goalPhrase();
    const extras = [];
    if (S.promos) extras.push('ponerte <b>todas las promociones</b> que te convengan');
    if (S.stockRule.on) extras.push('subirte el precio un <b>' + (Number(S.stockRule.pct) || 0) + '%</b> cuando te queden menos de <b>' + (Number(S.stockRule.qty) || 0) + ' unidades</b>');
    if (extras.length === 1) s += ' y ' + extras[0];
    else if (extras.length === 2) s += ', ' + extras[0] + ' y ' + extras[1];
    s += ' <span class="summary__floor">mientras tu precio de venta <b>nunca quede por debajo de ' + money(S.minPrice) + '</b>.</span>';
    return s;
  }

  function renderSummary() {
    $('#sumSentence').innerHTML = buildSentence();
    const g = GOALS[S.goal] || {};
    const rows = [
      { k: 'Se aplica a', v: targetLabel(), ic: S.target.mode === 'group' ? 'layers' : 'producto' },
      { k: 'Objetivo', v: g.label || '—', ic: g.icon || 'target' },
      { k: 'Precio mínimo', v: money(S.minPrice), ic: 'lock' },
    ];
    const extras = [];
    if (S.promos) extras.push('Promociones gestionadas');
    if (S.stockRule.on) extras.push('Sube +' + (S.stockRule.pct || 0) + '% si < ' + (S.stockRule.qty || 0) + ' u.');
    rows.push({ k: 'Extras', v: extras.length ? extras.join(' · ') : 'Ninguno', ic: 'sparkles' });

    $('#sumGrid').innerHTML = rows.map(r => `
      <div class="sitem">
        <div class="sitem__k">${r.k}</div>
        <div class="sitem__v">${icon(r.ic)}<span>${r.v}</span></div>
      </div>`).join('');
  }

  /* ============================================================
     GUARDAR / ACTIVAR
     ============================================================ */
  function plainSentence() {
    // versión sin HTML para la tarjeta guardada
    const tmp = document.createElement('div');
    tmp.innerHTML = buildSentence();
    return tmp.textContent;
  }

  function activate() {
    const err = validateStep();
    if (err) { showError(err); return; }
    const g = GOALS[S.goal] || {};
    const name = g.label + ' · ' + targetLabel();
    const list = loadSaved();
    list.unshift({
      id: 'v3_' + Date.now(),
      name,
      goal: S.goal,
      icon: g.icon || 'target',
      desc: plainSentence(),
      active: true,
      createdAt: new Date().toISOString(),
    });
    saveSaved(list);
    toast('Estrategia activada', 'rocket');
    showEmpty();
  }

  function renderSaved() {
    const list = loadSaved();
    const wrap = $('#savedWrap');
    wrap.classList.toggle('hidden', list.length === 0);
    $('#savedCount').textContent = list.length;
    $('#savedList').innerHTML = list.map(s => `
      <div class="scard" data-id="${s.id}">
        <span class="scard__ic">${icon(s.icon || 'target')}</span>
        <div class="scard__main">
          <div class="scard__name">${s.name}</div>
          <div class="scard__desc">${s.desc}</div>
        </div>
        <span class="scard__state"><span class="chip ${s.active ? 'chip--teal' : 'chip--gray'}">${s.active ? 'Activa' : 'Pausada'}</span></span>
        <button class="scard__del" data-del="${s.id}" title="Eliminar">${icon('trash')}</button>
      </div>`).join('');
    $$('#savedList .scard__del').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.del;
      saveSaved(loadSaved().filter(x => x.id !== id));
      renderSaved();
      toast('Estrategia eliminada', 'trash');
    }));
    // toggle activa/pausada al tocar el chip
    $$('#savedList .scard__state').forEach(el => el.addEventListener('click', () => {
      const id = el.closest('.scard').dataset.id;
      const l = loadSaved().map(x => x.id === id ? { ...x, active: !x.active } : x);
      saveSaved(l); renderSaved();
    }));
  }

  /* ============================================================
     INIT
     ============================================================ */
  function init() {
    hydrateIcons(document);

    $('#btnStart').addEventListener('click', showWizard);
    $('#btnCancel').addEventListener('click', () => { if (confirm('¿Descartar esta estrategia?')) showEmpty(); });
    $('#btnNext').addEventListener('click', next);
    $('#btnBack').addEventListener('click', back);
    $('#btnActivate').addEventListener('click', activate);

    // Paso 1
    $$('#targetMode .opt').forEach(o => o.addEventListener('click', () => selectMode(o.dataset.mode)));
    // Paso 2
    initStep2();
    // Paso 3
    initStep3();

    renderSaved();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
