# CLAUDE.md — R8T (Repricer con IA para Real Trends)

> Guía para el próximo Claude (o dev) que trabaje en este repo. Leé esto **antes** de tocar código.

## Qué es R8T

R8T es **"el n8n de Real Trends"**: un editor visual de estrategias de *repricing* (ajuste
automático de precios) para vendedores de Mercado Libre. El usuario arma su propia
estrategia arrastrando **bloques** sobre un lienzo con cuadrícula, los conecta y ajusta
los números de cada uno. Es una **funcionalidad extra dentro de Real Trends**, no un
producto separado — por eso el diseño clona el de Real Trends.

Inspirado en **Zentor, TheFoxie y MargenFull** (repricers de ML), pero mucho más
personalizable y "ludificado" (gamificado).

## Estado actual (Fase 1 — COMPLETA)

✅ Editor de nodos vanilla JS: pan, zoom, arrastre, conexiones bezier, cuadrícula de fondo.
✅ Paleta de bloques por categorías, drag & drop al lienzo.
✅ ~25 bloques cubriendo todas las variables de una estrategia (ver `docs/BLOCKS.md`).
✅ Inspector con edición de números (steppers, sliders, selects, toggles).
✅ 6 estrategias pre-armadas (Crecimiento, Rentabilidad, Ganar BuyBox, Liquidación,
   Equilibrado IA, Blindaje Fiscal).
✅ Simulador de precio en vivo con productos de muestra (margen neto, ganancia, salud).
✅ Gamificación: nivel/XP y "salud de la estrategia".
✅ Creación de **bloques propios** desde el editor.
✅ Guardado en `localStorage` + exportar JSON.

## Lo que sigue (ver `docs/ROADMAP.md`)

- **Fase 2 — Chatbot IA (Groq):** panel derecho "Asistente IA" ya maquetado en
  `js/app.js → initChat()`. Falta conectar la **API de Groq** (Llama 3.3 70B) para que
  edite el grafo con lenguaje natural. La API key NO debe ir hardcodeada en el front:
  usar un backend/proxy. Ver ROADMAP para el contrato de función sugerido.
- **Fase 3 — Backend real:** persistencia por usuario, conexión a la API de Mercado
  Libre (precios, comisiones por categoría, buybox, stock reales), ejecución programada
  del repricer.
- **Fase 4 — Integración en la app de Real Trends** como módulo/microfrontend.

## Arquitectura (sin framework, sin build)

Es un sitio **100% estático**: se abre `index.html` directamente, sin Node ni bundler.
Esta decisión fue a propósito (la máquina de desarrollo no tenía toolchain y así se
puede previsualizar como Artifact al instante). Migrar a React/Vite es opcional (ver
ROADMAP); si se hace, conservar `blocks.js`/`strategies.js`/`simulate.js` casi tal cual.

```
index.html            Shell de la app (documento completo standalone)
r8t-app.html          Copia SIN <html>/<head>/<body> para publicar como Artifact de Claude.
                      ⚠ Mantener su <body> sincronizado con index.html (o consolidar).
styles/
  theme.css           Tokens de diseño Real Trends (colores, tipografía, botones)
  app.css             Chrome de la app (rail, topbar, paleta, inspector, modales)
  editor.css          Canvas: cuadrícula, nodos, puertos, conexiones, simulador
js/
  icons.js            Set de íconos SVG inline → icon("nombre")
  blocks.js           ★ Registro de bloques + helpers de cálculo (variablePct, priceForMargin…)
  strategies.js       Estrategias pre-armadas + productos de muestra (SAMPLE_PRODUCTS)
  editor.js           ★ Motor del canvas (objeto RE): estado, render, pan/zoom, drag, conexiones
  simulate.js         ★ Recorre el grafo y calcula precio/margen/salud
  inspector.js        Panel derecho: UI de edición de parámetros del nodo
  app.js              ★ Bootstrap: paleta, tabs, presets, simulador, guardado, gamificación, chat
docs/                 DESIGN.md · BLOCKS.md · ROADMAP.md
```

Orden de carga de scripts (importa, hay dependencias globales): icons → blocks →
strategies → editor → simulate → inspector → app.

### Conceptos clave

- **Bloque (block type):** definición en `BLOCKS` (o `window.CUSTOM_BLOCKS`). Tiene
  `cat`, `name`, `icon`, `inputs`, `outputs`, `params[]`, `summary(p,ctx)` y
  `apply(ctx,p)` (o `branch(ctx,p)` para condiciones). Ver `docs/BLOCKS.md`.
- **Nodo (node):** instancia de un bloque en el lienzo `{id, type, x, y, params}`.
- **ctx (contexto de precio):** objeto que fluye por el grafo en la simulación; cada
  bloque lo muta (precio, costos, impuestos, piso/techo, notas…). Definido en
  `simulate.js → seedCtx()`.
- **RE:** objeto del editor (`editor.js`). API: `RE.loadGraph`, `RE.getGraph`,
  `RE.addNodeCenter`, `RE.updateNodeParams`, `RE.fitView`, `RE.getState`, etc.

## Diseño = Real Trends (NO cambiar sin motivo)

Colores extraídos del sitio real (`real-trends.com`). Están en `styles/theme.css`:
azul `#0065F3`, teal `#71D8BF`, navy `#171E43`, tinta `#292828`, lima `#CBF44F`.
Botones tipo píldora (radius 36px). Tipografía: Proxima Nova (marca) → fallback **Mulish**
(Google Fonts). Es una marca **light-only**: no hay tema oscuro a propósito.
Detalle completo en `docs/DESIGN.md`.

## Cómo previsualizar

- **Local:** abrir `index.html` en el navegador (doble clic). No necesita servidor.
- **Como Artifact de Claude:** publicar `r8t-app.html` con los archivos de `styles/` y
  `js/` como supporting files.

## Convenciones

- UI 100% en **español (Argentina)**. Términos: margen, comisión, IIBB, buybox, cuotas.
- Sin dependencias externas salvo la fuente de Google. Mantenerlo así en Fase 1.
- Los cálculos de la simulación son **aproximaciones didácticas**, no contabilidad exacta.
  Cuando haya backend + API de ML, reemplazar por datos y fórmulas reales.
- Al agregar un bloque nuevo: definirlo en `blocks.js` y listo (la paleta y el inspector
  se generan solos). Guía paso a paso en `docs/BLOCKS.md`.

## Repo

GitHub: https://github.com/theotrosman/R8T
```

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```
