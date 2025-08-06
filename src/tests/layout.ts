import { Page } from 'playwright';
import { TestResult } from '../models/database';

export interface LayoutTestResult {
  category: string;
  tests: TestResult[];
  score: number;
}

export class LayoutTester {
  private page: Page;
  private analysisId: string;

  constructor(page: Page, analysisId: string) {
    this.page = page;
    this.analysisId = analysisId;
  }

  async runAllTests(): Promise<LayoutTestResult> {
    const tests: TestResult[] = [];

    // Test 1: Header Structure
    tests.push(await this.testHeaderStructure());

    // Test 2: Navigation Menu
    tests.push(await this.testNavigationMenu());

    // Test 3: Main Content Area
    tests.push(await this.testMainContentArea());

    // Test 4: Footer Structure
    tests.push(await this.testFooterStructure());

    // Test 5: Government Identity Elements
    tests.push(await this.testGovernmentIdentity());

    // Test 6: Responsive Layout
    tests.push(await this.testResponsiveLayout());

    // Calculate overall score
    const totalScore = tests.reduce((sum, test) => sum + (test.score || 0), 0);
    const score = Math.round(totalScore / tests.length);

    return {
      category: 'Diseño y Layout',
      tests,
      score
    };
  }

  private async testHeaderStructure(): Promise<TestResult> {
    try {
      const headerInfo = await this.page.evaluate(() => {
        const results = {
          hasHeader: false,
          hasLogo: false,
          hasInstitutionName: false,
          hasGovernmentBranding: false,
          hasLanguageSelector: false,
          hasSearchInHeader: false,
          headerHeight: 0,
          foundElements: [] as string[]
        };

        // Check for header element
        const header = document.querySelector('header') || 
                      document.querySelector('.header') || 
                      document.querySelector('#header');
        
        if (header) {
          results.hasHeader = true;
          results.foundElements.push('Elemento Header');
          
          const rect = header.getBoundingClientRect();
          results.headerHeight = rect.height;

          // Check for logo
          const logo = header.querySelector('img[alt*="logo"], .logo, #logo, img[src*="logo"]');
          if (logo) {
            results.hasLogo = true;
            results.foundElements.push('Logo');
          }

          // Check for institution name
          const institutionName = header.querySelector('h1, .institution-name, .site-title');
          if (institutionName && institutionName.textContent && institutionName.textContent.trim().length > 0) {
            results.hasInstitutionName = true;
            results.foundElements.push('Nombre de Institución');
          }

          // Check for government branding
          const govElements = header.querySelectorAll('*');
          for (const element of govElements) {
            const text = element.textContent?.toLowerCase() || '';
            const src = element.getAttribute('src')?.toLowerCase() || '';
            const alt = element.getAttribute('alt')?.toLowerCase() || '';
            
            if (text.includes('gobierno') || text.includes('república dominicana') || 
                src.includes('gob.do') || alt.includes('gobierno') ||
                text.includes('government') || text.includes('dominican republic')) {
              results.hasGovernmentBranding = true;
              results.foundElements.push('Identidad Gubernamental');
              break;
            }
          }

          // Check for language selector
          const langSelector = header.querySelector('[lang], .language-selector, .lang-selector');
          if (langSelector) {
            results.hasLanguageSelector = true;
            results.foundElements.push('Selector de Idioma');
          }

          // Check for search in header
          const searchInHeader = header.querySelector('input[type="search"], .search-form, #search');
          if (searchInHeader) {
            results.hasSearchInHeader = true;
            results.foundElements.push('Búsqueda en Header');
          }
        }

        return results;
      });

      let score = 0;
      if (headerInfo.hasHeader) score += 20;
      if (headerInfo.hasLogo) score += 15;
      if (headerInfo.hasInstitutionName) score += 20;
      if (headerInfo.hasGovernmentBranding) score += 25;
      if (headerInfo.hasLanguageSelector) score += 10;
      if (headerInfo.hasSearchInHeader) score += 10;

      const status = score >= 70 ? 'passed' : score >= 50 ? 'warning' : 'failed';

      return {
        analysis_id: this.analysisId,
        category: 'Diseño y Layout',
        test_name: 'Estructura del Header',
        status,
        score,
        message: `Header encontrado con ${headerInfo.foundElements.length} elementos: ${headerInfo.foundElements.join(', ')}`,
        details: headerInfo,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        analysis_id: this.analysisId,
        category: 'Diseño y Layout',
        test_name: 'Estructura del Header',
        status: 'failed',
        score: 0,
        message: `Error al analizar header: ${error}`,
        details: { error: error.toString() },
        created_at: new Date().toISOString()
      };
    }
  }

  private async testNavigationMenu(): Promise<TestResult> {
    try {
      const navInfo = await this.page.evaluate(() => {
        const results = {
          hasNavigation: false,
          hasMainMenu: false,
          hasSubmenus: false,
          hasBreadcrumbs: false,
          menuItemsCount: 0,
          submenuItemsCount: 0,
          foundElements: [] as string[]
        };

        // Check for navigation elements
        const nav = document.querySelector('nav') || 
                   document.querySelector('.navigation') || 
                   document.querySelector('#navigation') ||
                   document.querySelector('.menu') ||
                   document.querySelector('#menu');

        if (nav) {
          results.hasNavigation = true;
          results.foundElements.push('Elemento de Navegación');

          // Count menu items
          const menuItems = nav.querySelectorAll('a, button');
          results.menuItemsCount = menuItems.length;

          if (results.menuItemsCount > 0) {
            results.hasMainMenu = true;
            results.foundElements.push('Menú Principal');
          }

          // Check for submenus
          const submenus = nav.querySelectorAll('ul ul, .submenu, .dropdown-menu');
          if (submenus.length > 0) {
            results.hasSubmenus = true;
            results.foundElements.push('Submenús');
            
            submenus.forEach(submenu => {
              results.submenuItemsCount += submenu.querySelectorAll('a, button').length;
            });
          }
        }

        // Check for breadcrumbs
        const breadcrumbs = document.querySelector('.breadcrumb, .breadcrumbs, nav[aria-label="breadcrumb"]');
        if (breadcrumbs) {
          results.hasBreadcrumbs = true;
          results.foundElements.push('Breadcrumbs');
        }

        return results;
      });

      let score = 0;
      if (navInfo.hasNavigation) score += 30;
      if (navInfo.hasMainMenu) score += 25;
      if (navInfo.menuItemsCount >= 3) score += 20;
      if (navInfo.hasSubmenus) score += 15;
      if (navInfo.hasBreadcrumbs) score += 10;

      const status = score >= 70 ? 'passed' : score >= 50 ? 'warning' : 'failed';

      return {
        analysis_id: this.analysisId,
        category: 'Diseño y Layout',
        test_name: 'Menú de Navegación',
        status,
        score,
        message: `Navegación con ${navInfo.menuItemsCount} elementos principales y ${navInfo.submenuItemsCount} subelementos`,
        details: navInfo,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        analysis_id: this.analysisId,
        category: 'Diseño y Layout',
        test_name: 'Menú de Navegación',
        status: 'failed',
        score: 0,
        message: `Error al analizar navegación: ${error}`,
        details: { error: error.toString() },
        created_at: new Date().toISOString()
      };
    }
  }

  private async testMainContentArea(): Promise<TestResult> {
    try {
      const contentInfo = await this.page.evaluate(() => {
        const results = {
          hasMainContent: false,
          hasHeadings: false,
          hasParagraphs: false,
          hasImages: false,
          hasLinks: false,
          contentLength: 0,
          headingsCount: 0,
          paragraphsCount: 0,
          imagesCount: 0,
          linksCount: 0,
          foundElements: [] as string[]
        };

        // Check for main content area
        const main = document.querySelector('main') || 
                    document.querySelector('.main-content') || 
                    document.querySelector('#main-content') ||
                    document.querySelector('.content') ||
                    document.querySelector('#content');

        let contentArea = main || document.body;

        if (main) {
          results.hasMainContent = true;
          results.foundElements.push('Área de Contenido Principal');
        }

        // Analyze content
        const textContent = contentArea.textContent || '';
        results.contentLength = textContent.trim().length;

        // Check for headings
        const headings = contentArea.querySelectorAll('h1, h2, h3, h4, h5, h6');
        results.headingsCount = headings.length;
        if (results.headingsCount > 0) {
          results.hasHeadings = true;
          results.foundElements.push('Encabezados');
        }

        // Check for paragraphs
        const paragraphs = contentArea.querySelectorAll('p');
        results.paragraphsCount = paragraphs.length;
        if (results.paragraphsCount > 0) {
          results.hasParagraphs = true;
          results.foundElements.push('Párrafos');
        }

        // Check for images
        const images = contentArea.querySelectorAll('img');
        results.imagesCount = images.length;
        if (results.imagesCount > 0) {
          results.hasImages = true;
          results.foundElements.push('Imágenes');
        }

        // Check for links
        const links = contentArea.querySelectorAll('a');
        results.linksCount = links.length;
        if (results.linksCount > 0) {
          results.hasLinks = true;
          results.foundElements.push('Enlaces');
        }

        return results;
      });

      let score = 0;
      if (contentInfo.hasMainContent) score += 20;
      if (contentInfo.hasHeadings) score += 20;
      if (contentInfo.hasParagraphs) score += 15;
      if (contentInfo.contentLength > 100) score += 15;
      if (contentInfo.hasImages) score += 10;
      if (contentInfo.hasLinks) score += 10;
      if (contentInfo.headingsCount >= 2) score += 10;

      const status = score >= 70 ? 'passed' : score >= 50 ? 'warning' : 'failed';

      return {
        analysis_id: this.analysisId,
        category: 'Diseño y Layout',
        test_name: 'Área de Contenido Principal',
        status,
        score,
        message: `Contenido con ${contentInfo.contentLength} caracteres, ${contentInfo.headingsCount} encabezados, ${contentInfo.paragraphsCount} párrafos`,
        details: contentInfo,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        analysis_id: this.analysisId,
        category: 'Diseño y Layout',
        test_name: 'Área de Contenido Principal',
        status: 'failed',
        score: 0,
        message: `Error al analizar contenido principal: ${error}`,
        details: { error: error.toString() },
        created_at: new Date().toISOString()
      };
    }
  }

  private async testFooterStructure(): Promise<TestResult> {
    try {
      const footerInfo = await this.page.evaluate(() => {
        const results = {
          hasFooter: false,
          hasContactInfo: false,
          hasCopyright: false,
          hasGovernmentLinks: false,
          hasSocialMedia: false,
          hasAccessibilityInfo: false,
          linksCount: 0,
          foundElements: [] as string[]
        };

        // Check for footer element
        const footer = document.querySelector('footer') || 
                      document.querySelector('.footer') || 
                      document.querySelector('#footer');

        if (footer) {
          results.hasFooter = true;
          results.foundElements.push('Elemento Footer');

          // Count links in footer
          const links = footer.querySelectorAll('a');
          results.linksCount = links.length;

          // Check for contact information
          const contactKeywords = ['contacto', 'contact', 'teléfono', 'phone', 'email', 'correo', 'dirección', 'address'];
          const footerText = footer.textContent?.toLowerCase() || '';
          
          if (contactKeywords.some(keyword => footerText.includes(keyword))) {
            results.hasContactInfo = true;
            results.foundElements.push('Información de Contacto');
          }

          // Check for copyright
          if (footerText.includes('©') || footerText.includes('copyright') || footerText.includes('derechos reservados')) {
            results.hasCopyright = true;
            results.foundElements.push('Copyright');
          }

          // Check for government links
          const govKeywords = ['gobierno', 'government', 'gob.do', 'presidencia', 'ministerio'];
          if (govKeywords.some(keyword => footerText.includes(keyword))) {
            results.hasGovernmentLinks = true;
            results.foundElements.push('Enlaces Gubernamentales');
          }

          // Check for social media
          const socialKeywords = ['facebook', 'twitter', 'instagram', 'youtube', 'linkedin', 'social'];
          const socialIcons = footer.querySelectorAll('[class*="social"], [class*="facebook"], [class*="twitter"], [class*="instagram"]');
          
          if (socialKeywords.some(keyword => footerText.includes(keyword)) || socialIcons.length > 0) {
            results.hasSocialMedia = true;
            results.foundElements.push('Redes Sociales');
          }

          // Check for accessibility information
          const accessibilityKeywords = ['accesibilidad', 'accessibility', 'wcag', 'nortic'];
          if (accessibilityKeywords.some(keyword => footerText.includes(keyword))) {
            results.hasAccessibilityInfo = true;
            results.foundElements.push('Información de Accesibilidad');
          }
        }

        return results;
      });

      let score = 0;
      if (footerInfo.hasFooter) score += 25;
      if (footerInfo.hasContactInfo) score += 20;
      if (footerInfo.hasCopyright) score += 15;
      if (footerInfo.hasGovernmentLinks) score += 15;
      if (footerInfo.hasSocialMedia) score += 10;
      if (footerInfo.hasAccessibilityInfo) score += 15;

      const status = score >= 70 ? 'passed' : score >= 50 ? 'warning' : 'failed';

      return {
        analysis_id: this.analysisId,
        category: 'Diseño y Layout',
        test_name: 'Estructura del Footer',
        status,
        score,
        message: `Footer con ${footerInfo.linksCount} enlaces y ${footerInfo.foundElements.length} elementos: ${footerInfo.foundElements.join(', ')}`,
        details: footerInfo,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        analysis_id: this.analysisId,
        category: 'Diseño y Layout',
        test_name: 'Estructura del Footer',
        status: 'failed',
        score: 0,
        message: `Error al analizar footer: ${error}`,
        details: { error: error.toString() },
        created_at: new Date().toISOString()
      };
    }
  }

  private async testGovernmentIdentity(): Promise<TestResult> {
    try {
      const identityInfo = await this.page.evaluate(() => {
        const results = {
          hasGovernmentDomain: false,
          hasOfficialBranding: false,
          hasInstitutionIdentification: false,
          hasGovernmentColors: false,
          hasOfficialLogos: false,
          foundElements: [] as string[]
        };

        // Check domain
        if (window.location.hostname.includes('.gob.do') || window.location.hostname.includes('.gov.do')) {
          results.hasGovernmentDomain = true;
          results.foundElements.push('Dominio Gubernamental');
        }

        // Check for official branding elements
        const allElements = document.querySelectorAll('*');
        const pageText = document.body.textContent?.toLowerCase() || '';

        // Check for institution identification
        const institutionKeywords = ['ministerio', 'presidencia', 'senado', 'cámara', 'diputados', 'ayuntamiento', 'alcaldía'];
        if (institutionKeywords.some(keyword => pageText.includes(keyword))) {
          results.hasInstitutionIdentification = true;
          results.foundElements.push('Identificación Institucional');
        }

        // Check for official branding
        const brandingKeywords = ['república dominicana', 'gobierno dominicano', 'estado dominicano'];
        if (brandingKeywords.some(keyword => pageText.includes(keyword))) {
          results.hasOfficialBranding = true;
          results.foundElements.push('Marca Oficial');
        }

        // Check for official logos
        const images = document.querySelectorAll('img');
        for (const img of images) {
          const src = img.getAttribute('src')?.toLowerCase() || '';
          const alt = img.getAttribute('alt')?.toLowerCase() || '';
          
          if (src.includes('escudo') || src.includes('logo') || alt.includes('escudo') || 
              alt.includes('república dominicana') || src.includes('gobierno')) {
            results.hasOfficialLogos = true;
            results.foundElements.push('Logos Oficiales');
            break;
          }
        }

        // Check for government colors (basic check for common government color schemes)
        const stylesheets = document.querySelectorAll('link[rel="stylesheet"], style');
        let hasGovColors = false;
        
        // This is a simplified check - in reality, you'd want to analyze computed styles
        for (const sheet of stylesheets) {
          const content = sheet.textContent || '';
          if (content.includes('#0066cc') || content.includes('#003366') || content.includes('blue')) {
            hasGovColors = true;
            break;
          }
        }
        
        if (hasGovColors) {
          results.hasGovernmentColors = true;
          results.foundElements.push('Colores Gubernamentales');
        }

        return results;
      });

      let score = 0;
      if (identityInfo.hasGovernmentDomain) score += 30;
      if (identityInfo.hasOfficialBranding) score += 25;
      if (identityInfo.hasInstitutionIdentification) score += 20;
      if (identityInfo.hasOfficialLogos) score += 15;
      if (identityInfo.hasGovernmentColors) score += 10;

      const status = score >= 70 ? 'passed' : score >= 50 ? 'warning' : 'failed';

      return {
        analysis_id: this.analysisId,
        category: 'Diseño y Layout',
        test_name: 'Elementos de Identidad Gubernamental',
        status,
        score,
        message: `Identidad gubernamental con ${identityInfo.foundElements.length} elementos: ${identityInfo.foundElements.join(', ')}`,
        details: identityInfo,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        analysis_id: this.analysisId,
        category: 'Diseño y Layout',
        test_name: 'Elementos de Identidad Gubernamental',
        status: 'failed',
        score: 0,
        message: `Error al analizar identidad gubernamental: ${error}`,
        details: { error: error.toString() },
        created_at: new Date().toISOString()
      };
    }
  }

  private async testResponsiveLayout(): Promise<TestResult> {
    try {
      const viewports = [
        { width: 1920, height: 1080, name: 'Desktop' },
        { width: 768, height: 1024, name: 'Tablet' },
        { width: 375, height: 667, name: 'Mobile' }
      ];

      const responsiveResults = [];

      for (const viewport of viewports) {
        await this.page.setViewportSize(viewport);
        await this.page.waitForTimeout(1000);

        const layoutInfo = await this.page.evaluate(() => {
          return {
            bodyWidth: document.body.scrollWidth,
            viewportWidth: window.innerWidth,
            hasHorizontalScroll: document.body.scrollWidth > window.innerWidth,
            visibleElements: document.querySelectorAll(':not([style*="display: none"]):not([style*="visibility: hidden"])').length
          };
        });

        responsiveResults.push({
          viewport: viewport.name,
          width: viewport.width,
          height: viewport.height,
          isResponsive: !layoutInfo.hasHorizontalScroll,
          bodyWidth: layoutInfo.bodyWidth,
          visibleElements: layoutInfo.visibleElements
        });
      }

      const responsiveCount = responsiveResults.filter(r => r.isResponsive).length;
      const score = Math.round((responsiveCount / viewports.length) * 100);
      const status = score >= 80 ? 'passed' : score >= 60 ? 'warning' : 'failed';

      return {
        analysis_id: this.analysisId,
        category: 'Diseño y Layout',
        test_name: 'Layout Responsivo',
        status,
        score,
        message: `Layout responsivo en ${responsiveCount}/${viewports.length} viewports`,
        details: { responsiveResults },
        created_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        analysis_id: this.analysisId,
        category: 'Diseño y Layout',
        test_name: 'Layout Responsivo',
        status: 'failed',
        score: 0,
        message: `Error al probar layout responsivo: ${error}`,
        details: { error: error.toString() },
        created_at: new Date().toISOString()
      };
    }
  }
}