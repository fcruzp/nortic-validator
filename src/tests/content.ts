import { Page } from 'playwright';
import { TestResult } from '../models/database';

export interface ContentTestResult {
  category: string;
  tests: TestResult[];
  score: number;
}

export class ContentTester {
  private page: Page;
  private analysisId: string;

  constructor(page: Page, analysisId: string) {
    this.page = page;
    this.analysisId = analysisId;
  }

  async runAllTests(): Promise<ContentTestResult> {
    const tests: TestResult[] = [];

    // Test 1: Institutional Information
    tests.push(await this.testInstitutionalInformation());

    // Test 2: Transparency Section
    tests.push(await this.testTransparencySection());

    // Test 3: Services Information
    tests.push(await this.testServicesInformation());

    // Test 4: Contact Information
    tests.push(await this.testContactInformation());

    // Test 5: News and Communications
    tests.push(await this.testNewsSection());

    // Test 6: Required Legal Information
    tests.push(await this.testLegalInformation());

    // Calculate overall score
    const totalScore = tests.reduce((sum, test) => sum + (test.score || 0), 0);
    const score = Math.round(totalScore / tests.length);

    return {
      category: 'Contenido',
      tests,
      score
    };
  }

  private async testInstitutionalInformation(): Promise<TestResult> {
    try {
      const institutionalInfo = await this.page.evaluate(() => {
        const results = {
          hasMissionVision: false,
          hasOrganizationalChart: false,
          hasHistory: false,
          hasDirectoryInfo: false,
          hasInstitutionalGoals: false,
          foundSections: [] as string[]
        };

        const pageText = document.body.textContent?.toLowerCase() || '';
        const links = Array.from(document.querySelectorAll('a')).map(a => a.textContent?.toLowerCase() || '');
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => h.textContent?.toLowerCase() || '');
        
        const allText = [pageText, ...links, ...headings].join(' ');

        // Check for mission and vision
        if (allText.includes('misión') || allText.includes('visión') || allText.includes('mission') || allText.includes('vision')) {
          results.hasMissionVision = true;
          results.foundSections.push('Misión y Visión');
        }

        // Check for organizational chart
        if (allText.includes('organigrama') || allText.includes('estructura') || allText.includes('organizacional') || 
            allText.includes('organizational chart') || allText.includes('organization')) {
          results.hasOrganizationalChart = true;
          results.foundSections.push('Organigrama');
        }

        // Check for history
        if (allText.includes('historia') || allText.includes('antecedentes') || allText.includes('history') || 
            allText.includes('background') || allText.includes('fundación')) {
          results.hasHistory = true;
          results.foundSections.push('Historia');
        }

        // Check for directory information
        if (allText.includes('directorio') || allText.includes('funcionarios') || allText.includes('autoridades') || 
            allText.includes('directory') || allText.includes('officials') || allText.includes('staff')) {
          results.hasDirectoryInfo = true;
          results.foundSections.push('Directorio');
        }

        // Check for institutional goals
        if (allText.includes('objetivos') || allText.includes('metas') || allText.includes('goals') || 
            allText.includes('objectives') || allText.includes('propósitos')) {
          results.hasInstitutionalGoals = true;
          results.foundSections.push('Objetivos Institucionales');
        }

        return results;
      });

      let score = 0;
      if (institutionalInfo.hasMissionVision) score += 25;
      if (institutionalInfo.hasOrganizationalChart) score += 20;
      if (institutionalInfo.hasHistory) score += 15;
      if (institutionalInfo.hasDirectoryInfo) score += 25;
      if (institutionalInfo.hasInstitutionalGoals) score += 15;

      const status = score >= 70 ? 'passed' : score >= 50 ? 'warning' : 'failed';

      return {
        analysis_id: this.analysisId,
        category: 'Contenido',
        test_name: 'Información Institucional',
        status,
        score,
        message: `Información institucional encontrada: ${institutionalInfo.foundSections.join(', ')}`,
        details: institutionalInfo,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        analysis_id: this.analysisId,
        category: 'Contenido',
        test_name: 'Información Institucional',
        status: 'failed',
        score: 0,
        message: `Error al analizar información institucional: ${error}`,
        details: { error: error.toString() },
        created_at: new Date().toISOString()
      };
    }
  }

  private async testTransparencySection(): Promise<TestResult> {
    try {
      const transparencyInfo = await this.page.evaluate(() => {
        const results = {
          hasTransparencySection: false,
          hasBudgetInfo: false,
          hasContractsInfo: false,
          hasPublicEmployees: false,
          hasDeclarations: false,
          hasPublicPurchases: false,
          foundSections: [] as string[]
        };

        const pageText = document.body.textContent?.toLowerCase() || '';
        const links = Array.from(document.querySelectorAll('a')).map(a => a.textContent?.toLowerCase() || '');
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => h.textContent?.toLowerCase() || '');
        
        const allText = [pageText, ...links, ...headings].join(' ');

        // Check for transparency section
        if (allText.includes('transparencia') || allText.includes('transparency') || allText.includes('portal de transparencia')) {
          results.hasTransparencySection = true;
          results.foundSections.push('Portal de Transparencia');
        }

        // Check for budget information
        if (allText.includes('presupuesto') || allText.includes('budget') || allText.includes('financiero') || 
            allText.includes('gastos') || allText.includes('ingresos')) {
          results.hasBudgetInfo = true;
          results.foundSections.push('Información Presupuestaria');
        }

        // Check for contracts information
        if (allText.includes('contratos') || allText.includes('contracts') || allText.includes('licitaciones') || 
            allText.includes('procurement') || allText.includes('compras')) {
          results.hasContractsInfo = true;
          results.foundSections.push('Contratos y Licitaciones');
        }

        // Check for public employees information
        if (allText.includes('empleados públicos') || allText.includes('nómina') || allText.includes('funcionarios') || 
            allText.includes('public employees') || allText.includes('payroll')) {
          results.hasPublicEmployees = true;
          results.foundSections.push('Empleados Públicos');
        }

        // Check for declarations
        if (allText.includes('declaraciones') || allText.includes('declarations') || allText.includes('patrimonio') || 
            allText.includes('assets') || allText.includes('declaración jurada')) {
          results.hasDeclarations = true;
          results.foundSections.push('Declaraciones');
        }

        // Check for public purchases
        if (allText.includes('compras públicas') || allText.includes('public purchases') || allText.includes('adquisiciones') || 
            allText.includes('acquisitions') || allText.includes('compras y contrataciones')) {
          results.hasPublicPurchases = true;
          results.foundSections.push('Compras Públicas');
        }

        return results;
      });

      let score = 0;
      if (transparencyInfo.hasTransparencySection) score += 30;
      if (transparencyInfo.hasBudgetInfo) score += 20;
      if (transparencyInfo.hasContractsInfo) score += 15;
      if (transparencyInfo.hasPublicEmployees) score += 15;
      if (transparencyInfo.hasDeclarations) score += 10;
      if (transparencyInfo.hasPublicPurchases) score += 10;

      const status = score >= 70 ? 'passed' : score >= 50 ? 'warning' : 'failed';

      return {
        analysis_id: this.analysisId,
        category: 'Contenido',
        test_name: 'Sección de Transparencia',
        status,
        score,
        message: `Transparencia encontrada: ${transparencyInfo.foundSections.join(', ')}`,
        details: transparencyInfo,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        analysis_id: this.analysisId,
        category: 'Contenido',
        test_name: 'Sección de Transparencia',
        status: 'failed',
        score: 0,
        message: `Error al analizar transparencia: ${error}`,
        details: { error: error.toString() },
        created_at: new Date().toISOString()
      };
    }
  }

  private async testServicesInformation(): Promise<TestResult> {
    try {
      const servicesInfo = await this.page.evaluate(() => {
        const results = {
          hasServicesSection: false,
          hasServicesCatalog: false,
          hasOnlineServices: false,
          hasServiceRequirements: false,
          hasServiceForms: false,
          hasServiceSchedules: false,
          foundSections: [] as string[]
        };

        const pageText = document.body.textContent?.toLowerCase() || '';
        const links = Array.from(document.querySelectorAll('a')).map(a => a.textContent?.toLowerCase() || '');
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => h.textContent?.toLowerCase() || '');
        
        const allText = [pageText, ...links, ...headings].join(' ');

        // Check for services section
        if (allText.includes('servicios') || allText.includes('services') || allText.includes('trámites')) {
          results.hasServicesSection = true;
          results.foundSections.push('Servicios');
        }

        // Check for services catalog
        if (allText.includes('catálogo de servicios') || allText.includes('services catalog') || 
            allText.includes('listado de servicios') || allText.includes('directorio de servicios')) {
          results.hasServicesCatalog = true;
          results.foundSections.push('Catálogo de Servicios');
        }

        // Check for online services
        if (allText.includes('servicios en línea') || allText.includes('online services') || 
            allText.includes('servicios digitales') || allText.includes('digital services') ||
            allText.includes('trámites en línea')) {
          results.hasOnlineServices = true;
          results.foundSections.push('Servicios en Línea');
        }

        // Check for service requirements
        if (allText.includes('requisitos') || allText.includes('requirements') || 
            allText.includes('documentos necesarios') || allText.includes('required documents')) {
          results.hasServiceRequirements = true;
          results.foundSections.push('Requisitos de Servicios');
        }

        // Check for service forms
        const forms = document.querySelectorAll('form');
        const formLinks = Array.from(document.querySelectorAll('a')).filter(a => 
          a.href.includes('.pdf') || a.textContent?.toLowerCase().includes('formulario') ||
          a.textContent?.toLowerCase().includes('form')
        );
        
        if (forms.length > 0 || formLinks.length > 0 || allText.includes('formularios')) {
          results.hasServiceForms = true;
          results.foundSections.push('Formularios');
        }

        // Check for service schedules
        if (allText.includes('horarios') || allText.includes('schedule') || allText.includes('horario de atención') ||
            allText.includes('office hours') || allText.includes('horas de servicio')) {
          results.hasServiceSchedules = true;
          results.foundSections.push('Horarios de Atención');
        }

        return results;
      });

      let score = 0;
      if (servicesInfo.hasServicesSection) score += 25;
      if (servicesInfo.hasServicesCatalog) score += 20;
      if (servicesInfo.hasOnlineServices) score += 20;
      if (servicesInfo.hasServiceRequirements) score += 15;
      if (servicesInfo.hasServiceForms) score += 10;
      if (servicesInfo.hasServiceSchedules) score += 10;

      const status = score >= 70 ? 'passed' : score >= 50 ? 'warning' : 'failed';

      return {
        analysis_id: this.analysisId,
        category: 'Contenido',
        test_name: 'Información de Servicios',
        status,
        score,
        message: `Servicios encontrados: ${servicesInfo.foundSections.join(', ')}`,
        details: servicesInfo,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        analysis_id: this.analysisId,
        category: 'Contenido',
        test_name: 'Información de Servicios',
        status: 'failed',
        score: 0,
        message: `Error al analizar servicios: ${error}`,
        details: { error: error.toString() },
        created_at: new Date().toISOString()
      };
    }
  }

  private async testContactInformation(): Promise<TestResult> {
    try {
      const contactInfo = await this.page.evaluate(() => {
        const results = {
          hasContactSection: false,
          hasPhoneNumbers: false,
          hasEmailAddresses: false,
          hasPhysicalAddress: false,
          hasOfficeHours: false,
          hasContactForm: false,
          foundElements: [] as string[]
        };

        const pageText = document.body.textContent?.toLowerCase() || '';
        const links = Array.from(document.querySelectorAll('a')).map(a => a.textContent?.toLowerCase() || '');
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => h.textContent?.toLowerCase() || '');
        
        const allText = [pageText, ...links, ...headings].join(' ');

        // Check for contact section
        if (allText.includes('contacto') || allText.includes('contact') || allText.includes('contáctanos')) {
          results.hasContactSection = true;
          results.foundElements.push('Sección de Contacto');
        }

        // Check for phone numbers
        const phoneRegex = /(\+?1?[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g;
        if (phoneRegex.test(pageText) || allText.includes('teléfono') || allText.includes('phone')) {
          results.hasPhoneNumbers = true;
          results.foundElements.push('Números Telefónicos');
        }

        // Check for email addresses
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const emailLinks = document.querySelectorAll('a[href^="mailto:"]');
        if (emailRegex.test(pageText) || emailLinks.length > 0 || allText.includes('email') || allText.includes('correo')) {
          results.hasEmailAddresses = true;
          results.foundElements.push('Direcciones de Email');
        }

        // Check for physical address
        if (allText.includes('dirección') || allText.includes('address') || allText.includes('ubicación') ||
            allText.includes('location') || allText.includes('calle') || allText.includes('avenida')) {
          results.hasPhysicalAddress = true;
          results.foundElements.push('Dirección Física');
        }

        // Check for office hours
        if (allText.includes('horario') || allText.includes('hours') || allText.includes('horario de atención') ||
            allText.includes('office hours') || allText.includes('lunes') || allText.includes('monday')) {
          results.hasOfficeHours = true;
          results.foundElements.push('Horarios de Oficina');
        }

        // Check for contact form
        const contactForms = document.querySelectorAll('form');
        let hasContactForm = false;
        
        for (const form of contactForms) {
          const formText = form.textContent?.toLowerCase() || '';
          if (formText.includes('contacto') || formText.includes('contact') || 
              formText.includes('mensaje') || formText.includes('message')) {
            hasContactForm = true;
            break;
          }
        }
        
        if (hasContactForm) {
          results.hasContactForm = true;
          results.foundElements.push('Formulario de Contacto');
        }

        return results;
      });

      let score = 0;
      if (contactInfo.hasContactSection) score += 20;
      if (contactInfo.hasPhoneNumbers) score += 20;
      if (contactInfo.hasEmailAddresses) score += 20;
      if (contactInfo.hasPhysicalAddress) score += 20;
      if (contactInfo.hasOfficeHours) score += 10;
      if (contactInfo.hasContactForm) score += 10;

      const status = score >= 70 ? 'passed' : score >= 50 ? 'warning' : 'failed';

      return {
        analysis_id: this.analysisId,
        category: 'Contenido',
        test_name: 'Información de Contacto',
        status,
        score,
        message: `Información de contacto: ${contactInfo.foundElements.join(', ')}`,
        details: contactInfo,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        analysis_id: this.analysisId,
        category: 'Contenido',
        test_name: 'Información de Contacto',
        status: 'failed',
        score: 0,
        message: `Error al analizar información de contacto: ${error}`,
        details: { error: error.toString() },
        created_at: new Date().toISOString()
      };
    }
  }

  private async testNewsSection(): Promise<TestResult> {
    try {
      const newsInfo = await this.page.evaluate(() => {
        const results = {
          hasNewsSection: false,
          hasRecentNews: false,
          hasNewsArchive: false,
          hasAnnouncements: false,
          hasEvents: false,
          hasPublications: false,
          foundSections: [] as string[]
        };

        const pageText = document.body.textContent?.toLowerCase() || '';
        const links = Array.from(document.querySelectorAll('a')).map(a => a.textContent?.toLowerCase() || '');
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => h.textContent?.toLowerCase() || '');
        
        const allText = [pageText, ...links, ...headings].join(' ');

        // Check for news section
        if (allText.includes('noticias') || allText.includes('news') || allText.includes('novedades')) {
          results.hasNewsSection = true;
          results.foundSections.push('Noticias');
        }

        // Check for recent news
        if (allText.includes('últimas noticias') || allText.includes('recent news') || 
            allText.includes('noticias recientes') || allText.includes('latest news')) {
          results.hasRecentNews = true;
          results.foundSections.push('Noticias Recientes');
        }

        // Check for news archive
        if (allText.includes('archivo') || allText.includes('archive') || allText.includes('histórico') ||
            allText.includes('archivo de noticias') || allText.includes('news archive')) {
          results.hasNewsArchive = true;
          results.foundSections.push('Archivo de Noticias');
        }

        // Check for announcements
        if (allText.includes('anuncios') || allText.includes('announcements') || allText.includes('comunicados') ||
            allText.includes('press releases') || allText.includes('boletines')) {
          results.hasAnnouncements = true;
          results.foundSections.push('Anuncios y Comunicados');
        }

        // Check for events
        if (allText.includes('eventos') || allText.includes('events') || allText.includes('actividades') ||
            allText.includes('activities') || allText.includes('calendario')) {
          results.hasEvents = true;
          results.foundSections.push('Eventos');
        }

        // Check for publications
        if (allText.includes('publicaciones') || allText.includes('publications') || allText.includes('documentos') ||
            allText.includes('documents') || allText.includes('informes') || allText.includes('reports')) {
          results.hasPublications = true;
          results.foundSections.push('Publicaciones');
        }

        return results;
      });

      let score = 0;
      if (newsInfo.hasNewsSection) score += 25;
      if (newsInfo.hasRecentNews) score += 20;
      if (newsInfo.hasNewsArchive) score += 15;
      if (newsInfo.hasAnnouncements) score += 15;
      if (newsInfo.hasEvents) score += 15;
      if (newsInfo.hasPublications) score += 10;

      const status = score >= 70 ? 'passed' : score >= 50 ? 'warning' : 'failed';

      return {
        analysis_id: this.analysisId,
        category: 'Contenido',
        test_name: 'Noticias y Comunicaciones',
        status,
        score,
        message: `Comunicaciones encontradas: ${newsInfo.foundSections.join(', ')}`,
        details: newsInfo,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        analysis_id: this.analysisId,
        category: 'Contenido',
        test_name: 'Noticias y Comunicaciones',
        status: 'failed',
        score: 0,
        message: `Error al analizar noticias: ${error}`,
        details: { error: error.toString() },
        created_at: new Date().toISOString()
      };
    }
  }

  private async testLegalInformation(): Promise<TestResult> {
    try {
      const legalInfo = await this.page.evaluate(() => {
        const results = {
          hasPrivacyPolicy: false,
          hasTermsOfUse: false,
          hasAccessibilityStatement: false,
          hasCopyrightInfo: false,
          hasLegalFramework: false,
          hasDataProtection: false,
          foundSections: [] as string[]
        };

        const pageText = document.body.textContent?.toLowerCase() || '';
        const links = Array.from(document.querySelectorAll('a')).map(a => a.textContent?.toLowerCase() || '');
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => h.textContent?.toLowerCase() || '');
        
        const allText = [pageText, ...links, ...headings].join(' ');

        // Check for privacy policy
        if (allText.includes('política de privacidad') || allText.includes('privacy policy') || 
            allText.includes('privacidad') || allText.includes('privacy')) {
          results.hasPrivacyPolicy = true;
          results.foundSections.push('Política de Privacidad');
        }

        // Check for terms of use
        if (allText.includes('términos de uso') || allText.includes('terms of use') || 
            allText.includes('términos y condiciones') || allText.includes('terms and conditions')) {
          results.hasTermsOfUse = true;
          results.foundSections.push('Términos de Uso');
        }

        // Check for accessibility statement
        if (allText.includes('accesibilidad') || allText.includes('accessibility') || 
            allText.includes('nortic') || allText.includes('wcag')) {
          results.hasAccessibilityStatement = true;
          results.foundSections.push('Declaración de Accesibilidad');
        }

        // Check for copyright information
        if (allText.includes('copyright') || allText.includes('derechos reservados') || 
            allText.includes('©') || allText.includes('derechos de autor')) {
          results.hasCopyrightInfo = true;
          results.foundSections.push('Información de Copyright');
        }

        // Check for legal framework
        if (allText.includes('marco legal') || allText.includes('legal framework') || 
            allText.includes('base legal') || allText.includes('normativa') || allText.includes('legislation')) {
          results.hasLegalFramework = true;
          results.foundSections.push('Marco Legal');
        }

        // Check for data protection
        if (allText.includes('protección de datos') || allText.includes('data protection') || 
            allText.includes('protección de información') || allText.includes('data privacy')) {
          results.hasDataProtection = true;
          results.foundSections.push('Protección de Datos');
        }

        return results;
      });

      let score = 0;
      if (legalInfo.hasPrivacyPolicy) score += 20;
      if (legalInfo.hasTermsOfUse) score += 15;
      if (legalInfo.hasAccessibilityStatement) score += 20;
      if (legalInfo.hasCopyrightInfo) score += 15;
      if (legalInfo.hasLegalFramework) score += 15;
      if (legalInfo.hasDataProtection) score += 15;

      const status = score >= 70 ? 'passed' : score >= 50 ? 'warning' : 'failed';

      return {
        analysis_id: this.analysisId,
        category: 'Contenido',
        test_name: 'Información Legal Requerida',
        status,
        score,
        message: `Información legal encontrada: ${legalInfo.foundSections.join(', ')}`,
        details: legalInfo,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        analysis_id: this.analysisId,
        category: 'Contenido',
        test_name: 'Información Legal Requerida',
        status: 'failed',
        score: 0,
        message: `Error al analizar información legal: ${error}`,
        details: { error: error.toString() },
        created_at: new Date().toISOString()
      };
    }
  }
}