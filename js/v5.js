/* ============================================================
   R8T · v5.js — Competencia como onboarding por pasos (mismo diseño que v3).

   Inicio (3 promesas) → 1 Seguir (hasta 10) → 2 Grupos (armados solos, se revisan)
   → 3 Tu publicación (una tuya o una nueva, precio, envío gratis, contra qué grupo)
   → 4 Resultado (frase + puesto + ranking por precio) → Guardar → "Mis grupos".

   Cada paso llega con todo pre-armado ("te lo dejamos perfecto"): grupos por tipo,
   la publicación tuya que corresponde, el grupo que le compite y su precio.
   Autónomo: icons.js + styles/v3.css + styles/v5.css. Estado en localStorage "r8t.v5c".
   ============================================================ */
(function () {
  'use strict';

  const MAX_FOLLOW = 10;
  const LS_KEY = 'r8t.v5c';

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
  const MINE = [
    { id: 'MLA1433310021', type: 'in', brand: 'Vox', color: '#16a34a', title: 'Auriculares Bluetooth Vox Go In-ear Inalámbricos', price: 34999, cost: 17500, free: false, full: false, cuotas: 3, photos: 4 },
    { id: 'MLA1433310877', type: 'over', brand: 'Vox', color: '#16a34a', title: 'Auriculares Vincha Vox Studio Bluetooth', price: 104999, cost: 56000, free: true, full: false, cuotas: 3, photos: 5 },
    { id: 'MLA1433311540', type: 'in', brand: 'Vox', color: '#16a34a', title: 'Auriculares In-ear Vox Sport Con Micrófono', price: 19999, cost: 9800, free: true, full: true, cuotas: 0, photos: 6 },
  ];

  /* ---------- Estado ---------- */
  const blank = () => ({
    view: 'home', step: 1, q: '',
    followed: [],
    groups: [], builtFor: '', split: 'auto',   // 'auto' (por tipo o precio) | 'one'
    mode: 'own', ownId: null, title: '', price: null, free: false, gid: null,
    saved: false,
  });
  let S = load();
  function load() {
    try { const s = JSON.parse(localStorage.getItem(LS_KEY)); if (s && Array.isArray(s.followed)) return Object.assign(blank(), s); } catch (e) {}
    return blank();
  }
  const save = () => { try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) {} };

  /* ---------- Helpers ---------- */
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => '$ ' + Math.round(n).toLocaleString('es-AR');
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const median = a => { const b = a.slice().sort((x, y) => x - y), m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
  const roundPrice = n => Math.max(999, Math.round(n / 500) * 500 - 1);
  const byId = id => MARKET.find(x => x.id === id);
  const own = () => MINE.find(m => m.id === S.ownId);
  const thumb = (l, extra) => `<span class="pick__thumb v5-thumb${extra ? ' ' + extra : ''}" style="background:${l.color}">${esc(l.brand.slice(0, 2).toUpperCase())}</span>`;
  const typeName = t => t === 'in' ? 'in-ear' : 'vincha';

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
    setTimeout(() => { t.style.transition = 'opacity .25s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 260); }, 2400);
  }

  /* Datos de un grupo */
  function stats(g) {
    const ls = g.items.map(byId).filter(Boolean);
    const prices = ls.map(l => l.price);
    return {
      ls, n: ls.length,
      med: ls.length ? median(prices) : 0,
      min: ls.length ? Math.min(...prices) : 0,
      freeK: ls.filter(l => l.free).length,
      type: ls.filter(l => l.type === 'over').length > ls.length / 2 ? 'over' : 'in',
    };
  }
  const curGroup = () => S.groups.find(g => g.id === S.gid) || S.groups[0];

  /* ============================================================
     Paso 1 · Seguir
     ============================================================ */
  function renderMarket() {
    const q = norm(S.q.trim());
    const list = MARKET.filter(l => !q || norm(l.title + ' ' + l.seller + ' ' + l.brand).includes(q));
    const full = S.followed.length >= MAX_FOLLOW;
    $('#counter').textContent = S.followed.length + ' de ' + MAX_FOLLOW;
    $('#counter').classList.toggle('is-full', full);
    $('#market').innerHTML = list.length ? list.map(l => {
      const on = S.followed.includes(l.id);
      return `<button class="pick${on ? ' is-sel' : ''}" data-follow="${l.id}" ${!on && full ? 'disabled' : ''}>
        ${thumb(l)}
        <span class="pick__main"><span class="pick__name">${esc(l.title)}</span>
          <span class="pick__meta">${esc(l.seller)}${l.free ? ' · <span class="v5-free">Envío gratis</span>' : ''} · ≈${l.sales30} ventas/mes</span></span>
        <span class="pick__price">${money(l.price)}</span>
        <span class="pick__check">${icon('checkc')}</span>
      </button>`;
    }).join('') : `<div class="pick" style="color:var(--rt-gray-400)">No encontramos «${esc(S.q)}».</div>`;
  }

  /* ============================================================
     Paso 2 · Grupos (se arman solos)
     ============================================================ */
  function buildGroups() {
    const ls = S.followed.map(byId).filter(Boolean);
    const mk = (name, arr) => ({ id: 'g' + Math.random().toString(36).slice(2, 8), name, items: arr.map(l => l.id) });
    const ins = ls.filter(l => l.type === 'in'), overs = ls.filter(l => l.type === 'over');
    if (S.split === 'one') { S.groups = [mk('Mi competencia', ls)]; S.why = 'Están todas juntas en un solo grupo'; }
    else if (ins.length && overs.length) { S.groups = [mk('Auriculares in-ear', ins), mk('Auriculares vincha', overs)]; S.why = 'Las separamos por tipo de producto: in-ear y vincha'; }
    else if (ls.length >= 4) {
      const med = median(ls.map(l => l.price));
      S.groups = [mk('Económicas', ls.filter(l => l.price <= med)), mk('Premium', ls.filter(l => l.price > med))];
      S.why = 'Son todas del mismo tipo, así que las separamos por precio';
    } else { S.groups = [mk('Mi competencia', ls)]; S.why = 'Son pocas y parecidas, así que van todas juntas'; }
    S.builtFor = S.followed.slice().sort().join(',') + '|' + S.split;
  }

  function renderGroups() {
    const sig = S.followed.slice().sort().join(',') + '|' + S.split;
    if (S.builtFor !== sig || !S.groups.length) buildGroups();
    $('#groupWhy').textContent = S.why || 'Te las dejamos agrupadas';
    const two = S.groups.length === 2;
    $('#groups').innerHTML = S.groups.map((g, gi) => {
      const st = stats(g);
      return `<div class="v5-group">
        <div class="v5-group__h"><span class="v5-group__ic">${icon('layers')}</span>
          <input class="v5-group__name" value="${esc(g.name)}" data-rename="${g.id}" maxlength="28" aria-label="Nombre del grupo"></div>
        <div class="v5-group__meta">${st.n} publicaci${st.n === 1 ? 'ón' : 'ones'}${st.n ? ' · precio típico ' + money(st.med) : ''}</div>
        ${st.ls.map(l => `<div class="v5-member">${thumb(l)}<span class="v5-member__t" title="${esc(l.title)}">${esc(l.title)}</span><span class="v5-member__p">${money(l.price)}</span>
          ${two ? `<button class="v5-mv" data-move="${l.id}" data-to="${S.groups[1 - gi].id}" title="Pasar a «${esc(S.groups[1 - gi].name)}»">${icon('chevron')}</button>` : ''}</div>`).join('')
          || '<div class="v5-group__empty">Quedó vacío. Pasá alguna publicación acá o seguí sin este grupo.</div>'}
      </div>`;
    }).join('');
    $('#groups').classList.toggle('opts--2', two);
    const types = new Set(S.followed.map(id => byId(id).type));
    $('#btnOneGroup').textContent = S.split === 'one'
      ? (S.followed.length >= 4 || types.size > 1 ? 'Mejor separalas en dos grupos' : '')
      : (two ? 'Prefiero todas en un solo grupo' : '');
  }

  /* ============================================================
     Paso 3 · Tu publicación (llega pre-armado)
     ============================================================ */
  function prefillStep3() {
    S.groups = S.groups.filter(g => g.items.length);
    if (!S.groups.find(g => g.id === S.gid)) S.gid = null;
    if (S.mode === 'own' && !own()) {
      const big = S.groups.slice().sort((a, b) => b.items.length - a.items.length)[0];
      const t = stats(big).type;
      S.ownId = (MINE.find(m => m.type === t) || MINE[0]).id;
      S.price = null;
    }
    if (S.mode === 'own') {
      const m = own();
      if (!S.gid) S.gid = (S.groups.find(g => stats(g).type === m.type) || S.groups[0]).id;
      if (S.price == null) { S.price = m.price; S.free = m.free; }
    } else {
      if (!S.gid) S.gid = S.groups[0].id;
      if (S.price == null) { S.price = roundPrice(stats(curGroup()).med); S.free = false; }
    }
  }

  function renderStep3() {
    $$('#modeOpts .opt').forEach(o => o.classList.toggle('is-sel', o.dataset.mode === S.mode));
    $('#ownPicker').classList.toggle('hidden', S.mode !== 'own');
    $('#newTitleField').classList.toggle('hidden', S.mode !== 'new');
    $('#ownPicker').innerHTML = `<div class="picker__list">` + MINE.map(m => `
      <button class="pick${m.id === S.ownId ? ' is-sel' : ''}" data-own="${m.id}">${thumb(m)}
        <span class="pick__main"><span class="pick__name">${esc(m.title)}</span><span class="pick__meta">${typeName(m.type)}${m.free ? ' · <span class="v5-free">Envío gratis</span>' : ''}</span></span>
        <span class="pick__price">${money(m.price)}</span><span class="pick__check">${icon('checkc')}</span></button>`).join('') + `</div>`;
    if (document.activeElement !== $('#newTitle')) $('#newTitle').value = S.title;
    if (document.activeElement !== $('#price')) $('#price').value = S.price ? S.price.toLocaleString('es-AR') : '';
    $('#groupSeg').innerHTML = S.groups.map(g => `<button data-gid="${g.id}" class="${g.id === S.gid ? 'is-on' : ''}">${esc(g.name)}</button>`).join('');
    const g = curGroup(), st = stats(g);
    $('#priceHint').innerHTML = `El precio típico de «${esc(g.name)}» es <b>${money(st.med)}</b>.`;
    $('#freeDesc').textContent = `Lo ofrecen ${st.freeK} de ${st.n} publicaciones de «${g.name}».`;
    $('#freeSwitch').classList.toggle('is-on', S.free);
    $('#freeAddon').classList.toggle('is-on', S.free);
  }

  /* ============================================================
     Paso 4 · Resultado
     ============================================================ */
  function result() {
    const g = curGroup(), st = stats(g);
    const cheaper = st.ls.filter(l => l.price < S.price).length;
    const pos = cheaper + 1, tot = st.n + 1;
    const sorted = st.ls.map(l => l.price).sort((a, b) => a - b);
    const top3 = sorted.length >= 3 ? sorted[2] - 1000 : null;
    return { g, st, pos, tot, top3 };
  }
  const meTitle = () => S.mode === 'own' ? own().title : (S.title.trim() || 'Tu publicación nueva');

  function renderStep4() {
    const { g, st, pos, tot, top3 } = result();
    const diff = Math.round((S.price / st.med - 1) * 100);
    $('#sumSentence').innerHTML = pos === 1
      ? `Con <b>${money(S.price)}</b> serías <b>la más barata</b> de «${esc(g.name)}»${S.free ? ' y con envío gratis' : ''}.`
      : `Con <b>${money(S.price)}</b> quedarías <b>${pos}º de ${tot}</b> por precio en «${esc(g.name)}».`;
    const item = (k, v, ic) => `<div class="sitem"><div class="sitem__k">${k}</div><div class="sitem__v">${icon(ic)}${v}</div></div>`;
    $('#sumGrid').innerHTML =
      item('Puesto por precio', `${pos}º de ${tot}`, 'chart') +
      item('Precio típico del grupo', `${money(st.med)} <small style="opacity:.7;font-weight:700">(${Math.abs(diff) < 3 ? 'estás ahí' : 'estás ' + Math.abs(diff) + ' % ' + (diff > 0 ? 'arriba' : 'abajo')})</small>`, 'precio') +
      item('Envío gratis', `${S.free ? 'Vos sí' : 'Vos no'} · ${st.freeK} de ${st.n} sí`, 'envios') +
      item('La más barata', money(st.min), 'target');

    let tip = '';
    if (!S.free && st.freeK / st.n >= 0.5) tip = `<b>Lo primero que sumaría: envío gratis.</b> Lo tienen ${st.freeK} de ${st.n} publicaciones del grupo y el comprador lo mira antes que el precio.<br><button class="mpguide__btn" data-apply="free">${icon('envios')}Sumar envío gratis</button>`;
    else if (pos > 3 && top3) tip = `<b>Para entrar al top 3 por precio</b> tendrías que bajar a ${money(top3)}.<br><button class="mpguide__btn" data-apply="top3" data-price="${top3}">${icon('precio')}Usar ${money(top3)}</button>`;
    else tip = `<b>Estás bien ubicado.</b> Quedás entre las más baratas y ofrecés lo mismo que el resto del grupo.`;
    $('#tip').innerHTML = icon('info') + '<span>' + tip + '</span>';

    $('#rankName').textContent = g.name;
    const me = { me: true, title: meTitle(), price: S.price, free: S.free };
    const rows = st.ls.concat([me]).sort((a, b) => a.price - b.price || (a.me ? -1 : 1));
    $('#rank').innerHTML = rows.map((l, i) => l.me
      ? `<div class="pick v5-me"><span class="v5-pos">${i + 1}</span><span class="pick__thumb" style="background:var(--rt-navy);color:var(--rt-lime);font-weight:900;font-size:11px">VOS</span>
          <span class="pick__main"><span class="pick__name"><span class="v5-me__tag">VOS</span>${esc(l.title)}</span><span class="pick__meta">${l.free ? '<span class="v5-free">Envío gratis</span>' : 'Sin envío gratis'} · prueba, no publicada</span></span>
          <span class="pick__price">${money(l.price)}</span></div>`
      : `<div class="pick"><span class="v5-pos">${i + 1}</span>${thumb(l)}
          <span class="pick__main"><span class="pick__name">${esc(l.title)}</span><span class="pick__meta">${esc(l.seller)}${l.free ? ' · <span class="v5-free">Envío gratis</span>' : ''}</span></span>
          <span class="pick__price">${money(l.price)}</span></div>`).join('');
  }

  /* ============================================================
     Inicio · Mis grupos
     ============================================================ */
  function renderHome() {
    $('#savedWrap').classList.toggle('hidden', !S.saved);
    $('#btnStart').querySelector('span:last-child').textContent = S.saved ? 'Armar de nuevo' : 'Empezar';
    if (!S.saved) return;
    const { g, pos, tot } = result();
    $('#savedList').innerHTML = S.groups.map(gr => {
      const st = stats(gr);
      return `<div class="scard"><div class="scard__ic">${icon('layers')}</div><div class="scard__main">
        <div class="scard__name">${esc(gr.name)} <span class="chip chip--gray">${st.n} seguidas</span></div>
        <div class="scard__desc">Precio típico ${money(st.med)} · ${st.freeK} de ${st.n} con envío gratis</div></div></div>`;
    }).join('') +
      `<div class="scard scard--active"><div class="scard__ic">${icon('producto')}</div><div class="scard__main">
        <div class="scard__name">${esc(meTitle())} <span class="run-badge"><i></i>Prueba</span></div>
        <div class="scard__desc">Con ${money(S.price)} quedarías ${pos}º de ${tot} en «${esc(g.name)}».</div></div></div>`;
  }

  /* ============================================================
     Navegación
     ============================================================ */
  function check(step) {
    if (step === 1 && S.followed.length < 2) return 'Elegí al menos 2 publicaciones.';
    if (step === 2 && !S.groups.some(g => g.items.length)) return 'Necesitás al menos un grupo con publicaciones.';
    if (step === 3) {
      if (S.mode === 'new' && S.title.trim().length < 3) return 'Ponele un nombre a tu publicación nueva.';
      if (!S.price || S.price < 100) return 'Poné un precio.';
    }
    return '';
  }
  function showError(msg) {
    $('#navErrorTxt').textContent = msg;
    $('#navError').classList.toggle('show', !!msg);
  }

  function render() {
    $('#home').hidden = S.view !== 'home';
    $('#wizard').hidden = S.view !== 'wiz';
    if (S.view === 'home') { renderHome(); return; }
    $$('#steps .steps__item').forEach(it => {
      const n = +it.dataset.step;
      it.classList.toggle('is-active', n === S.step);
      it.classList.toggle('is-done', n < S.step);
      it.querySelector('.steps__dot').innerHTML = n < S.step ? icon('check') : n;
    });
    $$('.pane').forEach(p => p.classList.toggle('is-active', +p.dataset.pane === S.step));
    $('#btnNext').classList.toggle('hidden', S.step === 4);
    $('#btnSave').classList.toggle('hidden', S.step !== 4);
    if (S.step === 1) renderMarket();
    if (S.step === 2) renderGroups();
    if (S.step === 3) { prefillStep3(); renderStep3(); }
    if (S.step === 4) renderStep4();
  }

  function go(step) {
    showError('');
    S.step = step; save(); render();
    $('#scroller').scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------- Eventos ---------- */
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-follow],[data-move],[data-mode],[data-own],[data-gid],[data-apply]');
    if (!t) return;
    const d = t.dataset;
    if (d.follow) {
      const i = S.followed.indexOf(d.follow);
      if (i >= 0) S.followed.splice(i, 1);
      else if (S.followed.length < MAX_FOLLOW) S.followed.push(d.follow);
      showError(''); save(); renderMarket();
    } else if (d.move) {
      S.groups.forEach(g => g.items = g.items.filter(x => x !== d.move));
      S.groups.find(g => g.id === d.to).items.push(d.move);
      save(); renderGroups();
    } else if (d.mode) {
      if (S.mode === d.mode) return;
      S.mode = d.mode; S.price = null; S.gid = null;
      if (d.mode === 'new') S.ownId = null;
      showError(''); prefillStep3(); save(); renderStep3();
      if (d.mode === 'new') $('#newTitle').focus();
    } else if (d.own) {
      S.ownId = d.own; S.price = null; S.gid = null;
      prefillStep3(); save(); renderStep3();
    } else if (d.apply) {
      if (d.apply === 'free') { S.free = true; toast('Listo, con envío gratis', 'envios'); }
      if (d.apply === 'top3') { S.price = Number(d.price); toast('Precio actualizado a ' + money(S.price), 'precio'); }
      save(); renderStep4();
    } else if (d.gid) {
      S.gid = d.gid;
      if (S.mode === 'new') S.price = roundPrice(stats(curGroup()).med);
      save(); renderStep3();
    }
  });

  $('#btnStart').addEventListener('click', () => { S.view = 'wiz'; go(1); });
  $('#btnEdit').addEventListener('click', () => { S.view = 'wiz'; go(1); });
  $('#btnBack').addEventListener('click', () => { if (S.step === 1) { S.view = 'home'; save(); render(); } else go(S.step - 1); });
  $('#btnNext').addEventListener('click', () => { const err = check(S.step); if (err) { showError(err); return; } go(S.step + 1); });
  $('#btnSave').addEventListener('click', () => { S.saved = true; S.view = 'home'; save(); render(); $('#scroller').scrollTo({ top: 0 }); toast('Guardamos tus grupos', 'check'); });
  $('#btnReset').addEventListener('click', () => { S = blank(); save(); $('#q').value = ''; render(); toast('Listo, empezamos de cero', 'refresh'); });
  $$('#steps .steps__item').forEach(it => it.addEventListener('click', () => {
    const n = +it.dataset.step;
    if (n < S.step) go(n);
  }));

  $('#q').addEventListener('input', e => { S.q = e.target.value; renderMarket(); });
  $('#groups').addEventListener('change', e => {
    const id = e.target.dataset.rename; if (!id) return;
    const g = S.groups.find(x => x.id === id); g.name = e.target.value.trim() || g.name; save();
  });
  $('#btnOneGroup').addEventListener('click', () => { S.split = S.split === 'one' ? 'auto' : 'one'; S.gid = null; save(); renderGroups(); });
  $('#newTitle').addEventListener('input', e => { S.title = e.target.value; showError(''); save(); });
  $('#price').addEventListener('input', e => { const v = Number(e.target.value.replace(/\D/g, '')); S.price = v || null; save(); });
  $('#price').addEventListener('blur', () => { if (S.price) $('#price').value = S.price.toLocaleString('es-AR'); });
  $('#freeSwitch').addEventListener('click', () => { S.free = !S.free; save(); renderStep3(); });

  /* ---------- Arranque ---------- */
  hydrateIcons();
  $('#q').value = S.q;
  render();
})();
