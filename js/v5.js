/* ============================================================
   R8T · v5.js — Competencia en una sola pantalla.

   1. Pestañas = grupos. Lo que seguís entra al grupo abierto (máx. 10 en total).
   2. "Fijate dónde quedarías": elegís una publicación tuya o una nueva,
      ponés precio y envío gratis, y ves el ranking por precio del grupo con vos adentro.

   Autónomo: sólo depende de icons.js. Datos de ejemplo (MARKET / MINE).
   Estado en localStorage "r8t.v5b".
   ============================================================ */
(function () {
  'use strict';

  const MAX_FOLLOW = 10;
  const MAX_GROUPS = 4;
  const LS_KEY = 'r8t.v5b';

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
  const blank = () => ({ groups: [{ id: 'g1', name: 'Grupo 1', items: [] }], active: 'g1', mine: 'new', price: null, free: false, q: '' });
  let S = load();
  function load() {
    try { const s = JSON.parse(localStorage.getItem(LS_KEY)); if (s && Array.isArray(s.groups) && s.groups.length) return Object.assign(blank(), s); } catch (e) {}
    return blank();
  }
  const save = () => { try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) {} };

  /* ---------- Helpers ---------- */
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => '$ ' + Math.round(n).toLocaleString('es-AR');
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const median = a => { const b = a.slice().sort((x, y) => x - y), m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
  const byId = id => MARKET.find(x => x.id === id);
  const group = () => S.groups.find(g => g.id === S.active) || S.groups[0];
  const groupOf = id => S.groups.find(g => g.items.includes(id));
  const followedCount = () => S.groups.reduce((n, g) => n + g.items.length, 0);
  const thumb = l => `<span class="v5-thumb" style="background:${l.color}">${esc(l.brand.slice(0, 2).toUpperCase())}</span>`;

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
    setTimeout(() => { t.style.transition = 'opacity .25s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 260); }, 2200);
  }

  /* ---------- Pestañas (grupos) ---------- */
  function renderTabs() {
    $('#tabs').innerHTML = S.groups.map(g => `
      <button class="v5-tab${g.id === S.active ? ' is-on' : ''}" data-tab="${g.id}" title="Doble clic para renombrar">
        ${esc(g.name)} <small>${g.items.length}</small>
        ${g.id === S.active && S.groups.length > 1 ? `<span class="v5-tab__x" data-del="${g.id}" title="Borrar grupo">${icon('x')}</span>` : ''}
      </button>`).join('') +
      (S.groups.length < MAX_GROUPS ? `<button class="v5-tab v5-tab--add" data-add>${icon('plus')} Nuevo grupo</button>` : '');
  }

  /* ---------- 1. Seguir publicaciones ---------- */
  function renderResults() {
    const q = norm(S.q.trim());
    const list = MARKET.filter(l => !q || norm(l.title + ' ' + l.seller + ' ' + l.brand).includes(q));
    const full = followedCount() >= MAX_FOLLOW;
    $('#count').textContent = followedCount() + ' / ' + MAX_FOLLOW + ' seguidas';
    $('#count').classList.toggle('is-full', full);
    $('#results').innerHTML = list.length ? list.map(l => {
      const g = groupOf(l.id);
      let btn;
      if (g && g.id === S.active) btn = `<button class="v5-btn is-on" data-follow="${l.id}">Siguiendo</button>`;
      else if (g) btn = `<button class="v5-btn" data-follow="${l.id}" title="Pasarla a «${esc(group().name)}»">En ${esc(g.name)}</button>`;
      else btn = `<button class="v5-btn" data-follow="${l.id}" ${full ? 'disabled title="Máximo 10 publicaciones"' : ''}>Seguir</button>`;
      return `<li class="v5-row">${thumb(l)}
        <div class="v5-row__t"><b title="${esc(l.title)}">${esc(l.title)}</b><small>${esc(l.seller)}</small></div>
        <span class="v5-row__p">${money(l.price)}</span>${btn}</li>`;
    }).join('') : `<li class="v5-empty">No encontramos «${esc(S.q)}».</li>`;
  }

  function toggleFollow(id) {
    const g = group(), cur = groupOf(id);
    if (cur && cur.id === g.id) { cur.items = cur.items.filter(x => x !== id); }
    else if (cur) { cur.items = cur.items.filter(x => x !== id); g.items.push(id); toast('Movida a «' + esc(g.name) + '»'); }
    else {
      if (followedCount() >= MAX_FOLLOW) { toast('Máximo 10 publicaciones', 'alert'); return; }
      g.items.push(id);
    }
    save(); render();
  }

  /* ---------- 2. Dónde quedarías ---------- */
  function defaultPrice() {
    const items = group().items.map(byId);
    return items.length ? Math.round(median(items.map(l => l.price)) / 500) * 500 - 1 : 29999;
  }

  function renderMine() {
    $('#mine').innerHTML = `<option value="new">Una publicación nueva</option>` +
      `<optgroup label="Mis publicaciones">` + MINE.map(m => `<option value="${m.id}">${esc(m.title)}</option>`).join('') + `</optgroup>`;
    $('#mine').value = S.mine;
    if (S.price == null) S.price = defaultPrice();
    if (document.activeElement !== $('#price')) $('#price').value = S.price.toLocaleString('es-AR');
    $('#free').checked = S.free;
  }

  function renderCompare() {
    const g = group();
    const items = g.items.map(byId).filter(Boolean);
    if (!items.length) {
      $('#verdict').innerHTML = `Seguí al menos una publicación en «${esc(g.name)}» y acá vas a ver en qué puesto quedarías.`;
      $('#rank').innerHTML = '';
      return;
    }
    const n = items.length;
    const cheaper = items.filter(l => l.price < S.price).length;
    const pos = cheaper + 1, tot = n + 1;
    const med = median(items.map(l => l.price));
    const diff = Math.round((S.price / med - 1) * 100);
    const freeK = items.filter(l => l.free).length;

    let txt = pos === 1
      ? `Con <b>${money(S.price)}</b> serías la <b>más barata</b> de «${esc(g.name)}».`
      : `Con <b>${money(S.price)}</b> quedarías <b>${pos}º de ${tot}</b> por precio en «${esc(g.name)}».`;
    txt += ` El precio típico del grupo es <b>${money(med)}</b>` +
      (Math.abs(diff) < 3 ? ' y estás justo ahí.' : ` (estás ${Math.abs(diff)} % ${diff > 0 ? 'arriba' : 'abajo'}).`);
    if (!S.free && freeK / n >= 0.5) txt += ` <span class="bad"><b>${freeK} de ${n}</b> ofrecen envío gratis y vos no.</span>`;
    else if (S.free) txt += ` Ofrecés envío gratis, como ${freeK} de ${n}.`;
    $('#verdict').innerHTML = txt;

    const own = MINE.find(m => m.id === S.mine);
    const me = { me: true, title: own ? own.title : 'Tu publicación nueva', price: S.price, free: S.free };
    const rows = items.concat([me]).sort((a, b) => a.price - b.price || (a.me ? -1 : 1));
    $('#rank').innerHTML = rows.map((l, i) => l.me
      ? `<li class="v5-row v5-row--me"><span class="v5-pos">${i + 1}</span>
          <div class="v5-row__t"><b><span class="v5-me">VOS</span>${esc(l.title)}</b><small>${l.free ? '<span class="ok">Envío gratis</span>' : 'Sin envío gratis'}</small></div>
          <span class="v5-row__p">${money(l.price)}</span></li>`
      : `<li class="v5-row"><span class="v5-pos">${i + 1}</span>${thumb(l)}
          <div class="v5-row__t"><b title="${esc(l.title)}">${esc(l.title)}</b><small>${l.free ? '<span class="ok">Envío gratis</span> · ' : ''}≈${l.sales30} ventas/mes</small></div>
          <span class="v5-row__p">${money(l.price)}</span></li>`).join('');
  }

  function render() { renderTabs(); renderResults(); renderMine(); renderCompare(); }

  /* ---------- Eventos ---------- */
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-del],[data-tab],[data-add],[data-follow]');
    if (!t) return;
    if (t.dataset.del) {
      const g = S.groups.find(x => x.id === t.dataset.del);
      if (g.items.length && !confirm(`¿Borrar «${g.name}»? Se dejan de seguir sus ${g.items.length} publicaciones.`)) return;
      S.groups = S.groups.filter(x => x.id !== g.id); S.active = S.groups[0].id;
    } else if (t.dataset.tab) {
      if (S.active === t.dataset.tab) return;
      S.active = t.dataset.tab; if (S.mine === 'new') S.price = null;
    } else if (t.dataset.add !== undefined) {
      const id = 'g' + Date.now().toString(36);
      S.groups.push({ id, name: 'Grupo ' + (S.groups.length + 1), items: [] }); S.active = id;
      if (S.mine === 'new') S.price = null;
    } else if (t.dataset.follow) { toggleFollow(t.dataset.follow); return; }
    save(); render();
  });
  $('#tabs').addEventListener('dblclick', e => {
    const t = e.target.closest('[data-tab]'); if (!t) return;
    const g = S.groups.find(x => x.id === t.dataset.tab);
    const name = prompt('Nombre del grupo', g.name);
    if (name && name.trim()) { g.name = name.trim().slice(0, 24); save(); render(); }
  });
  $('#q').addEventListener('input', e => { S.q = e.target.value; renderResults(); });
  $('#mine').addEventListener('change', e => {
    S.mine = e.target.value;
    const m = MINE.find(x => x.id === S.mine);
    if (m) { S.price = m.price; S.free = m.free; } else { S.price = defaultPrice(); S.free = false; }
    save(); render();
  });
  $('#price').addEventListener('input', e => {
    const v = Number(e.target.value.replace(/\D/g, ''));
    if (v >= 100) { S.price = v; save(); renderCompare(); }
  });
  $('#price').addEventListener('blur', () => { $('#price').value = S.price.toLocaleString('es-AR'); });
  $('#free').addEventListener('change', e => { S.free = e.target.checked; save(); renderCompare(); });
  $('#btnReset').addEventListener('click', () => { S = blank(); save(); $('#q').value = ''; render(); toast('Listo, empezamos de cero', 'refresh'); });

  /* ---------- Arranque ---------- */
  hydrateIcons();
  $('#q').value = S.q;
  render();
})();
