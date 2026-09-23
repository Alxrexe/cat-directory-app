# Documentación de Arquitectura - Cat Directory App

Este proyecto implementa una arquitectura hexagonal adaptada a React para el directorio de razas de gatos, asegurando máxima mantenibilidad, testabilidad y escalabilidad.

## Visión General de la Arquitectura

La arquitectura separa la lógica del negocio de directorio de gatos de preocupaciones externas, definiendo límites claros entre capas a través de interfaces bien definidas para el consumo de la API de Catfact Ninja.

## Contexto del Proyecto

Aplicación web de prueba técnica para Nextep Innovation que:

- Consume la API pública de Catfact Ninja
- Muestra un directorio interactivo de razas de gatos
- Implementa infinite scroll, búsqueda local y virtualización
- Ofrece detalles de razas y datos curiosos aleatorios

## Estructura de Directorios

```
src/
├── domain/                    # Capa de Dominio (Lógica de Negocio de Gatos)
│   ├── entities/             # Entidades: Breed, CatFact
│   ├── value-objects/        # Objetos de valor: BreedId, Country
│   ├── repositories/         # Interfaces: IBreedRepository, IFactRepository
│   └── services/             # Servicios: BreedSearchService, FactService
│
├── application/              # Capa de Aplicación (Casos de Uso)
│   ├── use-cases/            # GetBreedsUseCase, GetBreedDetailUseCase
│   ├── ports/                # Puertos: IHttpClient, IStorageService
│   └── dto/                  # DTOs: BreedDTO, CatFactDTO
│
├── infrastructure/           # Capa de Infraestructura
│   ├── persistence/          # Cache en localStorage, IndexedDB
│   ├── external-services/    # CatfactNinjaAPIAdapter
│   └── config/               # Configuración de API, endpoints
│
├── presentation/             # Capa de Presentación (UI de Gatos)
│   ├── components/           # BreedList, BreedCard, BreedDetail
│   ├── hooks/                # useBreeds, useInfiniteScroll, useSearch
│   └── pages/                # Home (directorio), Detail (vista detalle)
│
└── adapters/                  # Capa de Adaptadores
    ├── controllers/          # Controladores de Next.js
    ├── presenters/           # Transformadores de datos API→UI
    └── gateways/             # Gateways a Catfact Ninja API
```

## Principios Fundamentales

### 1. Independencia de la Infraestructura

La lógica de negocio de razas de gatos permanece completamente independiente de la API de Catfact Ninja y frameworks externos.

### 2. Inversión de Dependencias

Los módulos de negocio (dominio) no dependen directamente de la implementación de la API. Ambos dependen de abstracciones (interfaces).

### 3. Puertos y Adaptadores

La comunicación con la API de Catfact Ninja ocurre a través de interfaces bien definidas implementadas por adaptadores concretos.

### 4. Responsabilidad Única

Cada capa tiene una responsabilidad específica: dominio (lógica de gatos), aplicación (casos de uso), infraestructura (API), presentación (UI).

## Flujo de Datos

```
┌─────────────────┐
│ UI de Gatos     │
│ (Lista/Detalle) │
└────────┬────────┘
         │
┌────────▼────────┐
│ Adaptadores     │
│ (Next.js API)   │
└────────┬────────┘
         │
┌────────▼────────┐
│ Aplicación      │
│ (Casos de Uso)  │
└────────┬────────┘
         │
┌────────▼────────┐
│ Dominio         │
│ (Lógica Gatos)  │
└─────────────────┘
         ▲
         │
┌────────┴────────┐
│ Infraestructura │
│ (Catfact API)   │
└─────────────────┘
```

## Responsabilidades de las Capas

### Capa de Dominio (Lógica de Gatos)

- Entidades: `Breed`, `CatFact` con reglas de negocio
- Objetos de valor: `BreedId`, `CountryCode`
- Interfaces de repositorios para acceso a datos de gatos
- Servicios de dominio: búsqueda, filtrado de razas
- Sin dependencias de Catfact Ninja API

### Capa de Aplicación (Casos de Uso)

- Casos de uso: `GetBreedsUseCase`, `GetBreedDetailUseCase`
- Coordinación de objetos de dominio de gatos
- Gestión de paginación y virtualización
- Puertos para comunicación externa
- DTOs para transferencia entre capas

### Capa de Infraestructura (API Catfact)

- Implementación de repositorios para Catfact Ninja
- Manejo de llamadas a endpoints de razas y datos curiosos
- Gestión de caché en localStorage/IndexedDB
- Implementación de reintentos con backoff exponencial
- Configuración de endpoints y autenticación

### Capa de Presentación (UI del Directorio)

- Componentes: `BreedList`, `BreedCard`, `BreedDetail`
- Hooks: `useBreeds`, `useInfiniteScroll`, `useSearch`
- Páginas: Home (directorio), Detail (vista detalle)
- Manejo de estados de carga y error
- Implementación de virtualización de listas

### Capa de Adaptadores

- Controladores Next.js para rutas de gatos
- Presentadores para transformar datos API→UI
- Gateways para comunicación con Catfact Ninja
- Manejo de estados de URL para búsqueda y paginación

## Características Específicas del Proyecto

### Gestión de Estado

- **Zustand**: Estado global de UI (búsqueda, tema, loading)
- **TanStack Query**: Estado de servidor para datos de Catfact API
- **URL State**: Persistencia de búsqueda y paginación en query params

### Virtualización

- **@tanstack/react-virtual**: Renderizado eficiente de listas grandes
- Manejo de miles de razas sin degradar rendimiento
- Scroll fluido con skeleton loading

### Manejo de Errores

- Estados de carga con skeletons y spinners
- Reintentos automáticos con backoff exponencial
- Toasts amigables para errores de red
- Pantallas de error con opción de reintentar

### Accesibilidad

- Navegación por teclado en lista y buscador
- Roles ARIA correctos en estados de carga/error
- Focus management en virtualización
- Soporte para screen readers

## Beneficios de la Arquitectura

- **Testabilidad**: Lógica de gatos testeable independientemente de la API
- **Mantenibilidad**: Cambios en Catfact API no afectan lógica de negocio
- **Flexibilidad**: Fácil cambiar de proveedor de API o implementar caché
- **Escalabilidad**: Capas pueden escalarse independientemente
- **Reusabilidad**: Lógica de dominio reutilizable en diferentes interfaces

## Guías de Implementación

1. Las entidades de gatos no deben depender de la API de Catfact Ninja
2. Usar interfaces para repositorios de datos de razas
3. Implementar reintentos con backoff en capa de infraestructura
4. Mantener componentes React desacoplados de lógica de negocio
5. Usar Zod para validación de datos de la API
6. Implementar virtualización para listas grandes
7. Mantener estado de búsqueda en URL para compartibilidad
