# Arquitectura

Este documento amplía la sección de arquitectura del [README](README.md): capas, flujo de datos, cómo se modelan los fallos y dónde vive cada decisión.

## 1. Capas y regla de dependencias

```
            ┌──────────────────────────────────────────────┐
            │  app/  (rutas Next: páginas, metadata, SEO)  │
            └──────────────────────┬───────────────────────┘
                                   │ compone
┌──────────────────────────────────▼───────────────────────────────────┐
│ presentation/   ADAPTADOR PRIMARIO (React)                           │
│   features/ · components/ · hooks/ · stores/ (Zustand) · providers/  │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │ llama a casos de uso (por contexto)
┌──────────────────────────────────▼───────────────────────────────────┐
│ application/    CASOS DE USO + PUERTOS                               │
│   use-cases/ · ports/ (BreedRepository, FactRepository,              │
│   BreedSnapshotStore, Clock) · errors.ts (DataSourceError)           │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │ usa
┌──────────────────────────────────▼───────────────────────────────────┐
│ domain/         NÚCLEO (TypeScript puro)                             │
│   Breed · BreedSlug · BreedPage · búsqueda · país · pelaje · CatFact │
└──────────────────────────────────────────────────────────────────────┘
                                   ▲ implementa los puertos
┌──────────────────────────────────┴───────────────────────────────────┐
│ infrastructure/ ADAPTADORES SECUNDARIOS                              │
│   http/ (cliente + backoff) · catfact/ (esquemas Zod, mappers,       │
│   repositorios) · storage/ (localStorage) · container/ (raíces)      │
└──────────────────────────────────────────────────────────────────────┘
```

- Las dependencias solo apuntan hacia el dominio. `eslint.config.mjs` lo comprueba con `no-restricted-imports` por carpeta:
  - `domain/` no puede importar casos de uso, adaptadores, UI, React, Next ni Zod.
  - `application/` no puede importar adaptadores, UI ni frameworks.
  - `infrastructure/` no puede importar la UI.
- **Raíces de composición.** `infrastructure/container/server.ts` (con `server-only`) y `infrastructure/container/client.ts` son los únicos sitios que deciden qué adaptador implementa cada puerto. El servidor los usa como módulo. El navegador recibe su contenedor por contexto (`UseCasesProvider`), así que un test puede inyectar dobles sin tocar módulos.
- **Casos de uso como funciones fábrica** (`createListBreedsPage({ breeds })`): sin clases ni decoradores, tree-shakeables y fáciles de probar.

## 2. Dominio

| Módulo | Responsabilidad |
| --- | --- |
| `breed/breed.ts` | Entidad `Breed`. Normaliza espacios y convierte los `""` de la API en `null`. |
| `breed/slug.ts` | Identidad derivada del nombre, porque la API no tiene ids. Translitera ligaduras (`æ` → `ae`) antes de quitar diacríticos. |
| `breed/breed-page.ts` | Página del directorio, `hasNextPage` y posición absoluta de cada raza. |
| `breed/search.ts` | Filtro por nombre sin acentos ni mayúsculas. Es puro: lo usan el servidor (primer render ya filtrado) y el cliente. |
| `breed/country.ts` | Separa `"developed in the United States (founding stock from Asia)"` en país y linaje. |
| `breed/coat.ts` | Reduce las ~15 grafías del pelaje a 7 familias y calcula su distribución. |
| `breed/related.ts` | Razas emparentadas: primero el mismo país, luego la misma familia de pelaje. |

## 3. Casos de uso

| Caso de uso | Dónde corre | Qué hace |
| --- | --- | --- |
| `listBreedsPage(n)` | navegador | Una página. Valida `n` antes de llamar al repositorio. |
| `restoreBreedPages(n)` | servidor | Páginas 1..n para restaurar `?page=n`. La 1 va sola (dice cuántas hay) y el resto en paralelo con un máximo de 3 simultáneas; n se limita a 40. |
| `getBreedDossier(slug)` | servidor | Recorre el catálogo (cacheado) y devuelve la raza, su posición, las vecinas, las emparentadas y la distribución de pelaje. |
| `getRandomFact()` | navegador | Dato curioso de 220 caracteres como máximo, para que quepa en la tarjeta. |
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
  → <DirectoryView initialPages={[p1, p2, p3]} />
      → useInfiniteQuery hidratada con initialData (sin segunda petición)
      → filterByName(entries, "bri") ya en el HTML
```

**Home, scroll infinito (navegador)**

```
BreedList (useWindowVirtualizer)
  → la última fila visible está a 6 del final y la lista ya se midió
  → fetchNextPage → listBreedsPage(4) → HttpClient (timeout 8 s + backoff)
      ├─ cada reintento → onRetry → useConnectionStore → píldora "Reintentando 2/3"
      └─ fallo final → DataSourceError → bloque de error + toast "Reintentar"
  → la página visible arriba → history.replaceState(?page=4)
```

**Detalle**

```
build: generateStaticParams → loadCatalog → 98 HTML estáticos (ISR 1 h)
visita: HTML estático al instante
      + RandomFact → useQuery(getRandomFact) con su propio skeleton
      + gráfico de pelaje: recharts se descarga al entrar en pantalla
```

## 5. Modelo de fallos

Los puertos rechazan siempre con `DataSourceError`, cuyo `kind` decide qué hacer:

| kind | Origen | ¿Reintenta? | Mensaje |
| --- | --- | --- | --- |
| `offline` | `navigator.onLine === false` | sí | "Sin conexión" |
| `timeout` | `AbortSignal.timeout`, 408 | sí | "La API tarda demasiado" |
| `network` | `fetch` rechazado | sí | "No pudimos conectar" |
| `rate-limited` | 429 (lee `Retry-After`) | sí | "Demasiadas peticiones" |
| `server` | 5xx | sí | "La API está fallando" |
| `client` | otros 4xx | no | "Petición rechazada" |
| `invalid-response` | JSON inválido o esquema | no | "Respuesta inesperada" |
| `aborted` | cancelación propia | no | — |

- **El backoff vive en el adaptador** (`infrastructure/http/retry.ts`), no en React Query (`retry: false`). Así protege igual al SSR, al cliente y a cualquier caso de uso, y no se multiplica: 4 intentos de Query por 4 del cliente serían 16 peticiones por fallo, con un límite de 100 por minuto.
- **Equal jitter**: la mitad del retardo es fija y la otra mitad aleatoria. Así los clientes que fallaron a la vez no reintentan en el mismo milisegundo.
- **Sin red, las peticiones se pausan en vez de fallar.** Es el `networkMode: "online"` de React Query. `ConnectionWatcher` sincroniza además su estado si la red ya faltaba antes de hidratar. Lo que llegó a fallar se relanza al reconectar (`resumeAfterReconnect`).
- **Módulos diferidos tolerantes.** `useIdleModule` sustituye a `React.lazy` y `next/dynamic`, que convierten un chunk que no descarga en un error de render. Aquí el componente se queda en su versión básica y reintenta con el evento `online`.
- **Tres niveles de copia sin red**: la caché de datos de Next (servidor), la copia de la página 1 en localStorage (cliente) y el service worker (HTML y assets).

## 6. Estado

| Estado | Dónde | Por qué ahí |
| --- | --- | --- |
| Páginas del directorio | React Query (`["breeds","directory"]`) | Estado de servidor: caché, paginación, pausa sin red. Lo comparten la lista y la paleta ⌘K. |
| Dato curioso | React Query (`["random-fact", slug]`, `gcTime: 0`) | Ciclo de carga propio; se descarta al salir, así la próxima visita trae otro. |
| `q`, `page` | URL | Compartible y sobrevive a F5. Se escribe con `replaceState` para no provocar un render de servidor por tecla. |
| Conexión y reintento | Zustand `connection-store` | Lo alimenta el adaptador HTTP a través de la raíz de composición. |
| Preferencia de sonido | Zustand `preferences-store` + `persist` | Con `skipHydration`, para no desincronizar el HTML del servidor. |
| Vuelta al directorio y foco | Zustand `navigation-store` | "Directorio" vuelve a la misma búsqueda y página, y el foco a la fila visitada. |
| Tema | next-themes | Clase `.dark` en `<html>` sin parpadeo. |

## 7. Rendimiento

- **Virtualización sobre la ventana** con `initialRect`, para que el servidor también pinte las primeras filas. Filas con altura medida (`measureElement`), así el zoom del usuario no las recorta.
- **Presupuesto del primer pintado.** Todo lo que no se ve en el primer frame llega en ocioso o al primer uso, vía `useIdleModule` y `loadOnce`:

  | Módulo | Cuándo se descarga |
  | --- | --- |
  | Radix Tooltip y DropdownMenu (floating-ui) | ocioso |
  | sileo (toasts) | ocioso o con el primer aviso |
  | cmdk, vaul, Radix Dialog | al acercar el puntero o pulsar ⌘K |
  | recharts | cuando el gráfico entra en pantalla |
  | GSAP y SplitType (dato curioso) | cuando llega el dato |
  | GSAP (cifras del hero), Lenis, ogl | en un efecto o en ocioso; ogl solo si la figura se ve |
  | use-gesture y motion | ocioso, y solo en pantallas táctiles |
  | cuelume | solo si el usuario activa el sonido |

- `zod/mini` en lugar de Zod clásico: los esquemas viajan al navegador.
- Animaciones solo con `transform` y `opacity`. El shader del hero pausa el bucle fuera de pantalla o con la pestaña oculta, y se congela con `prefers-reduced-motion`.

## 8. Sistema visual

Estética de "ficha de archivo": papel blanco, filetes de 1 px, esquinas rectas (radio 0), etiquetas monoespaciadas en versalitas, titulares en serif y un solo acento ámbar (iris felino, OKLCH 62°) por debajo del 3 % de la superficie. Los tokens están en `app/globals.css` (`:root` y `.dark`), con el contraste medido en el propio archivo.

Tipografías: Instrument Serif (nombres de raza), Outfit (interfaz) e IBM Plex Mono (índices y cifras).

## 9. Librerías y dónde se usan

| Librería | Uso |
| --- | --- |
| `@tanstack/react-query` | Estado de servidor (directorio y dato curioso) |
| `zustand` | Conexión, preferencias y navegación |
| `@tanstack/react-virtual` | Lista virtualizada |
| `zod` (`zod/mini`) | Contratos de la API, localStorage y buscador |
| `react-hook-form` + `@hookform/resolvers` | Buscador con validación Zod |
| `@radix-ui/*` | Dialog (paleta), DropdownMenu (tema), Tooltip, Toggle (sonido), Progress (cargadas/total), Label, Slot |
| `cmdk` + `vaul` | Paleta ⌘K: diálogo en escritorio, cajón inferior en móvil |
| `sileo` | Avisos (toasts) de error, conexión y recarga, con acción "Reintentar". Un solo aviso a la vez: el nuevo transforma al anterior. Se usa a través de `presentation/lib/notify.ts`, así que cambiar de librería es cambiar ese archivo y el `<Toaster>` |
| `next-themes` | Modo oscuro con opción de seguir al sistema |
| `motion` + `@use-gesture/react` | Tirar para recargar |
| `gsap` + `@gsap/react` + `split-type` | Cifras del hero y entrada del dato curioso palabra a palabra |
| `lenis` | Desplazamiento suave con rueda (se para con modales abiertos) |
| `ogl` | Iris felino en WebGL del hero |
| `embla-carousel-react` | Razas emparentadas |
| `recharts` | Distribución de pelaje |
| `date-fns` | "Copia guardada hace 3 horas" |
| `cuelume` | Sonidos de interfaz sintetizados (opcionales) |
| `lucide-react`, `react-icons` | Iconografía y el gato de la marca |
| `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css` | Variantes de componentes y utilidades de estilo |
| `@next/bundle-analyzer` | `npm run analyze` |

## 10. Pruebas

Vitest con jsdom. Hay 35 pruebas repartidas por capa, cada una en la frontera que le corresponde:

- **Dominio:** funciones puras, sin dobles.
- **Casos de uso:** repositorios en memoria y reloj falso.
- **Infraestructura:** `fetch` simulado (503 intermitente, 429, esquema inválido, filas rotas) y temporizadores falsos para el backoff.
- **Presentación:** `renderHook` para el debounce, stores de Zustand y el adaptador de localStorage.

Los escenarios de extremo a extremo (sin conexión y reconexión, API caída, teclado, restauración de `?page=`, service worker sin red) se verificaron en Chrome con Playwright durante el desarrollo.
