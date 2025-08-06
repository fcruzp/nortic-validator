# Validador NORTIC A2

Sistema de validacion de sitios web gubernamentales basado en la norma NORTIC A2 de la OGTIC de Republica Dominicana.

## Caracteristicas

- [x] **Analisis completo de NORTIC A2**: Implementa pruebas para los capitulos 2-7 de la norma
- [x] **Tecnologias modernas**: Playwright para automatizacion web y Axe-core para accesibilidad
- [x] **Interfaz intuitiva**: Frontend React con resultados detallados y progreso en tiempo real
- [x] **Base de datos**: Almacenamiento persistente de analisis y resultados
- [x] **API REST**: Endpoints completos para integracion

## Categorias de Pruebas

### 1. Usabilidad (Capitulo 2)
- Tiempo de carga de paginas
- Compatibilidad con navegadores
- Tecnologias web modernas
- Formularios y validacion
- Funcionalidad de busqueda

### 2. Diseno y Layout (Capitulo 3)
- Estructura del header
- Menu de navegacion
- Area de contenido principal
- Estructura del footer
- Identidad gubernamental
- Diseno responsivo

### 3. Contenido (Capitulo 4)
- Informacion institucional
- Seccion de transparencia
- Informacion de servicios
- Datos de contacto
- Seccion de noticias
- Informacion legal

### 4. Seguridad (Capitulo 5)
- Certificado HTTPS
- Validacion de dominio (.gob.do)
- Headers de seguridad
- Content Security Policy
- Seguridad de cookies
- Seguridad de formularios

### 5. SEO (Capitulo 6)
- Meta tags
- Estructura semantica
- Estructura de URLs
- Sitemap
- Open Graph tags
- Datos estructurados

### 6. Accesibilidad (Capitulo 7)
- Cumplimiento WCAG 2.1 AA
- Navegacion por teclado
- Contraste de colores
- Texto alternativo
- Estructura de encabezados
- Compatibilidad con lectores de pantalla

## Instalacion y Configuracion

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

El servidor backend estara disponible en `http://localhost:3000`

### Frontend

```bash
cd frontend
npm install
npm run build
npm run dev
```

El frontend estara disponible en `http://localhost:5173`

## Uso de la API

### Iniciar un analisis
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

### Verificar estado del analisis
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

### Historial de analisis
```bash
GET /api/nortic-analysis/history?page=1&limit=10
```

## Estructura del Proyecto

```
nortic-validator/
├── src/
│   ├── models/
│   │   └── database.ts          # Modelos de base de datos
│   ├── tests/
│   │   ├── usability.ts         # Pruebas de usabilidad
│   │   ├── layout.ts            # Pruebas de diseno
│   │   ├── content.ts           # Pruebas de contenido
│   │   ├── security.ts          # Pruebas de seguridad
│   │   ├── seo.ts               # Pruebas de SEO
│   │   └── accessibility.ts     # Pruebas de accesibilidad
│   ├── services/
│   │   └── nortic-analyzer.ts   # Servicio principal
│   └── index.ts                 # Servidor Express
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Componente principal
│   │   └── main.tsx             # Punto de entrada
│   └── dist/                    # Build de produccion
└── dist/                        # Build del backend
```

## Cambios Necesarios en tu Codigo Actual

### Backend (index.ts)

Tu archivo actual sera reemplazado completamente. Los cambios principales:

1. **Nuevos endpoints**: Se agregaron endpoints especificos para NORTIC A2
2. **Base de datos**: Implementacion de SQLite para persistencia
3. **Analisis asincrono**: Los analisis ahora se ejecutan en background
4. **Compatibilidad**: Se mantienen endpoints legacy para compatibilidad

### Frontend (App.tsx)

Tu archivo actual sera actualizado con:

1. **Nueva interfaz**: Diseno mejorado con Tailwind CSS
2. **Progreso en tiempo real**: Seguimiento del analisis en progreso
3. **Resultados detallados**: Vista completa de todas las pruebas
4. **Historial mejorado**: Mejor visualizacion de analisis previos

## Puntuacion y Niveles de Cumplimiento

- **90-100 puntos**: Excelente
- **80-89 puntos**: Cumple
- **60-79 puntos**: Parcial
- **0-59 puntos**: No Cumple

## Desarrollo y contribucion

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

1. Crear nueva funcion de prueba en el archivo correspondiente
2. Agregar la prueba al metodo `runAllTests()`
3. Actualizar la documentacion

## Dependencias Principales

### Backend
- **Express**: Servidor web
- **Playwright**: Automatizacion del navegador
- **@axe-core/playwright**: Pruebas de accesibilidad
- **SQLite3**: Base de datos
- **TypeScript**: Tipado estatico

### Frontend
- **React**: Framework de UI
- **Vite**: Build tool
- **Tailwind CSS**: Estilos (via CDN)
- **TypeScript**: Tipado estatico

## Licencia

MIT

## Soporte

Para reportar problemas o solicitar caracteristicas, crear un issue en el repositorio del proyecto.

---

**Nota**: Este validador implementa las especificaciones de la norma NORTIC A2 de la OGTIC de Republica Dominicana. Para informacion oficial sobre la norma, consultar el sitio web de la OGTIC.




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
