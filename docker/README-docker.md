# Despliegue en Docker: NORTIC A2 Validator

Esta configuración crea dos contenedores:
- backend (Node.js/Express + Socket.IO) en el puerto interno 3000
- frontend (Vite build servido por Nginx) publicado en http://localhost:8080, con proxy hacia el backend en `/api` y `/socket.io`.

La base de datos SQLite se monta como archivo en el host para persistencia: `../nortic_validator.sqlite` (archivo ya presente en la raíz del repo).

## Requisitos
- Docker y Docker Compose

## Estructura de Docker
- docker/docker-compose.yml
- docker/Dockerfile.backend
- docker/Dockerfile.frontend

## Variables importantes
- Backend puerto interno: 3000 (expuesto como 3000:3000 para diagnóstico)
- Frontend publicado en: 8080:80
- DB (SQLite) en contenedor: /data/nortic_validator.sqlite (mapeado al archivo del host `../nortic_validator.sqlite`)

## Construir e iniciar
Desde el folder `docker/`:

```bash
docker compose build
docker compose up -d
```

Frontend: http://localhost:8080  
Swagger API (a través de proxy del frontend): http://localhost:8080/api-docs  
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

## Reconstruir con cambios de código
Tras modificar código fuente:
```bash
docker compose build --no-cache
docker compose up -d
```

## Notas de implementación

1) Backend (TypeScript)
- El Dockerfile compila TypeScript a `dist/` y ejecuta `node dist/index.js`.
- La variable PORT se fija a 3000 (configurada en compose).
- DATABASE_PATH se fija a `/data/nortic_validator.sqlite`. Asegúrate que el `dbManager` use `process.env.DATABASE_PATH` si aplica (actualmente se provee la variable para futuros cambios).

2) Frontend (Vite + Nginx)
- Se construye con `npm run build`.
- Nginx sirve el build y hace proxy:
  - `/api/...` → `http://backend:3000/api/...`
  - `/socket.io/...` → `http://backend:3000/socket.io/...` (WebSocket)
- Se activó SPA fallback a `index.html`.

3) CORS/WebSocket
- El frontend ahora usa rutas relativas y `io('/', { path: '/socket.io' })`, evitando hardcode a localhost. Esto elimina problemas de CORS tras el proxy.

## Limpieza de artefactos
Para borrar contenedores e imágenes del proyecto:
```bash
docker compose down --rmi local --volumes
```
Esto también eliminará el volumen anónimo; la DB se conserva porque está mapeada a un archivo del host.
