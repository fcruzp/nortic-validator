import { Page } from 'playwright';
import { TestResult } from '../models/database';

export interface SecurityTestResult {
  category: string;
  tests: TestResult[];
  score: number;
}

export class SecurityTester {
  private page: Page;
  private analysisId: string;

  constructor(page: Page, analysisId: string) {
    this.page = page;
    this.analysisId = analysisId;
  }

  async runAllTests(): Promise<SecurityTestResult> {
    const tests: TestResult[] = [];

    // Test 1: HTTPS Implementation
    tests.push(await this.testHTTPSImplementation());

    // Test 2: Security Headers
    tests.push(await this.testSecurityHeaders());

    // Test 3: Form Security
    tests.push(await this.testFormSecurity());

    // Test 4: Content Security Policy
    tests.push(await this.testContentSecurityPolicy());

    // Test 5: Cookie Security
    tests.push(await this.testCookieSecurity());

    // Test 6: External Resources Security
    tests.push(await this.testExternalResourcesSecurity());

    // Calculate overall score
    const totalScore = tests.reduce((sum, test) => sum + (test.score || 0), 0);
    const score = Math.round(totalScore / tests.length);

    return {
      category: 'Seguridad',
      tests,
      score
    };
  }

  private async testHTTPSImplementation(): Promise<TestResult> {
    try {
      const httpsInfo = await this.page.evaluate(() => {
        const results = {
          isHTTPS: window.location.protocol === 'https:',
          hasSecureContext: window.isSecureContext,
          mixedContent: [] as string[],
          insecureResources: [] as string[]
        };

        // Check for mixed content
        const allResources = Array.from(document.querySelectorAll('img, script, link, iframe'));
        
        allResources.forEach(element => {
          const src = element.getAttribute('src') || element.getAttribute('href');
          if (src && src.startsWith('http://')) {
            results.mixedContent.push(src);
            results.insecureResources.push(element.tagName.toLowerCase());
          }
        });

        return results;
      });

      let score = 0;
      let issues = [];

      if (httpsInfo.isHTTPS) {
        score += 50;
      } else {
        issues.push('Sitio no usa HTTPS');
      }

      if (httpsInfo.hasSecureContext) {
        score += 25;
      } else {
        issues.push('Contexto no seguro');
      }

      if (httpsInfo.mixedContent.length === 0) {
        score += 25;
      } else {
        issues.push(`${httpsInfo.mixedContent.length} recursos inseguros encontrados`);
      }

      const status = score >= 80 ? 'passed' : score >= 60 ? 'warning' : 'failed';

      return {
        analysis_id: this.analysisId,
        category: 'Seguridad',
        test_name: 'Implementación HTTPS',
        status,
        score,
        message: issues.length === 0 ? 'HTTPS implementado correctamente' : issues.join(', '),
        details: httpsInfo,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        analysis_id: this.analysisId,
        category: 'Seguridad',
        test_name: 'Implementación HTTPS',
        status: 'failed',
        score: 0,
        message: `Error al verificar HTTPS: ${error}`,
        details: { error: error.toString() },
        created_at: new Date().toISOString()
      };
    }
  }

  private async testSecurityHeaders(): Promise<TestResult> {
    try {
      const response = await this.page.goto(this.page.url(), { waitUntil: 'networkidle' });
      const headers = response?.headers() || {};

      const securityHeaders = {
        hasXFrameOptions: !!headers['x-frame-options'],
        hasXContentTypeOptions: !!headers['x-content-type-options'],
        hasXXSSProtection: !!headers['x-xss-protection'],
        hasStrictTransportSecurity: !!headers['strict-transport-security'],
        hasReferrerPolicy: !!headers['referrer-policy'],
        hasContentSecurityPolicy: !!headers['content-security-policy'],
        foundHeaders: [] as string[]
      };

      if (securityHeaders.hasXFrameOptions) securityHeaders.foundHeaders.push('X-Frame-Options');
      if (securityHeaders.hasXContentTypeOptions) securityHeaders.foundHeaders.push('X-Content-Type-Options');
      if (securityHeaders.hasXXSSProtection) securityHeaders.foundHeaders.push('X-XSS-Protection');
      if (securityHeaders.hasStrictTransportSecurity) securityHeaders.foundHeaders.push('Strict-Transport-Security');
      if (securityHeaders.hasReferrerPolicy) securityHeaders.foundHeaders.push('Referrer-Policy');
      if (securityHeaders.hasContentSecurityPolicy) securityHeaders.foundHeaders.push('Content-Security-Policy');

      let score = 0;
      if (securityHeaders.hasXFrameOptions) score += 15;
      if (securityHeaders.hasXContentTypeOptions) score += 15;
      if (securityHeaders.hasXXSSProtection) score += 15;
      if (securityHeaders.hasStrictTransportSecurity) score += 20;
      if (securityHeaders.hasReferrerPolicy) score += 15;
      if (securityHeaders.hasContentSecurityPolicy) score += 20;

      const status = score >= 80 ? 'passed' : score >= 60 ? 'warning' : 'failed';

      return {
        analysis_id: this.analysisId,
        category: 'Seguridad',
        test_name: 'Cabeceras de Seguridad',
        status,
        score,
        message: `${securityHeaders.foundHeaders.length}/6 cabeceras de seguridad encontradas: ${securityHeaders.foundHeaders.join(', ')}`,
        details: { securityHeaders, allHeaders: headers },
        created_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        analysis_id: this.analysisId,
        category: 'Seguridad',
        test_name: 'Cabeceras de Seguridad',
        status: 'failed',
        score: 0,
        message: `Error al verificar cabeceras de seguridad: ${error}`,
        details: { error: error.toString() },
        created_at: new Date().toISOString()
      };
    }
  }

  private async testFormSecurity(): Promise<TestResult> {
    try {
      const formSecurity = await this.page.evaluate(() => {
        const results = {
          formsCount: 0,
          secureFormsCount: 0,
          hasCSRFProtection: false,
          hasInputValidation: false,
          hasPasswordFields: false,
          securePasswordFields: 0,
          foundSecurityFeatures: [] as string[]
        };

        const forms = document.querySelectorAll('form');
        results.formsCount = forms.length;

        forms.forEach(form => {
          // Check if form submits to HTTPS
          const action = form.getAttribute('action') || '';
          if (action.startsWith('https://') || (!action.includes('http://') && window.location.protocol === 'https:')) {
            results.secureFormsCount++;
          }

          // Check for CSRF tokens
          const csrfInputs = form.querySelectorAll('input[name*="csrf"], input[name*="token"], input[type="hidden"]');
          if (csrfInputs.length > 0) {
            results.hasCSRFProtection = true;
            results.foundSecurityFeatures.push('Protección CSRF');
          }

          // Check for input validation
          const validatedInputs = form.querySelectorAll('input[required], input[pattern], input[minlength], input[maxlength]');
          if (validatedInputs.length > 0) {
            results.hasInputValidation = true;
            results.foundSecurityFeatures.push('Validación de Entrada');
          }

          // Check password fields
          const passwordFields = form.querySelectorAll('input[type="password"]');
          results.hasPasswordFields = passwordFields.length > 0;
          
          passwordFields.forEach(field => {
            if (field.hasAttribute('autocomplete') && field.getAttribute('autocomplete') !== 'off') {
              results.securePasswordFields++;
            }
          });
        });

        return results;
      });

      let score = 100;
      let issues = [];

      if (formSecurity.formsCount === 0) {
        score = 100; // No forms is not necessarily bad
      } else {
        const secureFormRatio = formSecurity.secureFormsCount / formSecurity.formsCount;
        
        if (secureFormRatio < 1) {
          score -= 30;
          issues.push('Algunos formularios no son seguros');
        }

        if (!formSecurity.hasCSRFProtection && formSecurity.formsCount > 0) {
          score -= 25;
          issues.push('Falta protección CSRF');
        }

        if (!formSecurity.hasInputValidation && formSecurity.formsCount > 0) {
          score -= 20;
          issues.push('Falta validación de entrada');
        }

        if (formSecurity.hasPasswordFields && formSecurity.securePasswordFields === 0) {
          score -= 25;
          issues.push('Campos de contraseña inseguros');
        }
      }

      const status = score >= 80 ? 'passed' : score >= 60 ? 'warning' : 'failed';

      return {
        analysis_id: this.analysisId,
        category: 'Seguridad',
        test_name: 'Seguridad de Formularios',
        status,
        score: Math.max(0, score),
        message: formSecurity.formsCount === 0 ? 'No se encontraron formularios' : 
                issues.length === 0 ? 'Formularios seguros' : issues.join(', '),
        details: formSecurity,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        analysis_id: this.analysisId,
        category: 'Seguridad',
        test_name: 'Seguridad de Formularios',
        status: 'failed',
        score: 0,
        message: `Error al verificar seguridad de formularios: ${error}`,
        details: { error: error.toString() },
        created_at: new Date().toISOString()
      };
    }
  }

  private async testContentSecurityPolicy(): Promise<TestResult> {
    try {
      const cspInfo = await this.page.evaluate(() => {
        const results = {
          hasCSPHeader: false,
          hasCSPMeta: false,
          cspDirectives: [] as string[],
          hasUnsafeInline: false,
          hasUnsafeEval: false,
          allowsAllSources: false
        };

        // Check for CSP meta tag
        const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
        if (cspMeta) {
          results.hasCSPMeta = true;
          const content = cspMeta.getAttribute('content') || '';
          
          // Parse CSP directives
          const directives = content.split(';').map(d => d.trim().split(' ')[0]);
          results.cspDirectives = directives;

          // Check for unsafe practices
          if (content.includes("'unsafe-inline'")) {
            results.hasUnsafeInline = true;
          }
          
          if (content.includes("'unsafe-eval'")) {
            results.hasUnsafeEval = true;
          }

          if (content.includes('*') && !content.includes("'self'")) {
            results.allowsAllSources = true;
          }
        }

        return results;
      });

      // CSP header would be checked in testSecurityHeaders
      const response = await this.page.goto(this.page.url(), { waitUntil: 'networkidle' });
      const headers = response?.headers() || {};
      cspInfo.hasCSPHeader = !!headers['content-security-policy'];

      let score = 0;
      let issues = [];

      if (cspInfo.hasCSPHeader || cspInfo.hasCSPMeta) {
        score += 40;
      } else {
        issues.push('No se encontró Content Security Policy');
      }

      if (cspInfo.cspDirectives.length > 0) {
        score += 20;
      }

      if (cspInfo.hasUnsafeInline) {
        score -= 20;
        issues.push("Permite 'unsafe-inline'");
      }

      if (cspInfo.hasUnsafeEval) {
        score -= 20;
        issues.push("Permite 'unsafe-eval'");
      }

      if (cspInfo.allowsAllSources) {
        score -= 15;
        issues.push('Permite todas las fuentes (*)');
      }

      if (!cspInfo.hasUnsafeInline && !cspInfo.hasUnsafeEval && !cspInfo.allowsAllSources && cspInfo.cspDirectives.length > 0) {
        score += 40;
      }

      const status = score >= 80 ? 'passed' : score >= 60 ? 'warning' : 'failed';

      return {
        analysis_id: this.analysisId,
        category: 'Seguridad',
        test_name: 'Política de Seguridad de Contenido',
        status,
        score: Math.max(0, score),
        message: issues.length === 0 ? 'CSP implementado correctamente' : issues.join(', '),
        details: cspInfo,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        analysis_id: this.analysisId,
        category: 'Seguridad',
        test_name: 'Política de Seguridad de Contenido',
        status: 'failed',
        score: 0,
        message: `Error al verificar CSP: ${error}`,
        details: { error: error.toString() },
        created_at: new Date().toISOString()
      };
    }
  }

  private async testCookieSecurity(): Promise<TestResult> {
    try {
      const cookieInfo = await this.page.evaluate(() => {
        const results = {
          cookiesCount: 0,
          secureCookies: 0,
          httpOnlyCookies: 0,
          sameSiteCookies: 0,
          foundSecurityFeatures: [] as string[]
        };

        const cookies = document.cookie.split(';');
        results.cookiesCount = cookies.filter(c => c.trim().length > 0).length;

        // Note: JavaScript cannot access HttpOnly cookies or see Secure/SameSite flags
        // This would need to be checked via network monitoring or server-side
        
        return results;
      });

      // Get cookies from browser context
      const browserCookies = await this.page.context().cookies();
      
      cookieInfo.cookiesCount = browserCookies.length;
      cookieInfo.secureCookies = browserCookies.filter(c => c.secure).length;
      cookieInfo.httpOnlyCookies = browserCookies.filter(c => c.httpOnly).length;
      cookieInfo.sameSiteCookies = browserCookies.filter(c => c.sameSite && c.sameSite !== 'None').length;

      if (cookieInfo.secureCookies > 0) cookieInfo.foundSecurityFeatures.push('Cookies Seguras');
      if (cookieInfo.httpOnlyCookies > 0) cookieInfo.foundSecurityFeatures.push('Cookies HttpOnly');
      if (cookieInfo.sameSiteCookies > 0) cookieInfo.foundSecurityFeatures.push('Cookies SameSite');

      let score = 100;
      let issues = [];

      if (cookieInfo.cookiesCount === 0) {
        score = 100; // No cookies is not necessarily bad
      } else {
        const secureRatio = cookieInfo.secureCookies / cookieInfo.cookiesCount;
        const httpOnlyRatio = cookieInfo.httpOnlyCookies / cookieInfo.cookiesCount;
        const sameSiteRatio = cookieInfo.sameSiteCookies / cookieInfo.cookiesCount;

        if (secureRatio < 0.8) {
          score -= 30;
          issues.push('Algunas cookies no son seguras');
        }

        if (httpOnlyRatio < 0.5) {
          score -= 25;
          issues.push('Faltan cookies HttpOnly');
        }

        if (sameSiteRatio < 0.5) {
          score -= 20;
          issues.push('Faltan cookies SameSite');
        }
      }

      const status = score >= 80 ? 'passed' : score >= 60 ? 'warning' : 'failed';

      return {
        analysis_id: this.analysisId,
        category: 'Seguridad',
        test_name: 'Seguridad de Cookies',
        status,
        score: Math.max(0, score),
        message: cookieInfo.cookiesCount === 0 ? 'No se encontraron cookies' : 
                issues.length === 0 ? 'Cookies configuradas de forma segura' : issues.join(', '),
        details: cookieInfo,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        analysis_id: this.analysisId,
        category: 'Seguridad',
        test_name: 'Seguridad de Cookies',
        status: 'failed',
        score: 0,
        message: `Error al verificar seguridad de cookies: ${error}`,
        details: { error: error.toString() },
        created_at: new Date().toISOString()
      };
    }
  }

  private async testExternalResourcesSecurity(): Promise<TestResult> {
    try {
      const externalResources = await this.page.evaluate(() => {
        const results = {
          totalResources: 0,
          externalResources: 0,
          secureExternalResources: 0,
          hasIntegrityChecks: 0,
          hasCrossOriginAttributes: 0,
          foundSecurityFeatures: [] as string[],
          externalDomains: [] as string[]
        };

        const currentDomain = window.location.hostname;
        const allResources = Array.from(document.querySelectorAll('script, link, img, iframe'));
        
        results.totalResources = allResources.length;

        allResources.forEach(element => {
          const src = element.getAttribute('src') || element.getAttribute('href');
          
          if (src) {
            try {
              const url = new URL(src, window.location.href);
              
              if (url.hostname !== currentDomain) {
                results.externalResources++;
                
                if (!results.externalDomains.includes(url.hostname)) {
                  results.externalDomains.push(url.hostname);
                }

                if (url.protocol === 'https:') {
                  results.secureExternalResources++;
                }

                // Check for integrity attribute
                if (element.hasAttribute('integrity')) {
                  results.hasIntegrityChecks++;
                }

                // Check for crossorigin attribute
                if (element.hasAttribute('crossorigin')) {
                  results.hasCrossOriginAttributes++;
                }
              }
            } catch (e) {
              // Invalid URL, skip
            }
          }
        });

        if (results.hasIntegrityChecks > 0) results.foundSecurityFeatures.push('Verificación de Integridad');
        if (results.hasCrossOriginAttributes > 0) results.foundSecurityFeatures.push('Atributos CrossOrigin');

        return results;
      });

      let score = 100;
      let issues = [];

      if (externalResources.externalResources === 0) {
        score = 100; // No external resources is secure
      } else {
        const secureRatio = externalResources.secureExternalResources / externalResources.externalResources;
        const integrityRatio = externalResources.hasIntegrityChecks / externalResources.externalResources;
        const crossOriginRatio = externalResources.hasCrossOriginAttributes / externalResources.externalResources;

        if (secureRatio < 1) {
          score -= 40;
          issues.push('Algunos recursos externos no son seguros');
        }

        if (integrityRatio < 0.5) {
          score -= 30;
          issues.push('Faltan verificaciones de integridad');
        }

        if (crossOriginRatio < 0.3) {
          score -= 20;
          issues.push('Faltan atributos crossorigin');
        }

        if (externalResources.externalDomains.length > 10) {
          score -= 10;
          issues.push('Demasiados dominios externos');
        }
      }

      const status = score >= 80 ? 'passed' : score >= 60 ? 'warning' : 'failed';

      return {
        analysis_id: this.analysisId,
        category: 'Seguridad',
        test_name: 'Seguridad de Recursos Externos',
        status,
        score: Math.max(0, score),
        message: externalResources.externalResources === 0 ? 'No se encontraron recursos externos' : 
                issues.length === 0 ? 'Recursos externos seguros' : issues.join(', '),
        details: externalResources,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        analysis_id: this.analysisId,
        category: 'Seguridad',
        test_name: 'Seguridad de Recursos Externos',
        status: 'failed',
        score: 0,
        message: `Error al verificar recursos externos: ${error}`,
        details: { error: error.toString() },
        created_at: new Date().toISOString()
      };
    }
  }
}