/* ============================================================
   R8T · icons.js  —  set de íconos SVG (line-icons, estilo Real Trends)
   Uso: icon("truck")  → string SVG.  color = currentColor.
   ============================================================ */
const ICONS = {
  // categorías
  producto:    '<path d="M20 7 12 3 4 7v10l8 4 8-4z"/><path d="M4 7l8 4 8-4M12 21V11"/>',
  competencia: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  margen:      '<path d="M3 17l5-5 3 3 7-8"/><path d="M15 7h5v5"/>',
  costos:      '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/>',
  impuestos:   '<path d="M3 21h18M5 21V9l7-5 7 5v12"/><path d="M9 21v-6h6v6"/>',
  promos:      '<path d="M3 11v2a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M15 8a5 5 0 0 1 0 8"/>',
  descuentos:  '<path d="M20.6 12.6 12 21l-8-8a3.5 3.5 0 0 1 0-5l1-1 7 7"/><path d="m14 6 4-4 4 4-4 4"/><circle cx="8.5" cy="8.5" r="1.3"/>',
  envios:      '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17.5" cy="18" r="1.6"/>',
  cuotas:      '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 9.5h19M6 15h4"/>',
  devoluciones:'<path d="M3 8a9 9 0 1 1-1.5 5"/><path d="M3 3v5h5"/>',
  logica:      '<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="12" r="2.5"/><path d="M8 7.5 15.5 11M8 16.5 15.5 13"/>',
  accion:      '<path d="M5 12l4 4L19 6"/>',
  precio:      '<path d="M20 12V7a2 2 0 0 0-2-2h-5L3 15l6 6L20 12z"/><circle cx="15" cy="9" r="1.4"/>',
  // acciones IA / estrategia
  bolt:        '<path d="M13 2 4 14h6l-1 8 9-12h-6z"/>',
  rocket:      '<path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2M9 11a11 11 0 0 1 8-8c1 0 2 0 2 0s0 1 0 2a11 11 0 0 1-8 8l-3 1-1-1z"/><circle cx="14.5" cy="9.5" r="1.4"/>',
  shield:      '<path d="M12 3 5 6v6c0 4 3 6.5 7 9 4-2.5 7-5 7-9V6z"/><path d="m9 12 2 2 4-4"/>',
  scale:       '<path d="M12 3v18M7 21h10M5 7l7-2 7 2M5 7l-2 6a4 4 0 0 0 4 0zM19 7l2 6a4 4 0 0 1-4 0z"/>',
  sparkles:    '<path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z"/><path d="M19 14l.9 2 .9-2M5 5l.7 1.6L7 7"/>',
  // UI
  search:      '<circle cx="11" cy="11" r="7"/><path d="m21 21-4-4"/>',
  plus:        '<path d="M12 5v14M5 12h14"/>',
  minus:       '<path d="M5 12h14"/>',
  save:        '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
  play:        '<path d="M6 4l14 8-14 8z"/>',
  chevron:     '<path d="m6 9 6 6 6-6"/>',
  dots:        '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  trash:       '<path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/>',
  copy:        '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
  close:       '<path d="M6 6l12 12M18 6 6 18"/>',
  fit:         '<path d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4"/>',
  lock:        '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  info:        '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  alert:       '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
  check:       '<path d="M20 6 9 17l-5-5"/>',
  checkc:      '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  x:           '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
  download:    '<path d="M12 3v12M7 11l5 4 5-4M4 21h16"/>',
  upload:      '<path d="M12 15V3M7 7l5-4 5 4M4 21h16"/>',
  edit:        '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  grid:        '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  chat:        '<path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.5A8 8 0 1 1 21 12z"/>',
  home:        '<path d="M4 11 12 4l8 7"/><path d="M6 10v9h12v-9"/>',
  chart:       '<path d="M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-8"/>',
  gauge:       '<path d="M4 15a8 8 0 1 1 16 0"/><path d="M12 15l4-4"/>',
  book:        '<path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2z"/><path d="M4 5v14"/>',
  target:      '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/>',
  layers:      '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5M3 18l9 5 9-5"/>',
  drag:        '<circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/>',
  wand:        '<path d="M15 4V2M15 10V8M9.5 4.5 8 3M21.5 4.5 20 3M18 7h2M10 7h2"/><path d="m3 21 12-12 2 2L5 23z"/>',
  clock:       '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  undo:        '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-4"/>',
  redo:        '<path d="m15 14 5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h4"/>',
  coins:       '<circle cx="9" cy="9" r="6"/><path d="M15.5 4.2a6 6 0 0 1 0 15.6M9 6.5v5M6.7 7.8h3.1a1.4 1.4 0 0 1 0 2.8H8a1.4 1.4 0 0 0 0 2.8h3"/>',
  stock:       '<path d="M3 7 12 3l9 4v10l-9 4-9-4z"/><path d="M12 12v9M3 7l9 5 9-5"/>',
  stop:        '<rect x="6" y="6" width="12" height="12" rx="2.5"/>',
  pause:       '<path d="M8 5v14M16 5v14"/>',
};

function icon(name, cls) {
  const p = ICONS[name] || ICONS.info;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${cls ? ` class="${cls}"` : ''}>${p}</svg>`;
}
