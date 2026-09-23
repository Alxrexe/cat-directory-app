# Cat Directory App

Aplicación web de prueba técnica para Nextep Innovation - Directorio interactivo de razas de gatos.

## Contexto del Proyecto

Este proyecto es una prueba técnica para el puesto de Frontend Developer en Nextep Innovation. El objetivo es desarrollar una aplicación web en TypeScript que consuma la API pública de Catfact Ninja para crear un directorio interactivo de razas de gatos.

### Objetivos del Negocio

- Permitir a los usuarios explorar un directorio de razas de gatos
- Visualizar resultados de manera fluida, manejando grandes volúmenes de datos
- Ofrecer detalles específicos de cada raza y un dato curioso aleatorio

## Características Principales

### Directorio de Razas (Home)
- Listado de razas de gatos desde [Catfact Ninja API](https://catfact.ninja/)
- Información: Nombre de la raza y país de origen
- **Infinite Scroll** con paginación automática
- **Pull to Refresh** para recargar desde página 1
- **Búsqueda local** con debounce para filtrar por nombre
- **Estado en URL** para compartir vistas y persistencia
- **Renderizado SSR/SSG** para carga inicial rápida
- **Virtualización** para manejar miles de items sin degradar rendimiento

### Vista de Detalle
- Información completa de la raza (Breed, Country, Origin, Coat, Pattern)
- Dato curioso aleatorio desde API secundaria
- Estado de loading independiente

## Stack Tecnológico

### Framework Principal

- **Next.js 16**: Framework de React con App Router
- **React 19**: Biblioteca de UI
- **TypeScript 5**: Desarrollo con seguridad de tipos

### Gestión de Estado

- **Zustand**: Gestión de estado reactiva y predecible
- **TanStack Query**: Gestión de estado de servidor

### UI y Estilos

- **Tailwind CSS 4**: Framework CSS utilitario
- **Radix UI**: Componentes UI headless accesibles
- **Framer Motion**: Animaciones fluidas
- **Lucide React**: Biblioteca de iconos

### Virtualización

- **@tanstack/react-virtual**: Virtualización eficiente de listas

### Validación

- **Zod**: Validación de esquemas en runtime

## Configuración de Desarrollo

### Requisitos Previos

- Node.js 18+
- Gestor de paquetes npm o yarn

### Instalación

```bash
npm install
```

### Servidor de Desarrollo

```bash
npm run dev
# o con modo turbo
npm run dev:turbo
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver el resultado.

### Compilación para Producción

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

## Arquitectura

El proyecto sigue una arquitectura hexagonal adaptada a React para separación clara de responsabilidades:

- **Separación UI/Lógica**: Componentes React desacoplados de lógica de negocio
- **Capa de Servicios**: Abstracción de llamadas a API externas
- **Gestión de Estado**: Zustand para estado global, TanStack Query para estado de servidor
- **Tipado Fuerte**: Interfaces TypeScript y validación Zod

Para documentación detallada de la arquitectura, ver [ARCHITECTURE.md](./ARCHITECTURE.md).

## API Utilizada

- **Catfact Ninja**: https://catfact.ninja/
- **Endpoint de Razas**: https://catfact.ninja/breeds
- **Endpoint de Datos Curiosos**: https://catfact.ninja/fact

## Requerimientos Técnicos Cumplidos

✅ **State Management**: Zustand + TanStack Query  
✅ **Arquitectura**: Separación clara de responsabilidades  
✅ **Manejo de Errores**: Estados de carga, skeletons, toasts amigables  
✅ **Reintentos Automáticos**: Backoff exponencial para fallos de red  
✅ **Modelado de Datos**: TypeScript + Zod para validación  
✅ **Routing**: App Router de Next.js  
✅ **Accesibilidad**: Navegación por teclado, roles ARIA correctos  
✅ **Virtualización**: @tanstack/react-virtual para listas grandes  

## Auditoría Lighthouse

El proyecto ha sido auditado con Lighthouse para asegurar:

- Performance ≥ 90
- Accessibility ≥ 90  
- Best Practices ≥ 90
- SEO ≥ 90

## PLUS Implementados

- 🌙 **Dark Mode**: Soporte para tema claro/oscuro responsivo
- ✨ **Animaciones**: Transiciones fluidas entre vistas
- 💾 **Caché Local**: Persistencia en localStorage para carga instantánea
- 🧪 **Testing**: Pruebas unitarias con Vitest

## Instrucciones de Ejecución

1. Clonar el repositorio
2. Ejecutar `npm install`
3. Ejecutar `npm run dev`
4. Abrir http://localhost:3000

## Deploy

[Link de deploy en Vercel] (pendiente)

## Licencia

Proyecto de prueba técnica - Nextep Innovation
