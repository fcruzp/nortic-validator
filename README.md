# Validador NORTIC A2

Sistema de validaciÃ³n de sitios web gubernamentales basado en la norma NORTIC A2 de la OGTIC de RepÃºblica Dominicana.

## CaracterÃ­sticas

- âœ… **AnÃ¡lisis completo de NORTIC A2**: Implementa pruebas para los capÃ­tulos 2-7 de la norma
- âœ… **TecnologÃ­as modernas**: Playwright para automatizaciÃ³n web y Axe-core para accesibilidad
- âœ… **Interfaz intuitiva**: Frontend React con resultados detallados y progreso en tiempo real
- âœ… **Base de datos**: Almacenamiento persistente de anÃ¡lisis y resultados
- âœ… **API REST**: Endpoints completos para integraciÃ³n

## CategorÃ­as de Pruebas

### 1. Usabilidad (CapÃ­tulo 2)
- Tiempo de carga de pÃ¡ginas
- Compatibilidad con navegadores
- TecnologÃ­as web modernas
- Formularios y validaciÃ³n
- Funcionalidad de bÃºsqueda

### 2. DiseÃ±o y Layout (CapÃ­tulo 3)
- Estructura del header
- MenÃº de navegaciÃ³n
- Ãrea de contenido principal
- Estructura del footer
- Identidad gubernamental
- DiseÃ±o responsivo

### 3. Contenido (CapÃ­tulo 4)
- InformaciÃ³n institucional
- SecciÃ³n de transparencia
- InformaciÃ³n de servicios
- Datos de contacto
- SecciÃ³n de noticias
- InformaciÃ³n legal

### 4. Seguridad (CapÃ­tulo 5)
- Certificado HTTPS
- ValidaciÃ³n de dominio (.gob.do)
- Headers de seguridad
- Content Security Policy
- Seguridad de cookies
- Seguridad de formularios

### 5. SEO (CapÃ­tulo 6)
- Meta tags
- Estructura semÃ¡ntica
- Estructura de URLs
- Sitemap
- Open Graph tags
- Datos estructurados

### 6. Accesibilidad (CapÃ­tulo 7)
- Cumplimiento WCAG 2.1 AA
- NavegaciÃ³n por teclado
- Contraste de colores
- Texto alternativo
- Estructura de encabezados
- Compatibilidad con lectores de pantalla

## InstalaciÃ³n y ConfiguraciÃ³n

### Prerrequisitos
- Node.js 18+
- npm o yarn

### Backend

```bash
cd nortic-validator
npm install
npm run build
npm start
```

El servidor backend estarÃ¡ disponible en `http://localhost:3000`

### Frontend

```bash
cd frontend
npm install
npm run build
npm run dev
```

El frontend estarÃ¡ disponible en `http://localhost:5173`

## Uso de la API

### Iniciar un anÃ¡lisis
```bash
POST /api/nortic-analysis
Content-Type: application/json

{
  "url": "https://ejemplo.gob.do",
  "testCategories": ["usability", "layout", "content", "security", "seo", "accessibility"],
  "options": {
    "timeout": 30000,
    "waitForNetworkIdle": true
  }
}
```

### Verificar estado del anÃ¡lisis
```bash
GET /api/nortic-analysis/{analysisId}/status
```

### Obtener resultados
```bash
GET /api/nortic-analysis/{analysisId}/results
```

### Obtener resultados detallados
```bash
GET /api/nortic-analysis/{analysisId}/detailed
```

### Historial de anÃ¡lisis
```bash
GET /api/nortic-analysis/history?page=1&limit=10
```

## Estructura del Proyecto

```
nortic-validator/
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ models/
â”‚   â”‚   â””â”€â”€ database.ts          # Modelos de base de datos
â”‚   â”œâ”€â”€ tests/
â”‚   â”‚   â”œâ”€â”€ usability.ts         # Pruebas de usabilidad
â”‚   â”‚   â”œâ”€â”€ layout.ts            # Pruebas de diseÃ±o
â”‚   â”‚   â”œâ”€â”€ content.ts           # Pruebas de contenido
â”‚   â”‚   â”œâ”€â”€ security.ts          # Pruebas de seguridad
â”‚   â”‚   â”œâ”€â”€ seo.ts               # Pruebas de SEO
â”‚   â”‚   â””â”€â”€ accessibility.ts     # Pruebas de accesibilidad
â”‚   â”œâ”€â”€ services/
â”‚   â”‚   â””â”€â”€ nortic-analyzer.ts   # Servicio principal
â”‚   â””â”€â”€ index.ts                 # Servidor Express
â”œâ”€â”€ frontend/
â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ App.tsx              # Componente principal
â”‚   â”‚   â””â”€â”€ main.tsx             # Punto de entrada
â”‚   â””â”€â”€ dist/                    # Build de producciÃ³n
â””â”€â”€ dist/                        # Build del backend
```

## Cambios Necesarios en tu CÃ³digo Actual

### Backend (index.ts)

Tu archivo actual serÃ¡ reemplazado completamente. Los cambios principales:

1. **Nuevos endpoints**: Se agregaron endpoints especÃ­ficos para NORTIC A2
2. **Base de datos**: ImplementaciÃ³n de SQLite para persistencia
3. **AnÃ¡lisis asÃ­ncrono**: Los anÃ¡lisis ahora se ejecutan en background
4. **Compatibilidad**: Se mantienen endpoints legacy para compatibilidad

### Frontend (App.tsx)

Tu archivo actual serÃ¡ actualizado con:

1. **Nueva interfaz**: DiseÃ±o mejorado con Tailwind CSS
2. **Progreso en tiempo real**: Seguimiento del anÃ¡lisis en progreso
3. **Resultados detallados**: Vista completa de todas las pruebas
4. **Historial mejorado**: Mejor visualizaciÃ³n de anÃ¡lisis previos

## PuntuaciÃ³n y Niveles de Cumplimiento

- **90-100 puntos**: Excelente âœ…
- **80-89 puntos**: Cumple âœ…
- **60-79 puntos**: Parcial âš ï¸
- **0-59 puntos**: No Cumple âŒ

## Desarrollo y ContribuciÃ³n

### Ejecutar en modo desarrollo

Backend:
```bash
npm run dev
```

Frontend:
```bash
npm run dev
```

### Agregar nuevas pruebas

1. Crear nueva funciÃ³n de prueba en el archivo correspondiente
2. Agregar la prueba al mÃ©todo `runAllTests()`
3. Actualizar la documentaciÃ³n

## Dependencias Principales

### Backend
- **Express**: Servidor web
- **Playwright**: AutomatizaciÃ³n del navegador
- **@axe-core/playwright**: Pruebas de accesibilidad
- **SQLite3**: Base de datos
- **TypeScript**: Tipado estÃ¡tico

### Frontend
- **React**: Framework de UI
- **Vite**: Build tool
- **Tailwind CSS**: Estilos (vÃ­a CDN)
- **TypeScript**: Tipado estÃ¡tico

## Licencia

MIT

## Soporte

Para reportar problemas o solicitar caracterÃ­sticas, crear un issue en el repositorio del proyecto.

---

**Nota**: Este validador implementa las especificaciones de la norma NORTIC A2 de la OGTIC de RepÃºblica Dominicana. Para informaciÃ³n oficial sobre la norma, consultar el sitio web de la OGTIC.




## Despliegue con Docker (Docker Desktop)

Esta configuración levanta dos contenedores:
- backend (Node.js/Express + Socket.IO) en el puerto interno 3000
- frontend (Vite build servido por Nginx) publicado en http://localhost:8080, con proxy hacia el backend en las rutas /api y /socket.io

La base de datos SQLite se monta como archivo en el host para persistencia: ./nortic_validator.sqlite (en la raíz del repo).

### Requisitos
- Docker Desktop instalado y funcionando
- Docker Compose (incluido en Docker Desktop)

### Estructura de Docker
- docker/docker-compose.yml
- docker/Dockerfile.backend
- docker/Dockerfile.frontend

### Puertos y variables relevantes
- Backend puerto interno: 3000 (expuesto como 3000:3000 para diagnóstico directo)
- Frontend publicado en: 8080:80
- DB (SQLite) dentro del contenedor backend: /data/nortic_validator.sqlite (mapeado al archivo del host ./nortic_validator.sqlite)

### Primer arranque (construir e iniciar)
Desde el folder docker/:

```bash
docker compose build
docker compose up -d
```

Endpoints:
- Frontend: http://localhost:8080
- Swagger API (a través del proxy del frontend): http://localhost:8080/api-docs
- Backend directo (debug): http://localhost:3000/api/health

### Ver logs
```bash
docker compose logs -f backend
docker compose logs -f frontend
```

### Detener
```bash
docker compose down
```

### Reconstruir con cambios de código
Cuando cambies el código fuente:
```bash
docker compose build --no-cache
docker compose up -d
```

### Notas de implementación

1) Backend (TypeScript)
- El Dockerfile compila TypeScript a dist/ y ejecuta node dist/index.js.
- La variable PORT se fija a 3000 (configurada en docker-compose).
- DATABASE_PATH se fija a /data/nortic_validator.sqlite. El gestor de DB debe respetar process.env.DATABASE_PATH (ya se provee para cambios presentes o futuros).

2) Frontend (Vite + Nginx)
- Se construye con npm run build durante la imagen.
- Nginx sirve el build y hace proxy:
  - /api/... → http://backend:3000/api/...
  - /socket.io/... → http://backend:3000/socket.io/... (WebSocket)
- Activado SPA fallback a index.html para rutas de FE.

3) CORS/WebSocket
- El frontend usa rutas relativas y io('/', { path: '/socket.io' }), evitando hardcodes a localhost. Esto funciona vía proxy de Nginx y elimina problemas de CORS.

### Limpieza de artefactos
Para borrar contenedores e imágenes del proyecto, y volúmenes anónimos:
```bash
docker compose down --rmi local --volumes
```
Nota: Esto elimina los contenedores, imágenes locales relacionadas y volúmenes anónimos de Compose. La base de datos se conserva porque está mapeada al archivo del host ./nortic_validator.sqlite.

# Despliegue en Docker: NORTIC A2 Validator

Esta configuraciÃ³n crea dos contenedores:
- backend (Node.js/Express + Socket.IO) en el puerto interno 3000
- frontend (Vite build servido por Nginx) publicado en http://localhost:8080, con proxy hacia el backend en `/api` y `/socket.io`.

La base de datos SQLite se monta como archivo en el host para persistencia: `../nortic_validator.sqlite` (archivo ya presente en la raÃ­z del repo).

## Requisitos
- Docker y Docker Compose

## Estructura de Docker
- docker/docker-compose.yml
- docker/Dockerfile.backend
- docker/Dockerfile.frontend

## Variables importantes
- Backend puerto interno: 3000 (expuesto como 3000:3000 para diagnÃ³stico)
- Frontend publicado en: 8080:80
- DB (SQLite) en contenedor: /data/nortic_validator.sqlite (mapeado al archivo del host `../nortic_validator.sqlite`)

## Construir e iniciar
Desde el folder `docker/`:

```bash
docker compose build
docker compose up -d
```

Frontend: http://localhost:8080  
Swagger API (a travÃ©s de proxy del frontend): http://localhost:8080/api-docs  
Backend directo (debug): http://localhost:3000/api/health

## Ver logs
```bash
docker compose logs -f backend
docker compose logs -f frontend
```

## Detener
```bash
docker compose down
```

## Reconstruir con cambios de cÃ³digo
Tras modificar cÃ³digo fuente:
```bash
docker compose build --no-cache
docker compose up -d
```

## Notas de implementaciÃ³n

1) Backend (TypeScript)
- El Dockerfile compila TypeScript a `dist/` y ejecuta `node dist/index.js`.
- La variable PORT se fija a 3000 (configurada en compose).
- DATABASE_PATH se fija a `/data/nortic_validator.sqlite`. AsegÃºrate que el `dbManager` use `process.env.DATABASE_PATH` si aplica (actualmente se provee la variable para futuros cambios).

2) Frontend (Vite + Nginx)
- Se construye con `npm run build`.
- Nginx sirve el build y hace proxy:
  - `/api/...` â†’ `http://backend:3000/api/...`
  - `/socket.io/...` â†’ `http://backend:3000/socket.io/...` (WebSocket)
- Se activÃ³ SPA fallback a `index.html`.

3) CORS/WebSocket
- El frontend ahora usa rutas relativas y `io('/', { path: '/socket.io' })`, evitando hardcode a localhost. Esto elimina problemas de CORS tras el proxy.

## Limpieza de artefactos
Para borrar contenedores e imÃ¡genes del proyecto:
```bash
docker compose down --rmi local --volumes
```
Esto tambiÃ©n eliminarÃ¡ el volumen anÃ³nimo; la DB se conserva porque estÃ¡ mapeada a un archivo del host.
