import { Page } from 'playwright';
import { TestResult } from '../models/database';

export interface SEOTestResult {
  category: string;
  tests: TestResult[];
  score: number;
}

export class SEOTester {
  private page: Page;
  private analysisId: string;

  constructor(page: Page, analysisId: string) {
    this.page = page;
    this.analysisId = analysisId;
  }

  async runAllTests(): Promise<SEOTestResult> {
    const tests: TestResult[] = [];

    // Test 1: Title Tag Optimization
    tests.push(await this.testTitleTag());

    // Test 2: Meta Description
    tests.push(await this.testMetaDescription());

    // Test 3: Heading Structure
    tests.push(await this.testHeadingStructure());

    // Test 4: Image Alt Attributes
    tests.push(await this.testImageAltAttributes());

    // Test 5: URL Structure
    tests.push(await this.testURLStructure());

    // Test 6: Internal Linking
    tests.push(await this.testInternalLinking());

    // Calculate overall score
    const totalScore = tests.reduce((sum, test) => sum + (test.score || 0), 0);
    const score = Math.round(totalScore / tests.length);

    return {
      category: 'SEO',
      tests,
      score
    };
  }

  private async testTitleTag(): Promise<TestResult> {
    try {
      const titleInfo = await this.page.evaluate(() => {
        const results = {
          hasTitle: false,
          titleLength: 0,
          titleContent: '',
          isOptimalLength: false,
          hasInstitutionName: false,
          hasKeywords: false
        };

        const titleElement = document.querySelector('title');
        if (titleElement && titleElement.textContent) {
          results.hasTitle = true;
          results.titleContent = titleElement.textContent.trim();
          results.titleLength = results.titleContent.length;
          results.isOptimalLength = results.titleLength >= 30 && results.titleLength <= 60;

          const titleLower = results.titleContent.toLowerCase();
          
          // Check for institution-related keywords
          const institutionKeywords = ['gobierno', 'ministerio', 'presidencia', 'república dominicana', 'gob.do'];
          results.hasInstitutionName = institutionKeywords.some(keyword => titleLower.includes(keyword));

          // Check for relevant keywords
          const relevantKeywords = ['servicios', 'información', 'transparencia', 'ciudadanos', 'trámites'];
          results.hasKeywords = relevantKeywords.some(keyword => titleLower.includes(keyword));
        }

        return results;
      });

      let score = 0;
      let issues = [];

      if (titleInfo.hasTitle) {
        score += 30;
      } else {
        issues.push('Falta etiqueta title');
      }

      if (titleInfo.isOptimalLength) {
        score += 25;
      } else if (titleInfo.titleLength > 0) {
        score += 15;
        if (titleInfo.titleLength < 30) {
          issues.push('Title muy corto');
        } else if (titleInfo.titleLength > 60) {
          issues.push('Title muy largo');
        }
      }

      if (titleInfo.hasInstitutionName) {
        score += 25;
      } else {
        issues.push('Falta nombre de institución en title');
      }

      if (titleInfo.hasKeywords) {
        score += 20;
      } else {
        issues.push('Faltan palabras clave relevantes');
      }

      const status = score >= 80 ? 'passed' : score >= 60 ? 'warning' : 'failed';

      return {
        analysis_id: this.analysisId,
        category: 'SEO',
        test_name: 'Optimización de Etiqueta Title',
        status,
        score,
        message: issues.length === 0 ? `Title optimizado: "${titleInfo.titleContent}"` : issues.join(', '),
        details: titleInfo,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        analysis_id: this.analysisId,
        category: 'SEO',
        test_name: 'Optimización de Etiqueta Title',
        status: 'failed',
        score: 0,
        message: `Error al analizar title: ${error}`,
        details: { error: error.toString() },
        created_at: new Date().toISOString()
      };
    }
  }

  private async testMetaDescription(): Promise<TestResult> {
    try {
      const metaInfo = await this.page.evaluate(() => {
        const results = {
          hasMetaDescription: false,
          descriptionLength: 0,
          descriptionContent: '',
          isOptimalLength: false,
          hasInstitutionInfo: false,
          hasCallToAction: false
        };

        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription && metaDescription.getAttribute('content')) {
          results.hasMetaDescription = true;
          results.descriptionContent = metaDescription.getAttribute('content')?.trim() || '';
          results.descriptionLength = results.descriptionContent.length;
          results.isOptimalLength = results.descriptionLength >= 120 && results.descriptionLength <= 160;

          const descriptionLower = results.descriptionContent.toLowerCase();
          
          // Check for institution information
          const institutionKeywords = ['gobierno', 'ministerio', 'presidencia', 'república dominicana', 'institución'];
          results.hasInstitutionInfo = institutionKeywords.some(keyword => descriptionLower.includes(keyword));

          // Check for call to action
          const ctaKeywords = ['consulta', 'solicita', 'accede', 'visita', 'conoce', 'descubre', 'obtén'];
          results.hasCallToAction = ctaKeywords.some(keyword => descriptionLower.includes(keyword));
        }

        return results;
      });

      let score = 0;
      let issues = [];

      if (metaInfo.hasMetaDescription) {
        score += 30;
      } else {
        issues.push('Falta meta description');
      }

      if (metaInfo.isOptimalLength) {
        score += 30;
      } else if (metaInfo.descriptionLength > 0) {
        score += 20;
        if (metaInfo.descriptionLength < 120) {
          issues.push('Meta description muy corta');
        } else if (metaInfo.descriptionLength > 160) {
          issues.push('Meta description muy larga');
        }
      }

      if (metaInfo.hasInstitutionInfo) {
        score += 20;
      } else {
        issues.push('Falta información institucional');
      }

      if (metaInfo.hasCallToAction) {
        score += 20;
      } else {
        issues.push('Falta llamada a la acción');
      }

      const status = score >= 80 ? 'passed' : score >= 60 ? 'warning' : 'failed';

      return {
        analysis_id: this.analysisId,
        category: 'SEO',
        test_name: 'Meta Descripción',
        status,
        score,
        message: issues.length === 0 ? 'Meta description optimizada' : issues.join(', '),
        details: metaInfo,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        analysis_id: this.analysisId,
        category: 'SEO',
        test_name: 'Meta Descripción',
        status: 'failed',
        score: 0,
        message: `Error al analizar meta description: ${error}`,
        details: { error: error.toString() },
        created_at: new Date().toISOString()
      };
    }
  }

  private async testHeadingStructure(): Promise<TestResult> {
    try {
      const headingInfo = await this.page.evaluate(() => {
        const results = {
          hasH1: false,
          h1Count: 0,
          h1Content: '',
          hasHierarchy: false,
          headingCounts: {
            h1: 0,
            h2: 0,
            h3: 0,
            h4: 0,
            h5: 0,
            h6: 0
          },
          headingStructure: [] as string[]
        };

        // Count all headings
        for (let i = 1; i <= 6; i++) {
          const headings = document.querySelectorAll(`h${i}`);
          results.headingCounts[`h${i}` as keyof typeof results.headingCounts] = headings.length;
          
          if (i === 1) {
            results.h1Count = headings.length;
            results.hasH1 = headings.length > 0;
            if (headings.length > 0) {
              results.h1Content = headings[0].textContent?.trim() || '';
            }
          }
        }

        // Check for proper hierarchy
        const allHeadings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        let previousLevel = 0;
        let hasProperHierarchy = true;

        allHeadings.forEach(heading => {
          const currentLevel = parseInt(heading.tagName.charAt(1));
          results.headingStructure.push(`${heading.tagName}: ${heading.textContent?.trim().substring(0, 50) || ''}`);
          
          if (currentLevel > previousLevel + 1) {
            hasProperHierarchy = false;
          }
          previousLevel = currentLevel;
        });

        results.hasHierarchy = hasProperHierarchy;

        return results;
      });

      let score = 0;
      let issues = [];

      if (headingInfo.hasH1) {
        score += 30;
        if (headingInfo.h1Count === 1) {
          score += 10;
        } else {
          issues.push(`${headingInfo.h1Count} etiquetas H1 encontradas (debería ser 1)`);
        }
      } else {
        issues.push('Falta etiqueta H1');
      }

      if (headingInfo.hasHierarchy) {
        score += 25;
      } else {
        issues.push('Jerarquía de encabezados incorrecta');
      }

      const totalHeadings = Object.values(headingInfo.headingCounts).reduce((sum, count) => sum + count, 0);
      if (totalHeadings >= 3) {
        score += 20;
      } else if (totalHeadings > 0) {
        score += 10;
        issues.push('Pocos encabezados encontrados');
      }

      if (headingInfo.headingCounts.h2 > 0) {
        score += 15;
      } else {
        issues.push('Faltan etiquetas H2');
      }

      const status = score >= 80 ? 'passed' : score >= 60 ? 'warning' : 'failed';

      return {
        analysis_id: this.analysisId,
        category: 'SEO',
        test_name: 'Estructura de Encabezados',
        status,
        score,
        message: issues.length === 0 ? 'Estructura de encabezados optimizada' : issues.join(', '),
        details: headingInfo,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        analysis_id: this.analysisId,
        category: 'SEO',
        test_name: 'Estructura de Encabezados',
        status: 'failed',
        score: 0,
        message: `Error al analizar encabezados: ${error}`,
        details: { error: error.toString() },
        created_at: new Date().toISOString()
      };
    }
  }

  private async testImageAltAttributes(): Promise<TestResult> {
    try {
      const imageInfo = await this.page.evaluate(() => {
        const results = {
          totalImages: 0,
          imagesWithAlt: 0,
          imagesWithEmptyAlt: 0,
          imagesWithDescriptiveAlt: 0,
          decorativeImages: 0,
          altTexts: [] as string[]
        };

        const images = document.querySelectorAll('img');
        results.totalImages = images.length;

        images.forEach(img => {
          const alt = img.getAttribute('alt');
          
          if (alt !== null) {
            results.imagesWithAlt++;
            
            if (alt.trim() === '') {
              results.imagesWithEmptyAlt++;
              results.decorativeImages++;
            } else {
              results.altTexts.push(alt.trim());
              
              // Check if alt text is descriptive (more than just filename)
              if (alt.length > 10 && !alt.includes('.jpg') && !alt.includes('.png') && !alt.includes('.gif')) {
                results.imagesWithDescriptiveAlt++;
              }
            }
          }
        });

        return results;
      });

      let score = 0;
      let issues = [];

      if (imageInfo.totalImages === 0) {
        score = 100; // No images is not necessarily bad
      } else {
        const altCoverage = (imageInfo.imagesWithAlt / imageInfo.totalImages) * 100;
        const descriptiveCoverage = (imageInfo.imagesWithDescriptiveAlt / imageInfo.totalImages) * 100;

        if (altCoverage >= 95) {
          score += 40;
        } else if (altCoverage >= 80) {
          score += 30;
          issues.push('Algunas imágenes sin atributo alt');
        } else {
          score += 20;
          issues.push('Muchas imágenes sin atributo alt');
        }

        if (descriptiveCoverage >= 70) {
          score += 30;
        } else if (descriptiveCoverage >= 50) {
          score += 20;
          issues.push('Algunos textos alt poco descriptivos');
        } else {
          score += 10;
          issues.push('Textos alt poco descriptivos');
        }

        if (imageInfo.decorativeImages > 0) {
          score += 15; // Good practice to mark decorative images
        }

        // Bonus for having some descriptive alt texts
        if (imageInfo.imagesWithDescriptiveAlt > 0) {
          score += 15;
        }
      }

      const status = score >= 80 ? 'passed' : score >= 60 ? 'warning' : 'failed';

      return {
        analysis_id: this.analysisId,
        category: 'SEO',
        test_name: 'Atributos Alt de Imágenes',
        status,
        score: Math.min(100, score),
        message: imageInfo.totalImages === 0 ? 'No se encontraron imágenes' : 
                issues.length === 0 ? `${imageInfo.imagesWithAlt}/${imageInfo.totalImages} imágenes con alt` : issues.join(', '),
        details: imageInfo,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        analysis_id: this.analysisId,
        category: 'SEO',
        test_name: 'Atributos Alt de Imágenes',
        status: 'failed',
        score: 0,
        message: `Error al analizar atributos alt: ${error}`,
        details: { error: error.toString() },
        created_at: new Date().toISOString()
      };
    }
  }

  private async testURLStructure(): Promise<TestResult> {
    try {
      const urlInfo = await this.page.evaluate(() => {
        const results = {
          currentURL: window.location.href,
          isHTTPS: window.location.protocol === 'https:',
          hasGovernmentDomain: false,
          isDescriptive: false,
          hasParameters: false,
          urlLength: 0,
          pathSegments: [] as string[]
        };

        results.urlLength = results.currentURL.length;
        results.hasGovernmentDomain = window.location.hostname.includes('.gob.do') || 
                                      window.location.hostname.includes('.gov.do');

        const path = window.location.pathname;
        results.pathSegments = path.split('/').filter(segment => segment.length > 0);
        
        // Check if URL is descriptive (contains meaningful words, not just IDs)
        const meaningfulWords = ['servicios', 'transparencia', 'contacto', 'noticias', 'informacion', 
                               'tramites', 'ciudadanos', 'gobierno', 'ministerio'];
        results.isDescriptive = meaningfulWords.some(word => 
          results.currentURL.toLowerCase().includes(word)
        );

        results.hasParameters = window.location.search.length > 0;

        return results;
      });

      let score = 0;
      let issues = [];

      if (urlInfo.isHTTPS) {
        score += 25;
      } else {
        issues.push('URL no usa HTTPS');
      }

      if (urlInfo.hasGovernmentDomain) {
        score += 25;
      } else {
        issues.push('No es dominio gubernamental oficial');
      }

      if (urlInfo.isDescriptive) {
        score += 25;
      } else {
        issues.push('URL poco descriptiva');
      }

      if (urlInfo.urlLength <= 100) {
        score += 15;
      } else {
        issues.push('URL muy larga');
      }

      if (urlInfo.pathSegments.length > 0 && urlInfo.pathSegments.length <= 4) {
        score += 10;
      } else if (urlInfo.pathSegments.length > 4) {
        issues.push('Estructura de URL muy profunda');
      }

      const status = score >= 80 ? 'passed' : score >= 60 ? 'warning' : 'failed';

      return {
        analysis_id: this.analysisId,
        category: 'SEO',
        test_name: 'Estructura de URL',
        status,
        score,
        message: issues.length === 0 ? 'Estructura de URL optimizada' : issues.join(', '),
        details: urlInfo,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        analysis_id: this.analysisId,
        category: 'SEO',
        test_name: 'Estructura de URL',
        status: 'failed',
        score: 0,
        message: `Error al analizar URL: ${error}`,
        details: { error: error.toString() },
        created_at: new Date().toISOString()
      };
    }
  }

  private async testInternalLinking(): Promise<TestResult> {
    try {
      const linkInfo = await this.page.evaluate(() => {
        const results = {
          totalLinks: 0,
          internalLinks: 0,
          externalLinks: 0,
          linksWithTitle: 0,
          linksWithDescriptiveText: 0,
          emptyLinks: 0,
          navigationLinks: 0,
          contentLinks: 0
        };

        const currentDomain = window.location.hostname;
        const allLinks = document.querySelectorAll('a[href]');
        results.totalLinks = allLinks.length;

        allLinks.forEach(link => {
          const href = link.getAttribute('href') || '';
          const linkText = link.textContent?.trim() || '';
          
          // Classify link type
          try {
            const url = new URL(href, window.location.href);
            
            if (url.hostname === currentDomain) {
              results.internalLinks++;
            } else {
              results.externalLinks++;
            }
          } catch (e) {
            // Relative link, consider internal
            if (href.startsWith('/') || href.startsWith('./') || href.startsWith('../') || !href.includes('://')) {
              results.internalLinks++;
            }
          }

          // Check link attributes
          if (link.hasAttribute('title')) {
            results.linksWithTitle++;
          }

          // Check if link text is descriptive
          const nonDescriptiveTexts = ['click here', 'read more', 'more', 'here', 'link', 'página', 'más', 'aquí', 'enlace'];
          const isDescriptive = linkText.length > 3 && 
                               !nonDescriptiveTexts.includes(linkText.toLowerCase());
          
          if (isDescriptive) {
            results.linksWithDescriptiveText++;
          }

          if (linkText.length === 0) {
            results.emptyLinks++;
          }

          // Classify by location
          const nav = link.closest('nav, .navigation, .menu');
          const main = link.closest('main, .main-content, .content');
          
          if (nav) {
            results.navigationLinks++;
          } else if (main) {
            results.contentLinks++;
          }
        });

        return results;
      });

      let score = 0;
      let issues = [];

      if (linkInfo.totalLinks === 0) {
        score = 50; // No links is concerning for SEO
        issues.push('No se encontraron enlaces');
      } else {
        // Internal linking ratio
        const internalRatio = linkInfo.internalLinks / linkInfo.totalLinks;
        if (internalRatio >= 0.7) {
          score += 25;
        } else if (internalRatio >= 0.5) {
          score += 20;
        } else {
          score += 10;
          issues.push('Pocos enlaces internos');
        }

        // Descriptive link text
        const descriptiveRatio = linkInfo.linksWithDescriptiveText / linkInfo.totalLinks;
        if (descriptiveRatio >= 0.8) {
          score += 25;
        } else if (descriptiveRatio >= 0.6) {
          score += 20;
        } else {
          score += 10;
          issues.push('Textos de enlaces poco descriptivos');
        }

        // Navigation links
        if (linkInfo.navigationLinks > 0) {
          score += 20;
        } else {
          issues.push('Faltan enlaces de navegación');
        }

        // Content links
        if (linkInfo.contentLinks > 0) {
          score += 15;
        }

        // Title attributes
        if (linkInfo.linksWithTitle > 0) {
          score += 10;
        }

        // Penalty for empty links
        if (linkInfo.emptyLinks > 0) {
          score -= 15;
          issues.push('Enlaces sin texto');
        }

        // Minimum internal links
        if (linkInfo.internalLinks >= 5) {
          score += 5;
        }
      }

      const status = score >= 80 ? 'passed' : score >= 60 ? 'warning' : 'failed';

      return {
        analysis_id: this.analysisId,
        category: 'SEO',
        test_name: 'Enlaces Internos',
        status,
        score: Math.max(0, Math.min(100, score)),
        message: issues.length === 0 ? `${linkInfo.internalLinks} enlaces internos encontrados` : issues.join(', '),
        details: linkInfo,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        analysis_id: this.analysisId,
        category: 'SEO',
        test_name: 'Enlaces Internos',
        status: 'failed',
        score: 0,
        message: `Error al analizar enlaces: ${error}`,
        details: { error: error.toString() },
        created_at: new Date().toISOString()
      };
    }
  }
}