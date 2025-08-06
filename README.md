# Validador NORTIC A2

Sistema de validación de sitios web gubernamentales basado en la norma NORTIC A2 de la OGTIC de República Dominicana.

## Características

- ✅ **Análisis completo de NORTIC A2**: Implementa pruebas para los capítulos 2-7 de la norma
- ✅ **Tecnologías modernas**: Playwright para automatización web y Axe-core para accesibilidad
- ✅ **Interfaz intuitiva**: Frontend React con resultados detallados y progreso en tiempo real
- ✅ **Base de datos**: Almacenamiento persistente de análisis y resultados
- ✅ **API REST**: Endpoints completos para integración

## Categorías de Pruebas

### 1. Usabilidad (Capítulo 2)
- Tiempo de carga de páginas
- Compatibilidad con navegadores
- Tecnologías web modernas
- Formularios y validación
- Funcionalidad de búsqueda

### 2. Diseño y Layout (Capítulo 3)
- Estructura del header
- Menú de navegación
- Área de contenido principal
- Estructura del footer
- Identidad gubernamental
- Diseño responsivo

### 3. Contenido (Capítulo 4)
- Información institucional
- Sección de transparencia
- Información de servicios
- Datos de contacto
- Sección de noticias
- Información legal

### 4. Seguridad (Capítulo 5)
- Certificado HTTPS
- Validación de dominio (.gob.do)
- Headers de seguridad
- Content Security Policy
- Seguridad de cookies
- Seguridad de formularios

### 5. SEO (Capítulo 6)
- Meta tags
- Estructura semántica
- Estructura de URLs
- Sitemap
- Open Graph tags
- Datos estructurados

### 6. Accesibilidad (Capítulo 7)
- Cumplimiento WCAG 2.1 AA
- Navegación por teclado
- Contraste de colores
- Texto alternativo
- Estructura de encabezados
- Compatibilidad con lectores de pantalla

## Instalación y Configuración

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

El servidor backend estará disponible en `http://localhost:3000`

### Frontend

```bash
cd frontend
npm install
npm run build
npm run dev
```

El frontend estará disponible en `http://localhost:5173`

## Uso de la API

### Iniciar un análisis
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

### Verificar estado del análisis
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

### Historial de análisis
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
│   │   ├── layout.ts            # Pruebas de diseño
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
│   └── dist/                    # Build de producción
└── dist/                        # Build del backend
```

## Cambios Necesarios en tu Código Actual

### Backend (index.ts)

Tu archivo actual será reemplazado completamente. Los cambios principales:

1. **Nuevos endpoints**: Se agregaron endpoints específicos para NORTIC A2
2. **Base de datos**: Implementación de SQLite para persistencia
3. **Análisis asíncrono**: Los análisis ahora se ejecutan en background
4. **Compatibilidad**: Se mantienen endpoints legacy para compatibilidad

### Frontend (App.tsx)

Tu archivo actual será actualizado con:

1. **Nueva interfaz**: Diseño mejorado con Tailwind CSS
2. **Progreso en tiempo real**: Seguimiento del análisis en progreso
3. **Resultados detallados**: Vista completa de todas las pruebas
4. **Historial mejorado**: Mejor visualización de análisis previos

## Puntuación y Niveles de Cumplimiento

- **90-100 puntos**: Excelente ✅
- **80-89 puntos**: Cumple ✅
- **60-79 puntos**: Parcial ⚠️
- **0-59 puntos**: No Cumple ❌

## Desarrollo y Contribución

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

1. Crear nueva función de prueba en el archivo correspondiente
2. Agregar la prueba al método `runAllTests()`
3. Actualizar la documentación

## Dependencias Principales

### Backend
- **Express**: Servidor web
- **Playwright**: Automatización del navegador
- **@axe-core/playwright**: Pruebas de accesibilidad
- **SQLite3**: Base de datos
- **TypeScript**: Tipado estático

### Frontend
- **React**: Framework de UI
- **Vite**: Build tool
- **Tailwind CSS**: Estilos (vía CDN)
- **TypeScript**: Tipado estático

## Licencia

MIT

## Soporte

Para reportar problemas o solicitar características, crear un issue en el repositorio del proyecto.

---

**Nota**: Este validador implementa las especificaciones de la norma NORTIC A2 de la OGTIC de República Dominicana. Para información oficial sobre la norma, consultar el sitio web de la OGTIC.

