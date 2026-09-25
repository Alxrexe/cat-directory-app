# Michiverso

Directorio de razas de gato sobre la API pública de [catfact.ninja](https://catfact.ninja/), presentado como el menú de una consola: una pantalla de inicio, un campo infinito de orbes con forma de gato y un dispositivo de bolsillo, el Ronrón, con la ficha de cada raza. Prueba técnica de Frontend para Nextep Innovation.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript estricto · TanStack Query + Zustand · Zod · Three.js + GSAP · Tailwind CSS 4 · Vitest.

![El campo de orbes](docs/screenshots/campo.png)

## Cómo ejecutarlo

Requisitos: Node.js 20.9 o superior y npm.

```bash
npm install
npm run dev          # desarrollo en http://localhost:3000
```

Build de producción (con el que se midió Lighthouse):

```bash
npm run build
npm start            # http://localhost:3000
```

| Script | Qué hace |
| --- | --- |
| `npm test` | Pruebas unitarias (Vitest) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint, incluidas las reglas que protegen las fronteras de la arquitectura |
| `npm run check` | Las tres anteriores |
| `npm run lighthouse` | Audita Home y Detalle (móvil y escritorio) contra el build en marcha. Ver [Auditoría Lighthouse](#auditoría-lighthouse) |
| `npm run analyze` | Build con `@next/bundle-analyzer` |

No hace falta ninguna variable de entorno. Opcionales: `NEXT_PUBLIC_SITE_URL` (URL canónica para metadatos y sitemap) y `NEXT_PUBLIC_CATFACT_BASE_URL` (por defecto `https://catfact.ninja`).

## Cómo se usa

1. **Inicio.** Una pantalla blanca con un solo botón, "Empezar simulación". Al pulsarlo se enlaza el Michiverso: un túnel de luz en WebGL mientras se cargan de verdad el motor, el cielo y las razas. Los pasos se ven en pantalla. Una cookie recuerda que ya entraste y la próxima visita va directo al campo.
2. **El campo.** Cada raza es un orbe blanco con orejas de gato y su monograma. Las filas se deslizan en diagonal sin fin. Al pasar el puntero, los orbes cercanos se agrandan como bajo una lupa y el resto sigue su curso. La rueda o el arrastre aceleran el viaje, y viajar despierta la página siguiente de la API.
3. **La consola de abajo.** Buscador, filtros de pelaje, contador y la lista completa, virtualizada y con scroll infinito.
4. **El Ronrón.** Pulsar un orbe (o una fila) abre la ficha como un dispositivo que nace del orbe: foto, datos, historia, familia y un dato curioso. Tiene controles reales (cruceta, A, B, L, R) y atajos de teclado.

| Inicio | Lupa sobre el campo |
| --- | --- |
| ![Pantalla de inicio](docs/screenshots/inicio.png) | ![Lupa](docs/screenshots/lupa.png) |

![El Ronrón](docs/screenshots/ronron.png)

## Requisitos de la prueba

**Listado de razas (`/`)**

| Requisito | Cómo se cumple |
| --- | --- |
| Raza y país de cada entrada | Cada orbe lleva el monograma y el nombre; al señalarlo, una etiqueta muestra nombre y país. La lista de la consola los muestra en texto. |
| Infinite scroll obligatorio | En la lista, la página siguiente se pide a 5 filas del final. En el campo, viajar ~2400 px (rueda o arrastre) despierta la página siguiente. |
| Pull-to-refresh o recarga | Botón redondo de recarga en la consola y gesto de tirar para recargar en táctil. Lo cargado no se pierde hasta que llega la página nueva. |
| Búsqueda local con debounce | 300 ms, sin acentos ni mayúsculas, sobre lo cargado. Los orbes que no coinciden se desvanecen en el campo. Con la búsqueda activa, el scroll infinito se pausa y se ofrece "Despertar 25 más". |
| Estado en la URL | `?q=`, `?pelaje=` y `?page=` (la página que ocupa la parte alta de la lista). Se comparte y sobrevive a F5. |
| Primera página en el servidor | La home se renderiza en el servidor con la primera página (o las que pida `?page=`) ya resuelta. El cliente hidrata React Query con esos datos, sin segunda petición. |
| Virtualización obligatoria | La lista usa `@tanstack/react-virtual`: con 98 razas o con 10 000 hay unas 11 filas en el DOM. El campo dibuja todos los orbes visibles en una sola llamada instanciada de WebGL. |

**Detalle (`/razas/[slug]`)**

| Requisito | Cómo se cumple |
| --- | --- |
| Breed, Country, Origin, Coat, Pattern | Pestaña "Ficha" del Ronrón. Los vacíos de la API se muestran como "Sin registrar". |
| Dato curioso aleatorio de `/fact` | Pantalla propia del Ronrón con su ciclo de carga independiente de la ficha. El botón A pide otro. |
| Carga independiente | La ficha llega generada en el build; el dato curioso tiene su propio skeleton, error y reintento. |

Además: foto y resumen de cada raza desde Wikipedia (ver [Datos de Wikipedia](#datos-de-wikipedia)), razas emparentadas, reparto de pelajes, raza anterior y siguiente, "Al azar" y compartir.

**Técnicos**

| Requisito | Cómo se cumple |
| --- | --- |
| Gestión de estado | React Query para estado de servidor y Zustand para estado de UI. Ver [Gestión de estado](#gestión-de-estado-react-query--zustand). |
| Arquitectura limpia | Hexagonal, con las fronteras comprobadas por ESLint. Ver [Arquitectura](#arquitectura). |
| Skeletons | Lista, dato curioso y pestaña Familia tienen skeleton. El campo tiene su pantalla de enlace con los pasos reales. |
| Toasts ante fallos de red | Avisos con sileo: sin conexión, conexión restablecida, página que falla (con "Reintentar"), dato que falla. |
| Reintentos con backoff | Exponencial con jitter y límite, en el adaptador HTTP. Ver [Manejo de fallos](#manejo-de-fallos). |
| Tipado fuerte y Zod | TypeScript estricto. Toda respuesta de catfact.ninja y de Wikipedia se valida con Zod (`zod/mini`) antes de entrar al dominio. |
| Accesibilidad | Ver [Accesibilidad](#accesibilidad). |
| Lighthouse ≥ 90 en Home y Detalle | Ver [Auditoría Lighthouse](#auditoría-lighthouse). |

**Plus:** transiciones entre la lista y el detalle (el Ronrón nace del orbe o la fila pulsada y vuelve a él al cerrarse), copia local en localStorage de la primera página y service worker para abrir sin red, y 44 pruebas unitarias.

## Arquitectura

Hexagonal (puertos y adaptadores), con las dependencias apuntando siempre hacia dentro:

```
src/
├── domain/          Núcleo. TypeScript puro: Breed, slug, búsqueda, país, pelaje,
│                    perfil (foto + resumen), dato curioso.
├── application/     Casos de uso + puertos (interfaces) + contrato de errores.
├── infrastructure/  Adaptadores secundarios: HTTP a catfact.ninja y a Wikipedia,
│                    localStorage, y las raíces de composición (servidor y navegador).
└── presentation/    Adaptador primario: React (componentes, hooks, stores) y el
                     motor del campo en Three.js.
app/                 Rutas de Next: solo componen piezas de presentation/.
```

- El **dominio** no importa nada: ni React, ni Zod, ni casos de uso.
- La **aplicación** define lo que necesita (`BreedRepository`, `FactRepository`, `BreedProfileRepository`, `BreedSnapshotStore`, `Clock`) y los casos de uso trabajan contra esas interfaces.
- La **infraestructura** las implementa. Todo fallo sale como un `DataSourceError` tipado (`offline`, `timeout`, `server`, `rate-limited`, `invalid-response`…).
- Las fronteras no dependen de la disciplina: `eslint.config.mjs` rompe el lint si una capa importa de otra que no le toca.

Ejemplo del porqué: la API no tiene endpoint por raza. Encontrar una por su slug es lógica de aplicación (`getBreedDossier` recorre las páginas), no del adaptador HTTP. En las pruebas ese caso de uso corre contra un repositorio en memoria. Y cuando hizo falta añadir fotos, bastó un puerto nuevo (`BreedProfileRepository`) y su adaptador de Wikipedia: ningún componente sabe de dónde salen.

Más detalle, con el flujo de datos y cada decisión, en [ARCHITECTURE.md](ARCHITECTURE.md).

### Gestión de estado: React Query + Zustand

Son dos tipos de estado distintos, así que cada uno tiene su herramienta:

- **Estado de servidor → TanStack Query.** Las páginas del directorio son una `useInfiniteQuery` hidratada con lo que resolvió el servidor, y el dato curioso es una `useQuery` aparte. Query aporta caché, deduplicación, estados de carga y error por consulta y, sobre todo, **pausa las peticiones sin red y las reanuda solas al volver** (`networkMode: "online"`). La paleta ⌘K reutiliza la misma consulta que la lista.
- **Estado de UI → Zustand.** La fase de la simulación (inicio, enlace, en marcha), el estado de conexión ("reintentando 2 de 3"), el Ronrón abierto, las razas descubiertas (persistidas), las preferencias (sonido) y la navegación. Son stores pequeños, sin provider, y legibles desde fuera de React: el cliente HTTP avisa de cada reintento sin conocer la UI, y el motor de Three.js recibe el estado sin re-renderizar.
- **La URL** es la fuente de verdad de `q`, `pelaje` y `page`. Se escribe con `history.replaceState`, que el App Router sincroniza con `useSearchParams` sin volver a pedir la página al servidor en cada tecla.

Redux Toolkit habría resuelto lo mismo con más ceremonia. Aquí no hay flujos de escritura complejos que justifiquen reducers y acciones.

### Estrategia de renderizado

| Ruta | Estrategia | Por qué |
| --- | --- | --- |
| `/` | SSR dinámico con caché de datos (`fetch` con `revalidate: 3600`) | Lee `?page=`, `?q=` y la cookie de la simulación para devolver la vista correcta desde el primer byte. Cada página de la API sale de la caché de datos de Next, así que el render no espera a la API. |
| `/razas/[slug]` | SSG de las 98 razas en el build + ISR cada hora + `dynamicParams` | La ficha es estática y se sirve al instante. Una raza nueva se genera en su primera visita. Si la API cae durante el build, el build no falla: las fichas se generan bajo demanda. |
| `@modal/(.)razas/[slug]` | Ruta interceptada | Al navegar desde el campo, el Ronrón se abre como modal encima de los orbes, pero la URL es la de la ficha: se comparte, "atrás" lo cierra y F5 abre la página completa. |
| Dato curioso, páginas 2+ | Cliente | El dato tiene que ser aleatorio en cada visita (en el HTML quedaría congelado) y el infinite scroll es client-side por requisito. |

### Datos de Wikipedia

La API de razas no tiene fotos. El adaptador `infrastructure/wikipedia` las toma de la API de MediaWiki en el build: busca el artículo de cada raza ("Bengal cat", "Bengal (cat)", "Bengal"), acepta solo artículos que se describen como gato o raza, y trae la foto principal y un resumen en español cuando existe (si no, en inglés, y lo dice). Todo por lotes y en serie: unas diez peticiones para las 98 razas, cacheadas un día. Si Wikipedia no responde, la ficha sale igual, con el monograma en lugar de la foto.

## Manejo de fallos

La regla: **nunca perder lo que el usuario ya tiene en pantalla y decir siempre qué pasa**.

| Situación | Qué ocurre |
| --- | --- |
| Fallo intermitente (red, timeout, 5xx, 429) | El cliente HTTP reintenta con **backoff exponencial y jitter**: hasta 3 reintentos (en el navegador, esperas de hasta 0,6 s, 1,2 s y 2,4 s). Respeta `Retry-After` en los 429. La barra de sistema muestra el intento en curso. Los 4xx y las respuestas con forma inválida no se reintentan. |
| Se agotan los reintentos | Bloque de error al final de la lista con "Reintentar" y un aviso con la misma acción. Lo ya cargado sigue ahí. |
| El navegador pierde la conexión | Aviso persistente y el icono de red de la barra en rojo; al volver la red, el aviso se transforma en "Conexión restablecida". La página siguiente queda **en pausa**, no en error, y se reanuda sola. |
| La API cae durante el SSR | La página se entrega igual. El cliente reintenta desde el navegador y, mientras tanto, muestra la **copia local** de la primera página si existe. |
| Abrir la app sin red | El service worker sirve la última copia del HTML (que ya trae la primera página) y los assets. |
| Una fila de la API viene rota | Se descarta esa fila (validación Zod por fila); el resto de la página se muestra. |
| El navegador no tiene WebGL | La simulación pasa a "modo consola": la lista y el Ronrón funcionan igual, sin el campo. |
| Una librería diferida no se puede descargar | El componente se queda en su versión básica (texto plano, botón sin tooltip, sin animación) y reintenta al volver la red. Nunca rompe el render. |

| Sin conexión | API caída tras los reintentos |
| --- | --- |
| ![Sin conexión](docs/screenshots/sin-conexion.png) | ![API caída](docs/screenshots/api-caida.png) |

## Accesibilidad

- **El campo es decorativo para el lector de pantalla** (`aria-hidden`): todo lo que hace tiene su equivalente accesible en la consola (lista, buscador, filtros) y en la paleta ⌘K.
- **Lista virtualizada:** `aria-setsize` y `aria-posinset`, para que el lector anuncie "13 de 98" aunque solo existan 11 filas en el DOM. Región `status` con el número de resultados.
- **Teclado:** `/` enfoca el buscador y `↓` pasa a la lista (un solo tabulador entra; dentro, flechas, Inicio, Fin, RePág y AvPág). `Esc` limpia o pliega. ⌘K abre la paleta. En el Ronrón: `←` `→` cambian de raza, `↑` `↓` de pestaña, A pide otro dato y B o `Esc` cierran. El diálogo atrapa el foco y lo devuelve al cerrar.
- Cada botón de icono tiene nombre accesible. Contraste AA medido sobre la porcelana y las pantallas pizarra. Enlace para saltar al contenido. Con `prefers-reduced-motion` no hay video, el campo no se desliza y las animaciones se reducen a fundidos.

## Auditoría Lighthouse

Build de producción, Lighthouse 13 (CLI), cada auditoría corrida 3 veces con el servidor caliente. Se reporta la mediana.

| Página | Performance | Accessibility | Best Practices | SEO |
| --- | --- | --- | --- | --- |
| Home · móvil | **90** | **100** | **100** | **100** |
| Detalle · móvil | **90** | **100** | **100** | **100** |
| Home · escritorio | **100** | **100** | **100** | **100** |
| Detalle · escritorio | **100** | **100** | **100** | **100** |

| Home · móvil | Detalle · móvil |
| --- | --- |
| ![Lighthouse Home móvil](docs/screenshots/lighthouse-home-mobile.png) | ![Lighthouse Detalle móvil](docs/screenshots/lighthouse-detalle-mobile.png) |

Los reportes completos están en [`docs/lighthouse/`](docs/lighthouse/): JSON y HTML de cada página y formato, más `summary.json` con las tres corridas.

Todas las métricas llegan a 90. La de menos margen es **Performance en móvil**: Lighthouse simula un móvil de gama media con la CPU 4 veces más lenta, y el campo de orbes es una experiencia WebGL. Lo que la sostiene:

- **Nada de lo que no se ve en el primer pintado viaja con la página.** El motor del campo (Three.js, ~170 KB) se pide al acercar el puntero al botón de inicio y termina de cargar durante el túnel, que es literalmente la pantalla de carga. GSAP llega con la primera interacción. El cliente HTTP, Zod y los adaptadores se descargan la primera vez que hace falta una página nueva o un dato. Los avisos (sileo y motion), la paleta, los tooltips, el gráfico y el carrusel, al usarlos.
- **Hidratación por tandas.** Cada pieza grande está en su propio `<Suspense>` (nada suspende), así React cede el hilo entre una y otra.
- **Fuentes:** dos familias web (Rubik y Nunito). Los rótulos técnicos usan la mono del sistema.
- **CSS del primer pintado: 14 KB.**

Nota para reproducir: las cifras de móvil varían entre corridas según la carga del equipo (en la misma build, de 83 a 91 con otras aplicaciones abiertas). El script calienta cada ruta y toma la mediana de tres; para comparar, cerrar otras aplicaciones pesadas. En escritorio es 100 de forma estable.

## Capturas

| | |
| --- | --- |
| ![Enlace](docs/screenshots/enlace.png) | ![Búsqueda](docs/screenshots/busqueda.png) |
| El enlace: pasos reales de carga | Búsqueda: la lista filtra y el campo resalta las coincidencias |
| ![Historia](docs/screenshots/ronron-historia.png) | ![Familia](docs/screenshots/ronron-familia.png) |
| Historia, desde Wikipedia | Familia: emparentadas y reparto de pelajes |
| ![Paleta](docs/screenshots/paleta.png) | |
| Paleta ⌘K | |

<p>
  <img src="docs/screenshots/movil-campo.png" width="260" alt="El campo en móvil">
  <img src="docs/screenshots/movil-ronron.png" width="260" alt="El Ronrón en móvil">
</p>

## Pruebas

`npm test` corre 44 pruebas unitarias:

- **Dominio:** slug (incluidas ligaduras como "æ"), búsqueda sin acentos, parseo del país, familias de pelaje y razas emparentadas.
- **Casos de uso:** contra repositorios en memoria. Restaurar `?page=N` con techo, localizar una raza y sus vecinas entre páginas, caducidad de la copia local, y el filtro de datos curiosos aptos para toda la familia.
- **Infraestructura:** backoff exponencial con temporizadores falsos, `Retry-After`, límite de intentos, qué se reintenta y qué no. El repositorio de catfact con `fetch` simulado (mapeo, filas rotas, 503 intermitente, 429, respuesta inválida) y el de Wikipedia (candidatos de título, artículos que no son de gatos, resumen en español o inglés, peticiones por lotes).
- **Presentación:** debounce, estado de la URL, store de conexión, localStorage y el monograma de los orbes.

## Decisiones y límites conocidos

- **La API no expone ids** ni un endpoint por raza. El slug se deriva del nombre y el detalle se resuelve recorriendo las páginas en el servidor (cacheadas).
- **La búsqueda es local**, como pide el enunciado: filtra lo cargado y lo dice.
- **Los textos de la API están en inglés** y se muestran tal cual. La interfaz está en español. De los 306 datos curiosos, 7 son crudos para una app familiar (pieles, gatos que se comen…); si sale uno, se pide otro.
- **Tema claro siempre.** El Michiverso vive sobre el cielo de día; no hay modo oscuro por decisión de diseño.
- **Sin despliegue público.** La app se evalúa con el build de producción local (`npm run build && npm start`).
