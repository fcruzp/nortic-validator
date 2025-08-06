import { Page } from 'playwright';
import { TestResult } from '../models/database';

export interface AccessibilityTestResult {
  category: string;
  tests: TestResult[];
  score: number;
}

export class AccessibilityTester {
  private page: Page;
  private analysisId: string;

  constructor(page: Page, analysisId: string) {
    this.page = page;
    this.analysisId = analysisId;
  }

  async runAllTests(): Promise<AccessibilityTestResult> {
    const tests: TestResult[] = [];

    // Test 1: Keyboard Navigation
    tests.push(await this.testKeyboardNavigation());

    // Test 2: Color Contrast
    tests.push(await this.testColorContrast());

    // Test 3: ARIA Labels and Roles
    tests.push(await this.testARIAImplementation());

    // Test 4: Form Accessibility
    tests.push(await this.testFormAccessibility());

    // Test 5: Image Accessibility
    tests.push(await this.testImageAccessibility());

    // Test 6: Document Structure
    tests.push(await this.testDocumentStructure());

    // Calculate overall score
    const totalScore = tests.reduce((sum, test) => sum + (test.score || 0), 0);
    const score = Math.round(totalScore / tests.length);

    return {
      category: 'Accesibilidad',
      tests,
      score
    };
  }

  private async testKeyboardNavigation(): Promise<TestResult> {
    try {
      const keyboardInfo = await this.page.evaluate(() => {
        const results = {
          focusableElements: 0,
          elementsWithTabIndex: 0,
          elementsWithNegativeTabIndex: 0,
          hasSkipLinks: false,
          hasFocusIndicators: false,
          interactiveElements: 0,
          accessibleInteractiveElements: 0
        };

        // Find all focusable elements
        const focusableSelectors = [
          'a[href]', 'button', 'input', 'textarea', 'select',
          '[tabindex]:not([tabindex="-1"])', '[contenteditable="true"]'
        ];
        
        const focusableElements = document.querySelectorAll(focusableSelectors.join(', '));
        results.focusableElements = focusableElements.length;

        // Check tabindex usage
        const elementsWithTabIndex = document.querySelectorAll('[tabindex]');
        results.elementsWithTabIndex = elementsWithTabIndex.length;
        
        const negativeTabIndex = document.querySelectorAll('[tabindex="-1"]');
        results.elementsWithNegativeTabIndex = negativeTabIndex.length;

        // Check for skip links
        const skipLinks = document.querySelectorAll('a[href^="#"], .skip-link, #skip-link');
        results.hasSkipLinks = skipLinks.length > 0;

        // Check for focus indicators (basic check)
        const stylesheets = Array.from(document.styleSheets);
        let hasFocusStyles = false;
        
        try {
          stylesheets.forEach(sheet => {
            try {
              const rules = Array.from(sheet.cssRules || []);
              rules.forEach(rule => {
                if (rule.cssText && rule.cssText.includes(':focus')) {
                  hasFocusStyles = true;
                }
              });
            } catch (e) {
              // Cross-origin stylesheet, skip
            }
          });
        } catch (e) {
          // Error accessing stylesheets
        }
        
        results.hasFocusIndicators = hasFocusStyles;

        // Check interactive elements accessibility
        const interactiveElements = document.querySelectorAll('button, a, input, select, textarea, [role="button"], [role="link"]');
        results.interactiveElements = interactiveElements.length;

        let accessibleCount = 0;
        interactiveElements.forEach(element => {
          const hasAccessibleName = element.getAttribute('aria-label') || 
                                   element.getAttribute('aria-labelledby') ||
                                   element.textContent?.trim() ||
                                   element.getAttribute('title');
          
          if (hasAccessibleName) {
            accessibleCount++;
          }
        });
        
        results.accessibleInteractiveElements = accessibleCount;

        return results;
      });

      let score = 0;
      let issues = [];

      if (keyboardInfo.focusableElements > 0) {
        score += 20;
      } else {
        issues.push('No se encontraron elementos enfocables');
      }

      if (keyboardInfo.hasSkipLinks) {
        score += 20;
      } else {
        issues.push('Faltan enlaces de salto');
      }

      if (keyboardInfo.hasFocusIndicators) {
        score += 25;
      } else {
        issues.push('Faltan indicadores de foco');
      }

      // Check proper tabindex usage
      const properTabIndexRatio = keyboardInfo.elementsWithTabIndex > 0 ? 
        (keyboardInfo.elementsWithTabIndex - keyboardInfo.elementsWithNegativeTabIndex) / keyboardInfo.elementsWithTabIndex : 1;
      
      if (properTabIndexRatio >= 0.8) {
        score += 15;
      } else {
        issues.push('Uso inadecuado de tabindex');
      }

      // Check accessible interactive elements
      const accessibilityRatio = keyboardInfo.interactiveElements > 0 ? 
        keyboardInfo.accessibleInteractiveElements / keyboardInfo.interactiveElements : 1;
      
      if (accessibilityRatio >= 0.9) {
        score += 20;
      } else if (accessibilityRatio >= 0.7) {
        score += 15;
      } else {
        issues.push('Elementos interactivos sin nombres accesibles');
      }

      const status = score >= 80 ? 'passed' : score >= 60 ? 'warning' : 'failed';

      return {
        analysis_id: this.analysisId,
        category: 'Accesibilidad',
        test_name: 'Navegación por Teclado',
        status,
        score,
        message: issues.length === 0 ? 'Navegación por teclado accesible' : issues.join(', '),
        details: keyboardInfo,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        analysis_id: this.analysisId,
        category: 'Accesibilidad',
        test_name: 'Navegación por Teclado',
        status: 'failed',
        score: 0,
        message: `Error al verificar navegación por teclado: ${error}`,
        details: { error: error.toString() },
        created_at: new Date().toISOString()
      };
    }
  }

  private async testColorContrast(): Promise<TestResult> {
    try {
      const contrastInfo = await this.page.evaluate(() => {
        const results = {
          textElements: 0,
          elementsChecked: 0,
          potentialIssues: 0,
          hasColorOnlyInformation: false,
          foundIssues: [] as string[]
        };

        // Get all text elements
        const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div, a, button, label, li');
        results.textElements = textElements.length;

        let checkedElements = 0;
        let potentialIssues = 0;

        textElements.forEach(element => {
          const computedStyle = window.getComputedStyle(element);
          const color = computedStyle.color;
          const backgroundColor = computedStyle.backgroundColor;
          
          if (color && backgroundColor && element.textContent?.trim()) {
            checkedElements++;
            
            // Basic check for potential contrast issues
            // This is a simplified check - real contrast calculation requires more complex logic
            if (color.includes('rgb') && backgroundColor.includes('rgb')) {
              const colorMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
              const bgMatch = backgroundColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
              
              if (colorMatch && bgMatch) {
                const [, r1, g1, b1] = colorMatch.map(Number);
                const [, r2, g2, b2] = bgMatch.map(Number);
                
                // Simple brightness difference check
                const brightness1 = (r1 * 299 + g1 * 587 + b1 * 114) / 1000;
                const brightness2 = (r2 * 299 + g2 * 587 + b2 * 114) / 1000;
                const brightnessDiff = Math.abs(brightness1 - brightness2);
                
                if (brightnessDiff < 125) {
                  potentialIssues++;
                }
              }
            }
          }
        });

        results.elementsChecked = checkedElements;
        results.potentialIssues = potentialIssues;

        // Check for color-only information
        const colorOnlyElements = document.querySelectorAll('[style*="color:"], .red, .green, .blue, .error, .success, .warning');
        results.hasColorOnlyInformation = colorOnlyElements.length > 0;

        return results;
      });

      let score = 100;
      let issues = [];

      if (contrastInfo.elementsChecked === 0) {
        score = 70;
        issues.push('No se pudieron verificar contrastes');
      } else {
        const issueRatio = contrastInfo.potentialIssues / contrastInfo.elementsChecked;
        
        if (issueRatio > 0.3) {
          score -= 40;
          issues.push('Muchos problemas potenciales de contraste');
        } else if (issueRatio > 0.1) {
          score -= 20;
          issues.push('Algunos problemas potenciales de contraste');
        }
      }

      if (contrastInfo.hasColorOnlyInformation) {
        score -= 15;
        issues.push('Posible información solo por color');
      }

      const status = score >= 80 ? 'passed' : score >= 60 ? 'warning' : 'failed';

      return {
        analysis_id: this.analysisId,
        category: 'Accesibilidad',
        test_name: 'Contraste de Colores',
        status,
        score: Math.max(0, score),
        message: issues.length === 0 ? 'Contraste de colores adecuado' : issues.join(', '),
        details: contrastInfo,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        analysis_id: this.analysisId,
        category: 'Accesibilidad',
        test_name: 'Contraste de Colores',
        status: 'failed',
        score: 0,
        message: `Error al verificar contraste: ${error}`,
        details: { error: error.toString() },
        created_at: new Date().toISOString()
      };
    }
  }

  private async testARIAImplementation(): Promise<TestResult> {
    try {
      const ariaInfo = await this.page.evaluate(() => {
        const results = {
          elementsWithARIA: 0,
          elementsWithRoles: 0,
          elementsWithLabels: 0,
          elementsWithDescriptions: 0,
          landmarkRoles: 0,
          interactiveElements: 0,
          accessibleInteractiveElements: 0,
          foundRoles: [] as string[],
          foundLabels: [] as string[]
        };

        // Check all elements with ARIA attributes
        const elementsWithARIA = document.querySelectorAll('[aria-label], [aria-labelledby], [aria-describedby], [role], [aria-expanded], [aria-hidden], [aria-live]');
        results.elementsWithARIA = elementsWithARIA.length;

        // Check roles
        const elementsWithRoles = document.querySelectorAll('[role]');
        results.elementsWithRoles = elementsWithRoles.length;
        
        elementsWithRoles.forEach(element => {
          const role = element.getAttribute('role');
          if (role && !results.foundRoles.includes(role)) {
            results.foundRoles.push(role);
          }
        });

        // Check landmark roles
        const landmarkRoles = document.querySelectorAll('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], [role="complementary"], [role="search"]');
        results.landmarkRoles = landmarkRoles.length;

        // Check labels
        const elementsWithLabels = document.querySelectorAll('[aria-label], [aria-labelledby]');
        results.elementsWithLabels = elementsWithLabels.length;

        // Check descriptions
        const elementsWithDescriptions = document.querySelectorAll('[aria-describedby]');
        results.elementsWithDescriptions = elementsWithDescriptions.length;

        // Check interactive elements accessibility
        const interactiveElements = document.querySelectorAll('button, a, input, select, textarea, [role="button"], [role="link"], [role="tab"], [role="menuitem"]');
        results.interactiveElements = interactiveElements.length;

        let accessibleCount = 0;
        interactiveElements.forEach(element => {
          const hasAccessibleName = element.getAttribute('aria-label') || 
                                   element.getAttribute('aria-labelledby') ||
                                   element.textContent?.trim() ||
                                   element.getAttribute('title') ||
                                   (element.tagName === 'INPUT' && element.getAttribute('placeholder'));
          
          if (hasAccessibleName) {
            accessibleCount++;
          }
        });
        
        results.accessibleInteractiveElements = accessibleCount;

        return results;
      });

      let score = 0;
      let issues = [];

      if (ariaInfo.elementsWithARIA > 0) {
        score += 25;
      } else {
        issues.push('No se encontraron atributos ARIA');
      }

      if (ariaInfo.landmarkRoles >= 2) {
        score += 25;
      } else if (ariaInfo.landmarkRoles > 0) {
        score += 15;
        issues.push('Pocos roles de landmark');
      } else {
        issues.push('Faltan roles de landmark');
      }

      if (ariaInfo.elementsWithLabels > 0) {
        score += 20;
      } else {
        issues.push('Faltan etiquetas ARIA');
      }

      if (ariaInfo.elementsWithRoles > 0) {
        score += 15;
      } else {
        issues.push('Faltan roles ARIA');
      }

      // Check interactive elements accessibility
      const accessibilityRatio = ariaInfo.interactiveElements > 0 ? 
        ariaInfo.accessibleInteractiveElements / ariaInfo.interactiveElements : 1;
      
      if (accessibilityRatio >= 0.9) {
        score += 15;
      } else if (accessibilityRatio >= 0.7) {
        score += 10;
      } else {
        issues.push('Elementos interactivos sin nombres accesibles');
      }

      const status = score >= 80 ? 'passed' : score >= 60 ? 'warning' : 'failed';

      return {
        analysis_id: this.analysisId,
        category: 'Accesibilidad',
        test_name: 'Etiquetas y Roles ARIA',
        status,
        score,
        message: issues.length === 0 ? 'Implementación ARIA adecuada' : issues.join(', '),
        details: ariaInfo,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        analysis_id: this.analysisId,
        category: 'Accesibilidad',
        test_name: 'Etiquetas y Roles ARIA',
        status: 'failed',
        score: 0,
        message: `Error al verificar ARIA: ${error}`,
        details: { error: error.toString() },
        created_at: new Date().toISOString()
      };
    }
  }

  private async testFormAccessibility(): Promise<TestResult> {
    try {
      const formInfo = await this.page.evaluate(() => {
        const results = {
          totalForms: 0,
          totalInputs: 0,
          inputsWithLabels: 0,
          inputsWithPlaceholders: 0,
          inputsWithRequiredIndicators: 0,
          inputsWithErrorMessages: 0,
          formsWithFieldsets: 0,
          inputsWithDescriptions: 0,
          accessibilityFeatures: [] as string[]
        };

        const forms = document.querySelectorAll('form');
        results.totalForms = forms.length;

        const inputs = document.querySelectorAll('input, textarea, select');
        results.totalInputs = inputs.length;

        inputs.forEach(input => {
          // Check for labels
          const label = document.querySelector(`label[for="${input.id}"]`) || input.closest('label');
          if (label || input.getAttribute('aria-label') || input.getAttribute('aria-labelledby')) {
            results.inputsWithLabels++;
          }

          // Check for placeholders
          if (input.getAttribute('placeholder')) {
            results.inputsWithPlaceholders++;
          }

          // Check for required indicators
          if (input.hasAttribute('required') || input.getAttribute('aria-required') === 'true') {
            results.inputsWithRequiredIndicators++;
          }

          // Check for error messages
          if (input.getAttribute('aria-describedby') || input.getAttribute('aria-invalid')) {
            results.inputsWithErrorMessages++;
          }

          // Check for descriptions
          if (input.getAttribute('aria-describedby')) {
            results.inputsWithDescriptions++;
          }
        });

        // Check for fieldsets
        forms.forEach(form => {
          const fieldsets = form.querySelectorAll('fieldset');
          if (fieldsets.length > 0) {
            results.formsWithFieldsets++;
          }
        });

        // Compile accessibility features found
        if (results.inputsWithLabels > 0) results.accessibilityFeatures.push('Etiquetas');
        if (results.inputsWithRequiredIndicators > 0) results.accessibilityFeatures.push('Indicadores Requeridos');
        if (results.inputsWithErrorMessages > 0) results.accessibilityFeatures.push('Mensajes de Error');
        if (results.formsWithFieldsets > 0) results.accessibilityFeatures.push('Fieldsets');
        if (results.inputsWithDescriptions > 0) results.accessibilityFeatures.push('Descripciones');

        return results;
      });

      let score = 100;
      let issues = [];

      if (formInfo.totalForms === 0) {
        score = 100; // No forms is not necessarily bad
      } else {
        // Check label coverage
        const labelCoverage = formInfo.totalInputs > 0 ? 
          formInfo.inputsWithLabels / formInfo.totalInputs : 1;
        
        if (labelCoverage >= 0.9) {
          score += 0; // Already at 100
        } else if (labelCoverage >= 0.7) {
          score -= 20;
          issues.push('Algunos campos sin etiquetas');
        } else {
          score -= 40;
          issues.push('Muchos campos sin etiquetas');
        }

        // Check required indicators
        if (formInfo.inputsWithRequiredIndicators === 0 && formInfo.totalInputs > 0) {
          score -= 15;
          issues.push('Faltan indicadores de campos requeridos');
        }

        // Check fieldsets for complex forms
        if (formInfo.totalInputs > 5 && formInfo.formsWithFieldsets === 0) {
          score -= 15;
          issues.push('Formularios complejos sin fieldsets');
        }

        // Bonus for error handling
        if (formInfo.inputsWithErrorMessages > 0) {
          score += 10;
        }

        // Bonus for descriptions
        if (formInfo.inputsWithDescriptions > 0) {
          score += 5;
        }
      }

      const status = score >= 80 ? 'passed' : score >= 60 ? 'warning' : 'failed';

      return {
        analysis_id: this.analysisId,
        category: 'Accesibilidad',
        test_name: 'Accesibilidad de Formularios',
        status,
        score: Math.max(0, Math.min(100, score)),
        message: formInfo.totalForms === 0 ? 'No se encontraron formularios' : 
                issues.length === 0 ? 'Formularios accesibles' : issues.join(', '),
        details: formInfo,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        analysis_id: this.analysisId,
        category: 'Accesibilidad',
        test_name: 'Accesibilidad de Formularios',
        status: 'failed',
        score: 0,
        message: `Error al verificar formularios: ${error}`,
        details: { error: error.toString() },
        created_at: new Date().toISOString()
      };
    }
  }

  private async testImageAccessibility(): Promise<TestResult> {
    try {
      const imageInfo = await this.page.evaluate(() => {
        const results = {
          totalImages: 0,
          imagesWithAlt: 0,
          imagesWithEmptyAlt: 0,
          imagesWithDescriptiveAlt: 0,
          decorativeImages: 0,
          imagesWithLongDesc: 0,
          complexImages: 0,
          accessibilityFeatures: [] as string[]
        };

        const images = document.querySelectorAll('img');
        results.totalImages = images.length;

        images.forEach(img => {
          const alt = img.getAttribute('alt');
          const longDesc = img.getAttribute('longdesc');
          const ariaLabel = img.getAttribute('aria-label');
          const ariaDescribedBy = img.getAttribute('aria-describedby');
          
          // Check alt attribute
          if (alt !== null) {
            results.imagesWithAlt++;
            
            if (alt.trim() === '') {
              results.imagesWithEmptyAlt++;
              results.decorativeImages++;
            } else {
              // Check if alt text is descriptive
              if (alt.length > 10 && !alt.includes('.jpg') && !alt.includes('.png') && !alt.includes('.gif')) {
                results.imagesWithDescriptiveAlt++;
              }
            }
          }

          // Check for long descriptions
          if (longDesc || ariaDescribedBy) {
            results.imagesWithLongDesc++;
          }

          // Identify complex images (charts, graphs, etc.)
          const src = img.getAttribute('src')?.toLowerCase() || '';
          const altText = (alt || ariaLabel || '').toLowerCase();
          
          if (altText.includes('chart') || altText.includes('graph') || altText.includes('diagram') ||
              altText.includes('gráfico') || altText.includes('diagrama') || altText.includes('tabla') ||
              src.includes('chart') || src.includes('graph')) {
            results.complexImages++;
          }
        });

        // Compile accessibility features
        if (results.imagesWithAlt > 0) results.accessibilityFeatures.push('Atributos Alt');
        if (results.decorativeImages > 0) results.accessibilityFeatures.push('Imágenes Decorativas Marcadas');
        if (results.imagesWithLongDesc > 0) results.accessibilityFeatures.push('Descripciones Largas');
        if (results.imagesWithDescriptiveAlt > 0) results.accessibilityFeatures.push('Textos Alt Descriptivos');

        return results;
      });

      let score = 100;
      let issues = [];

      if (imageInfo.totalImages === 0) {
        score = 100; // No images is not necessarily bad
      } else {
        // Check alt attribute coverage
        const altCoverage = imageInfo.imagesWithAlt / imageInfo.totalImages;
        
        if (altCoverage >= 0.95) {
          score += 0; // Already at 100
        } else if (altCoverage >= 0.8) {
          score -= 20;
          issues.push('Algunas imágenes sin atributo alt');
        } else {
          score -= 40;
          issues.push('Muchas imágenes sin atributo alt');
        }

        // Check descriptive alt texts
        const descriptiveCoverage = imageInfo.totalImages > 0 ? 
          imageInfo.imagesWithDescriptiveAlt / imageInfo.totalImages : 1;
        
        if (descriptiveCoverage < 0.5) {
          score -= 20;
          issues.push('Textos alt poco descriptivos');
        }

        // Check complex images
        if (imageInfo.complexImages > 0 && imageInfo.imagesWithLongDesc === 0) {
          score -= 25;
          issues.push('Imágenes complejas sin descripciones largas');
        }

        // Bonus for proper decorative image marking
        if (imageInfo.decorativeImages > 0) {
          score += 10;
        }

        // Bonus for long descriptions
        if (imageInfo.imagesWithLongDesc > 0) {
          score += 15;
        }
      }

      const status = score >= 80 ? 'passed' : score >= 60 ? 'warning' : 'failed';

      return {
        analysis_id: this.analysisId,
        category: 'Accesibilidad',
        test_name: 'Accesibilidad de Imágenes',
        status,
        score: Math.max(0, Math.min(100, score)),
        message: imageInfo.totalImages === 0 ? 'No se encontraron imágenes' : 
                issues.length === 0 ? 'Imágenes accesibles' : issues.join(', '),
        details: imageInfo,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        analysis_id: this.analysisId,
        category: 'Accesibilidad',
        test_name: 'Accesibilidad de Imágenes',
        status: 'failed',
        score: 0,
        message: `Error al verificar imágenes: ${error}`,
        details: { error: error.toString() },
        created_at: new Date().toISOString()
      };
    }
  }

  private async testDocumentStructure(): Promise<TestResult> {
    try {
      const structureInfo = await this.page.evaluate(() => {
        const results = {
          hasDoctype: false,
          hasLangAttribute: false,
          hasTitle: false,
          hasMainLandmark: false,
          hasNavLandmark: false,
          hasHeaderLandmark: false,
          hasFooterLandmark: false,
          headingLevels: [] as number[],
          hasProperHeadingHierarchy: false,
          hasSkipLinks: false,
          foundLandmarks: [] as string[]
        };

        // Check doctype
        results.hasDoctype = document.doctype !== null;

        // Check lang attribute
        const htmlElement = document.documentElement;
        results.hasLangAttribute = htmlElement.hasAttribute('lang');

        // Check title
        results.hasTitle = !!document.title && document.title.trim().length > 0;

        // Check landmarks
        const main = document.querySelector('main, [role="main"]');
        results.hasMainLandmark = !!main;
        if (main) results.foundLandmarks.push('main');

        const nav = document.querySelector('nav, [role="navigation"]');
        results.hasNavLandmark = !!nav;
        if (nav) results.foundLandmarks.push('navigation');

        const header = document.querySelector('header, [role="banner"]');
        results.hasHeaderLandmark = !!header;
        if (header) results.foundLandmarks.push('banner');

        const footer = document.querySelector('footer, [role="contentinfo"]');
        results.hasFooterLandmark = !!footer;
        if (footer) results.foundLandmarks.push('contentinfo');

        // Check heading hierarchy
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        results.headingLevels = headings.map(h => parseInt(h.tagName.charAt(1)));

        // Check if heading hierarchy is proper
        let hasProperHierarchy = true;
        let previousLevel = 0;

        for (const level of results.headingLevels) {
          if (level > previousLevel + 1) {
            hasProperHierarchy = false;
            break;
          }
          previousLevel = level;
        }

        results.hasProperHeadingHierarchy = hasProperHierarchy && results.headingLevels.length > 0;

        // Check for skip links
        const skipLinks = document.querySelectorAll('a[href^="#"], .skip-link, #skip-link');
        results.hasSkipLinks = skipLinks.length > 0;

        return results;
      });

      let score = 0;
      let issues = [];

      if (structureInfo.hasDoctype) {
        score += 10;
      } else {
        issues.push('Falta declaración DOCTYPE');
      }

      if (structureInfo.hasLangAttribute) {
        score += 15;
      } else {
        issues.push('Falta atributo lang en HTML');
      }

      if (structureInfo.hasTitle) {
        score += 15;
      } else {
        issues.push('Falta título del documento');
      }

      if (structureInfo.hasMainLandmark) {
        score += 20;
      } else {
        issues.push('Falta landmark main');
      }

      if (structureInfo.hasNavLandmark) {
        score += 15;
      } else {
        issues.push('Falta landmark navigation');
      }

      if (structureInfo.hasHeaderLandmark) {
        score += 10;
      }

      if (structureInfo.hasFooterLandmark) {
        score += 5;
      }

      if (structureInfo.hasProperHeadingHierarchy) {
        score += 15;
      } else {
        issues.push('Jerarquía de encabezados incorrecta');
      }

      if (structureInfo.hasSkipLinks) {
        score += 5;
      } else {
        issues.push('Faltan enlaces de salto');
      }

      const status = score >= 80 ? 'passed' : score >= 60 ? 'warning' : 'failed';

      return {
        analysis_id: this.analysisId,
        category: 'Accesibilidad',
        test_name: 'Estructura del Documento',
        status,
        score,
        message: issues.length === 0 ? 'Estructura del documento accesible' : issues.join(', '),
        details: structureInfo,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        analysis_id: this.analysisId,
        category: 'Accesibilidad',
        test_name: 'Estructura del Documento',
        status: 'failed',
        score: 0,
        message: `Error al verificar estructura: ${error}`,
        details: { error: error.toString() },
        created_at: new Date().toISOString()
      };
    }
  }
}