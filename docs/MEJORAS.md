# R8T — Todo lo que hay para mejorar

> Backlog vivo. Ordenado por prioridad. Marcá con `[x]` lo que se vaya haciendo.
> Contexto y arquitectura: ver [`../CLAUDE.md`](../CLAUDE.md). Fases grandes: [`ROADMAP.md`](ROADMAP.md).

---

## 0. Verificar en vivo (URGENTE — nunca se pudo renderizar)

La v2 se escribió **sin poder probarla en un navegador** (en la máquina no había forma de
renderizar). Antes que nada, abrir `index.html` y verificar:

- [ ] Carga sin errores en consola (F12 → Console).
- [ ] Se ve la estrategia "Equilibrado" por defecto, con el condicional y sus bloques anidados.
- [ ] **Arrastrar** un bloque de la paleta al flujo (soltar en una pila) funciona.
- [ ] **Reordenar** arrastrando un bloque; el marcador de inserción aparece bien.
- [ ] Soltar un bloque **dentro** de una rama SÍ / SI NO.
- [ ] Editar números en línea (steppers, tipear, sliders) recalcula el panel Resultado.
- [ ] Cambiar producto/grupo y ver que la proyección cambia.
- [ ] Menú de cada bloque (⋯): subir/bajar/duplicar/eliminar.
- [ ] Zoom (botones + Ctrl/⌘+rueda) y pan (arrastrar el fondo).
- [ ] Guardado (recargar la página mantiene la estrategia) y Exportar JSON.
- [ ] Chatbot y panel Estrategias se ven bien.

## 1. Bugs probables / riesgos a revisar

- [ ] **Drag & drop anidado**: el hit-testing usa `elementFromPoint` + `getBoundingClientRect`
  con `zoom` aplicado. Revisar que a 50% y 150% el marcador caiga en el índice correcto.
- [ ] **Arrastre desde inputs**: se cancela el drag si empezás sobre un control
  (`editor.js → onDragStart`). Confirmar que no bloquea seleccionar texto en los inputs.
- [ ] **`CSS zoom`**: no es estándar (va en Chromium/WebKit y Firefox nuevo). Si algún día
  se apunta a más navegadores, migrar a `transform: scale` + recalcular scroll.
- [ ] **Foco al tipear**: al escribir en un número NO se re-renderiza (a propósito). Verificar
  que cambiar un `select`/`toggle` (que sí re-renderiza) no sea molesto.
- [ ] **`confirm()`** ya no se usa (se sacó); revisar que borrar conexiones/bloques no dependa de él.
- [ ] Revisar `r8t-app.html` vs `index.html`: hay que mantenerlos sincronizados (o consolidar
  en un solo archivo generando el del Artifact con un script).

## 2. UX / UI

- [ ] **Onboarding**: un cartel de "primeros pasos" la primera vez (arrastrá, editá, mirá el resultado).
- [ ] **Estados vacíos** más guiados (pila raíz vacía → sugerir bloques típicos).
- [ ] **Undo / Redo** (hoy no hay). Es muy pedido en editores.
- [ ] **Validación visual**: marcar en rojo bloques que rompen la estrategia (ej. sin
  "Publicar precio" al final, o margen negativo).
- [ ] **Colapsar/expandir** contenedores condicionales grandes.
- [ ] **Atajos de teclado** (Del para borrar el seleccionado, Ctrl+D duplicar).
- [ ] Mejorar la **barra de explicación**: resaltar el bloque al pasar el mouse por su frase.
- [ ] Accesibilidad: foco visible en controles, navegación por teclado, `aria-*`.
- [ ] Responsive real (hoy está pensado para desktop ancho).

## 3. Bloques y lógica

- [ ] Más tipos de **condición** (Y/O combinadas, rangos, comparar dos variables).
- [ ] Bloque **"Programar por fecha"** (campañas con vigencia real, no solo simulada).
- [ ] Bloque de **competencia real** (elegir a qué competidor/seguir el BuyBox).
- [ ] Permitir **anidar condiciones dentro de condiciones** con buen layout (ya es posible en
  el modelo; falta pulir el diseño cuando hay mucha profundidad).
- [ ] **Bloques propios** más potentes: hoy son 5 efectos (bajar/subir %, margen, piso, costo).
  Sumar: condiciones propias, fórmulas, combinaciones.
- [ ] Plantillas de estrategia por **rubro** (electro, indumentaria, etc.).

## 4. Realismo de los cálculos (hoy son aproximaciones didácticas)

- [ ] **Modelo de demanda** de la proyección (`simulate.js`): la elasticidad (`2.2`) y la
  conversión base (`3%`) están fijas. Calibrar con datos reales por categoría.
- [ ] **IVA**: hoy se computa simplificado. Modelar débito/crédito fiscal real (AR).
- [ ] **Comisiones ML por categoría** reales (hoy es un % editable genérico).
- [ ] **Costo fijo por venta** de ML depende del precio del ítem: modelar los tramos reales.
- [ ] Cuotas: el costo financiero real depende del plan vigente de ML/Mercado Pago.
- [ ] Estacionalidad y tendencia en la proyección (hoy es lineal).

## 5. Fase 2 — Asistente con Groq (próximo gran paso)

- [ ] Backend/proxy para la **API key de Groq** (NO exponerla en el front).
- [ ] Tool-calling que mapee a acciones sobre el árbol: `addBlock`, `setParam`,
  `loadStrategy`, `moveBlock`, `deleteBlock` (ver contrato sugerido en `ROADMAP.md`).
- [ ] Que el asistente **lea el programa actual** y lo explique / proponga cambios.
- [ ] Historial de conversación y "deshacer lo que hizo la IA".

## 6. Fase 3 — Backend y datos reales

- [ ] Auth por usuario + persistencia (hoy es `localStorage`).
- [ ] Integración con la **API de Mercado Libre**: precios, competidores, BuyBox, comisiones,
  stock, visitas reales → reemplazar `SAMPLE_PRODUCTS`/`SAMPLE_GROUPS`.
- [ ] Selección real de productos/grupos del catálogo del vendedor.
- [ ] Motor de **ejecución programada** del repricer (la "frecuencia de ajuste").
- [ ] Registro/auditoría de cambios de precio e historial.

## 7. Fase 4 — Integración en Real Trends

- [ ] Empaquetar como módulo/microfrontend dentro de la app.
- [ ] Compartir sesión, branding y navegación con Real Trends.
- [ ] (Opcional) migrar a React/Vite conservando `blocks.js`/`strategies.js`/`simulate.js`.

## 8. Deuda técnica

- [ ] Tests (hoy no hay). Al menos unit tests de `simulate.js` y del recorrido del árbol.
- [ ] Consolidar `index.html` + `r8t-app.html` (evitar duplicar el `<body>`).
- [ ] Tipado (JSDoc o migrar a TS) para el modelo de programa y el `ctx`.
- [ ] Separar constantes de negocio (comisiones, impuestos por defecto) en un archivo de config.
- [ ] Manejo de errores más robusto en el parseo de `localStorage` / import de JSON.

---

_Última actualización: 2026-09-11 (rework v2)._
