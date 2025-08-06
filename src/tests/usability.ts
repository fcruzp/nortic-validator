import { Page } from 'playwright';
import { TestResult } from '../models/database';

export interface UsabilityTestResult {
  category: string;
  tests: TestResult[];
  score: number;
}

export class UsabilityTester {
  private page: Page;
  private analysisId: string;

  constructor(page: Page, analysisId: string) {
    this.page = page;
    this.analysisId = analysisId;
  }

  async runAllTests(): Promise<UsabilityTestResult> {
    const tests: TestResult[] = [];

    // Test 1: Page Load Time
    tests.push(await this.testPageLoadTime());

    // Test 2: Responsive Design
    tests.push(await this.testResponsiveDesign());

    // Test 3: Navigation Consistency
    tests.push(await this.testNavigationConsistency());

    // Test 4: Browser Compatibility
    tests.push(await this.testBrowserCompatibility());

    // Test 5: Form Usability
    tests.push(await this.testFormUsability());

    // Test 6: Search Functionality
    tests.push(await this.testSearchFunctionality());

    // Calculate overall score
    const passedTests = tests.filter(t => t.status === 'passed').length;
    const score = Math.round((passedTests / tests.length) * 100);

    return {
      category: 'Usabilidad',
      tests,
      score
    };
  }

  private async testPageLoadTime(): Promise<TestResult> {
    try {
      const startTime = Date.now();
      await this.page.reload({ waitUntil: 'networkidle' });
      const loadTime = Date.now() - startTime;

      const status = loadTime <= 3000 ? 'passed' : loadTime <= 5000 ? 'warning' : 'failed';
      const score = loadTime <= 3000 ? 100 : loadTime <= 5000 ? 70 : 30;

      return {
        analysis_id: this.analysisId,
        category: 'Usabilidad',
        test_name: 'Tiempo de Carga de Página',
        status,
        score,
        message: `Tiempo de carga: ${loadTime}ms`,
        details: { loadTime, threshold: 3000 },
        created_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        analysis_id: this.analysisId,
        category: 'Usabilidad',
        test_name: 'Tiempo de Carga de Página',
        status: 'failed',
        score: 0,
        message: `Error al medir tiempo de carga: ${error}`,
        details: { error: error.toString() },
        created_at: new Date().toISOString()
      };
    }
  }

  private async testResponsiveDesign(): Promise<TestResult> {
    try {
      const viewports = [
        { width: 1920, height: 1080, name: 'Desktop' },
        { width: 768, height: 1024, name: 'Tablet' },
        { width: 375, height: 667, name: 'Mobile' }
      ];

      const results = [];
      
      for (const viewport of viewports) {
        await this.page.setViewportSize(viewport);
        await this.page.waitForTimeout(1000);

        // Check if content is visible and properly arranged
        const bodyWidth = await this.page.evaluate(() => document.body.scrollWidth);
        const viewportWidth = viewport.width;
        
        const hasHorizontalScroll = bodyWidth > viewportWidth;
        const isResponsive = !hasHorizontalScroll;

        results.push({
          viewport: viewport.name,
          width: viewport.width,
          height: viewport.height,
          isResponsive,
          bodyWidth
        });
      }

      const responsiveCount = results.filter(r => r.isResponsive).length;
      const status = responsiveCount === 3 ? 'passed' : responsiveCount >= 2 ? 'warning' : 'failed';
      const score = Math.round((responsiveCount / 3) * 100);

      return {
        analysis_id: this.analysisId,
        category: 'Usabilidad',
        test_name: 'Diseño Responsivo',
        status,
        score,
        message: `Responsive en ${responsiveCount}/3 viewports`,
        details: { results },
        created_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        analysis_id: this.analysisId,
        category: 'Usabilidad',
        test_name: 'Diseño Responsivo',
        status: 'failed',
        score: 0,
        message: `Error en prueba responsive: ${error}`,
        details: { error: error.toString() },
        created_at: new Date().toISOString()
      };
    }
  }

  private async testNavigationConsistency(): Promise<TestResult> {
    try {
      // Check for consistent navigation elements
      const navigationElements = await this.page.evaluate(() => {
        const nav = document.querySelector('nav');
        const header = document.querySelector('header');
        const menu = document.querySelector('.menu, #menu, [role="navigation"]');
        
        return {
          hasNav: !!nav,
          hasHeader: !!header,
          hasMenu: !!menu,
          navLinks: nav ? nav.querySelectorAll('a').length : 0,
          headerLinks: header ? header.querySelectorAll('a').length : 0
        };
      });

      const hasNavigation = navigationElements.hasNav || navigationElements.hasHeader || navigationElements.hasMenu;
      const hasLinks = navigationElements.navLinks > 0 || navigationElements.headerLinks > 0;
      
      const status = hasNavigation && hasLinks ? 'passed' : hasNavigation ? 'warning' : 'failed';
      const score = hasNavigation && hasLinks ? 100 : hasNavigation ? 70 : 30;

      return {
        analysis_id: this.analysisId,
        category: 'Usabilidad',
        test_name: 'Consistencia de Navegación',
        status,
        score,
        message: hasNavigation ? 'Elementos de navegación encontrados' : 'No se encontraron elementos de navegación',
        details: navigationElements,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        analysis_id: this.analysisId,
        category: 'Usabilidad',
        test_name: 'Consistencia de Navegación',
        status: 'failed',
        score: 0,
        message: `Error en prueba de navegación: ${error}`,
        details: { error: error.toString() },
        created_at: new Date().toISOString()
      };
    }
  }

  private async testBrowserCompatibility(): Promise<TestResult> {
    try {
      // Check for modern web standards compliance
      const compatibility = await this.page.evaluate(() => {
        const features = {
          flexbox: CSS.supports('display', 'flex'),
          grid: CSS.supports('display', 'grid'),
          customProperties: CSS.supports('--custom-property', 'value'),
          es6: typeof Symbol !== 'undefined',
          fetch: typeof fetch !== 'undefined',
          promises: typeof Promise !== 'undefined'
        };

        const supportedFeatures = Object.values(features).filter(Boolean).length;
        const totalFeatures = Object.keys(features).length;

        return {
          features,
          supportedFeatures,
          totalFeatures,
          compatibilityScore: (supportedFeatures / totalFeatures) * 100
        };
      });

      const status = compatibility.compatibilityScore >= 80 ? 'passed' : 
                    compatibility.compatibilityScore >= 60 ? 'warning' : 'failed';
      const score = Math.round(compatibility.compatibilityScore);

      return {
        analysis_id: this.analysisId,
        category: 'Usabilidad',
        test_name: 'Compatibilidad del Navegador',
        status,
        score,
        message: `Compatibilidad: ${compatibility.supportedFeatures}/${compatibility.totalFeatures} características`,
        details: compatibility,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        analysis_id: this.analysisId,
        category: 'Usabilidad',
        test_name: 'Compatibilidad del Navegador',
        status: 'failed',
        score: 0,
        message: `Error en prueba de compatibilidad: ${error}`,
        details: { error: error.toString() },
        created_at: new Date().toISOString()
      };
    }
  }

  private async testFormUsability(): Promise<TestResult> {
    try {
      const formAnalysis = await this.page.evaluate(() => {
        const forms = document.querySelectorAll('form');
        const inputs = document.querySelectorAll('input, textarea, select');
        
        let labelsCount = 0;
        let placeholdersCount = 0;
        let requiredFieldsCount = 0;

        inputs.forEach(input => {
          const label = document.querySelector(`label[for="${input.id}"]`) || 
                       input.closest('label');
          if (label) labelsCount++;
          
          if (input.getAttribute('placeholder')) placeholdersCount++;
          if (input.hasAttribute('required')) requiredFieldsCount++;
        });

        return {
          formsCount: forms.length,
          inputsCount: inputs.length,
          labelsCount,
          placeholdersCount,
          requiredFieldsCount,
          hasSubmitButton: !!document.querySelector('input[type="submit"], button[type="submit"]')
        };
      });

      let score = 100;
      let issues = [];

      if (formAnalysis.formsCount === 0) {
        score = 100; // No forms is not necessarily bad
      } else {
        const labelCoverage = formAnalysis.inputsCount > 0 ? 
          (formAnalysis.labelsCount / formAnalysis.inputsCount) * 100 : 0;
        
        if (labelCoverage < 80) {
          score -= 30;
          issues.push('Faltan etiquetas en algunos campos');
        }
        
        if (!formAnalysis.hasSubmitButton) {
          score -= 20;
          issues.push('No se encontró botón de envío');
        }
      }

      const status = score >= 80 ? 'passed' : score >= 60 ? 'warning' : 'failed';

      return {
        analysis_id: this.analysisId,
        category: 'Usabilidad',
        test_name: 'Usabilidad de Formularios',
        status,
        score: Math.max(0, score),
        message: formAnalysis.formsCount === 0 ? 'No se encontraron formularios' : 
                issues.length === 0 ? 'Formularios bien estructurados' : issues.join(', '),
        details: formAnalysis,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        analysis_id: this.analysisId,
        category: 'Usabilidad',
        test_name: 'Usabilidad de Formularios',
        status: 'failed',
        score: 0,
        message: `Error en análisis de formularios: ${error}`,
        details: { error: error.toString() },
        created_at: new Date().toISOString()
      };
    }
  }

  private async testSearchFunctionality(): Promise<TestResult> {
    try {
      const searchAnalysis = await this.page.evaluate(() => {
        const searchInputs = document.querySelectorAll('input[type="search"], input[name*="search"], input[placeholder*="buscar"], input[placeholder*="search"]');
        const searchForms = document.querySelectorAll('form[role="search"], .search-form, #search-form');
        const searchButtons = document.querySelectorAll('button[type="submit"]:has(+ input[type="search"]), .search-button, #search-button');

        return {
          hasSearchInput: searchInputs.length > 0,
          hasSearchForm: searchForms.length > 0,
          hasSearchButton: searchButtons.length > 0,
          searchElementsCount: searchInputs.length + searchForms.length + searchButtons.length
        };
      });

      let score = 100;
      let message = '';

      if (searchAnalysis.searchElementsCount === 0) {
        score = 70; // Not having search is not critical for all sites
        message = 'No se encontró funcionalidad de búsqueda';
      } else if (searchAnalysis.hasSearchInput && searchAnalysis.hasSearchForm) {
        score = 100;
        message = 'Funcionalidad de búsqueda completa encontrada';
      } else if (searchAnalysis.hasSearchInput) {
        score = 80;
        message = 'Campo de búsqueda encontrado, pero podría mejorarse';
      } else {
        score = 60;
        message = 'Funcionalidad de búsqueda básica encontrada';
      }

      const status = score >= 80 ? 'passed' : score >= 60 ? 'warning' : 'failed';

      return {
        analysis_id: this.analysisId,
        category: 'Usabilidad',
        test_name: 'Funcionalidad de Búsqueda',
        status,
        score,
        message,
        details: searchAnalysis,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        analysis_id: this.analysisId,
        category: 'Usabilidad',
        test_name: 'Funcionalidad de Búsqueda',
        status: 'failed',
        score: 0,
        message: `Error en análisis de búsqueda: ${error}`,
        details: { error: error.toString() },
        created_at: new Date().toISOString()
      };
    }
  }
}