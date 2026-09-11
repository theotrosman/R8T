# Roadmap de R8T

## ✅ Fase 1 — Editor de bloques (COMPLETA)
Editor visual funcional, bloques, estrategias, simulador, gamificación, guardado local.

## 🔜 Fase 2 — Asistente IA con Groq
El panel "Asistente IA" (`app.js → initChat`) hoy es una demo con respuestas canned.
Conectarlo a **Groq** (modelo sugerido: `llama-3.3-70b-versatile`) para que:
- recomiende y **cargue** estrategias según lo que pide el usuario;
- **edite el grafo** con lenguaje natural ("subí el margen a 30% y ganá el buybox");
- explique qué hace la estrategia actual.

**Seguridad de la API key (importante):** NO poner la key de Groq en el front. Hoy el
proyecto es estático; para Fase 2 hace falta un pequeño backend/proxy (serverless) que
reciba el mensaje + el grafo y llame a Groq. Contrato sugerido:

```
POST /api/assistant
  body: { message, graph, product }
  resp: { reply: string, actions?: [ {op:'loadStrategy', id} |
                                     {op:'setParam', nodeId, key, value} |
                                     {op:'addBlock', type} ] }
```
El front aplica `actions` sobre `RE` (ya existe `RE.updateNodeParams`, `RE.addNodeCenter`,
`RE.loadGraph`). Definir un JSON-schema de "herramientas" para el tool-calling de Groq
que mapee 1:1 con esos `op`.

## 🔜 Fase 3 — Backend y datos reales de Mercado Libre
- Auth por usuario y persistencia de estrategias (hoy es `localStorage`).
- API de Mercado Libre: comisiones por categoría, precio de buybox, competidores, stock,
  visitas reales → reemplazar `SAMPLE_PRODUCTS` y los defaults de la simulación.
- Motor de ejecución programada (la "frecuencia de ajuste" del bloque `fijar_precio`).
- Reemplazar las fórmulas didácticas de `simulate.js` por el cálculo fiscal real (AR).

## 🔜 Fase 4 — Integración en Real Trends
- Empaquetar como módulo/microfrontend dentro de la app.
- Compartir sesión/branding con Real Trends.
- (Opcional) migrar a React/Vite si el equipo lo prefiere; conservar la lógica de
  `blocks.js`, `strategies.js` y `simulate.js` (son agnósticas del framework).

## Ideas / backlog
- Deshacer/rehacer (undo/redo) en el editor.
- Minimapa del grafo.
- Plantillas por rubro (electro, indumentaria, etc.).
- A/B testing de estrategias y métricas de resultado.
- Validación visual del grafo (marcar nodos sin conectar).
- Historial de precios y simulación sobre datos históricos.
