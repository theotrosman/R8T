<h1 align="center">R8T · el n8n de Real Trends</h1>

<p align="center">
  <b>Editor visual de estrategias de repricing con IA para Mercado Libre.</b><br>
  Armá tu propia estrategia con bloques que se arrastran, conectan y ajustan —
  como en n8n, pero para precios.
</p>

---

## ¿Qué es?

R8T es una funcionalidad extra dentro de **Real Trends** para que cualquier vendedor
diseñe su propio *repricer* sin programar. Arrastrás bloques (competencia, márgenes,
impuestos, promos, envíos, cuotas, devoluciones, reglas…), los conectás en el lienzo y
ves en vivo qué precio y qué margen te da. Inspirado en **Zentor, TheFoxie y MargenFull**,
pero mucho más personalizable y ludificado.

## Características (Fase 1)

- 🧩 **Editor tipo n8n** con cuadrícula, pan, zoom, arrastre y conexiones.
- 🎯 **6 estrategias listas:** Crecimiento, Rentabilidad máxima, Ganar BuyBox,
  Liquidación, Equilibrado (IA) y Blindaje Fiscal.
- 🧮 **~25 bloques** que cubren todas las variables de una estrategia, con foco especial
  en **impuestos y sus cambios**.
- 📊 **Simulador de precio en vivo** con productos de muestra: margen neto, ganancia y
  "salud" de la estrategia.
- 🏆 **Gamificación:** nivel, XP y salud de la estrategia.
- 🛠️ **Bloques propios:** creá tus reglas y reutilizalas.
- 🎨 **Diseño idéntico a Real Trends.**

## Cómo correrlo

No necesita instalación ni servidor. Abrí **`index.html`** en el navegador.

## Estructura

Ver **[`CLAUDE.md`](CLAUDE.md)** para la arquitectura completa, y:
- [`docs/DESIGN.md`](docs/DESIGN.md) — sistema de diseño (colores/tipografía de Real Trends).
- [`docs/BLOCKS.md`](docs/BLOCKS.md) — spec de bloques y cómo agregar uno.
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — próximas fases (chatbot Groq, backend, ML API).

## Estado

Fase 1 completa (editor + bloques + estrategias + simulador). El **chatbot con Groq** y la
integración con la API de Mercado Libre son las próximas fases.
