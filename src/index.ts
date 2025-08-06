import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';
import { dbManager, PaginationOptions, AnalysisFilters, AnalysisSorting } from './models/database';
import { norticAnalyzer, ProgressUpdate } from './services/nortic-analyzer';
import swaggerSpec from '../swagger-spec.json';

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "DELETE"]
  }
});

const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(cors());
app.use(express.json());

// Swagger configuration
const swaggerOptions = {
  definition: swaggerSpec,
  apis: ['./src/index.ts'], // Path to the API docs
};

// Generate swagger specification
const swaggerDocument = swaggerJSDoc(swaggerOptions);

// Swagger UI setup with custom options
const swaggerUiOptions = {
  explorer: true,
  swaggerOptions: {
    docExpansion: 'list',
    filter: true,
    showRequestDuration: true,
    tryItOutEnabled: true,
    requestInterceptor: (req: any) => {
      req.headers['Content-Type'] = 'application/json';
      return req;
    }
  },
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info .title { color: #1f2937; font-size: 2.5rem; }
    .swagger-ui .info .description { font-size: 1.1rem; line-height: 1.6; }
    .swagger-ui .scheme-container { background: #f8fafc; padding: 1rem; border-radius: 0.5rem; }
    .swagger-ui .opblock.opblock-post { border-color: #10b981; }
    .swagger-ui .opblock.opblock-get { border-color: #3b82f6; }
    .swagger-ui .opblock.opblock-delete { border-color: #ef4444; }
    .swagger-ui .opblock-summary-method { min-width: 80px; }
    .swagger-ui .btn.authorize { background-color: #059669; border-color: #059669; }
    .swagger-ui .btn.execute { background-color: #1d4ed8; border-color: #1d4ed8; }
  `,
  customSiteTitle: 'NORTIC A2 Validator API Documentation',
  customfavIcon: '/favicon.ico'
};

// Serve Swagger documentation
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(swaggerDocument, swaggerUiOptions));

// Serve raw swagger JSON
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerDocument);
});

// API Documentation landing page
app.get('/docs', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>NORTIC A2 Validator - Documentación API</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 1200px;
                margin: 0 auto;
                padding: 2rem;
                background: #f8fafc;
            }
            .header {
                text-align: center;
                margin-bottom: 3rem;
                padding: 2rem;
                background: white;
                border-radius: 1rem;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            }
            .header h1 {
                color: #1f2937;
                margin-bottom: 0.5rem;
                font-size: 2.5rem;
            }
            .header p {
                color: #6b7280;
                font-size: 1.2rem;
            }
            .cards {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 2rem;
                margin-bottom: 3rem;
            }
            .card {
                background: white;
                padding: 2rem;
                border-radius: 1rem;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                transition: transform 0.2s;
            }
            .card:hover {
                transform: translateY(-2px);
            }
            .card h3 {
                color: #1f2937;
                margin-bottom: 1rem;
                font-size: 1.5rem;
            }
            .card p {
                color: #6b7280;
                margin-bottom: 1.5rem;
            }
            .btn {
                display: inline-block;
                padding: 0.75rem 1.5rem;
                background: #3b82f6;
                color: white;
                text-decoration: none;
                border-radius: 0.5rem;
                font-weight: 500;
                transition: background 0.2s;
            }
            .btn:hover {
                background: #2563eb;
            }
            .btn-green {
                background: #10b981;
            }
            .btn-green:hover {
                background: #059669;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🏛️ NORTIC A2 Validator API</h1>
            <p>Sistema de Validación de Sitios Web Gubernamentales</p>
            <p><strong>Versión 1.0.0</strong> | Basado en la norma NORTIC A2 de la OGTIC</p>
        </div>

        <div class="cards">
            <div class="card">
                <h3>📚 Documentación Interactiva</h3>
                <p>Explora todos los endpoints de la API con ejemplos en vivo, esquemas de datos detallados y la posibilidad de probar las llamadas directamente desde el navegador.</p>
                <a href="/api-docs" class="btn">Ver Documentación Swagger</a>
            </div>

            <div class="card">
                <h3>📄 Especificación OpenAPI</h3>
                <p>Descarga la especificación completa en formato JSON para integrar con herramientas de desarrollo, generar clientes automáticamente o importar en Postman.</p>
                <a href="/api-docs.json" class="btn btn-green">Descargar JSON</a>
            </div>

            <div class="card">
                <h3>🚀 Inicio Rápido</h3>
                <p>Comienza a usar la API inmediatamente con ejemplos de código y casos de uso comunes para análisis de sitios web gubernamentales.</p>
                <a href="/api-docs#/An%C3%A1lisis%20NORTIC/startNorticAnalysis" class="btn">Empezar Ahora</a>
            </div>
        </div>
    </body>
    </html>
  `);
});

// Initialize database
async function initializeApp() {
  try {
    await dbManager.initialize();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
}

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Routes

/**
 * @swagger
 * /api/nortic-analysis:
 *   post:
 *     summary: Iniciar nuevo análisis NORTIC A2
 *     description: Inicia un análisis completo de un sitio web gubernamental según la norma NORTIC A2
 *     tags: [Análisis NORTIC]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AnalysisRequest'
 *     responses:
 *       200:
 *         description: Análisis iniciado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalysisStartResponse'
 */
app.post('/api/nortic-analysis', async (req, res) => {
  try {
    const { url, testCategories, options } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    console.log(`[INFO] Starting analysis for URL: ${url}`);

    // Generate analysis ID first
    const analysisId = require('uuid').v4();
    
    // Set up progress callback BEFORE starting analysis
    const progressCallback = (update: ProgressUpdate) => {
      console.log(`[PROGRESS] Analysis ${analysisId}: ${update.progress}% - ${update.currentTest || 'N/A'} (${update.completedTests}/${update.totalTests})`);
      io.emit('analysis-progress', update);
    };
    
    // Configure callback with the real ID
    norticAnalyzer.setProgressCallback(analysisId, progressCallback);
    
    // Return response immediately
    res.json({
      analysisId,
      url,
      status: 'in_progress',
      startTime: new Date().toISOString(),
      estimatedDuration: 120
    });

    // Start analysis asynchronously (don't await here)
    norticAnalyzer.analyze(url, analysisId, {
      testCategories,
      ...options
    }).then((completedAnalysisId) => {
      console.log(`[SUCCESS] Analysis completed: ${completedAnalysisId}`);
      // Clean up callback after completion
      norticAnalyzer.removeProgressCallback(analysisId);
    }).catch((error) => {
      console.error(`[ERROR] Analysis failed for ${analysisId}:`, error);
      // Send final error update
      progressCallback({
        analysisId,
        status: 'failed',
        progress: 0,
        currentTest: null,
        completedTests: 0,
        totalTests: 36,
        error: error.message || 'Error desconocido durante el análisis'
      });
      // Clean up callback after error
      norticAnalyzer.removeProgressCallback(analysisId);
    });

  } catch (error: any) {
    console.error('Analysis startup error:', error);
    res.status(500).json({ 
      error: 'Failed to start analysis',
      details: error.message || 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/nortic-analysis/{analysisId}/status:
 *   get:
 *     summary: Obtener estado del análisis
 *     description: Obtiene el estado actual de un análisis específico
 *     tags: [Análisis NORTIC]
 *     parameters:
 *       - in: path
 *         name: analysisId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Estado obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalysisStatus'
 */
app.get('/api/nortic-analysis/:analysisId/status', async (req, res) => {
  try {
    const { analysisId } = req.params;
    const status = await norticAnalyzer.getAnalysisStatus(analysisId);

    if (!status) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    res.json(status);
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({ 
      error: 'Failed to get analysis status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/nortic-analysis/{analysisId}/results:
 *   get:
 *     summary: Obtener resultados resumidos del análisis
 *     description: Obtiene los resultados resumidos de un análisis completado
 *     tags: [Resultados]
 *     parameters:
 *       - in: path
 *         name: analysisId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Resultados obtenidos exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalysisResult'
 */
app.get('/api/nortic-analysis/:analysisId/results', async (req, res) => {
  try {
    const { analysisId } = req.params;
    const results = await norticAnalyzer.getAnalysisResult(analysisId);

    if (!results) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    res.json(results);
  } catch (error) {
    console.error('Results error:', error);
    res.status(500).json({ 
      error: 'Failed to get analysis results',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/nortic-analysis/{analysisId}/detailed:
 *   get:
 *     summary: Obtener resultados detallados del análisis
 *     description: Obtiene los resultados detallados de un análisis con información completa de cada prueba
 *     tags: [Resultados]
 *     parameters:
 *       - in: path
 *         name: analysisId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Resultados detallados obtenidos exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DetailedResults'
 */
app.get('/api/nortic-analysis/:analysisId/detailed', async (req, res) => {
  try {
    const { analysisId } = req.params;
    const detailedResults = await norticAnalyzer.getDetailedResults(analysisId);

    if (!detailedResults) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    res.json(detailedResults);
  } catch (error) {
    console.error('Detailed results error:', error);
    res.status(500).json({ 
      error: 'Failed to get detailed results',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/nortic-analysis/{analysisId}:
 *   delete:
 *     summary: Borrar análisis
 *     description: Elimina completamente un análisis y todos sus datos relacionados (test_results, accessibility_violations)
 *     tags: [Análisis NORTIC]
 *     parameters:
 *       - in: path
 *         name: analysisId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID único del análisis a eliminar
 *     responses:
 *       200:
 *         description: Análisis eliminado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Análisis eliminado exitosamente"
 *                 analysisId:
 *                   type: string
 *                   format: uuid
 *                   example: "123e4567-e89b-12d3-a456-426614174000"
 *       404:
 *         description: Análisis no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Analysis not found"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.delete('/api/nortic-analysis/:analysisId', async (req, res) => {
  try {
    const { analysisId } = req.params;
    
    console.log(`[INFO] Attempting to delete analysis: ${analysisId}`);
    
    // Check if analysis exists first
    const analysis = await dbManager.getAnalysis(analysisId);
    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }
    
    // Delete the analysis and all related data
    const deleted = await dbManager.deleteAnalysis(analysisId);
    
    if (deleted) {
      console.log(`[SUCCESS] Analysis deleted: ${analysisId}`);
      res.json({
        success: true,
        message: 'Análisis eliminado exitosamente',
        analysisId
      });
    } else {
      console.log(`[WARNING] Analysis not found for deletion: ${analysisId}`);
      res.status(404).json({ error: 'Analysis not found' });
    }
  } catch (error) {
    console.error('Delete analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to delete analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/nortic-analysis/history:
 *   get:
 *     summary: Obtener historial de análisis con ordenamiento y filtrado
 *     description: Obtiene el historial paginado de análisis realizados con opciones avanzadas de ordenamiento y filtrado
 *     tags: [Historial]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Elementos por página
 *       - in: query
 *         name: url
 *         schema:
 *           type: string
 *         description: Filtrar por URL específica
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in_progress, completed, failed]
 *         description: Filtrar por estado del análisis
 *       - in: query
 *         name: institution
 *         schema:
 *           type: string
 *         description: Filtrar por nombre de institución
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filtrar desde fecha (YYYY-MM-DD)
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filtrar hasta fecha (YYYY-MM-DD)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [created_at, overall_score, status, url, compliance_level]
 *           default: created_at
 *         description: Campo por el cual ordenar
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Dirección del ordenamiento
 *     responses:
 *       200:
 *         description: Historial obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedHistory'
 */
app.get('/api/nortic-analysis/history', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Parse filters
    const filters: AnalysisFilters = {};
    if (req.query.url) filters.url = req.query.url as string;
    if (req.query.status) filters.status = req.query.status as string;
    if (req.query.institution) filters.institution = req.query.institution as string;
    if (req.query.dateFrom) filters.dateFrom = req.query.dateFrom as string;
    if (req.query.dateTo) filters.dateTo = req.query.dateTo as string;

    // Parse sorting
    let sorting: AnalysisSorting | undefined;
    if (req.query.sortBy) {
      sorting = {
        field: req.query.sortBy as any,
        direction: (req.query.sortOrder as string)?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'
      };
    }

    const options: PaginationOptions = {
      page,
      limit,
      filters,
      sorting
    };

    const analyses = await dbManager.getAnalyses(options);
    res.json(analyses);
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ 
      error: 'Failed to get analysis history',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/nortic-analysis/institutions:
 *   get:
 *     summary: Obtener lista de instituciones
 *     description: Obtiene la lista de instituciones únicas para usar en filtros
 *     tags: [Historial]
 *     responses:
 *       200:
 *         description: Lista de instituciones obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 institutions:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Lista de nombres de instituciones
 */
app.get('/api/nortic-analysis/institutions', async (req, res) => {
  try {
    const institutions = await dbManager.getInstitutions();
    res.json({ institutions });
  } catch (error) {
    console.error('Institutions error:', error);
    res.status(500).json({ 
      error: 'Failed to get institutions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Legacy endpoints for compatibility with existing frontend
/**
 * @swagger
 * /api/analyze:
 *   post:
 *     summary: Iniciar análisis (endpoint legacy)
 *     description: Endpoint de compatibilidad con versiones anteriores
 *     tags: [Legacy]
 *     deprecated: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [url]
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *     responses:
 *       200:
 *         description: Análisis iniciado (formato legacy)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LegacyAnalyzeResponse'
 */
app.post('/api/analyze', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const analysisId = require('uuid').v4();
    const result = await norticAnalyzer.analyze(url, analysisId);
    
    // For compatibility, return the old format but with new analysis ID
    res.json({ 
      success: true, 
      id: result,
      message: 'Analysis started. Use the new NORTIC endpoints to check status and results.'
    });
  } catch (error) {
    console.error('Legacy analyze error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to start analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/proyectos:
 *   get:
 *     summary: Obtener proyectos (endpoint legacy)
 *     description: Endpoint de compatibilidad que devuelve el historial en formato legacy
 *     tags: [Legacy]
 *     deprecated: true
 *     responses:
 *       200:
 *         description: Lista de proyectos en formato legacy
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/LegacyProject'
 */
app.get('/api/proyectos', async (req, res) => {
  try {
    const result = await dbManager.getAnalysesLegacy(1, 20);
    
    // Transform to legacy format
    const proyectos = result.analyses.map(analysis => ({
      id: analysis.id,
      url: analysis.url,
      resumen: `Análisis NORTIC A2 - Puntuación: ${analysis.overall_score || 'Pendiente'} - Estado: ${analysis.status}`,
      fecha: analysis.created_at
    }));

    res.json(proyectos);
  } catch (error) {
    console.error('Legacy proyectos error:', error);
    res.status(500).json({ 
      error: 'Failed to get projects',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Verificar estado del sistema
 *     description: Endpoint de salud para verificar que el sistema esté funcionando correctamente
 *     tags: [Sistema]
 *     responses:
 *       200:
 *         description: Sistema funcionando correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    details: error.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  
  try {
    await norticAnalyzer.close();
    await dbManager.close();
    console.log('Cleanup completed');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Start server
async function startServer() {
  await initializeApp();
  
  server.listen(PORT, () => {
    console.log(`NORTIC Validator server running on http://localhost:${PORT}`);
    console.log('WebSocket server enabled for real-time progress updates');
    console.log('');
    console.log('📚 API Documentation available at:');
    console.log(`   • Interactive Docs: http://localhost:${PORT}/api-docs`);
    console.log(`   • Documentation Hub: http://localhost:${PORT}/docs`);
    console.log(`   • OpenAPI JSON: http://localhost:${PORT}/api-docs.json`);
    console.log('');
    console.log('🔗 Available endpoints:');
    console.log('  POST /api/nortic-analysis - Start new analysis');
    console.log('  GET  /api/nortic-analysis/:id/status - Get analysis status');
    console.log('  GET  /api/nortic-analysis/:id/results - Get analysis results');
    console.log('  GET  /api/nortic-analysis/:id/detailed - Get detailed results');
    console.log('  DELETE /api/nortic-analysis/:id - Delete analysis');
    console.log('  GET  /api/nortic-analysis/history - Get analysis history (with sorting & filtering)');
    console.log('  GET  /api/nortic-analysis/institutions - Get institutions list');
    console.log('  GET  /api/health - Health check');
  });
}

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
