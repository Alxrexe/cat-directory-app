# Arquitectura

Amplía la sección del [README](README.md): capas, flujo de datos, fallos, estado y rendimiento.

## Capas

```
app/              rutas de Next: páginas, metadata, sitemap
presentation/     adaptador primario: React, stores de Zustand y el motor Three.js
application/      casos de uso y puertos (BreedRepository, FactRepository,
                  BreedProfileRepository, BreedSnapshotStore, Clock)
domain/           TypeScript puro: Breed, slug, búsqueda, país, pelaje, CatFact
infrastructure/   adaptadores: cliente HTTP con backoff, catfact.ninja, Wikipedia,
                  localStorage y las raíces de composición
```

Las dependencias apuntan hacia el dominio y `eslint.config.mjs` lo hace cumplir con `no-restricted-imports`: `domain/` no importa casos de uso, adaptadores, UI ni frameworks; `application/` no importa adaptadores ni UI; `infrastructure/` no importa UI.

`container/server.ts` y `container/client.ts` son los únicos sitios que eligen qué adaptador implementa cada puerto. El navegador usa `client-lazy.ts`, que expone los mismos casos de uso y descarga la raíz real (cliente HTTP, Zod, adaptadores) la primera vez que se usa uno. La UI los recibe por contexto (`UseCasesProvider`), así que los tests inyectan dobles sin tocar módulos. Los casos de uso son funciones fábrica, sin clases.

## Casos de uso

| Caso de uso | Dónde | Qué hace |
| --- | --- | --- |
| `listBreedsPage(n)` | navegador | Una página del directorio. |
| `restoreBreedPages(n)` | servidor | Páginas 1..n para `?page=n`: la 1 primero (dice cuántas hay), el resto en paralelo con un máximo de 3, n limitado a 40. |
| `getBreedDossier(slug)` | servidor | Recorre el catálogo cacheado: raza, posición, vecinas, emparentadas, reparto de pelaje y perfil de Wikipedia. |
| `getRandomFact()` | navegador | Dato de hasta 220 caracteres; si no es apto para toda la familia pide otro, hasta 4 veces. |
| `firstPageSnapshot` | navegador | Guarda la página 1 en localStorage y descarta copias de más de 7 días. |

## Flujo de datos

```
GET /?page=3&q=bri
  → parseDirectoryParams (lo inválido cae al valor por defecto)
  → restoreBreedPages(3) → fetch con revalidate 3600 (caché de datos de Next)
      → Zod valida la página y cada fila por separado → Breed[]
  → <HomeExperience initialPages> → useInfiniteQuery hidratada, sin segunda petición

Lista de la consola (useVirtualizer)
  → la última fila visible está a 5 del final → fetchNextPage
      → HttpClient: timeout de 8 s y backoff; cada reintento avisa a la barra
      → al fallar del todo: DataSourceError → bloque de error y aviso "Reintentar"
  → la página de la fila de arriba → history.replaceState(?page=N)

Detalle
  build: generateStaticParams → catálogo + perfiles → 98 HTML estáticos (ISR 1 h)
  desde el campo: @modal/(.)razas/[slug] → modal sobre la Home
  desde un enlace o F5: /razas/[slug] → página completa
  en ambos: el dato curioso es una useQuery aparte, con su propio estado de carga
```

## Fallos

Los puertos rechazan siempre con `DataSourceError`; la UI decide por su `kind`:

| kind | Origen | Reintenta |
| --- | --- | --- |
| `offline` | `navigator.onLine === false` | sí |
| `timeout` | `AbortSignal.timeout`, 408 | sí |
| `network` | `fetch` rechazado o chunk que no descarga | sí |
| `rate-limited` | 429 (respeta `Retry-After`) | sí |
| `server` | 5xx | sí |
| `client` | otros 4xx | no |
| `invalid-response` | JSON o esquema inválido | no |
| `aborted` | cancelación propia | no |

- El backoff vive en el adaptador (`infrastructure/http/retry.ts`) y React Query tiene `retry: false`: reintentar en los dos sitios serían 16 peticiones por fallo contra un límite de 100 por minuto. Usa "equal jitter" para que los clientes no reintenten a la vez.
- Sin red, React Query pausa en vez de fallar (`networkMode: "online"`), y lo que llegó a fallar se relanza al reconectar.
- `useIdleModule` sustituye a `React.lazy`: si un chunk no descarga, el componente se queda en su versión básica en lugar de romper el render.
- Sin WebGL, la Home sigue funcionando con la lista y la ficha.
- Wikimedia responde 429 a las ráfagas: el optimizador de imágenes guarda cada foto un mes y, si una no llega, se muestra el monograma de la raza.

## Estado

| Estado | Dónde |
| --- | --- |
| Páginas del directorio | React Query, compartidas por la lista, el campo y la paleta ⌘K |
| Dato curioso | React Query con `gcTime: 0`: cada visita trae uno nuevo |
| `q`, `pelaje`, `page` | URL, con `replaceState` para no pedir un render de servidor por tecla |
| Fase de la simulación | Zustand (`simulation-store`), en memoria: recargar vuelve a la pantalla de inicio |
| Ficha abierta, conexión, razas descubiertas, vuelta al directorio | stores de Zustand pequeños; las descubiertas se persisten |
| Tema | clase `.dark` en `<html>` y un store con `useSyncExternalStore`; cada visita empieza en claro |

## Rendimiento

- Fuera del primer pintado: el motor 3D (Three.js y GSAP), el cliente HTTP con Zod, sileo, la paleta, los tooltips, la pestaña Familia, el gesto de recarga y el sonido. Cada uno se descarga al usarse o en ocioso.
- El motor se crea dormido cuando el puntero se mueve sobre la pantalla de inicio: compila los shaders con `compileAsync` y sube el atlas antes del clic.
- Las animaciones de la interfaz usan Web Animations sobre `transform`, `opacity` y `filter` (`lib/motion.ts`), que siguen corriendo en el compositor mientras React monta una ruta. GSAP queda solo dentro del motor, para los uniforms del shader.
- El campo es un draw call instanciado y baja a 30 fps con la ficha delante. El bucle se para con la pestaña oculta.
- En la ficha, el video del cielo (85 KB con su póster) y el dato curioso esperan al evento `load`: antes competían con la foto por el LCP.
- Fuentes: Hubot Sans sin eje de anchura (48 KB) y Doto (6 KB). Lenis solo se crea si la página se desplaza, porque su bucle fuerza layouts en cada frame.
- Los `<Suspense>` sin nada que esperar reparten la hidratación en tareas cortas.

## Sistema visual

Plástico perla mate, teclas de gel, pantallas LCD y un solo acento azul. La paleta sale del logo: perla `oklch(99.4% 0.003 255)`, aro lavanda `oklch(84.6% 0.028 270)` y pizarra `oklch(43.8% 0.05 275)`, con el azul `oklch(56% 0.19 262)` para foco, selección y progreso. El tema oscuro redefine los mismos tokens en `.dark`; ningún componente conoce el tema.

Contraste medido (WCAG 2.x) desde los valores de `app/globals.css`:

| Par | Claro | Oscuro |
| --- | --- | --- |
| Texto principal | 15.4:1 | 14.6:1 |
| Texto secundario | 6.2:1 | 8.2:1 |
| Foco y selección (no texto) | 4.7:1 | 8.2:1 |
| Borde de control (no texto) | 3.6:1 | 4.3:1 |
| Texto en pantallas | 14.8:1 | 17.6:1 |
| Texto sobre gel, zona más clara | 4.6:1 | 9.7:1 |
| Letra de B e iconos redondos | 7.1:1 | 10.8:1 |

## Librerías

| Librería | Uso |
| --- | --- |
| `three`, `gsap` | Campo de orbes: shader, túnel de enlace, lupa y fundidos de paleta |
| `@tanstack/react-query`, `zustand` | Estado de servidor y estado de UI |
| `@tanstack/react-virtual` | Lista de la consola |
| `zod` (`zod/mini`), `react-hook-form` | Contratos de las APIs y del buscador |
| `@radix-ui/*`, `cmdk`, `vaul` | Diálogos, pestañas, filtros, tooltips y la paleta ⌘K |
| `sileo` | Avisos, detrás de `presentation/lib/notify.ts` |
| `split-type` | El dato curioso entra palabra a palabra |
| `motion`, `@use-gesture/react` | Tirar para recargar |
| `lenis` | Desplazamiento suave con rueda |
| `embla-carousel-react`, `recharts` | Emparentadas y reparto de pelajes |
| `cuelume` | Sonidos sintetizados con Web Audio |
| `lucide-react` | Iconos |

## Pruebas

44 pruebas con Vitest, cada una en su capa: el dominio sin dobles; los casos de uso con repositorios en memoria y reloj falso; la infraestructura con `fetch` simulado (503 intermitente, 429, esquema inválido, filas rotas), una Wikipedia simulada y temporizadores falsos para el backoff; y en presentación el debounce, los stores y el adaptador de localStorage. Los recorridos completos (lista, scroll infinito, búsqueda en la URL, teclado, sin conexión, API caída) se verificaron con Playwright contra el build de producción.
