# Bloques de R8T

Cada bloque es una regla de la estrategia. Se definen en `js/blocks.js` dentro del objeto
`BLOCKS`. La paleta, el inspector y la simulación se generan automáticamente a partir de
esta definición: **agregar un bloque = agregar una entrada acá**.

## Anatomía de un bloque

> v2: el editor es un **árbol apilable** (no un grafo). Los bloques se renderizan como
> tarjetas con controles en línea; ya no hay `inputs`/`outputs`/`summary`.

```js
mi_bloque: {
  cat: 'margen',              // categoría (ver CATS): define color e ícono de sección
  name: 'Nombre visible',
  icon: 'margen',            // clave de icons.js
  desc: 'Qué hace, en una frase clara para el vendedor.',
  params: [
    { key:'target', label:'Margen', type:'number', unit:'%',
      value:25, min:0, max:90, step:1, slider:true, hint:'texto de ayuda' },
    // type: 'number' | 'select' | 'toggle'
    // select: options:[['valor','Etiqueta'], ...]
  ],
  narrate: (p) => `fijo el precio para dejar ${p.target}% de margen`, // frase para la barra de explicación
  apply: (ctx, p) => { /* muta ctx: precio, costos, impuestos, notas… */ },
}

// Bloque CONTENEDOR (condición) que anida bloques adentro:
mi_condicion: {
  cat: 'logica', name: 'Cuando…', icon: 'logica', container: true,
  params: [ /* variable, operador, valor… */ ],
  condText: (p) => `el stock es menor a ${p.valor}`,   // usado por la barra de explicación
  branch: (ctx, p) => (/* condición */) ? 'si' : 'no', // decide qué rama ejecutar
}
```

### El contexto `ctx` (contrato de la simulación)

Se crea en `simulate.js → seedCtx(product)`. Campos que un `apply` puede leer/mutar:

| Campo | Qué es |
|---|---|
| `cost` | costo del producto ($) |
| `price` | **precio de venta que estamos calculando** (lo que ajustan los bloques) |
| `basePrice` | precio original |
| `competitor` | precio del competidor / ganador del BuyBox |
| `stock`, `visits` | stock y visitas (para reglas de demanda) |
| `commissionPct` | comisión ML (% sobre precio) |
| `fixedFee` | costo fijo por venta ($) |
| `ivaPct`, `iibbPct`, `taxExtraPct`, `retencionPct` | impuestos |
| `installmentPct` | costo financiero de cuotas (%) |
| `returnReservePct` | reserva por devoluciones (%) |
| `shipping`, `packaging` | costos fijos ($) |
| `floor`, `ceiling` | piso y techo de precio |
| `targetMarginPct`, `minMarginPct` | referencias de margen |
| `notes[]` | mensajes para el simulador: `note(ctx,'ok'|'warn'|'bad'|'info', 'texto')` |

Helpers disponibles (en `blocks.js`): `variablePct(ctx)`, `fixedCost(ctx)`,
`marginAt(ctx, price)`, `priceForMargin(ctx, margen%)`, `clamp`, `money`, `note`.

## Catálogo de bloques (variables cubiertas)

> El "inicio" ya no es un bloque: la cabecera del flujo es el **destino** (producto o
> grupo) y desde ahí se apilan los bloques. La simulación siembra el `ctx` desde el
> producto elegido (`simulate.js → seedCtx`).

**Competencia** · `ganar_buybox` (ganar por $X sin perforar piso) · `seguir_competidor`
(sigue UNA publicación por su link; acción posicionar / solo si me gana / solo avisar).

**Márgenes** · `margen_objetivo` (precio por margen deseado) · `piso_rentabilidad` (margen
mínimo, red de seguridad) · `techo_precio` (límite superior).

**Costos** · `comision_ml` (comisión por categoría + costo fijo) · `costos_operativos`
(packaging + gasto operativo).

**Impuestos** (foco del proyecto) · `impuestos_generales` (IVA, IIBB, otros; trasladar al
precio) · `cambio_impuesto` (simula/programa suba o baja de un impuesto y **reajusta el
precio para no perder margen**) · `retenciones` (retenciones AFIP/ARCA + percepciones IIBB).

**Promociones** · `promo_ml` (descuento con piso de margen) · `campana` (Hot Sale / oferta
del día, con tope de stock).

**Descuentos** · `descuento_volumen` (baja por mucho stock) · `liquidacion` (remate hasta
punto de equilibrio).

**Envíos** · `envio` (quién paga: vendedor/comprador/mixto; trasladar al precio).

**Cuotas** · `cuotas` (3/6/9/12 sin interés, costo financiero, absorber o trasladar).

**Devoluciones** · `devoluciones` (tasa de devolución + costo de gestión → reserva de margen).

**Lógica y reglas** · `condicion` (SI/NO con 2 salidas) · `regla_stock` (sube si poco
stock, baja si sobra) · `regla_horario` (pico/valle) · `redondeo` (psicológico / a $100 /
a $1.000 / entero).

**Acciones** · `fijar_precio` (salida final, frecuencia de ajuste) · `alerta` (notificación).

## Bloques propios (custom)

El usuario los crea desde el botón "Crear bloque propio" (`app.js → openCustomModal`).
Se guardan en `window.CUSTOM_BLOCKS` + `localStorage` y se reconstruyen con
`buildCustomDef(spec)`. Efectos disponibles en `app.js → EFFECTS`
(bajar %, subir %, fijar margen, piso, sumar costo). Ampliar EFFECTS para más reglas.

## Cómo agregar un bloque nuevo (checklist)

1. Elegí `cat` (o creá una nueva en `CATS` + su color en `theme.css` y `icons.js`).
2. Agregá la entrada en `BLOCKS` con `params`, `summary` y `apply`.
3. Verificá que el ícono exista en `icons.js` (si no, agregalo).
4. (Opcional) usalo en una estrategia de `strategies.js`.
5. Abrí `index.html` — aparece solo en la paleta y el inspector.
