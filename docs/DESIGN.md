# Diseño — clon de Real Trends

El objetivo es que R8T se vea como **una funcionalidad más dentro de Real Trends**.
Los tokens salieron del sitio real (`real-trends.com`, extraídos del CSS/SVG del logo).
Viven en `styles/theme.css`. **No inventar colores nuevos**: usar estas variables.

## Paleta

| Token CSS | Hex | Uso |
|---|---|---|
| `--rt-blue` | `#0065F3` | Acción primaria, links, estado activo |
| `--rt-blue-hover` | `#0353c9` | Hover del azul |
| `--rt-blue-050` / `--rt-blue-100` | `#EDF3FC` / `#E0EAF8` | Fondos suaves azulados |
| `--rt-teal` | `#71D8BF` | Marca (logo, chatbot), acentos |
| `--rt-navy` | `#171E43` | Chrome oscuro (headers de simulador, toasts) |
| `--rt-ink` | `#292828` | Títulos |
| `--rt-gray` | `#585757` | Texto |
| `--rt-lime` | `#CBF44F` | Highlights energéticos (chips "propio") |
| `--rt-bg` | `#f4f6fb` | Fondo de la app |
| `--rt-surface` | `#ffffff` | Cards / paneles |

**Color semántico** (separado del acento): `--ok #16a34a`, `--warn #f59e0b`,
`--danger #ef4444`. Se usa para salud, notas y márgenes.

**Acentos por categoría de bloque** (`--cat-*`): dan el look "ludificado" y colorido sin
romper la identidad. Impuestos usa rojo a propósito (es el foco del usuario).

## Tipografía

- Marca original: **Proxima Nova** (de pago).
- Fallback libre usado: **Mulish** (Google Fonts, pesos 400–900). Stack:
  `"Mulish","Proxima Nova","Montserrat",system-ui,sans-serif`.
- Títulos: weight 800, `letter-spacing:-.01em`. Labels en mayúscula con `letter-spacing`.

## Componentes

- **Botones**: píldora (`--r-pill: 36px`). `.btn--primary` azul con sombra azul,
  `.btn--teal`, `.btn--ghost`, `.btn--soft`.
- **Cards / nodos**: radius 13–14px, borde `--rt-line`, sombra suave. El nodo tiene una
  barra superior de 4px con el color de su categoría.
- **Rail lateral**: réplica de la nav de Real Trends (ícono `rt` teal arriba, íconos
  gris, activo en azul con barra lateral).

## Tema

Real Trends es **light-only**: R8T también. Es una decisión deliberada (no es un bug la
ausencia de modo oscuro). Todos los fondos y colores están seteados explícitamente, así
que la página se sostiene sobre cualquier fondo del host.

## Cuadrícula del canvas

Fondo de tres capas (puntos + líneas suaves) que se mueve con el pan y escala con el zoom
(`editor.js → applyTransform` ajusta `background-position` y `background-size`). Ver
`.canvas` en `editor.css`.
