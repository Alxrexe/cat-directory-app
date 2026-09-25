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
  → cookie michiverso_sim: ¿pantalla de inicio o directo al campo?
  → serverUseCases.restoreBreedPages(3)
      → CatfactBreedRepository.getPage(1..3)
          → fetch(..., { next: { revalidate: 3600 } })  ← caché de datos de Next
          → Zod valida la página y cada fila → mapper → Breed[]
  → <HomeExperience initialPages={[p1, p2, p3]} />
      → useInfiniteQuery hidratada con initialData (sin segunda petición)
```

**La simulación (navegador)**

```
Pantalla de inicio ──(puntero cerca del botón)──▶ descarga el motor (Three.js + GSAP)
  └─ clic ─▶ túnel de luz en el canvas mientras se completan pasos reales:
             motor listo · cielo (el video empieza a sonar) · razas · orbes
       └─▶ llegada: el velo se abre sobre el cielo y el campo empieza a fluir
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
- **Tres niveles de copia sin red**: la caché de datos de Next (servidor), la copia de la página 1 en localStorage (cliente) y el service worker (HTML y assets).

## 6. Estado

| Estado | Dónde | Por qué ahí |
| --- | --- | --- |
| Páginas del directorio | React Query (`["breeds","directory"]`) | Estado de servidor: caché, paginación, pausa sin red. Lo comparten la lista, el campo y la paleta ⌘K. |
| Dato curioso | React Query (`["random-fact", slug]`, `gcTime: 0`) | Ciclo de carga propio; se descarta al salir, así la próxima visita trae otro. |
| Copia local de la página 1 | React Query (`["first-page-snapshot"]`) | Solo se lee si el servidor no trajo datos; su lectura espera a la raíz diferida. |
| `q`, `pelaje`, `page` | URL | Compartible y sobrevive a F5. Se escribe con `replaceState` para no provocar un render de servidor por tecla. |
| Fase de la simulación y pasos de carga | Zustand `simulation-store` | Lo leen la pantalla de inicio, el motor y el cielo. La cookie `michiverso_sim` recuerda que ya se entró. |
| Ronrón abierto y sentido de navegación | Zustand `device-store` | La barra superior y la consola se apartan; el campo se atenúa. |
| Razas descubiertas | Zustand `discovery-store` + `persist` | Contador de la barra de sistema. `skipHydration` para no desincronizar el HTML. |
| Conexión y reintento | Zustand `connection-store` | Lo alimenta el adaptador HTTP a través de la raíz de composición. |
| Preferencia de sonido | Zustand `preferences-store` + `persist` | Con `skipHydration`. |
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
  | cuelume | solo si el usuario activa el sonido |

- **Hidratación por tandas.** Las piezas grandes (inicio, barra, consola, lista, visor, pantalla, dato, controles) van cada una en su `<Suspense>`: nada suspende, pero React cede el hilo entre una y otra en vez de hidratar en una sola tarea larga.
- **Fuentes:** Rubik (títulos) y Nunito (interfaz), subconjunto latino. Los rótulos técnicos usan la mono del sistema: una tercera fuente web costaba ~30 KB en el camino del primer pintado.
- **Video del cielo:** el original de 80 MB se recodificó a WebM VP9 (~130 KB) y MP4 de respaldo, con un póster de 10 KB. El póster no se pide mientras la pantalla de inicio lo tapa.
- **Campo:** un solo draw call instanciado; la CPU coloca ~300 puntos por frame. El bucle se para con la pestaña oculta. Con `prefers-reduced-motion` el campo no se desliza.
- Animaciones solo con `transform` y `opacity` (DOM) o en shader (WebGL). Ninguna transición de color, sombra o tamaño.

## 8. Sistema visual: porcelana de consola

Referentes: el menú de una consola familiar de sobremesa (piezas de plástico blanco, botones redondos con aro, barra inferior curva) y el rigor de una interfaz técnica (filetes de 1 px, rótulos en mono con mucho aire, cifras tabulares). Sin cristal: la porcelana es opaca.

- **Paleta del logo**, en OKLCH (`app/globals.css`): porcelana `oklch(99.3% 0.003 272)`, aro lavanda `oklch(84.6% 0.028 270)`, pizarra `oklch(43.8% 0.05 275)` y un solo acento pervinca `oklch(56% 0.13 262)` para foco, estado activo y progreso. Las pantallas del Ronrón son pizarra profunda con texto lavanda.
- **Piezas:** `porcelain` (superficie con aro y brillo), `console-dot` (botón redondo), `hud` (rótulo técnico). La marca es la cabeza del gato dentro del aro (`brand/cat-mark.tsx`); también es el botón de inicio.
- **Consola inferior:** su borde se levanta en el centro (dos hombros SVG y una joroba) para alojar el buscador, con botones redondos en las esquinas y una tira de atajos reales.
- **Tema claro siempre**, sobre el video del cielo de día a pantalla completa.
- **Tipografías:** Rubik (títulos, nombres, monogramas de los orbes), Nunito (interfaz) y la mono del sistema (rótulos).

## 9. Librerías y dónde se usan

| Librería | Uso |
| --- | --- |
| `three` | Motor del campo de orbes: shader SDF, túnel de enlace, lupa |
| `gsap` + `@gsap/react` + `split-type` | Animación de la interfaz (inicio, barra, Ronrón, pestañas) y del dato palabra a palabra |
| `@tanstack/react-query` | Estado de servidor (directorio, dato curioso, copia local) |
| `zustand` | Simulación, Ronrón, descubiertas, conexión, preferencias y navegación |
| `@tanstack/react-virtual` | Lista virtualizada de la consola |
| `zod` (`zod/mini`) | Contratos de catfact.ninja, Wikipedia, localStorage y buscador |
| `react-hook-form` + `@hookform/resolvers` | Buscador con validación Zod |
| `@radix-ui/*` | Dialog (Ronrón y paleta), Tabs (pantalla), ToggleGroup (filtros de pelaje), Toggle (sonido), Tooltip, Label, Slot |
| `cmdk` + `vaul` | Paleta ⌘K: diálogo en escritorio, cajón inferior en móvil |
| `sileo` | Avisos, detrás de `presentation/lib/notify.ts`. Un solo aviso a la vez: el nuevo transforma al anterior |
| `next-themes` | Fija el tema claro (`forcedTheme`) aunque el sistema esté en oscuro |
| `motion` + `@use-gesture/react` | Tirar para recargar |
| `lenis` | Desplazamiento suave con rueda (se para con modales abiertos) |
| `embla-carousel-react` | Razas emparentadas |
| `recharts` | Reparto de pelajes |
| `date-fns` | "Copia guardada hace 3 horas" |
| `cuelume` | Sonidos de interfaz sintetizados (opcionales, apagados por defecto) |
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
