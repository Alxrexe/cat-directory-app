# Arquitectura

Este documento amplía la sección de arquitectura del [README](README.md): capas, flujo de datos, cómo se modelan los fallos y dónde vive cada decisión.

## 1. Capas y regla de dependencias

```
            ┌──────────────────────────────────────────────┐
            │  app/  (rutas Next: páginas, metadata, SEO)  │
            └──────────────────────┬───────────────────────┘
                                   │ compone
┌──────────────────────────────────▼───────────────────────────────────┐
│ presentation/   ADAPTADOR PRIMARIO (React + motor Three.js)          │
│   simulation/ · field/ · dock/ · device/ · top-bar/ · features/ ·    │
│   components/ · hooks/ · stores/ (Zustand) · providers/              │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │ llama a casos de uso (por contexto)
┌──────────────────────────────────▼───────────────────────────────────┐
│ application/    CASOS DE USO + PUERTOS                               │
│   use-cases/ · ports/ (BreedRepository, FactRepository,              │
│   BreedProfileRepository, BreedSnapshotStore, Clock) · errors.ts     │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │ usa
┌──────────────────────────────────▼───────────────────────────────────┐
│ domain/         NÚCLEO (TypeScript puro)                             │
│   Breed · BreedSlug · BreedPage · búsqueda · país · pelaje ·         │
│   BreedProfile · CatFact                                             │
└──────────────────────────────────────────────────────────────────────┘
                                   ▲ implementa los puertos
┌──────────────────────────────────┴───────────────────────────────────┐
│ infrastructure/ ADAPTADORES SECUNDARIOS                              │
│   http/ (cliente + backoff) · catfact/ · wikipedia/ (esquemas Zod,   │
│   mappers, repositorios) · storage/ (localStorage) · container/      │
└──────────────────────────────────────────────────────────────────────┘
```

- Las dependencias solo apuntan hacia el dominio. `eslint.config.mjs` lo comprueba con `no-restricted-imports` por carpeta:
  - `domain/` no puede importar casos de uso, adaptadores, UI, React, Next ni Zod.
  - `application/` no puede importar adaptadores, UI ni frameworks.
  - `infrastructure/` no puede importar la UI.
- **Raíces de composición.** `container/server.ts` (con `server-only`) y `container/client.ts` son los únicos sitios que deciden qué adaptador implementa cada puerto. El navegador no importa `client.ts` directamente: `container/client-lazy.ts` expone los mismos casos de uso y descarga la raíz real (cliente HTTP, esquemas Zod, adaptadores) la primera vez que se usa uno. La UI lo recibe por contexto (`UseCasesProvider`), así que un test puede inyectar dobles sin tocar módulos.
- **Casos de uso como funciones fábrica** (`createListBreedsPage({ breeds })`): sin clases ni decoradores, tree-shakeables y fáciles de probar.

## 2. Dominio

| Módulo | Responsabilidad |
| --- | --- |
| `breed/breed.ts` | Entidad `Breed`. Normaliza espacios y convierte los `""` de la API en `null`. |
| `breed/slug.ts` | Identidad derivada del nombre, porque la API no tiene ids. Translitera ligaduras (`æ` → `ae`) antes de quitar diacríticos. |
| `breed/breed-page.ts` | Página del directorio, `hasNextPage` y posición absoluta de cada raza. |
| `breed/search.ts` | Filtro por nombre sin acentos ni mayúsculas. Es puro: lo usan el servidor y el cliente. |
| `breed/country.ts` | Separa `"developed in the United States (founding stock from Asia)"` en país y linaje. |
| `breed/coat.ts` | Reduce las ~15 grafías del pelaje a 7 familias y calcula su distribución. |
| `breed/related.ts` | Razas emparentadas: primero el mismo país, luego la misma familia de pelaje. |
| `breed/profile.ts` | Perfil de una raza: foto, resumen (recortado a ~420 caracteres) e idioma del resumen. |
| `fact/fact.ts` | `CatFact` y la regla `isFamilyFriendly`: 7 de los 306 datos de la API son crudos para una app familiar. |

## 3. Casos de uso

| Caso de uso | Dónde corre | Qué hace |
| --- | --- | --- |
| `listBreedsPage(n)` | navegador | Una página. Valida `n` antes de llamar al repositorio. |
| `restoreBreedPages(n)` | servidor | Páginas 1..n para restaurar `?page=n`. La 1 va sola (dice cuántas hay) y el resto en paralelo con un máximo de 3 simultáneas; n se limita a 40. |
| `getBreedDossier(slug)` | servidor | Recorre el catálogo (cacheado) y devuelve la raza, su posición, las vecinas, las emparentadas, la distribución de pelaje y el perfil de Wikipedia (si Wikipedia falla, la ficha sale sin perfil). |
| `getRandomFact()` | navegador | Dato de 220 caracteres como máximo. Si no es apto para toda la familia pide otro, hasta 4 veces. |
| `firstPageSnapshot` | navegador | `remember` guarda solo la página 1; `recall` descarta copias de más de 7 días. El `Clock` es inyectable. |

## 4. Flujo de datos

**Home, primer render (servidor)**

```
GET /?page=3&q=bri
  → parseDirectoryParams (valores inválidos caen al valor por defecto)
  → serverUseCases.restoreBreedPages(3)
      → CatfactBreedRepository.getPage(1..3)
          → fetch(..., { next: { revalidate: 3600 } })  ← caché de datos de Next
          → Zod valida la página y cada fila → mapper → Breed[]
  → <HomeExperience initialPages={[p1, p2, p3]} />
      → useInfiniteQuery hidratada con initialData (sin segunda petición)
```

**La simulación (navegador)**

```
Pantalla de inicio (HUD) ──(puntero cerca del disco)──▶ descarga el motor (Three.js + GSAP)
  └─ clic ─▶ el disco rebota y marca el % · trazos de luz sobre el velo, en el canvas,
             mientras se completan pasos reales (un arco por paso):
             motor listo · cielo (el video empieza a sonar) · razas · orbes
       └─▶ llegada: la retícula se atraviesa y el velo se abre como un iris
           (shader) sobre el cielo; los orbes salen del centro hacia fuera
           └─▶ 1,25 s después se montan la barra de sistema y la consola
```

**El campo**

```
engine.ts (Three.js, sin React)
  filas diagonales infinitas → cada orbe toma una raza de su "cinta";
  la asignación se congela mientras el orbe está en pantalla
  lupa: campana gaussiana alrededor del puntero (radio 1,7 orbes, +50 %)
  un solo draw call instanciado (hasta 640 orbes) + shader SDF de cabeza y orejas
  rueda/arrastre → ~2400 px de viaje → onExplore → loadMore (página siguiente)
  búsqueda → máscara por raza → los orbes que no coinciden se desvanecen
```

**Consola: scroll infinito de la lista**

```
DockList (useVirtualizer sobre el panel)
  → la última fila visible está a 5 del final y el panel ya se midió
  → fetchNextPage → listBreedsPage(4) → HttpClient (timeout 8 s + backoff)
      ├─ cada reintento → onRetry → useConnectionStore → "Reintentando 2/3"
      └─ fallo final → DataSourceError → bloque de error + aviso "Reintentar"
  → la página visible arriba → history.replaceState(?page=4)
```

**Detalle**

```
build: generateStaticParams → loadCatalog + perfiles de Wikipedia (en serie)
       → 98 HTML estáticos (ISR 1 h)
desde el campo: ruta interceptada @modal/(.)razas/[slug] → Ronrón como modal
                (nace del orbe pulsado; "atrás" o B lo devuelven a él)
desde un enlace o F5: /razas/[slug] → el Ronrón a pantalla completa
en ambos: dato curioso → useQuery(getRandomFact) con su propio skeleton
```

## 5. Modelo de fallos

Los puertos rechazan siempre con `DataSourceError`, cuyo `kind` decide qué hacer:

| kind | Origen | ¿Reintenta? | Mensaje |
| --- | --- | --- | --- |
| `offline` | `navigator.onLine === false` | sí | "Sin conexión" |
| `timeout` | `AbortSignal.timeout`, 408 | sí | "La API tarda demasiado" |
| `network` | `fetch` rechazado, o no se pudo descargar la raíz diferida | sí | "No pudimos conectar" |
| `rate-limited` | 429 (lee `Retry-After`) | sí | "Demasiadas peticiones" |
| `server` | 5xx | sí | "La API está fallando" |
| `client` | otros 4xx | no | "Petición rechazada" |
| `invalid-response` | JSON inválido o esquema | no | "Respuesta inesperada" |
| `aborted` | cancelación propia | no | — |

- **El backoff vive en el adaptador** (`infrastructure/http/retry.ts`), no en React Query (`retry: false`). Así protege igual al SSR, al cliente y a cualquier caso de uso, y no se multiplica: 4 intentos de Query por 4 del cliente serían 16 peticiones por fallo, con un límite de 100 por minuto.
- **Equal jitter**: la mitad del retardo es fija y la otra mitad aleatoria. Así los clientes que fallaron a la vez no reintentan en el mismo milisegundo.
- **Sin red, las peticiones se pausan en vez de fallar.** Es el `networkMode: "online"` de React Query. `ConnectionWatcher` sincroniza además su estado si la red ya faltaba antes de hidratar. Lo que llegó a fallar se relanza al reconectar.
- **Módulos diferidos tolerantes.** `useIdleModule` sustituye a `React.lazy` y `next/dynamic`, que convierten un chunk que no descarga en un error de render. Aquí el componente se queda en su versión básica y reintenta con el evento `online`. GSAP sigue la misma regla: si no llegó, lo que está en pantalla se queda quieto, nunca oculto.
- **Sin WebGL** (o si el motor falla), la simulación pasa a "modo consola": la lista y el Ronrón siguen funcionando.
- **Fotos de Wikimedia:** su servidor de imágenes responde 429 ante ráfagas. El optimizador de Next guarda cada foto un mes (`minimumCacheTTL`), así se le pide una vez; si una no llega, `FullImage` muestra el monograma de la raza en lugar de un icono roto.
- **Tres niveles de copia sin red**: la caché de datos de Next (servidor), la copia de la página 1 en localStorage (cliente) y el service worker (HTML y assets).

## 6. Estado

| Estado | Dónde | Por qué ahí |
| --- | --- | --- |
| Páginas del directorio | React Query (`["breeds","directory"]`) | Estado de servidor: caché, paginación, pausa sin red. Lo comparten la lista, el campo y la paleta ⌘K. |
| Dato curioso | React Query (`["random-fact", slug]`, `gcTime: 0`) | Ciclo de carga propio; se descarta al salir, así la próxima visita trae otro. |
| Copia local de la página 1 | React Query (`["first-page-snapshot"]`) | Solo se lee si el servidor no trajo datos; su lectura espera a la raíz diferida. |
| `q`, `pelaje`, `page` | URL | Compartible y sobrevive a F5. Se escribe con `replaceState` para no provocar un render de servidor por tecla. |
| Fase de la simulación y pasos de carga | Zustand `simulation-store` | Lo leen la pantalla de inicio, el motor y el cielo. `entered` vive en memoria: cerrar una ficha vuelve al campo sin repetir la entrada, pero recargar o volver a entrar la muestra siempre. |
| Ronrón abierto y sentido de navegación | Zustand `device-store` | La barra superior y la consola se apartan; el campo se atenúa. |
| Razas descubiertas | Zustand `discovery-store` + `persist` | Contador de la barra de sistema. `skipHydration` para no desincronizar el HTML. |
| Conexión y reintento | Zustand `connection-store` | Lo alimenta el adaptador HTTP a través de la raíz de composición. |
| Vuelta al directorio | Zustand `navigation-store` | B en la ficha completa vuelve a la misma búsqueda y página. |

## 7. Rendimiento

- **Presupuesto del primer pintado.** Todo lo que no se ve en el primer frame llega después, vía `useIdleModule` y `loadOnce`:

  | Módulo | Cuándo se descarga |
  | --- | --- |
  | Motor del campo (Three.js) | al acercar el puntero al botón de inicio, o durante el túnel |
  | GSAP | con la primera interacción, o con el motor |
  | Cliente HTTP, Zod y adaptadores (`client-lazy.ts`) | con la primera página nueva o el primer dato, o en ocioso |
  | Zod del buscador | con la primera tecla |
  | sileo (y motion) | con la primera interacción o el primer aviso |
  | cmdk, vaul, Radix Dialog | al acercar el puntero o pulsar ⌘K |
  | Radix Tooltip | ocioso |
  | Pestaña Familia (embla) y recharts | ocioso / al abrir la pestaña |
  | SplitType (dato palabra a palabra) | solo si GSAP ya está al llegar el dato |
  | use-gesture y motion (tirar para recargar) | al desplegar la lista, solo en táctil |
  | Lenis | solo con ratón |
  | cuelume (sonido, siempre activo) | con la primera pulsación o tecla |

- **Hidratación por tandas.** Las piezas grandes (inicio, barra, consola, lista, visor, pantalla, dato, controles) van cada una en su `<Suspense>`: nada suspende, pero React cede el hilo entre una y otra en vez de hidratar en una sola tarea larga.
- **Fuentes: 54 KB.** Hubot Sans (48 KB, sin el eje de anchura, que duplicaba el archivo) para todo y Doto (6 KB) para las cifras de LCD, subconjunto latino. Con el eje de anchura y una segunda familia de texto el móvil bajaba a 87.
- **Lo que no se ve espera** (`usePageSettled` en `lib/idle.ts`): el video del cielo y el dato curioso no se piden hasta que la página cargó y el navegador quedó ocioso. En una ficha abierta desde un enlace competían con la foto (85 KB de cielo antes del LCP).
- **Videos del cielo:** los originales de 80 MB (día y noche) se recodificaron a WebM VP9 (~130–145 KB) y MP4 de respaldo, con un póster de ~10 KB cada uno. El póster no se pide mientras la pantalla de inicio lo tapa, y el cielo del tema que no se usa no descarga nada.
- **Campo:** un solo draw call instanciado; la CPU coloca ~300 puntos por frame. El bucle se para con la pestaña oculta y baja a 30 fps (ritmo parejo) cuando el Ronrón está delante y el campo atenuado. Con `prefers-reduced-motion` el campo no se desliza.
- **Consola inferior sin filtro:** su sombra es una capa fija con degradado; un `drop-shadow` sobre toda la bandeja se recalculaba en cada desplazamiento de la lista.
- **DOM más corto:** el código de barras y la rejilla del altavoz son un solo elemento cada uno (degradados), no 22 y 12.
- Animaciones solo con `transform`, `opacity` y `filter` (DOM) o en shader (WebGL): retícula, destellos, ola del tema, apertura 3D del Ronrón (`rotateX` con perspectiva) y encendido de pantallas (`scaleY` + `brightness`). Ninguna transición de color, sombra o tamaño. La única excepción es interna de sileo (el morph de su píldora); su transición de color de fondo se anula en CSS.

## 8. Sistema visual: consola perla

Referentes: una consola de bolsillo de plástico mate blanco (cantos suaves, botones de gel, pantallas brillantes, una bisagra), el menú de una consola de sobremesa (el marco de selección que late) y el futurismo Y2K (azul eléctrico, destellos de cuatro puntas, lecturas LCD de matriz de puntos, retículas de HUD). De Apple, las esquinas continuas y las sombras largas y suaves. Nada de metal cepillado: superficies amables. Sin cristal esmerilado.

- **Paleta del logo**, en OKLCH (`app/globals.css`): perla `oklch(99.4% 0.003 255)`, aro lavanda `oklch(84.6% 0.028 270)`, pizarra `oklch(43.8% 0.05 275)` y un solo acento, azul eléctrico `oklch(56% 0.19 262)`, para foco, selección y progreso; un cian (`--glint`) solo para halos y destellos. Las pantallas del Ronrón son azul noche con rótulos cian.
- **Materiales (utilidades):** `pearl` (plástico perla: luz arriba, filete de 1 px, sombra larga), `pearl-button` (botón redondo abombado), `shell` (carcasa de la consola), `gel` (tecla principal con reflejo de burbuja), `well` (zona hundida), `screen-glass` (pantalla encendida con reflejo), `select-frame` (marco de selección que late; hace de anillo de foco), `hud-grid` (rejilla de plano), `hud` (rótulo en mayúsculas con aire), `lcd` (cifras de matriz de puntos) y `squircle` (esquinas continuas con `corner-shape`, donde el navegador lo soporta).
- **Tipografía:** una sola familia, **Hubot Sans** (grotesca de esquinas redondeadas, entre robot y juguete), para marca, títulos, interfaz, lectura y los monogramas de los orbes; **Doto** (matriz de puntos redondos) solo para las lecturas de LCD: hora, contadores, N.º, porcentaje de carga.
- **Pantalla de inicio (HUD):** rejilla de plano que se desvanece hacia los bordes, cuatro esquinas con lecturas (marca, hora LCD, razas y fuentes, atajo) y en el centro una retícula: anillo de 120 marcas, arcos que giran, un aro iridiscente (cónico enmascarado) y el disco de perla con el gato. Todo lo que gira es una animación CSS de `transform`. Al pulsar: rebote del disco, onda y destellos (GSAP); cuatro arcos, uno por paso real de carga; al llegar, la retícula se atraviesa (escala + opacidad) mientras el velo WebGL se abre como un iris con borde iridiscente.
- **El Ronrón:** consola de dos piezas unidas por una bisagra. Tapa: visor (la foto completa) y pantalla de datos. Base: cruceta de perla, pantalla del dato curioso, B de perla y A de gel; al pie, la marca, los atajos, un código de barras (sale del nombre de la raza) y el altavoz. Las orejas (triángulos redondeados con interior de gel y un LED) y los gatillos L/R son piezas sueltas que flotan sobre la tapa. Apertura (`device/device-motion.ts`): nace cerrado en el orbe pulsado, viaja al centro, la tapa gira sobre la bisagra con perspectiva y un pequeño rebote, las pantallas se encienden como un tubo (una raya que se abre con un destello) y orejas, gatillos y botones llegan a su sitio. Al terminar no queda ningún filtro ni perspectiva puestos.
- **Ronrón por pistas:** en la tapa, la pantalla toma la altura del visor y desplaza su contenido con el borde fundido; en la base, una rejilla con áreas con nombre (`pad · fact · btn` en escritorio, con el pie `mid`; `fact` arriba de `pad · mid · btn` en tableta y móvil). La altura del visor se calcula con `100dvh` para que el aparato quepa en 1280×800 y 1024×768.
- **Fotos completas de borde a borde** (`components/full-image.tsx`): la foto va entera (`contain`) y el hueco lo rellena la misma foto ampliada y desenfocada.
- **Orbes:** perla con un canto suave, orejitas estrechas, un pequeño salto al aparecer y un marco de selección azul que late en el orbe señalado (en el shader).
- **Consola inferior:** su borde se levanta en el centro (dos hombros SVG y una joroba) para alojar el buscador; filtros de pelaje en chips de perla que se llenan de gel.
- **Dos temas.** Claro por defecto, sobre el video del cielo de día; oscuro a elección (botón sol/luna), sobre el cielo nocturno: la misma consola en edición medianoche (perla índigo, pantallas casi negras, gel lavanda). `.dark` solo redefine valores; ningún componente conoce el tema. La clase la pone un script de una línea en el `<head>` del layout raíz (componente de servidor, `theme/theme-script.ts`) antes del primer pintado, y un store mínimo (`theme/use-color-theme.ts`, `useSyncExternalStore`) la expone a React.
- **Cambio de tema** (`theme/theme-transition.ts`): una ola del color del tema nuevo nace del botón y tapa la pantalla (un disco de 64 px escalado: solo `transform`), el tema cambia debajo, y la ola se disuelve (opacidad + escala). El campo funde su paleta en el shader (`engine.setTheme`) y el cielo cambia de video mientras la ola tapa.
- **Avisos** arriba y al centro, bajo la barra de sistema: la píldora clara de sileo de día y la oscura de noche, con los tonos de estado ajustados a AA en las dos.

**Contraste medido** (WCAG 2.x, calculado desde los OKLCH de `app/globals.css`):

| Par | Claro | Oscuro |
| --- | --- | --- |
| Texto principal | 15.4:1 | 14.6:1 |
| Pizarra (marca, iconos) | 7.8:1 | 11.4:1 |
| Texto secundario | 6.2:1 | 8.2:1 |
| Rótulos del HUD sobre el fondo de inicio | 5.8:1 | 9.4:1 |
| Foco, selección y % de carga | 4.7:1 | 8.2:1 |
| Borde de control (no texto, mín. 3:1) | 3.6:1 | 4.3:1 |
| Pantalla: texto | 14.8:1 | 17.6:1 |
| Pantalla: secundario | 7.3:1 | 9.4:1 |
| Pantalla: rótulos | 8.3:1 | 11.5:1 |
| Texto sobre gel (A, chips, botón de inicio) | 5.7:1 | 7.8:1 |
| Texto sobre gel, zona más clara del degradado | 4.6:1 | 9.7:1 |
| Pestaña activa | 14.4:1 | 8.6:1 |
| Pestañas inactivas | 9.9:1 | 10.0:1 |
| Letra de B e iconos redondos | 7.1:1 | 10.8:1 |

## 9. Librerías y dónde se usan

| Librería | Uso |
| --- | --- |
| `three` | Motor del campo de orbes: shader SDF, túnel de enlace, lupa |
| `gsap` + `@gsap/react` + `split-type` | Animación de la interfaz (inicio, barra, Ronrón, pestañas) y del dato palabra a palabra |
| `@tanstack/react-query` | Estado de servidor (directorio, dato curioso, copia local) |
| `zustand` | Simulación, Ronrón, descubiertas, conexión y navegación |
| `@tanstack/react-virtual` | Lista virtualizada de la consola |
| `zod` (`zod/mini`) | Contratos de catfact.ninja, Wikipedia, localStorage y buscador |
| `react-hook-form` + `@hookform/resolvers` | Buscador con validación Zod |
| `@radix-ui/*` | Dialog (Ronrón y paleta), Tabs (pantalla), ToggleGroup (filtros de pelaje), Tooltip, Label, Slot |
| `cmdk` + `vaul` | Paleta ⌘K: diálogo en escritorio, cajón inferior en móvil |
| `sileo` | Avisos, detrás de `presentation/lib/notify.ts`. Un solo aviso a la vez: el nuevo transforma al anterior |
| (propio) `theme/` | Tema claro por defecto y oscuro a elección: script en `<head>` + store con `useSyncExternalStore`. `next-themes` sigue instalado pero sin uso: su `<script>` dentro de un componente de cliente provocaba un aviso de React 19 al volver a montarse |
| `motion` + `@use-gesture/react` | Tirar para recargar |
| `lenis` | Desplazamiento suave con rueda (se para con modales abiertos) |
| `embla-carousel-react` | Razas emparentadas |
| `recharts` | Reparto de pelajes |
| `date-fns` | "Copia guardada hace 3 horas" |
| `cuelume` | Sonidos de interfaz sintetizados, siempre activos (por delegación en el documento) |
| `lucide-react` | Iconografía |
| `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css` | Variantes de componentes y utilidades de estilo |
| `@next/bundle-analyzer` | `npm run analyze` |

## 10. Pruebas

Vitest con jsdom. Hay 44 pruebas repartidas por capa, cada una en la frontera que le corresponde:

- **Dominio:** funciones puras, sin dobles.
- **Casos de uso:** repositorios en memoria y reloj falso.
- **Infraestructura:** `fetch` simulado (503 intermitente, 429, esquema inválido, filas rotas), una Wikipedia simulada (redirecciones, artículos que no son de gatos, lotes) y temporizadores falsos para el backoff.
- **Presentación:** `renderHook` para el debounce, stores de Zustand, el adaptador de localStorage y los monogramas.

Los recorridos de extremo a extremo (inicio → túnel → campo → lupa → Ronrón → cerrar; búsqueda y filtros; lista con scroll infinito y `?page=`; sin conexión; API caída; móvil) se verificaron en Chrome con Playwright durante el desarrollo.
