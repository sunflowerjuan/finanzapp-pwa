# FinanZapp PWA

Aplicación web progresiva para registrar gastos, definir presupuestos y visualizar reportes financieros desde una interfaz ligera y responsive.

## Características

- Registro y edición de gastos
- Presupuesto mensual y por categoría
- Reportes con gráficos
- Modo offline con Service Worker
- Interfaz responsive para escritorio y celular

## Estructura

```text
.
├── index.html
├── manifest.json
├── sw.js
└── src
    ├── css
    ├── img
    ├── js
    └── pages
```

## Ejecutar localmente

Como es una PWA, conviene levantarla con un servidor local para que el `service worker` y el `manifest` funcionen correctamente.

Ejemplo con VS Code Live Server o cualquier servidor estático:

```bash
npx serve .
```

Luego abre la URL local en el navegador.

## Tecnologías

- HTML
- CSS
- JavaScript
- Service Worker
- Web App Manifest
- D3.js

## Notas

- Los datos se almacenan en `localStorage`.
- Los iconos PWA están dentro de `src/img/icons` y `src/img/icons-ios`.
