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
    { id: 'g1', name: 'Categoría: Electrónica', count: 128, min: 8990, max: 189990 },
    { id: 'g2', name: 'Categoría: Indumentaria deportiva', count: 64, min: 15990, max: 129990 },
    { id: 'g3', name: 'Categoría: Hogar y cocina', count: 210, min: 4990, max: 249990 },
    { id: 'g4', name: 'Todas mis publicaciones', count: 412, min: 4990, max: 249990 },
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
    editingId: null,                                    // si estamos editando una guardada
    target: { mode: null, id: null, link: '' },        // product | group
    goal: null,                                         // buybox | competidor | ...
    comp: { source: 'link', link: '', dumpId: null, mode: 'below_amount', delta: 200, pct: 3 },
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

  /* ---------- Modal de confirmación (promesa) ---------- */
  function confirmDialog({ title, msg, yes }) {
    return new Promise(resolve => {
      const m = $('#confirmModal');
      $('#confirmTitle').textContent = title || '¿Seguro?';
      $('#confirmMsg').textContent = msg || '';
      $('#confirmYes').textContent = yes || 'Sí';
      m.hidden = false;
      const done = v => { m.hidden = true; cleanup(); resolve(v); };
      const onYes = () => done(true);
      const onNo = () => done(false);
      const onKey = e => { if (e.key === 'Escape') done(false); };
      function cleanup() {
        $('#confirmYes').removeEventListener('click', onYes);
        m.querySelectorAll('[data-close]').forEach(el => el.removeEventListener('click', onNo));
        document.removeEventListener('keydown', onKey);
      }
      $('#confirmYes').addEventListener('click', onYes);
      m.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', onNo));
      document.addEventListener('keydown', onKey);
    });
  }

  /* ---------- Persistencia ---------- */
  function loadSaved() { try { return JSON.parse(localStorage.getItem(STORE) || '[]'); } catch { return []; } }
  function saveSaved(list) { try { localStorage.setItem(STORE, JSON.stringify(list)); } catch {} }
  const isDirty = () => !!(S.target.mode || S.goal || S.minPrice);

  /* ============================================================
     NAVEGACIÓN DEL WIZARD
     ============================================================ */
  function showWizard(state) {
    $('#emptyState').hidden = true;
    $('#wizard').hidden = false;
    S = state || blank();
    applyStateToDOM();
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
    $$('.pane').forEach(p => p.classList.toggle('is-active', +p.dataset.pane === S.step));
    $$('#steps .steps__item').forEach(it => {
      const n = +it.dataset.step;
      it.classList.toggle('is-active', n === S.step);
      it.classList.toggle('is-done', n < S.step);
      it.querySelector('.steps__dot').innerHTML = n < S.step ? icon('check') : String(n);
    });
    $('#btnBack').style.visibility = S.step === 1 ? 'hidden' : 'visible';
    const last = S.step === 4;
    $('#btnNext').classList.toggle('hidden', last);
    $('#btnActivate').classList.toggle('hidden', !last);
    clearError();
    if (S.step === 3) renderMinPriceGuide();
    if (S.step === 4) renderSummary();
    $('#v3scroll').scrollTop = 0;
  }

  function showError(msg) { $('#navErrorTxt').textContent = msg; $('#navError').classList.add('show'); }
  function clearError() { $('#navError').classList.remove('show'); }

  function looksLikeMeliLink(v) {
    v = (v || '').trim().toLowerCase();
    return v.includes('mercadolibre.') || v.includes('/mla-') || v.includes('mla-') || v.startsWith('http');
  }

  function validateStep() {
    if (S.step === 1) {
      if (!S.target.mode) return 'Elegí si es una publicación o un grupo.';
      if (S.target.mode === 'product') {
        if (!S.target.id && !S.target.link.trim()) return 'Elegí una publicación o pegá un link.';
        if (!S.target.id && S.target.link.trim() && !looksLikeMeliLink(S.target.link)) return 'Ese link no parece de Mercado Libre. Revisalo.';
      }
      if (S.target.mode === 'group' && !S.target.id) return 'Elegí un grupo de publicaciones.';
    }
    if (S.step === 2) {
      if (!S.goal) return 'Elegí qué querés lograr.';
      if (S.goal === 'competidor') {
        if (S.comp.source === 'link') {
          if (!S.comp.link.trim()) return 'Pegá el link del competidor a seguir.';
          if (!looksLikeMeliLink(S.comp.link)) return 'Ese link no parece de Mercado Libre. Revisalo.';
        }
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

  async function cancel() {
    if (isDirty()) {
      const ok = await confirmDialog({ title: '¿Descartar la estrategia?', msg: 'Vas a perder lo que cargaste en estos pasos.', yes: 'Sí, descartar' });
      if (!ok) return;
    }
    showEmpty();
  }

  /* ============================================================
     PASO 1 — DESTINO
     ============================================================ */
  function selectMode(mode) {
    if (S.target.mode !== mode) S.target = { mode, id: null, link: '' };
    $$('#targetMode .opt').forEach(o => {
      const on = o.dataset.mode === mode;
      o.classList.toggle('is-sel', on); o.setAttribute('aria-pressed', on);
    });
    renderTargetPicker();
    clearError();
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
            <input class="input" id="prodLink" placeholder="https://articulo.mercadolibre.com.ar/MLA-..." spellcheck="false" inputmode="url" value="${S.target.link || ''}">
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
    $$('#goalList .opt').forEach(o => {
      const on = o.dataset.goal === goal;
      o.classList.toggle('is-sel', on); o.setAttribute('aria-pressed', on);
    });
    $('#revBuybox').classList.toggle('hidden', goal !== 'buybox');
    $('#revCompetidor').classList.toggle('hidden', goal !== 'competidor');
    $('#revRentabilidad').classList.toggle('hidden', goal !== 'rentabilidad');
    $('#revLiquidar').classList.toggle('hidden', goal !== 'liquidar');
    clearError();
  }

  function setSwitch(key, on) {
    const sw = document.querySelector('.switch[data-switch="' + key + '"]');
    if (!sw) return;
    sw.classList.toggle('is-on', on); sw.setAttribute('aria-pressed', on);
    sw.closest('.addon').classList.toggle('is-on', on);
  }

  function syncCompMode() {
    $$('#compMode button').forEach(b => b.classList.toggle('is-on', b.dataset.mode === S.comp.mode));
    $('#cmBelowAmount').classList.toggle('hidden', S.comp.mode !== 'below_amount');
    $('#cmBelowPct').classList.toggle('hidden', S.comp.mode !== 'below_pct');
    $('#cmMatch').classList.toggle('hidden', S.comp.mode !== 'match');
  }

  function initStep2() {
    $$('#goalList .opt').forEach(o => o.addEventListener('click', () => selectGoal(o.dataset.goal)));

    $$('#compSource button').forEach(b => b.addEventListener('click', () => {
      S.comp.source = b.dataset.src;
      $$('#compSource button').forEach(x => x.classList.toggle('is-on', x === b));
      $('#compLinkField').classList.toggle('hidden', b.dataset.src !== 'link');
      $('#compDumpField').classList.toggle('hidden', b.dataset.src !== 'dump');
      clearError();
    }));
    $$('#compMode button').forEach(b => b.addEventListener('click', () => {
      S.comp.mode = b.dataset.mode; syncCompMode();
    }));
    $('#compLink').addEventListener('input', e => { S.comp.link = e.target.value; clearError(); });
    $('#compDelta').addEventListener('input', e => { S.comp.delta = e.target.value; });
    $('#compPct').addEventListener('input', e => { S.comp.pct = e.target.value; });
    $('#dumpSearch').addEventListener('input', e => renderDump(e.target.value));
    renderDump('');

    $('#rentTarget').addEventListener('input', e => { S.rentTarget = e.target.value; });
    $('#liqMax').addEventListener('input', e => { S.liqMax = e.target.value; });

    $$('.switch').forEach(sw => sw.addEventListener('click', () => {
      const key = sw.dataset.switch;
      const on = !sw.classList.contains('is-on');
      setSwitch(key, on);
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
     PASO 3 — PISO (con guía que acompaña al usuario)
     ============================================================ */
  function initStep3() {
    $('#minPrice').addEventListener('input', e => { S.minPrice = e.target.value; clearError(); });
  }

  function renderMinPriceGuide() {
    const host = $('#minPriceGuide'); if (!host) return;
    let title = '', desc = '', suggest = null;

    if (S.target.mode === 'product') {
      const p = PRODUCTS.find(x => x.id === S.target.id);
      if (p) {
        suggest = Math.round(p.price * 0.85 / 100) * 100; // ~15% bajo el precio actual, redondeado
        title = 'Hoy vendés a ' + money(p.price);
        desc = 'Un piso razonable te deja margen para competir sin regalar plata. Te sugerimos <b>' + money(suggest) + '</b>, pero el número lo ponés vos.';
      } else if (S.target.link) {
        title = 'Publicación por link';
        desc = 'Poné el precio más bajo al que estarías dispuesto a vender esa publicación.';
      }
    } else if (S.target.mode === 'group') {
      const g = GROUPS.find(x => x.id === S.target.id);
      if (g) {
        title = g.name;
        desc = 'Tus precios en este grupo van de <b>' + money(g.min) + '</b> a <b>' + money(g.max) + '</b>. El piso se aplica como regla general; después podés afinarlo por publicación.';
      }
    }
    if (!title) { host.innerHTML = ''; return; }

    host.innerHTML = `
      <div class="mpguide">
        <span class="mpguide__ic" data-ic="wand"></span>
        <div class="mpguide__body">
          <div class="mpguide__t">${title}</div>
          <div class="mpguide__d">${desc}</div>
          ${suggest ? `<button class="mpguide__btn" id="useSuggest" type="button">${icon('check')} Usar ${money(suggest)}</button>` : ''}
        </div>
      </div>`;
    hydrateIcons(host);
    const btn = $('#useSuggest');
    if (btn) btn.addEventListener('click', () => {
      S.minPrice = suggest; $('#minPrice').value = suggest; clearError();
      toast('Precio mínimo sugerido aplicado', 'wand');
    });
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

  function compPositionPhrase() {
    if (S.comp.mode === 'match') return 'igualando su precio';
    if (S.comp.mode === 'below_pct') return 'quedando un <b>' + (Number(S.comp.pct) || 0) + '% por debajo</b>';
    return 'quedando <b>' + money(S.comp.delta) + ' por debajo</b>';
  }

  function goalPhrase() {
    switch (S.goal) {
      case 'buybox':       return 'ganes la <b>Buy Box</b> del catálogo';
      case 'competidor':   return 'le ganes a <b>' + competitorLabel() + '</b>, ' + compPositionPhrase();
      case 'rentabilidad': return 'cuides tu <b>rentabilidad</b> con un margen de al menos <b>' + (Number(S.rentTarget) || 0) + '%</b>';
      case 'liquidar':     return 'liquides el <b>stock parado</b>, bajando el precio hasta un <b>' + (Number(S.liqMax) || 0) + '%</b>';
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

  function extrasList() {
    const e = [];
    if (S.promos) e.push('Promociones gestionadas');
    if (S.stockRule.on) e.push('Sube +' + (S.stockRule.pct || 0) + '% si < ' + (S.stockRule.qty || 0) + ' u.');
    return e;
  }

  function renderSummary() {
    $('#sumSentence').innerHTML = buildSentence();
    const g = GOALS[S.goal] || {};
    const rows = [
      { k: 'Se aplica a', v: targetLabel(), ic: S.target.mode === 'group' ? 'layers' : 'producto' },
      { k: 'Objetivo', v: g.label || '—', ic: g.icon || 'target' },
      { k: 'Precio mínimo', v: money(S.minPrice), ic: 'lock' },
    ];
    const ex = extrasList();
    rows.push({ k: 'Extras', v: ex.length ? ex.join(' · ') : 'Ninguno', ic: 'sparkles' });
    $('#sumGrid').innerHTML = rows.map(r => `
      <div class="sitem">
        <div class="sitem__k">${r.k}</div>
        <div class="sitem__v">${icon(r.ic)}<span>${r.v}</span></div>
      </div>`).join('');
    $('#btnActivate').innerHTML = icon('play') + '<span>' + (S.editingId ? 'Guardar cambios' : 'Activar estrategia') + '</span>';
  }

  /* ============================================================
     APLICAR ESTADO → DOM (para editar/duplicar)
     ============================================================ */
  function applyStateToDOM() {
    // Paso 1
    if (S.target.mode) selectMode(S.target.mode); else {
      $$('#targetMode .opt').forEach(o => { o.classList.remove('is-sel'); o.setAttribute('aria-pressed', false); });
      $('#targetPicker').innerHTML = '';
    }
    // Paso 2 — objetivo
    if (S.goal) selectGoal(S.goal); else {
      $$('#goalList .opt').forEach(o => { o.classList.remove('is-sel'); o.setAttribute('aria-pressed', false); });
      ['revBuybox', 'revCompetidor', 'revRentabilidad', 'revLiquidar'].forEach(id => $('#' + id).classList.add('hidden'));
    }
    // comp
    $$('#compSource button').forEach(x => x.classList.toggle('is-on', x.dataset.src === S.comp.source));
    $('#compLinkField').classList.toggle('hidden', S.comp.source !== 'link');
    $('#compDumpField').classList.toggle('hidden', S.comp.source !== 'dump');
    $('#compLink').value = S.comp.link || '';
    $('#compDelta').value = S.comp.delta;
    $('#compPct').value = S.comp.pct;
    syncCompMode();
    renderDump('');
    $('#rentTarget').value = S.rentTarget;
    $('#liqMax').value = S.liqMax;
    // extras
    setSwitch('promos', S.promos);
    setSwitch('stock', S.stockRule.on);
    $('#stockQty').value = S.stockRule.qty;
    $('#stockPct').value = S.stockRule.pct;
    // Paso 3
    $('#minPrice').value = S.minPrice != null ? S.minPrice : '';
  }

  /* ============================================================
     GUARDAR / ACTIVAR / EDITAR
     ============================================================ */
  function plainSentence() {
    const tmp = document.createElement('div');
    tmp.innerHTML = buildSentence();
    return tmp.textContent;
  }

  function snapshot() {
    return JSON.parse(JSON.stringify({
      target: S.target, goal: S.goal, comp: S.comp, rentTarget: S.rentTarget,
      liqMax: S.liqMax, promos: S.promos, stockRule: S.stockRule, minPrice: S.minPrice,
    }));
  }

  function activate() {
    const err = validateStep();
    if (err) { showError(err); return; }
    const g = GOALS[S.goal] || {};
    const record = {
      id: S.editingId || ('v3_' + Date.now()),
      name: g.label + ' · ' + targetLabel(),
      goal: S.goal,
      icon: g.icon || 'target',
      desc: plainSentence(),
      state: snapshot(),
      active: true,
      createdAt: new Date().toISOString(),
    };
    let list = loadSaved();
    if (S.editingId) {
      const i = list.findIndex(x => x.id === S.editingId);
      if (i >= 0) { record.createdAt = list[i].createdAt; record.active = list[i].active; list[i] = record; }
      else list.unshift(record);
      toast('Cambios guardados', 'save');
    } else {
      list.unshift(record);
      toast('Estrategia activada', 'rocket');
    }
    saveSaved(list);
    showEmpty();
  }

  function editStrategy(id) {
    const rec = loadSaved().find(x => x.id === id);
    if (!rec || !rec.state) { toast('No se puede editar esta estrategia', 'alert'); return; }
    const st = Object.assign(blank(), rec.state, { step: 1, editingId: id });
    showWizard(st);
  }

  function duplicateStrategy(id) {
    const rec = loadSaved().find(x => x.id === id);
    if (!rec || !rec.state) return;
    const st = Object.assign(blank(), JSON.parse(JSON.stringify(rec.state)), { step: 4, editingId: null });
    showWizard(st);
    toast('Duplicá y ajustá lo que quieras', 'copy');
  }

  /* ============================================================
     "MIS ESTRATEGIAS" (empty state)
     ============================================================ */
  function renderSaved() {
    const list = loadSaved();
    $('#savedWrap').classList.toggle('hidden', list.length === 0);
    $('#savedCount').textContent = list.length;
    $('#btnStart').innerHTML = icon('rocket') + '<span>' + (list.length ? 'Crear otra estrategia' : 'Crear una estrategia') + '</span>';
    $('#savedList').innerHTML = list.map(s => `
      <div class="scard ${s.active ? 'scard--active' : ''}" data-id="${s.id}">
        <span class="scard__ic">${icon(s.icon || 'target')}</span>
        <div class="scard__main">
          <div class="scard__name">
            <span>${s.name}</span>
            ${s.active ? '<span class="run-badge"><i></i>Activa</span>' : '<span class="chip chip--gray">Pausada</span>'}
          </div>
          <div class="scard__desc">${s.desc}</div>
        </div>
        <div class="scard__acts">
          <button class="scard__act" data-toggle="${s.id}" title="${s.active ? 'Pausar' : 'Activar'}">${icon(s.active ? 'pause' : 'play')}</button>
          <button class="scard__act" data-edit="${s.id}" title="Editar" ${s.state ? '' : 'disabled'}>${icon('edit')}</button>
          <button class="scard__act" data-dup="${s.id}" title="Duplicar" ${s.state ? '' : 'disabled'}>${icon('copy')}</button>
          <button class="scard__act scard__act--del" data-del="${s.id}" title="Eliminar">${icon('trash')}</button>
        </div>
      </div>`).join('');

    $$('#savedList [data-toggle]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.toggle;
      const list2 = loadSaved().map(x => x.id === id ? { ...x, active: !x.active } : x);
      saveSaved(list2); renderSaved();
      const now = list2.find(x => x.id === id);
      toast(now && now.active ? 'Estrategia activada' : 'Estrategia pausada', now && now.active ? 'play' : 'pause');
    }));
    $$('#savedList [data-del]').forEach(b => b.addEventListener('click', async () => {
      const ok = await confirmDialog({ title: '¿Eliminar la estrategia?', msg: 'Esta acción no se puede deshacer.', yes: 'Sí, eliminar' });
      if (!ok) return;
      saveSaved(loadSaved().filter(x => x.id !== b.dataset.del));
      renderSaved(); toast('Estrategia eliminada', 'trash');
    }));
    $$('#savedList [data-edit]').forEach(b => b.addEventListener('click', () => editStrategy(b.dataset.edit)));
    $$('#savedList [data-dup]').forEach(b => b.addEventListener('click', () => duplicateStrategy(b.dataset.dup)));
  }

  /* ============================================================
     INIT
     ============================================================ */
  function init() {
    hydrateIcons(document);
    $('#btnStart').addEventListener('click', () => showWizard());
    $('#btnCancel').addEventListener('click', cancel);
    $('#btnNext').addEventListener('click', next);
    $('#btnBack').addEventListener('click', back);
    $('#btnActivate').addEventListener('click', activate);
    $$('#targetMode .opt').forEach(o => o.addEventListener('click', () => selectMode(o.dataset.mode)));
    initStep2();
    initStep3();
    renderSaved();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
