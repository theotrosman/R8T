/* ============================================================
   R8T · v5.js — Competencia: seguir publicaciones, armar grupos
   y comparar una "publicación de prueba" (no publicada) contra un grupo.

   Flujo (3 pasos):
     1. Seguir publicaciones del "dump" de MeLi (máx. 10) o por link.
     2. Armar grupos (drag & drop o "Armar grupos sugeridos").
     3. Publicación de prueba: idea nueva o copia de una propia → puntaje,
        tira de precios arrastrable, comparativa con "Probar", curva de ganancia.

   Autónomo: sólo depende de icons.js. Datos de ejemplo (MARKET / MINE).
   Estado en localStorage "r8t.v5". Cálculos = aproximaciones didácticas.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Constantes del modelo (didácticas) ---------- */
  const MAX_FOLLOW = 10;
  const COMMISSION = 0.14;   // comisión MeLi aprox.
  const IIBB = 0.035;        // ingresos brutos aprox.
  const SHIP = { in: 5900, over: 7400 }; // costo de envío gratis a cargo del vendedor
  const GROUP_COLORS = ['#0065F3', '#8b5cf6', '#06b6d4', '#ec4899'];
  const LS_KEY = 'r8t.v5';

  /* ---------- "Dump" de Mercado Libre (datos de ejemplo) ---------- */
  const MARKET = [
    // In-ear
    { id: 'MLA1402231187', type: 'in', brand: 'Kova', color: '#0f766e', title: 'Auriculares In-ear Bluetooth Kova Buds 2 Cancelación De Ruido', seller: 'AUDIOMAX_OK', rep: 'MercadoLíder Platinum', price: 38999, list: 45999, free: true, full: true, cuotas: 6, photos: 8, rating: 4.7, sold: '+5mil', sales30: 210 },
    { id: 'MLA1388712044', type: 'in', brand: 'Aurix', color: '#7c3aed', title: 'Auriculares Inalámbricos Aurix Air Bluetooth 5.3 Con Micrófono', seller: 'TECNOSUR', rep: 'MercadoLíder Gold', price: 24999, free: true, full: false, cuotas: 3, photos: 6, rating: 4.4, sold: '+1000', sales30: 140 },
    { id: 'MLA1371190322', type: 'in', brand: 'Pulse', color: '#dc2626', title: 'Auriculares Bluetooth Pulse Fit Deportivos In-ear Resistentes Al Agua', seller: 'MEGATECH-AR', rep: 'MercadoLíder', price: 21500, free: false, full: false, cuotas: 0, photos: 4, rating: 4.1, sold: '+500', sales30: 75 },
    { id: 'MLA1419934410', type: 'in', brand: 'Nimbus', color: '#2563eb', title: 'Auriculares In-ear Nimbus Pro Bluetooth Cancelación De Ruido Activa', seller: 'CASA HIFI', rep: 'MercadoLíder Platinum', price: 52999, list: 59999, free: true, full: true, cuotas: 12, photos: 10, rating: 4.8, sold: '+1000', sales30: 120 },
    { id: 'MLA1355620981', type: 'in', brand: 'Zentra', color: '#ea580c', title: 'Auriculares Inalámbricos Zentra Z1 Bluetooth Estuche De Carga', seller: 'ELSHOPDELSONIDO', rep: 'MercadoLíder Gold', price: 18999, free: true, full: false, cuotas: 3, photos: 5, rating: 4.2, sold: '+5mil', sales30: 260 },
    { id: 'MLA1398843127', type: 'in', brand: 'Kova', color: '#0f766e', title: 'Auriculares Bluetooth Kova Buds Lite In-ear Con Micrófono', seller: 'RUIDO CERO', rep: 'MercadoLíder', price: 27999, free: true, full: true, cuotas: 6, photos: 7, rating: 4.5, sold: '+1000', sales30: 165 },
    { id: 'MLA1427701650', type: 'in', brand: 'Bassline', color: '#111827', title: 'Auriculares In-ear Bassline Bluetooth 5.3 Graves Potentes 30hs', seller: 'DIGITAL POINT', rep: 'Reputación verde', price: 31999, free: false, full: false, cuotas: 3, photos: 3, rating: 4.0, sold: '+100', sales30: 32 },
    { id: 'MLA1366012375', type: 'in', brand: 'Aurix', color: '#7c3aed', title: 'Auriculares Bluetooth Aurix Air Pro Cancelación De Ruido In-ear', seller: 'AUDIOMAX_OK', rep: 'MercadoLíder Platinum', price: 44999, free: true, full: true, cuotas: 6, photos: 9, rating: 4.6, sold: '+500', sales30: 88 },
    { id: 'MLA1401188899', type: 'in', brand: 'Sonora', color: '#0891b2', title: 'Auriculares Inalámbricos Sonora Mini In-ear Bluetooth Táctiles', seller: 'TECNOSUR', rep: 'MercadoLíder Gold', price: 22999, free: true, full: false, cuotas: 0, photos: 5, rating: 4.3, sold: '+1000', sales30: 118 },
    // Vincha (over-ear)
    { id: 'MLA1412290034', type: 'over', brand: 'Sonora', color: '#0891b2', title: 'Auriculares Vincha Sonora Studio Bluetooth Cancelación De Ruido', seller: 'CASA HIFI', rep: 'MercadoLíder Platinum', price: 129999, list: 149999, free: true, full: true, cuotas: 12, photos: 10, rating: 4.8, sold: '+500', sales30: 64 },
    { id: 'MLA1384456120', type: 'over', brand: 'Bassline', color: '#111827', title: 'Auriculares Vincha Bassline Over-ear Bluetooth Graves Plegables', seller: 'MEGATECH-AR', rep: 'MercadoLíder', price: 64999, free: true, full: false, cuotas: 6, photos: 7, rating: 4.4, sold: '+1000', sales30: 110 },
    { id: 'MLA1376690212', type: 'over', brand: 'Nimbus', color: '#2563eb', title: 'Auriculares Over-ear Nimbus Max Bluetooth Cancelación De Ruido 40hs', seller: 'AUDIOMAX_OK', rep: 'MercadoLíder Platinum', price: 159999, free: true, full: true, cuotas: 12, photos: 9, rating: 4.9, sold: '+100', sales30: 41 },
    { id: 'MLA1409912256', type: 'over', brand: 'Pulse', color: '#dc2626', title: 'Auriculares Vincha Pulse Gamer Bluetooth Con Micrófono Plegables', seller: 'DIGITAL POINT', rep: 'Reputación verde', price: 54999, free: false, full: false, cuotas: 3, photos: 4, rating: 4.1, sold: '+500', sales30: 58 },
    { id: 'MLA1395578843', type: 'over', brand: 'Kova', color: '#0f766e', title: 'Auriculares Vincha Kova Wave Bluetooth Over-ear Cancelación De Ruido', seller: 'RUIDO CERO', rep: 'MercadoLíder Gold', price: 99999, free: true, full: true, cuotas: 6, photos: 8, rating: 4.6, sold: '+500', sales30: 72 },
    { id: 'MLA1361123409', type: 'over', brand: 'Zentra', color: '#ea580c', title: 'Auriculares Vincha Zentra Z5 Bluetooth Plegables 50hs Batería', seller: 'ELSHOPDELSONIDO', rep: 'MercadoLíder Gold', price: 47999, free: true, full: false, cuotas: 3, photos: 6, rating: 4.3, sold: '+1000', sales30: 125 },
    { id: 'MLA1418870561', type: 'over', brand: 'Aurix', color: '#7c3aed', title: 'Auriculares Over-ear Aurix Hush Bluetooth Cancelación De Ruido', seller: 'TECNOSUR', rep: 'MercadoLíder Gold', price: 89999, free: true, full: false, cuotas: 6, photos: 7, rating: 4.5, sold: '+100', sales30: 47 },
  ];

  /* Publicaciones propias del vendedor (cuenta "TR") */
  const MINE = [
    { id: 'MLA1433310021', type: 'in', brand: 'Vox', color: '#16a34a', title: 'Auriculares Bluetooth Vox Go In-ear Inalámbricos', price: 34999, cost: 17500, free: false, full: false, cuotas: 3, photos: 4 },
    { id: 'MLA1433310877', type: 'over', brand: 'Vox', color: '#16a34a', title: 'Auriculares Vincha Vox Studio Bluetooth', price: 104999, cost: 56000, free: true, full: false, cuotas: 3, photos: 5 },
    { id: 'MLA1433311540', type: 'in', brand: 'Vox', color: '#16a34a', title: 'Auriculares In-ear Vox Sport Con Micrófono', price: 19999, cost: 9800, free: true, full: true, cuotas: 0, photos: 6 },
  ];

  const STOP = new Set(['de', 'con', 'y', 'para', 'el', 'la', 'en', 'al', 'los', 'las', 'a', 'x', 'hs', '5.3', '30hs', '40hs', '50hs']);

  /* ---------- Estado ---------- */
  function blank() {
    return {
      step: 1,
      followed: [],          // ids
      extra: [],             // publicaciones agregadas por link (simuladas)
      groups: [],            // {id, name, color, items:[ids]}
      gid: null,             // grupo elegido en el paso 3
      src: 'new',            // 'new' | 'own'
      ownId: null,
      dirty: false,          // el usuario tocó el borrador
      draft: null,
      q: '', type: 'all',
    };
  }
  let S = load();
  function load() {
    try { const s = JSON.parse(localStorage.getItem(LS_KEY)); if (s && Array.isArray(s.followed)) {
      if (s.draft && !(isFinite(s.draft.price) && s.draft.price > 0)) s.draft = null; // borrador corrupto → se regenera
      return Object.assign(blank(), s);
    } } catch (e) {}
    return blank();
  }
  function save() { try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) {} }

  /* ---------- Helpers ---------- */
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const money = n => '$ ' + Math.round(n).toLocaleString('es-AR');
  const moneyShort = n => {
    const a = Math.abs(n), s = n < 0 ? '−' : '';
    if (a >= 1e6) return s + '$ ' + (a / 1e6).toFixed(1).replace('.', ',') + ' M';
    if (a >= 1e3) return s + '$ ' + Math.round(a / 1e3) + ' mil';
    return s + '$ ' + Math.round(a);
  };
  const pct = n => (n > 0 ? '+' : '') + Math.round(n * 100) + ' %';
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const median = arr => { const a = arr.slice().sort((x, y) => x - y); const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
  const mean = arr => arr.reduce((s, v) => s + v, 0) / (arr.length || 1);
  const roundTo = (n, step) => Math.round(n / step) * step;

  function hydrateIcons(root) {
    (root || document).querySelectorAll('[data-ic]').forEach(el => {
      if (el.dataset.icDone) return;
      el.insertAdjacentHTML('afterbegin', icon(el.dataset.ic));
      el.dataset.icDone = '1';
    });
  }
  function toast(msg, ic) {
    const t = document.createElement('div');
    t.className = 'toast toast--ok';
    t.innerHTML = icon(ic || 'check') + '<span>' + msg + '</span>';
    $('#toasts').appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(8px)'; t.style.transition = 'all .25s'; setTimeout(() => t.remove(), 260); }, 2600);
  }

  const all = () => MARKET.concat(S.extra);
  const byId = id => all().find(x => x.id === id) || MINE.find(x => x.id === id);
  const typeLbl = t => t === 'in' ? 'in-ear' : 'vincha';
  const thumb = (l, sm) => `<span class="v5-thumb${sm ? ' v5-thumb--sm' : ''}" style="background:${l.color}" data-type="${typeLbl(l.type)}">${esc(l.brand.slice(0, 2).toUpperCase())}</span>`;
  const groupOf = id => S.groups.find(g => g.items.includes(id));

  /* ============================================================
     PASO 1 · Seguir publicaciones
     ============================================================ */
  function renderResults() {
    const q = norm(S.q.trim());
    const list = all().filter(l => (!q || norm(l.title + ' ' + l.seller + ' ' + l.brand).includes(q)));
    const full = S.followed.length >= MAX_FOLLOW;
    $('#results').innerHTML = list.length ? list.map(l => {
      const on = S.followed.includes(l.id);
      return `<article class="v5-item${on ? ' is-following' : ''}">
        <div class="v5-item__top">${thumb(l)}
          <div><div class="v5-item__title">${esc(l.title)}</div><div class="v5-item__seller">${esc(l.seller)}</div></div>
        </div>
        <div class="v5-price">${money(l.price)}${l.list ? `<s>${money(l.list)}</s>` : ''}</div>
        <div class="v5-tags">
          ${l.free ? '<span class="v5-tag v5-tag--free">Envío gratis</span>' : ''}
          ${l.full ? '<span class="v5-tag v5-tag--full">FULL</span>' : ''}
        </div>
        <div class="v5-item__bottom">
          <span class="v5-item__sold">≈${l.sales30} ventas/mes</span>
          <button class="v5-follow${on ? ' is-on' : ''}" data-follow="${l.id}" ${!on && full ? 'disabled title="Llegaste al máximo de 10"' : ''}>
            ${on ? icon('check') + 'Siguiendo' : icon('plus') + 'Seguir'}
          </button>
        </div>
      </article>`;
    }).join('') : `<div class="v5-empty">No encontramos publicaciones con «${esc(S.q)}». Probá con otra palabra.</div>`;
  }

  function renderSide() {
    const n = S.followed.length;
    $('#quotaTxt').textContent = n + ' / ' + MAX_FOLLOW;
    $('#quotaBar').style.width = (n / MAX_FOLLOW * 100) + '%';
    $('.v5-quota__bar').classList.toggle('is-full', n >= MAX_FOLLOW);
    $('#quotaHint').textContent = n === 0 ? 'Todavía no seguís ninguna.'
      : n < 2 ? 'Seguí al menos 2 para poder armar un grupo.'
      : n >= MAX_FOLLOW ? 'Llegaste al máximo. Dejá de seguir alguna para sumar otra.'
      : `Te quedan ${MAX_FOLLOW - n} lugares.`;
    $('#followedList').innerHTML = S.followed.map(id => {
      const l = byId(id); if (!l) return '';
      return `<li>${thumb(l, true)}<span title="${esc(l.title)}">${esc(l.brand)} · ${typeLbl(l.type)}</span><b>${moneyShort(l.price)}</b><button data-unfollow="${id}" title="Dejar de seguir">${icon('x')}</button></li>`;
    }).join('');
    $('#next1').disabled = n < 2;
  }

  function toggleFollow(id) {
    const i = S.followed.indexOf(id);
    if (i >= 0) {
      S.followed.splice(i, 1);
      S.groups.forEach(g => g.items = g.items.filter(x => x !== id));
    } else {
      if (S.followed.length >= MAX_FOLLOW) { toast('Máximo 10 publicaciones seguidas', 'alert'); return; }
      S.followed.push(id);
      const l = byId(id);
      toast('Siguiendo: ' + esc(l.brand) + ' · ' + money(l.price), 'check');
    }
    save(); renderAll();
  }

  /* ============================================================
     PASO 2 · Grupos
     ============================================================ */
  function groupStats(items) {
    const ls = items.map(byId).filter(Boolean);
    if (!ls.length) return null;
    const prices = ls.map(l => l.price);
    return {
      ls, n: ls.length,
      min: Math.min(...prices), max: Math.max(...prices), med: median(prices),
      free: ls.filter(l => l.free).length / ls.length,
      full: ls.filter(l => l.full).length / ls.length,
      cuotas: mean(ls.map(l => l.cuotas)),
      photos: mean(ls.map(l => l.photos)),
      salesMed: median(ls.map(l => l.sales30)),
      salesMax: Math.max(...ls.map(l => l.sales30)),
      salesTot: ls.reduce((s, l) => s + l.sales30, 0),
      leader: ls.slice().sort((a, b) => b.sales30 - a.sales30)[0],
      type: ls.filter(l => l.type === 'over').length > ls.length / 2 ? 'over' : 'in',
    };
  }

  function chipCard(id, inGroup) {
    const l = byId(id); if (!l) return '';
    const moves = S.groups.filter(g => !g.items.includes(id))
      .map(g => `<button class="v5-mv" data-move="${id}" data-to="${g.id}" title="Mover a ${esc(g.name)}"><i class="v5-dot" style="background:${g.color}"></i>${esc(g.name.length > 10 ? g.name.slice(0, 9) + '…' : g.name)}</button>`).join('');
    return `<div class="v5-chipcard" draggable="true" data-drag="${id}">
      ${thumb(l, true)}
      <div class="v5-chipcard__t"><b title="${esc(l.title)}">${esc(l.title)}</b><small>${money(l.price)} · ≈${l.sales30}/mes</small></div>
      <div class="v5-chipcard__acts">${inGroup ? `<button class="v5-mv" data-move="${id}" data-to="" title="Sacar del grupo">${icon('x')}</button>` : moves}</div>
    </div>`;
  }

  function renderBoard() {
    const pool = S.followed.filter(id => !groupOf(id));
    let html = `<div class="v5-col v5-col--pool" data-drop="">
      <div class="v5-col__h"><span class="v5-col__name" style="cursor:default">Sin grupo</span><span class="v5-col__count">${pool.length}</span></div>
      <div class="v5-col__drop">${pool.map(id => chipCard(id, false)).join('') || '<div class="v5-col__hint">Todas tus publicaciones seguidas ya están en un grupo.</div>'}</div>
    </div>`;
    if (!S.groups.length) {
      html += `<div class="v5-col"><div class="v5-col__hint" style="margin-top:40px">Todavía no hay grupos.<br>Tocá <b>Armar grupos por mí</b>.</div></div>`;
    }
    S.groups.forEach(g => {
      const st = groupStats(g.items);
      html += `<div class="v5-col" data-drop="${g.id}">
        <div class="v5-col__h">
          <i class="v5-dot" style="background:${g.color}"></i>
          <input class="v5-col__name" value="${esc(g.name)}" data-rename="${g.id}" maxlength="28">
          <span class="v5-col__count">${g.items.length}</span>
          <button class="v5-col__del" data-delgroup="${g.id}" title="Borrar grupo">${icon('trash')}</button>
        </div>
        <div class="v5-col__drop">${g.items.map(id => chipCard(id, true)).join('') || '<div class="v5-col__hint">Arrastrá publicaciones acá</div>'}</div>
        ${st ? `
        <div class="v5-range">
          <div class="v5-range__bar">${st.ls.map(l => `<i style="left:${st.max > st.min ? (l.price - st.min) / (st.max - st.min) * 100 : 50}%;background:${g.color}" title="${esc(l.brand)} ${money(l.price)}"></i>`).join('')}</div>
          <div class="v5-range__lbl"><span>${moneyShort(st.min)}</span><span>mediana ${moneyShort(st.med)}</span><span>${moneyShort(st.max)}</span></div>
        </div>
` : ''}
      </div>`;
    });
    $('#board').innerHTML = html;
    $('#next2').disabled = !S.groups.some(g => g.items.length >= 2);
  }

  function addGroup(name, items) {
    const used = S.groups.map(g => g.color);
    const color = GROUP_COLORS.find(c => !used.includes(c)) || GROUP_COLORS[S.groups.length % GROUP_COLORS.length];
    const g = { id: 'g' + Date.now().toString(36) + Math.floor(Math.random() * 1e4), name, color, items: items || [] };
    S.groups.push(g);
    return g;
  }

  /* Sugerencia: si hay de los dos tipos, agrupa por tipo; si no, por rango de precio. */
  function suggestGroups() {
    const ls = S.followed.map(byId).filter(Boolean);
    if (ls.length < 2) { toast('Seguí al menos 2 publicaciones primero', 'alert'); return; }
    S.groups = [];
    const ins = ls.filter(l => l.type === 'in'), overs = ls.filter(l => l.type === 'over');
    if (ins.length && overs.length) {
      addGroup('In-ear', ins.map(l => l.id));
      addGroup('Vincha', overs.map(l => l.id));
      toast('Armamos 2 grupos por tipo de producto', 'sparkles');
    } else {
      const med = median(ls.map(l => l.price));
      const cheap = ls.filter(l => l.price <= med), prem = ls.filter(l => l.price > med);
      if (prem.length && cheap.length) {
        addGroup('Económicos', cheap.map(l => l.id));
        addGroup('Premium', prem.map(l => l.id));
        toast('Armamos 2 grupos por rango de precio', 'sparkles');
      } else {
        addGroup('Mi competencia', ls.map(l => l.id));
        toast('Armamos 1 grupo con todas', 'sparkles');
      }
    }
    save(); renderAll();
  }

  function moveTo(id, gid) {
    S.groups.forEach(g => g.items = g.items.filter(x => x !== id));
    const g = S.groups.find(x => x.id === gid);
    if (g) g.items.push(id);
    save(); renderAll();
  }

  /* ============================================================
     PASO 3 · Publicación de prueba vs grupo
     ============================================================ */
  const curGroup = () => S.groups.find(g => g.id === S.gid && g.items.length >= 2) || S.groups.find(g => g.items.length >= 2);

  /* Palabras que usa la mayoría del grupo en el título */
  function keywords(st) {
    const cnt = {};
    st.ls.forEach(l => {
      const seen = new Set();
      l.title.split(/\s+/).forEach(w => {
        const k = norm(w).replace(/[^a-z0-9.-]/g, '');
        if (k.length < 3 || STOP.has(k) || seen.has(k)) return;
        if (st.ls.some(x => norm(x.brand) === k)) return; // marcas no
        seen.add(k);
        cnt[k] = cnt[k] || { w, n: 0 };
        cnt[k].n++;
      });
    });
    return Object.entries(cnt).filter(([, v]) => v.n / st.n >= 0.45)
      .sort((a, b) => b[1].n - a[1].n).slice(0, 7).map(([k, v]) => ({ k, w: v.w, share: v.n / st.n }));
  }

  function templateDraft(st) {
    const type = st ? st.type : 'in';
    const med = st ? st.med : 30000;
    return {
      title: type === 'in' ? 'Auriculares Vox Inalámbricos In-ear' : 'Auriculares Vox Vincha Plegables',
      price: roundTo(med * 1.1, 500) - 1,
      cost: roundTo(med * 0.5, 100),
      free: false, full: false, cuotas: 3, photos: 3, type,
    };
  }

  /* Modelo de puntaje: 0..100. Cada parte va de 0 a 1. */
  function evaluate(d, st, kws, priceOverride) {
    const price = priceOverride != null ? priceOverride : d.price;
    const r = price / st.med;
    const parts = {
      price: clamp((1.25 - r) / 0.40, 0, 1),
      free: d.free ? 1 : 1 - st.free,
      full: d.full ? 1 : 1 - st.full,
      cuotas: st.cuotas <= 0 || d.cuotas >= st.cuotas ? 1 : d.cuotas / st.cuotas,
      photos: Math.min(1, d.photos / st.photos),
    };
    const W = { price: .40, free: .25, full: .10, cuotas: .15, photos: .10 };
    let score = 0, np = 0;
    for (const k in W) { score += W[k] * parts[k]; if (k !== 'price') np += W[k] * parts[k]; }
    np /= (1 - W.price);
    // Ventas estimadas: la mediana del grupo, ajustada por atributos y por precio (elasticidad ~3)
    const sales = Math.round(clamp(st.salesMed * (0.45 + np * 0.85) * Math.pow(r, -3), 0, st.salesMax * 2.2));
    const ship = d.free ? SHIP[st.type] : 0;
    const unit = price * (1 - COMMISSION - IIBB) - ship - d.cost;
    return { score: Math.round(score * 100), parts, r, sales, unit, month: sales * unit, price, ship };
  }

  let lastScore = null;
  let stripDomain = null; // se congela mientras se arrastra el punto "Vos"

  function ensureDraft() {
    const g = curGroup(); if (!g) return;
    S.gid = g.id;
    if (!S.draft) S.draft = templateDraft(groupStats(g.items));
  }

  function syncForm() {
    const d = S.draft;
    const set = (sel, v) => { const el = $(sel); if (document.activeElement !== el) el.value = v; };
    set('#fPrice', Math.round(d.price).toLocaleString('es-AR'));
    $('#fPrice').addEventListener('blur', () => syncForm());
    $('#fFree').checked = d.free;
    $('#fFull').checked = d.full;
    $('#fCuotas').value = String(d.cuotas);
    $('#fPhotos').textContent = d.photos;
    $$('#srcSeg button').forEach(b => b.classList.toggle('is-on', b.dataset.src === S.src));
    $('#ownPicker').classList.toggle('hidden', S.src !== 'own');
    $('#ownPicker').innerHTML = '<div class="v5-own__note">Copiamos sus datos. La original no se toca.</div>' +
      MINE.map(m => `<button data-own="${m.id}" class="${S.ownId === m.id ? 'is-on' : ''}">${thumb(m, true)}<span><b>${esc(m.title)}</b><small>${money(m.price)} · ${typeLbl(m.type)}</small></span></button>`).join('');
    $('#groupSel').innerHTML = S.groups.filter(g => g.items.length >= 2)
      .map(g => `<option value="${g.id}" ${g.id === S.gid ? 'selected' : ''}>${esc(g.name)} (${g.items.length} publicaciones)</option>`).join('');
  }

  function renderStep3() {
    const g = curGroup();
    if (!g) return;
    ensureDraft();
    syncForm();
    const st = groupStats(g.items);
    const d = S.draft;
    const kws = keywords(st);
    const e = evaluate(d, st, kws);

    // --- Puntaje
    const sc = e.score;
    const label = sc >= 80 ? 'Muy competitiva' : sc >= 60 ? 'Competitiva' : sc >= 40 ? 'Le faltan cosas' : 'Difícil de vender';
    const col = sc >= 80 ? 'var(--ok)' : sc >= 60 ? 'var(--rt-blue)' : sc >= 40 ? 'var(--warn)' : 'var(--danger)';
    const ARC = 157.08;
    const fg = $('#gaugeFg');
    fg.style.strokeDasharray = ARC; fg.style.strokeDashoffset = ARC * (1 - sc / 100); fg.style.stroke = col;
    tweenNumber($('#scoreN'), lastScore == null ? 0 : lastScore, sc);
    $('#scoreLabel').innerHTML = esc(label) + (lastScore != null && lastScore !== sc
      ? ` <span class="v5-delta v5-delta--${sc > lastScore ? 'up' : 'down'}">${sc > lastScore ? '+' : ''}${sc - lastScore}</span>` : '');
    $('#scoreLabel').style.color = col;
    lastScore = sc;

    // --- Ranking por precio
    const cheaper = st.ls.filter(l => l.price < d.price).length;
    const pos = cheaper + 1, tot = st.n + 1;
    const diff = e.r - 1;

    // --- Gaps ordenados por puntos que suman
    const gaps = [];
    if (!d.free && st.free > 0.3) gaps.push({ k: 'free', txt: `no tener <b>envío gratis</b> (lo tienen ${Math.round(st.free * st.n)} de ${st.n})` });
    if (e.r > 1.05) gaps.push({ k: 'price', txt: `el <b>precio</b>, ${Math.round(diff * 100)} % arriba de la mediana` });
    if (st.cuotas > 0 && d.cuotas < st.cuotas) gaps.push({ k: 'cuotas', txt: `ofrecer <b>menos cuotas</b> que el promedio (${st.cuotas.toFixed(1).replace('.', ',')})` });
    if (!d.full && st.full > 0.5) gaps.push({ k: 'full', txt: `no estar en <b>Full</b>` });
    if (d.photos < st.photos) gaps.push({ k: 'photos', txt: `tener <b>pocas fotos</b> (${d.photos} vs ${st.photos.toFixed(0)} promedio)` });

    $('#summary').innerHTML =
      `Con <b>${money(d.price)}</b> estarías <b>${Math.abs(Math.round(diff * 100))} % ${diff >= 0 ? 'arriba' : 'abajo'}</b> de la mediana de «${esc(g.name)}» ` +
      `y serías la <b>${pos}ª más barata de ${tot}</b>. ` +
      (gaps.length ? `Lo que más te frena: ${gaps[0].txt}. ` : 'No te falta nada clave: ya es cuestión de precio. ') +
      `Estimamos <b>≈ ${e.sales} ventas/mes</b>.`;

    $('#rank').innerHTML = pos === 1 ? `Serías <b>la más barata del grupo</b>. Ojo: bajar más sólo te come margen.`
      : `Hay <b>${cheaper}</b> publicaci${cheaper === 1 ? 'ón más barata' : 'ones más baratas'} que vos. ` +
        (pos > 3 ? `Para entrar al <b>top 3 por precio</b> necesitás bajar a <b>${money(top3Price(st))}</b>.` : `Ya estás en el <b>top 3 por precio</b>.`);

    renderStrip(st, g, e);
    renderCmp(st, d, e, kws);

    $('#stepMeta3').textContent = 'puntaje ' + sc + '/100';
  }

  function top3Price(st) {
    const sorted = st.ls.map(l => l.price).sort((a, b) => a - b);
    return Math.max(1, sorted[Math.min(2, sorted.length - 1)] - 1000);
  }

  function tweenNumber(el, from, to) {
    const t0 = performance.now(), dur = 550;
    cancelAnimationFrame(el._raf);
    const step = t => {
      const k = Math.min(1, (t - t0) / dur), ease = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(from + (to - from) * ease);
      if (k < 1) el._raf = requestAnimationFrame(step);
    };
    el._raf = requestAnimationFrame(step);
  }

  /* --- Tira de precios con punto "Vos" arrastrable --- */
  function domainFor(st, price) {
    const lo = Math.min(st.min, price), hi = Math.max(st.max, price);
    const pad = (hi - lo) * 0.08 || hi * 0.1;
    return { lo: Math.max(0, lo - pad), hi: hi + pad };
  }
  function renderStrip(st, g, e) {
    const dom = stripDomain || domainFor(st, S.draft.price);
    const x = p => clamp((p - dom.lo) / (dom.hi - dom.lo), 0, 1) * 100;
    $('#dots').innerHTML = st.ls.map(l => {
      const size = 12 + 20 * Math.sqrt(l.sales30 / st.salesMax);
      return `<i class="v5-cdot" data-dot="${l.id}" style="left:${x(l.price)}%;width:${size}px;height:${size}px;background:${g.color}"></i>`;
    }).join('');
    $('#median').style.left = x(st.med) + '%';
    $('#median span').textContent = 'mediana ' + moneyShort(st.med);
    $('#you').style.left = x(S.draft.price) + '%';
    $('#you span').textContent = 'Vos · ' + money(S.draft.price);
    $('#axMin').textContent = moneyShort(dom.lo);
    $('#axMax').textContent = moneyShort(dom.hi);
  }

  function bindStrip() {
    const strip = $('#strip'), you = $('#you'), tip = $('#tip');
    you.addEventListener('pointerdown', ev => {
      const g = curGroup(); if (!g) return;
      const st = groupStats(g.items);
      stripDomain = domainFor(st, S.draft.price);
      you.classList.add('is-drag');
      try { you.setPointerCapture(ev.pointerId); } catch (e) {}
      const move = e2 => {
        if (!stripDomain) return;
        const r = strip.getBoundingClientRect();
        const k = clamp((e2.clientX - r.left) / r.width, 0, 1);
        const p = Math.max(1000, roundTo(stripDomain.lo + k * (stripDomain.hi - stripDomain.lo), 500) - 1);
        if (!isFinite(p)) return;
        S.draft.price = p;
        S.dirty = true;
        renderStep3();
      };
      const up = () => {
        you.classList.remove('is-drag');
        you.removeEventListener('pointermove', move);
        you.removeEventListener('pointerup', up);
        you.removeEventListener('pointercancel', up);
        you.removeEventListener('lostpointercapture', up);
        if (!stripDomain) return;
        stripDomain = null; save(); renderStep3();
      };
      you.addEventListener('pointermove', move);
      you.addEventListener('pointerup', up);
      you.addEventListener('pointercancel', up);
      you.addEventListener('lostpointercapture', up);
    });
    strip.addEventListener('pointerover', ev => {
      const d = ev.target.closest('[data-dot]'); if (!d) return;
      const l = byId(d.dataset.dot);
      tip.innerHTML = `<b>${esc(l.brand)}</b> · ${money(l.price)}<br>≈${l.sales30} ventas/mes${l.free ? ' · envío gratis' : ''}${l.full ? ' · Full' : ''}`;
      tip.style.left = d.style.left; tip.style.top = '34px';
      tip.classList.remove('hidden');
    });
    strip.addEventListener('pointerout', ev => { if (ev.target.closest('[data-dot]')) tip.classList.add('hidden'); });
  }

  /* --- Comparativa con botones "Probar" --- */
  function renderCmp(st, d, e, kws) {
    const okIc = icon('check'), warnIc = icon('alert'), badIc = icon('x');
    const st3 = (s) => `<span class="v5-st v5-st--${s}">${s === 'ok' ? okIc : s === 'warn' ? warnIc : badIc}</span>`;
    const bar = v => `<div class="v5-minibar"><i style="width:${Math.round(clamp(v, 0, 1) * 100)}%"></i></div>`;
    const modeCuotas = Math.max(...[0, 3, 6, 12].filter(c => st.ls.filter(l => l.cuotas >= c).length / st.n >= 0.5));
    const rows = [
      { k: 'Precio', you: money(d.price) + ` <small class="muted">${pct(e.r - 1)}</small>`, grp: 'mediana ' + money(st.med),
        s: e.r <= 1.02 ? 'ok' : e.r <= 1.12 ? 'warn' : 'bad', fix: e.r > 1.02 ? 'price' : null },
      { k: 'Envío gratis', you: d.free ? 'Sí' : 'No', grp: `${Math.round(st.free * st.n)} de ${st.n}` + bar(st.free),
        s: d.free || st.free < 0.3 ? 'ok' : st.free > 0.6 ? 'bad' : 'warn', fix: !d.free && st.free >= 0.3 ? 'free' : null },
      { k: 'Full', you: d.full ? 'Sí' : 'No', grp: `${Math.round(st.full * st.n)} de ${st.n}` + bar(st.full),
        s: d.full || st.full < 0.4 ? 'ok' : 'warn', fix: !d.full && st.full >= 0.4 ? 'full' : null },
      { k: 'Cuotas s/int.', you: d.cuotas ? d.cuotas + ' cuotas' : 'Sin cuotas', grp: 'la mayoría: ' + (modeCuotas ? modeCuotas + ' cuotas' : 'sin cuotas'),
        s: d.cuotas >= modeCuotas ? 'ok' : 'warn', fix: d.cuotas < modeCuotas ? 'cuotas' : null, arg: modeCuotas },
      { k: 'Fotos', you: d.photos, grp: 'promedio ' + st.photos.toFixed(1).replace('.', ','),
        s: d.photos >= st.photos ? 'ok' : d.photos >= st.photos - 2 ? 'warn' : 'bad', fix: d.photos < st.photos ? 'photos' : null },
    ];
    $('#cmp').innerHTML = `<div class="v5-cmp__row v5-cmp__row--head"><span></span><span>Qué</span><span>Vos</span><span>El grupo</span><span></span></div>` +
      rows.map(r => `<div class="v5-cmp__row">${st3(r.s)}<span class="v5-cmp__k">${r.k}</span><span class="v5-cmp__you">${r.you}</span><span class="v5-cmp__grp">${r.grp}</span>
        ${r.fix ? `<button class="v5-try" data-fix="${r.fix}" data-arg="${r.arg != null ? r.arg : ''}">Probar</button>` : '<span></span>'}</div>`).join('');
  }

  function applyFix(kind, arg) {
    const g = curGroup(), st = groupStats(g.items), d = S.draft, kws = keywords(st);
    const before = evaluate(d, st, kws).score;
    let what = '';
    if (kind === 'price') { d.price = roundTo(st.med * 0.98, 500) - 1; what = 'Precio en ' + money(d.price); }
    if (kind === 'free') { d.free = true; what = 'Envío gratis activado'; }
    if (kind === 'full') { d.full = true; what = 'Publicación en Full'; }
    if (kind === 'cuotas') { d.cuotas = Number(arg) || 6; what = d.cuotas + ' cuotas sin interés'; }
    if (kind === 'photos') { d.photos = Math.min(12, Math.ceil(st.photos) + 1); what = d.photos + ' fotos'; }
    S.dirty = true;
    const after = evaluate(d, st, kws).score;
    save(); renderStep3();
    toast(`${what} · ${after >= before ? '+' : ''}${after - before} puntos`, 'sparkles');
  }

  /* ============================================================
     Navegación entre pasos
     ============================================================ */
  function canGo(n) {
    if (n === 1) return true;
    if (n === 2) return S.followed.length >= 2;
    if (n === 3) return S.groups.some(g => g.items.length >= 2);
    return false;
  }
  function go(n) {
    if (!canGo(n)) {
      toast(n === 2 ? 'Primero seguí al menos 2 publicaciones' : 'Primero armá un grupo con 2 o más publicaciones', 'alert');
      return;
    }
    S.step = n; save(); renderAll();
    $('#scroller').scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderSteps() {
    $$('#steps li').forEach(li => {
      const n = +li.dataset.step;
      li.classList.toggle('is-on', n === S.step);
      li.classList.toggle('is-done', n < S.step);
      li.classList.toggle('is-locked', !canGo(n));
    });
    $('#stepMeta1').textContent = S.followed.length + ' de ' + MAX_FOLLOW + ' seguidas';
    $('#stepMeta2').textContent = S.groups.length ? S.groups.length + (S.groups.length === 1 ? ' grupo' : ' grupos') : 'sin grupos';
    if (S.step !== 3) $('#stepMeta3').textContent = 'modo prueba';
    [1, 2, 3].forEach(n => $('#step' + n).classList.toggle('hidden', n !== S.step));
  }

  function renderAll() {
    if (S.step === 3 && !canGo(3)) S.step = canGo(2) ? 2 : 1;
    if (S.step === 2 && !canGo(2)) S.step = 1;
    renderSteps();
    if (S.step === 1) { renderResults(); renderSide(); }
    if (S.step === 2) renderBoard();
    if (S.step === 3) renderStep3();
  }

  /* ============================================================
     Eventos
     ============================================================ */
  function bind() {
    $('#steps').addEventListener('click', e => { const li = e.target.closest('li'); if (li) go(+li.dataset.step); });
    document.addEventListener('click', e => {
      const t = e.target.closest('[data-follow],[data-unfollow],[data-move],[data-delgroup],[data-go],[data-fix],[data-own],[data-src],[data-ph]');
      if (!t) return;
      const ds = t.dataset;
      if (ds.follow) toggleFollow(ds.follow);
      else if (ds.unfollow) toggleFollow(ds.unfollow);
      else if (ds.move !== undefined) moveTo(ds.move, ds.to);
      else if (ds.delgroup) { S.groups = S.groups.filter(g => g.id !== ds.delgroup); save(); renderAll(); }
      else if (ds.go) go(+ds.go);
      else if (ds.fix) applyFix(ds.fix, ds.arg);
      else if (ds.own) {
        const m = MINE.find(x => x.id === ds.own);
        S.ownId = m.id; S.dirty = true;
        S.draft = { title: m.title, price: m.price, cost: m.cost, free: m.free, full: m.full, cuotas: m.cuotas, photos: m.photos, type: m.type };
        const match = S.groups.find(g => g.items.length >= 2 && groupStats(g.items).type === m.type);
        if (match) S.gid = match.id;
        save(); renderStep3(); toast('Copiamos «' + esc(m.title) + '» al borrador', 'copy');
      }
      else if (ds.src) {
        S.src = ds.src;
        if (ds.src === 'new') { S.ownId = null; S.dirty = false; S.draft = templateDraft(groupStats(curGroup().items)); }
        save(); renderStep3();
      }
      else if (ds.ph) { S.draft.photos = clamp(S.draft.photos + Number(ds.ph), 1, 12); S.dirty = true; save(); renderStep3(); }
    });

    $('#q').addEventListener('input', e => { S.q = e.target.value; renderResults(); });
    $('#next1').addEventListener('click', () => go(2));
    $('#next2').addEventListener('click', () => go(3));
    $('#btnSuggest').addEventListener('click', suggestGroups);
    $('#btnNewGroup').addEventListener('click', () => {
      if (S.groups.length >= 4) { toast('Para la demo, hasta 4 grupos', 'alert'); return; }
      addGroup('Grupo ' + (S.groups.length + 1)); save(); renderAll();
    });
    $('#btnReset').addEventListener('click', () => { S = blank(); lastScore = null; save(); $('#q').value = ''; renderAll(); toast('Demo reiniciada', 'refresh'); });

    // Renombrar grupos
    $('#board').addEventListener('change', e => {
      const id = e.target.dataset.rename; if (!id) return;
      const g = S.groups.find(x => x.id === id); g.name = e.target.value.trim() || g.name; save(); renderAll();
    });
    // Drag & drop entre columnas
    $('#board').addEventListener('dragstart', e => { const c = e.target.closest('[data-drag]'); if (!c) return; e.dataTransfer.setData('text/plain', c.dataset.drag); c.classList.add('is-drag'); });
    $('#board').addEventListener('dragend', e => { const c = e.target.closest('[data-drag]'); if (c) c.classList.remove('is-drag'); });
    $('#board').addEventListener('dragover', e => { const col = e.target.closest('[data-drop]'); if (!col) return; e.preventDefault(); $$('.v5-col').forEach(c => c.classList.toggle('is-over', c === col)); });
    $('#board').addEventListener('dragleave', e => { if (!e.relatedTarget || !$('#board').contains(e.relatedTarget)) $$('.v5-col').forEach(c => c.classList.remove('is-over')); });
    $('#board').addEventListener('drop', e => {
      const col = e.target.closest('[data-drop]'); if (!col) return;
      e.preventDefault(); $$('.v5-col').forEach(c => c.classList.remove('is-over'));
      const id = e.dataTransfer.getData('text/plain'); if (id) moveTo(id, col.dataset.drop);
    });

    // Formulario del borrador
    const num = v => Number(String(v).replace(/\D/g, '')) || 0;
    $('#fPrice').addEventListener('input', e => { const v = num(e.target.value); if (v >= 1000) { S.draft.price = v; S.dirty = true; save(); renderStep3(); } });
    $('#fFree').addEventListener('change', e => { S.draft.free = e.target.checked; S.dirty = true; save(); renderStep3(); });
    $('#fFull').addEventListener('change', e => { S.draft.full = e.target.checked; S.dirty = true; save(); renderStep3(); });
    $('#fCuotas').addEventListener('change', e => { S.draft.cuotas = +e.target.value; S.dirty = true; save(); renderStep3(); });
    $('#groupSel').addEventListener('change', e => {
      S.gid = e.target.value;
      // Si es una idea nueva sin tocar, la adaptamos al grupo (in-ear vs vincha tienen precios muy distintos)
      if (S.src === 'new' && !S.dirty) S.draft = templateDraft(groupStats(curGroup().items));
      lastScore = null; save(); renderStep3();
    });

    bindStrip();
    window.addEventListener('resize', () => { if (S.step === 3) renderStep3(); });
  }

  /* ---------- Arranque ---------- */
  hydrateIcons();
  $('#q').value = S.q || '';
  bind();
  renderAll();
})();
