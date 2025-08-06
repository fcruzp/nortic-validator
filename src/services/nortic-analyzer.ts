import { chromium, Browser, Page, LaunchOptions } from 'playwright';
import { v4 as uuidv4 } from 'uuid';
import { dbManager, TestResult, AccessibilityViolation } from '../models/database';
import { UsabilityTester } from '../tests/usability';
import { LayoutTester } from '../tests/layout';
import { ContentTester } from '../tests/content';
import { SecurityTester } from '../tests/security';
import { SEOTester } from '../tests/seo';
import { AccessibilityTester } from '../tests/accessibility';

export interface AnalysisOptions {
  testCategories?: string[];
  timeout?: number;
  waitForNetworkIdle?: boolean;
}

export interface AnalysisResult {
  analysisId: string;
  url: string;
  overallScore: number;
  complianceLevel: string;
  categories: {
    [key: string]: {
      score: number;
      status: 'passed' | 'warning' | 'failed';
    };
  };
  startTime: string;
  endTime: string;
  duration: number;
}

export interface ProgressUpdate {
  analysisId: string;
  status: 'in_progress' | 'completed' | 'failed';
  progress: number;
  currentTest: string | null;
  completedTests: number;
  totalTests: number;
  error?: string;
}

export class NorticAnalyzer {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private progressCallbacks: Map<string, (update: ProgressUpdate) => void> = new Map();

  async initialize(): Promise<void> {
    // Detecta el binario de Chromium en Alpine/Docker y fuerza su uso.
    // Preferimos /usr/bin/chromium-browser, si no /usr/bin/chromium. Si no existe, dejamos que Playwright resuelva.
    const candidatePaths = ['/usr/bin/chromium-browser', '/usr/bin/chromium', '/usr/lib/chromium/chrome'];
    const fs = await import('fs');
    let executablePath: string | undefined = undefined;
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        executablePath = p;
        break;
      }
    }

    const launchOptions: LaunchOptions = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-client-side-phishing-detection',
        '--disable-popup-blocking',
        '--metrics-recording-only',
        '--mute-audio',
      ],
    };

    if (executablePath) {
      // En Alpine el paquete 'chromium' provee este binario; Playwright intentará usar headless_shell si no se especifica.
      (launchOptions as any).executablePath = executablePath;
      // Algunas builds requieren usar el modo headless "nuevo".
      launchOptions.args?.push('--headless=new');
      // Evitar GL issues
      launchOptions.args?.push('--use-gl=swiftshader');
    } else {
      // Si no encontramos binario del sistema, forzamos a Playwright a no usar headless_shell.
      process.env.PW_CHROMIUM_USE_HEADLESS_SHELL = '0';
    }

    this.browser = await chromium.launch(launchOptions);
  }

  setProgressCallback(analysisId: string, callback: (update: ProgressUpdate) => void): void {
    console.log(`[DEBUG] Setting progress callback for analysis: ${analysisId}`);
    this.progressCallbacks.set(analysisId, callback);
  }

  removeProgressCallback(analysisId: string): void {
    console.log(`[DEBUG] Removing progress callback for analysis: ${analysisId}`);
    this.progressCallbacks.delete(analysisId);
  }

  private updateProgress(analysisId: string, update: Partial<ProgressUpdate>): void {
    const callback = this.progressCallbacks.get(analysisId);
    if (callback) {
      const fullUpdate: ProgressUpdate = {
        analysisId,
        status: 'in_progress',
        progress: 0,
        currentTest: null,
        completedTests: 0,
        totalTests: 36,
        ...update
      };
      console.log(`[PROGRESS] Sending update for ${analysisId}: ${fullUpdate.progress}% - ${fullUpdate.currentTest || 'N/A'}`);
      callback(fullUpdate);
    } else {
      console.log(`[WARNING] No progress callback found for analysis ${analysisId}`);
    }
  }

  // Helper method to save error as test result
  private async saveErrorAsTestResult(analysisId: string, error: Error, currentTest: string, category: string = 'system'): Promise<void> {
    try {
      const errorTestResult: TestResult = {
        analysis_id: analysisId,
        category: category,
        test_name: currentTest || 'Error del Sistema',
        status: 'failed',
        score: 0,
        message: error.message || 'Error desconocido durante el análisis',
        details: {
          error_type: error.constructor.name,
          error_message: error.message,
          error_stack: error.stack,
          timestamp: new Date().toISOString(),
          test_phase: currentTest
        },
        created_at: new Date().toISOString()
      };

      await dbManager.createTestResult(errorTestResult);
      console.log(`[INFO] Error saved as test result for analysis ${analysisId}: ${error.message}`);
    } catch (saveError) {
      console.error(`[ERROR] Failed to save error as test result for analysis ${analysisId}:`, saveError);
    }
  }

  // Modified analyze method to accept analysisId as parameter
  async analyze(url: string, analysisId: string, options: AnalysisOptions = {}): Promise<string> {
    const startTime = new Date().toISOString();
    let currentTestName = 'Inicializando análisis';
    let currentCategory = 'system';

    console.log(`[INFO] Starting analysis ${analysisId} for URL: ${url}`);

    try {
      // Create analysis record
      await dbManager.createAnalysis({
        id: analysisId,
        url,
        status: 'in_progress',
        start_time: startTime
      });

      console.log(`[INFO] Analysis record created for ${analysisId}`);

      currentTestName = 'Inicializando navegador';
      this.updateProgress(analysisId, {
        status: 'in_progress',
        progress: 5,
        currentTest: currentTestName,
        completedTests: 0,
        totalTests: 36
      });

      // Initialize browser if not already done
      if (!this.browser) {
        console.log(`[INFO] Initializing browser for analysis ${analysisId}`);
        await this.initialize();
      }

      if (!this.browser) {
        throw new Error('Failed to initialize browser');
      }

      // Create new page
      this.page = await this.browser.newPage();
      
      // Set timeout
      const timeout = options.timeout || 60000; // Increased timeout to 60 seconds
      this.page.setDefaultTimeout(timeout);

      console.log(`[INFO] Browser page created for analysis ${analysisId}, timeout set to ${timeout}ms`);

      currentTestName = 'Cargando página web';
      this.updateProgress(analysisId, {
        progress: 10,
        currentTest: currentTestName,
        completedTests: 1
      });

      // Navigate to URL with better error handling
      let response;
      try {
        console.log(`[INFO] Entro a navegar hacia ${url} for analysis ${analysisId}`);
        response = await this.page.goto(url, { 
          waitUntil: options.waitForNetworkIdle ? 'networkidle' : 'domcontentloaded',
          timeout: timeout
        });
      } catch (navigationError: any) {
        console.error(`[ERROR] Navigation error for analysis ${analysisId}:`, {
          error: navigationError.message,
          url: url,
          timeout: timeout
        });
        
        // Save navigation error as test result
        await this.saveErrorAsTestResult(analysisId, navigationError, currentTestName, 'navigation');
        
        // Try to get more specific error information
        let errorMessage = `Error al cargar la página: ${navigationError.message}`;
        
        if (navigationError.message.includes('timeout')) {
          errorMessage = `Tiempo de espera agotado al cargar ${url}. El sitio puede estar lento o no responder.`;
        } else if (navigationError.message.includes('net::ERR_')) {
          errorMessage = `Error de red al acceder a ${url}. Verifique que la URL sea correcta y el sitio esté disponible.`;
        }
        
        throw new Error(errorMessage);
      }

      if (!response) {
        const noResponseError = new Error(`No se pudo obtener respuesta del servidor para ${url}`);
        await this.saveErrorAsTestResult(analysisId, noResponseError, currentTestName, 'navigation');
        throw noResponseError;
      }

      const statusCode = response.status();
      console.log(`[INFO] Page loaded with status: ${statusCode} for analysis ${analysisId}, URL: ${url}`);

      if (statusCode >= 400) {
        let errorMessage = `El servidor respondió con código ${statusCode}`;
        
        if (statusCode === 404) {
          errorMessage = `Página no encontrada (404) en ${url}`;
        } else if (statusCode === 500) {
          errorMessage = `Error interno del servidor (500) en ${url}. El sitio puede tener problemas técnicos.`;
        } else if (statusCode === 403) {
          errorMessage = `Acceso denegado (403) a ${url}. El sitio puede bloquear análisis automatizados.`;
        } else if (statusCode >= 500) {
          errorMessage = `Error del servidor (${statusCode}) en ${url}. El sitio tiene problemas técnicos.`;
        }
        
        const httpError = new Error(errorMessage);
        await this.saveErrorAsTestResult(analysisId, httpError, currentTestName, 'http');
        throw httpError;
      }

      currentTestName = 'Página cargada exitosamente. Iniciando análisis';
      this.updateProgress(analysisId, {
        progress: 15,
        currentTest: currentTestName,
        completedTests: 2
      });

      // Run tests
      const testCategories = options.testCategories || [
        'usabilidad', 'diseno', 'contenido', 'seguridad', 'seo', 'accesibilidad' // 'usability', 'layout', 'content', 'security', 'seo', 'accessibility'
      ];

      console.log(`[INFO] Running tests for analysis ${analysisId}. Categories: ${testCategories.join(', ')}`);

      const categoryResults: { [key: string]: any } = {};
      const allTestResults: TestResult[] = [];
      const allViolations: AccessibilityViolation[] = [];

      const testNames = {
        'usabilidad': 'Pruebas de Usabilidad',
        'diseno': 'Pruebas de Diseño y Layout',
        'contenido': 'Pruebas de Contenido',
        'seguridad': 'Pruebas de Seguridad',
        'seo': 'Pruebas de SEO',
        'accesibilidad': 'Pruebas de Accesibilidad'
      };

      let completedCategories = 0;
      const totalCategories = testCategories.length;

      for (const category of testCategories) {
        try {
          const categoryName = testNames[category as keyof typeof testNames] || category;
          currentTestName = `Ejecutando ${categoryName}`;
          currentCategory = category;
          
          console.log(`[INFO] Running ${categoryName} tests for analysis ${analysisId}`);
          
          this.updateProgress(analysisId, {
            progress: 15 + Math.round((completedCategories / totalCategories) * 70),
            currentTest: currentTestName,
            completedTests: 2 + completedCategories * 6
          });

          let result;
          
          switch (category) {
            case 'usabilidad':
              const usabilityTester = new UsabilityTester(this.page, analysisId);
              result = await usabilityTester.runAllTests();
              console.log(`[INFO] Usability tests completed for analysis ${analysisId}. Score: ${result.score}`);
              break;
            case 'diseno':
              const layoutTester = new LayoutTester(this.page, analysisId);
              result = await layoutTester.runAllTests();
              console.log(`[INFO] Layout tests completed for analysis ${analysisId}. Score: ${result.score}`);
              break;
            case 'contenido':
              const contentTester = new ContentTester(this.page, analysisId);
              result = await contentTester.runAllTests();
              console.log(`[INFO] Content tests completed for analysis ${analysisId}. Score: ${result.score}`);
              break;
            case 'seguridad':
              const securityTester = new SecurityTester(this.page, analysisId);
              result = await securityTester.runAllTests();
              console.log(`[INFO] Security tests completed for analysis ${analysisId}. Score: ${result.score}`);
              break;
            case 'seo':
              const seoTester = new SEOTester(this.page, analysisId);
              result = await seoTester.runAllTests();
              console.log(`[INFO] SEO tests completed for analysis ${analysisId}. Score: ${result.score}`);
              break;
            case 'accesibilidad':
              const accessibilityTester = new AccessibilityTester(this.page, analysisId);
              result = await accessibilityTester.runAllTests();
              console.log(`[INFO] Accessibility tests completed for analysis ${analysisId}. Score: ${result.score}`);
              if (result.violations) {
                allViolations.push(...result.violations);
              }
              break;
            default:
              continue;
          }

          if (result) {
            categoryResults[category] = {
              score: result.score,
              status: result.score >= 80 ? 'passed' : result.score >= 60 ? 'warning' : 'failed'
            };
            allTestResults.push(...result.tests);
          }

          completedCategories++;
        } catch (categoryError: any) {
          console.error(`[ERROR] Error running ${category} tests for analysis ${analysisId}:`, categoryError);
          
          // Save category error as test result
          await this.saveErrorAsTestResult(analysisId, categoryError, currentTestName, category);
          
          categoryResults[category] = {
            score: 0,
            status: 'failed'
          };
          completedCategories++;
        }
      }

      console.log(`[INFO] All tests completed for analysis ${analysisId}. Saving results...`);

      currentTestName = 'Guardando resultados';
      this.updateProgress(analysisId, {
        progress: 90,
        currentTest: currentTestName,
        completedTests: 34
      });

      // Save test results to database
      for (const testResult of allTestResults) {
        await dbManager.createTestResult(testResult);
      }

      // Save accessibility violations
      for (const violation of allViolations) {
        await dbManager.createAccessibilityViolation(violation);
      }

      // Calculate overall score and compliance level
      const scores = Object.values(categoryResults).map(r => r.score);
      const overallScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
      
      let complianceLevel = 'No Cumple';
      if (overallScore >= 90) complianceLevel = 'Excelente';
      else if (overallScore >= 80) complianceLevel = 'Cumple';
      else if (overallScore >= 60) complianceLevel = 'Parcial';

      const endTime = new Date().toISOString();
      const duration = Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000);

      console.log(`[INFO] Analysis ${analysisId} completed. Overall score: ${overallScore}, Compliance: ${complianceLevel}, Duration: ${duration}s`);

      // Update analysis record
      await dbManager.updateAnalysis(analysisId, {
        status: 'completed',
        overall_score: overallScore,
        compliance_level: complianceLevel,
        end_time: endTime,
        duration
      });

      this.updateProgress(analysisId, {
        status: 'completed',
        progress: 100,
        currentTest: null,
        completedTests: 36
      });

      console.log(`[SUCCESS] Analysis ${analysisId} completed successfully`);
      return analysisId;

    } catch (error: any) {
      console.error(`[ERROR] Analysis ${analysisId} failed:`, error);
      
      const errorMessage = error.message || 'Error desconocido durante el análisis';
      
      // Save the main error as test result if not already saved
      await this.saveErrorAsTestResult(analysisId, error, currentTestName, currentCategory);
      
      // Update analysis record with error
      await dbManager.updateAnalysis(analysisId, {
        status: 'failed',
        end_time: new Date().toISOString()
      });

      this.updateProgress(analysisId, {
        status: 'failed',
        progress: 0,
        currentTest: null,
        completedTests: 0,
        error: errorMessage
      });

      throw new Error(errorMessage);
    } finally {
      // Clean up page
      if (this.page) {
        console.log(`[INFO] Cleaning up page for analysis ${analysisId}`);
        await this.page.close();
        this.page = null;
      }
    }
  }

  // Legacy method for backward compatibility
  async analyzeOld(url: string, options: AnalysisOptions = {}): Promise<string> {
    const analysisId = uuidv4();
    return this.analyze(url, analysisId, options);
  }

  async getAnalysisResult(analysisId: string): Promise<AnalysisResult | null> {
    const analysis = await dbManager.getAnalysis(analysisId);
    if (!analysis) return null;

    if (analysis.status !== 'completed') {
      throw new Error(`Analysis is not completed. Status: ${analysis.status}`);
    }

    const testResults = await dbManager.getTestResults(analysisId);
    
    // Group results by category
    const categories: { [key: string]: { score: number; status: 'passed' | 'warning' | 'failed' } } = {};
    
    const categoryGroups = testResults.reduce((groups, result) => {
      if (!groups[result.category]) {
        groups[result.category] = [];
      }
      groups[result.category].push(result);
      return groups;
    }, {} as { [key: string]: TestResult[] });

    for (const [category, results] of Object.entries(categoryGroups)) {
      const avgScore = Math.round(
        results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length
      );
      categories[category] = {
        score: avgScore,
        status: avgScore >= 80 ? 'passed' : avgScore >= 60 ? 'warning' : 'failed'
      };
    }

    return {
      analysisId: analysis.id,
      url: analysis.url,
      overallScore: analysis.overall_score || 0,
      complianceLevel: analysis.compliance_level || 'Unknown',
      categories,
      startTime: analysis.start_time,
      endTime: analysis.end_time || '',
      duration: analysis.duration || 0
    };
  }

  async getDetailedResults(analysisId: string) {
    const analysis = await dbManager.getAnalysis(analysisId);
    if (!analysis) return null;

    const testResults = await dbManager.getTestResults(analysisId);
    const violations = await dbManager.getAccessibilityViolations(analysisId);

    return {
      analysis,
      testResults,
      violations
    };
  }

  async getAnalysisStatus(analysisId: string) {
    const analysis = await dbManager.getAnalysis(analysisId);
    if (!analysis) return null;

    return {
      analysisId: analysis.id,
      url: analysis.url,
      status: analysis.status,
      startTime: analysis.start_time,
      endTime: analysis.end_time,
      overallScore: analysis.overall_score,
      complianceLevel: analysis.compliance_level
    };
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

export const norticAnalyzer = new NorticAnalyzer();
