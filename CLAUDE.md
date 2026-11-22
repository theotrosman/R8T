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

## Estado actual (Fase 1 — COMPLETA, rework v2)

> ⚠ El modelo cambió de **grafo de nodos (n8n)** a **programa apilable en árbol
> (estilo Scratch/pilasbloques)**. Layout híbrido: el flujo va **vertical** y las
> condiciones abren **ramas horizontales SÍ / SI NO** que contienen bloques adentro.

✅ Editor apilable vanilla JS: flujo vertical, condicionales que **anidan** bloques,
   arrastrar para reordenar/insertar, agregar por botón "＋", zoom (CSS `zoom`) y pan.
✅ Edición de números **en línea, dentro de cada bloque** (steppers, selects, toggles).
   Ya NO hay panel inspector aparte (`inspector.js` eliminado).
✅ **Barra de explicación** arriba del editor: genera en lenguaje natural "Cuando pasa X,
   hago Y…" a partir del árbol (`describeProgram` en `strategies.js` + `narrate` por bloque).
✅ ~25 bloques cubriendo todas las variables (ver `docs/BLOCKS.md`).
✅ 6 estrategias pre-armadas (Crecimiento, Rentabilidad, Ganar BuyBox, Liquidación,
   Equilibrado, Blindaje Fiscal).
✅ **Aplicar a un producto o a un grupo** de productos (SAMPLE_PRODUCTS / SAMPLE_GROUPS).
✅ Panel **Resultado** (serio, SIN gamificación): precio sugerido, margen neto, ganancia,
   diagnóstico (Óptima/Aceptable/Poco competitivo/No rentable) y **proyección a 8 semanas**
   con modelo de demanda (precio vs competidor → unidades).
✅ Creación de **bloques propios** + guardado en `localStorage` + exportar JSON.

> Sacado a propósito en v2: "salud %", XP y niveles (el usuario los pidió fuera; querían
> algo serio pero claro).

## Lo que sigue (ver `docs/ROADMAP.md`)

- **Fase 2 — Chatbot IA (Groq): IMPLEMENTADA (v1).** `api/assistant.js` (serverless de
  Vercel) llama a Groq (Llama 3.3 70B) con la `GROQ_API_KEY` del entorno y devuelve
  `{reply, name, program}`. El front (`initChat` en `app.js`) sanitiza el `program` con
  `sanitizeProgram()` y lo carga en el editor con `RE.loadProgram` → **arma la estrategia
  directamente**. Si no hay backend (ej. en el Artifact de Claude), cae a una sugerencia
  local. Pendiente: acciones incrementales (editar bloque puntual), streaming, memoria.
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
index.html            Shell de la app COMPLETA (editor de bloques como pantalla principal).
v2.html               ★ Shell de la app SIMPLIFICADA "asistente-first" (ver más abajo).
v3.html / v5.html     v3 = wizard Lite de repricing · v5 = Competencia: grupos + publicación de prueba.
r8t-app.html          Copia SIN <html>/<head>/<body> para publicar como Artifact de Claude.
                      ⚠ Mantener su <body> sincronizado con index.html (o consolidar).
assets/
  logo-realtrends.svg Logo REAL de Real Trends (usado en rail y topbar)
styles/
  theme.css           Tokens de diseño Real Trends (colores, tipografía, botones)
  app.css             Chrome (rail, topbar, paleta, panel Resultado, presets, chat, modales)
  editor.css          Canvas: cuadrícula, bloques apilables, contenedores condicionales, zoom
  v2.css              Layout "asistente-first" de v2.html (chat, panel, tarjetas, overlays)
js/
  icons.js            Set de íconos SVG inline → icon("nombre")
  blocks.js           ★ Registro de bloques + helpers de cálculo (variablePct, priceForMargin…)
  strategies.js       Estrategias (árbol) + SAMPLE_PRODUCTS/SAMPLE_GROUPS + describeProgram()
  editor.js           ★ Motor apilable (objeto RE): árbol, render, inline edit, drag, zoom/pan
  simulate.js         ★ Recorre el árbol y calcula precio/margen + proyección a futuro
  app.js              ★ Bootstrap de index.html: paleta, tabs, destino, explicación, resultado, chat
  v2.js               ★ Bootstrap de v2.html (app propia, NO carga app.js): chat-first, "Mis
                      estrategias", presets recomendados, vista "pasada" simplificada y el editor
                      de bloques en overlay (reutiliza el motor RE + simulate + describeProgram).
api/
  assistant.js        Función serverless (Vercel) → proxy a Groq. Devuelve {reply, name, program}
                      y el front construye esa estrategia en el editor. Requiere env GROQ_API_KEY.
                      ⚠ Tiene su propio catálogo de bloques embebido: si agregás/cambiás bloques
                      en blocks.js, actualizá el prompt de assistant.js.
docs/                 DESIGN.md · BLOCKS.md · ROADMAP.md · MEJORAS.md
```

Orden de carga de scripts (importa, hay dependencias globales): icons → blocks →
strategies → editor → simulate → app.

### Conceptos clave (v2)

- **Bloque (block type):** definición en `BLOCKS` (o `window.CUSTOM_BLOCKS`). Tiene
  `cat`, `name`, `icon`, `desc`, `params[]`, `narrate(p)` (frase en lenguaje natural) y
  `apply(ctx,p)`. Los **contenedores** (ej. `condicion`) llevan `container:true` +
  `branch(ctx,p)` que devuelve `'si'|'no'`. Ver `docs/BLOCKS.md`.
- **Programa (árbol):** `{ target:{mode:'product'|'group', id}, root:[step,…] }`.
  `step = { id, type, params, branches?:{si:[…], no:[…]} }`. Reemplaza al viejo grafo.
- **ctx (contexto de precio):** objeto que se transforma al recorrer el árbol en orden;
  cada bloque lo muta (precio, costos, impuestos, piso/techo, notas…). Ver `simulate.js`.
- **RE:** objeto del editor (`editor.js`). API: `RE.loadProgram`, `RE.getProgram`,
  `RE.addBlock(type,path)`, `RE.setTarget/getTarget`, `RE.zoomBy/fitView`,
  `RE.mergedParams(step)`, `RE.getState`. Un `path` de pila es `'root'` o `'<stepId>.si'` / `'<stepId>.no'`.
- **Destino:** producto individual o grupo. `resolveTarget()` (strategies.js) devuelve el
  producto representativo + `scale` (nº de productos) para la proyección.

## v2.html — versión simplificada "asistente-first"

Misma marca y mismo motor, pero **el foco se corre del editor de bloques al chatbot**.
Pensada para el usuario que quiere *decir lo que necesita* y obtener la estrategia lista,
sin pelearse con bloques. Conceptos:

- **Centro = chat.** El asistente (mismo `/api/assistant`, con fallback local a presets)
  arma la estrategia y la muestra como **tarjeta** (qué hace en palabras + precio sugerido +
  acciones: Ver pasada / Guardar / Editar).
- **Panel derecho = "Mis estrategias"** (guardadas en `localStorage` `r8t.v2.strategies`) +
  **"Recomendadas"** (los 6 presets de `strategies.js`).
- **"Pasada"** = vista de correr la estrategia sobre un producto/grupo. **Se sacó a propósito
  la proyección a 8 semanas y el desglose de impuestos** (era el pedido: simplificar). Queda
  precio sugerido + diagnóstico + margen/ganancia por unidad, o tabla de precio por producto.
- **Editor de bloques = overlay "avanzado"** (botón en la topbar o "Editar" en cualquier
  tarjeta). Reutiliza `RE` tal cual; guarda de vuelta en "Mis estrategias".

`index.html` sigue siendo la app completa (editor como pantalla principal); v2 es una capa
de entrada más simple sobre el mismo motor. No comparten bootstrap (v2.js ≠ app.js) pero sí
todo lo demás (blocks/strategies/editor/simulate/icons). Comparten bloques propios
(`r8t.custom.v2`); v2 también sincroniza el autosave `r8t.save.v3` al guardar en el overlay.

## v3.html — versión "Lite" (asistente guiado por 3 pasos)

Respuesta al feedback de Ari (17-sep): armar una **v1 mucho más simple**, sin chat y sin las
estrategias abstractas de "agresividad" (eran subjetivas y difíciles de bajar a tierra). El
foco es **poca carga cognitiva**: el usuario elige con **selectores**, no escribe ni arma bloques.

- **Empty state = "paraguas" de 3 promesas:** (1) creá una estrategia para una publicación o
  un grupo, (2) definí qué querés lograr, (3) vos tenés el control (precio mínimo).
- **Wizard de 3 pasos + resumen:**
  1. **Destino:** una publicación (catálogo o link de MeLi) o un grupo.
  2. **Objetivo (elegís 1):** Ganar Buy Box · Ganarle a un competidor (link de MeLi **o**
     buscar en el **dump** = diferencial de RT) · Cuidar rentabilidad · Liquidar stock.
     **Extras** (toggles): gestionar promociones; subir precio si queda poco stock
     (regla estilo liquidación: "si me queda menos de X, subí X%").
  3. **Piso:** precio mínimo — la única regla que nunca se rompe.
- **Resumen en lenguaje natural** (`buildSentence` en `js/v3.js`): "Dale, vamos a gestionar
  que ganes la Buy Box y ponerte todas las promociones mientras tu precio de venta nunca
  quede por debajo de $14.000". Guarda en `localStorage` `r8t.v3.strategies`.
- **Autónomo:** sólo depende de `icons.js` + `styles/v3.css` (no usa el motor de bloques, a
  propósito: es la capa de entrada simple). La v2/index siguen siendo la versión avanzada
  (link "Versión avanzada" en la topbar de v3 → `v2.html`).

## v5.html — Competencia: grupos + publicación de prueba

Pedido del equipo de RT: **seguir publicaciones** (máx. **10**), **armar 1–2 grupos** y que el
usuario pueda **elegir una publicación propia o una idea nueva que no está en producción** para
compararse contra el grupo. No es repricing: es la antesala (entender dónde quedarías).
(No hay v4.html en el repo: el pedido fue directamente "v5".)

> Versión **simplificada** (feedback: "parece un volante de avión"): una idea por pantalla.
> Se sacaron a propósito: seguir por link, filtro de tipo, título/palabras clave, costo y la curva
> de ganancia (eso es terreno de Rentabilidad). No volver a sumarlos sin pedido.

- **Paso 1 · Seguir:** buscador sobre un "dump" de ejemplo (`MARKET` en `js/v5.js`). Tope `MAX_FOLLOW = 10`.
- **Paso 2 · Grupos:** drag & drop (o botones "→ grupo") y **Armar grupos por mí** (por tipo;
  si hay un solo tipo, por rango de precio). Rango de precios por grupo.
- **Paso 3 · Comparar (sandbox, nada se publica):** idea nueva o copia de una propia (`MINE`).
  Controles: grupo, precio, envío gratis, Full, cuotas, fotos. Resultado: **puntaje 0–100**
  (`evaluate()`: precio vs mediana 40 %, envío gratis 25 %, Full 10 %, cuotas 15 %, fotos 10 %),
  **tira de precios** con el punto "Vos" arrastrable y **comparativa con botones "Probar"**.
- Ventas estimadas (didáctico): mediana del grupo × atributos × (precio/mediana)^-3.
- **Autónomo:** sólo `icons.js` + `styles/v5.css` (clases con prefijo `v5-`). Estado en
  `localStorage` `r8t.v5`; botón "Reiniciar demo" lo borra.

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
