import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './App.css';

// Utils de base URL
const getApiBaseUrl = () => {
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
  if (envUrl) return envUrl.replace(/\/+$/, '');

  const origin = window.location.origin;

  try {
    const url = new URL(origin);
    if ((url.hostname === 'localhost' || url.hostname === '127.0.0.1') && url.port !== '3000') {
      url.port = '3000';
      return url.toString().replace(/\/+$/, '');
    }
    return origin.replace(/\/+$/, '');
  } catch {
    return 'http://localhost:3000';
  }
};

const getSocketUrl = () => {
  const envWs = (import.meta as any).env?.VITE_SOCKET_URL as string | undefined;
  if (envWs) return envWs.replace(/\/+$/, '');
  return getApiBaseUrl();
};

// Helper para fetch que acepta ruta relativa o absoluta
const apiFetch = (input: string, init?: RequestInit) => {
  const isAbsolute = /^https?:\/\//i.test(input);
  const base = getApiBaseUrl();
  const url = isAbsolute ? input : `${base}${input.startsWith('/') ? '' : '/'}${input}`;
  return fetch(url, init);
};

interface AnalysisResult {
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

interface ProgressUpdate {
  analysisId: string;
  status: 'in_progress' | 'completed' | 'failed';
  progress: number;
  currentTest: string | null;
  completedTests: number;
  totalTests: number;
  error?: string;
}

interface TestResult {
  test_name: string;
  category: string;
  status: 'passed' | 'warning' | 'failed';
  score: number;
  message: string;
  details: any;
}

interface DetailedResults {
  analysis: any;
  testResults: TestResult[];
  violations: any[];
}

interface AnalysisRecord {
  id: string;
  url: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  overall_score?: number;
  compliance_level?: string;
  created_at: string;
  updated_at: string;
  institution_name: string;
}

interface PaginatedHistory {
  analyses: AnalysisRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface HistoryFilters {
  url: string;
  status: string;
  institution: string;
  dateFrom: string;
  dateTo: string;
}

interface HistorySorting {
  field: 'created_at' | 'overall_score' | 'status' | 'url' | 'compliance_level';
  direction: 'ASC' | 'DESC';
}

function App() {
  const [url, setUrl] = useState('');
  const [historyData, setHistoryData] = useState<PaginatedHistory>({
    analyses: [],
    pagination: {
      page: 1,
      limit: 5,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false
    }
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [detailedResults, setDetailedResults] = useState<DetailedResults | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [showDetailedResults, setShowDetailedResults] = useState(false);
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [progressUpdate, setProgressUpdate] = useState<ProgressUpdate | null>(null);
  const [error, setError] = useState<string | null>(null);

  // New state for filtering and sorting
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<HistoryFilters>({
    url: '',
    status: '',
    institution: '',
    dateFrom: '',
    dateTo: ''
  });
  const [sorting, setSorting] = useState<HistorySorting>({
    field: 'created_at',
    direction: 'DESC'
  });
  const [institutions, setInstitutions] = useState<string[]>([]);

  // Delete confirmation state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [analysisToDelete, setAnalysisToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Initialize WebSocket connection
  useEffect(() => {
    const socketUrl = getSocketUrl();
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
    });

    newSocket.on('analysis-progress', (update: ProgressUpdate) => {
      console.log('Progress update received:', update);
      setProgressUpdate(update);
      
      if (update.status === 'completed') {
        setIsAnalyzing(false);
        setShowProgressDialog(false);
        loadAnalysisResult(update.analysisId);
        cargarProyectos();
      } else if (update.status === 'failed') {
        setIsAnalyzing(false);
        setShowProgressDialog(false);
        setError(update.error || 'Error durante el análisis');
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    cargarProyectos();
    loadInstitutions();
  }, []);

  // Load data when filters or sorting change
  useEffect(() => {
    cargarProyectos(1);
  }, [filters, sorting]);

  const buildQueryParams = (page: number = 1) => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', '5');
    
    if (filters.url) params.append('url', filters.url);
    if (filters.status) params.append('status', filters.status);
    if (filters.institution) params.append('institution', filters.institution);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    
    params.append('sortBy', sorting.field);
    params.append('sortOrder', sorting.direction);
    
    return params.toString();
  };

  const cargarProyectos = async (page: number = currentPage) => {
    try {
      const queryParams = buildQueryParams(page);
      const response = await apiFetch(`/api/nortic-analysis/history?${queryParams}`);
      if (response.ok) {
        const data = await response.json();
        setHistoryData(data);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const loadInstitutions = async () => {
    try {
      const response = await apiFetch('/api/nortic-analysis/institutions');
      if (response.ok) {
        const data = await response.json();
        setInstitutions(data.institutions);
      }
    } catch (error) {
      console.error('Error loading institutions:', error);
    }
  };

  const loadAnalysisResult = async (analysisId: string) => {
    try {
      const response = await apiFetch(`/api/nortic-analysis/${analysisId}/results`);
      if (response.ok) {
        const result = await response.json();
        setAnalysisResult(result);
        setShowResults(true);
        setShowDetailedResults(false);
      }
    } catch (error) {
      console.error('Error loading analysis result:', error);
    }
  };

  const analizar = async () => {
    if (!url) return;

    setIsAnalyzing(true);
    setShowProgressDialog(true);
    setProgressUpdate(null);
    setError(null);
    setAnalysisResult(null);
    setDetailedResults(null);
    setShowResults(false);
    setShowDetailedResults(false);

    try {
      const response = await apiFetch('/api/nortic-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al iniciar el análisis');
      }

      const data = await response.json();
      console.log('Analysis started:', data);
    } catch (error: any) {
      setIsAnalyzing(false);
      setShowProgressDialog(false);
      setError(error.message || 'Error al iniciar el análisis');
    }
  };

  const verResultados = async (analysisId: string) => {
    try {
      const basicResponse = await apiFetch(`/api/nortic-analysis/${analysisId}/results`);
      if (basicResponse.ok) {
        const basicResult = await basicResponse.json();
        setAnalysisResult(basicResult);
      }

      const detailedResponse = await apiFetch(`/api/nortic-analysis/${analysisId}/detailed`);
      if (detailedResponse.ok) {
        const detailedResult = await detailedResponse.json();
        setDetailedResults(detailedResult);
      }

      setShowResults(true);
      setShowDetailedResults(false);
      setExpandedDetails(new Set());
    } catch (error) {
      console.error('Error loading results:', error);
      setError('Error al cargar los resultados');
    }
  };

  const closeError = () => {
    setError(null);
  };

  const closeResults = () => {
    setShowResults(false);
    setShowDetailedResults(false);
    setAnalysisResult(null);
    setDetailedResults(null);
    setExpandedDetails(new Set());
  };

  const closeProgressDialog = () => {
    setShowProgressDialog(false);
    setProgressUpdate(null);
  };

  const toggleDetailedResults = () => {
    setShowDetailedResults(!showDetailedResults);
  };

  const toggleTestDetails = (testKey: string) => {
    const newExpanded = new Set(expandedDetails);
    if (newExpanded.has(testKey)) {
      newExpanded.delete(testKey);
    } else {
      newExpanded.add(testKey);
    }
    setExpandedDetails(newExpanded);
  };

  // Grouping helpers for Detailed Results
  const CATEGORY_GROUPS: Record<string, string> = {
    usability: 'Usabilidad',
    'diseño y layout': 'Diseño y Layout',
    'diseño & layout': 'Diseño y Layout',
    layout: 'Diseño y Layout',
    content: 'Contenido',
    contenido: 'Contenido',
    security: 'Seguridad',
    seguridad: 'Seguridad',
    seo: 'SEO',
    accessibility: 'Accesibilidad',
    accesibilidad: 'Accesibilidad'
  };

  const normalizeCategory = (raw: string) => {
    const key = raw?.toLowerCase().trim();
    return CATEGORY_GROUPS[key] || (key.charAt(0).toUpperCase() + key.slice(1));
  };

  const buildGroupedResults = (tests: TestResult[]) => {
    const grouped: Record<string, TestResult[]> = {};
    for (const t of tests) {
      const group = normalizeCategory(t.category || 'Otros');
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push(t);
    }
    return grouped;
  };

  const formatTestDetails = (details: any) => {
    if (!details) return 'No hay detalles disponibles';
    return JSON.stringify(details, null, 2);
  };

  const handleFilterChange = (key: keyof HistoryFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSortChange = (field: HistorySorting['field']) => {
    setSorting(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'DESC' ? 'ASC' : 'DESC'
    }));
  };

  const clearFilters = () => {
    setFilters({
      url: '',
      status: '',
      institution: '',
      dateFrom: '',
      dateTo: ''
    });
    setSorting({
      field: 'created_at',
      direction: 'DESC'
    });
  };

  const confirmDelete = (analysisId: string) => {
    setAnalysisToDelete(analysisId);
    setShowDeleteDialog(true);
  };

  const cancelDelete = () => {
    setAnalysisToDelete(null);
    setShowDeleteDialog(false);
  };

  const executeDelete = async () => {
    if (!analysisToDelete) return;

    setIsDeleting(true);
    try {
      const response = await apiFetch(`/api/nortic-analysis/${analysisToDelete}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Refresh the history after successful deletion
        await cargarProyectos();
        setShowDeleteDialog(false);
        setAnalysisToDelete(null);
        
        // If we're showing results for the deleted analysis, close them
        if (analysisResult && analysisResult.analysisId === analysisToDelete) {
          closeResults();
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error al borrar el análisis');
      }
    } catch (error: any) {
      setError(error.message || 'Error al borrar el análisis');
    } finally {
      setIsDeleting(false);
    }
  };


  // Eliminado: función no utilizada que rompía el build por TS6133
  // const getComplianceColor = (level: string) => {
  //   switch (level) {
  //     case 'Excelente': return 'text-green-600';
  //     case 'Cumple': return 'text-blue-600';
  //     case 'Parcial': return 'text-yellow-600';
  //     case 'No Cumple': return 'text-red-600';
  //     default: return 'text-gray-600';
  //   }
  // };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-DO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSortIcon = (field: HistorySorting['field']) => {
    if (sorting.field !== field) {
      return <span className="text-gray-400 text-xs">↕️</span>;
    }
    return sorting.direction === 'ASC' ? 
      <span className="text-blue-600 text-xs">↑</span> : 
      <span className="text-blue-600 text-xs">↓</span>;
  };

  const extractInstitutionFromUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      const cleanHostname = hostname.replace(/^www\./, '');
      
      if (cleanHostname.endsWith('.gob.do') || cleanHostname.endsWith('.gov.do')) {
        const parts = cleanHostname.split('.');
        return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      }
      return cleanHostname;
    } catch {
      return url;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Hero Header - Refined, minimal and modern */}
          <div className="relative overflow-hidden rounded-2xl mb-8 bg-white border border-gray-200">
            <div className="relative px-6 py-10 text-center">
              {/* Badge line */}
              <div className="flex items-center justify-center gap-2">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                  <span aria-hidden="true">✅</span>
                  NORTIC A2
                </span>
              </div>

              {/* Title */}
              <h1 className="mt-4 text-[28px] md:text-[34px] leading-tight font-extrabold text-gray-900 tracking-tight">
                Validador NORTIC A2
              </h1>

              {/* Subtitle */}
              <p className="mt-2 text-sm md:text-base text-gray-600">
                Sistema de Validación de Sitios Web Gubernamentales
              </p>

              {/* Decorative divider */}
              <div className="mt-6 flex justify-center">
                <span className="h-px w-24 bg-gradient-to-r from-transparent via-blue-300 to-transparent"></span>
              </div>

              {/* Disclaimer card */}
              <div className="mt-6 max-w-2xl mx-auto text-left">
                <div className="rounded-lg border border-gray-200 bg-gray-50/80 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 text-gray-500" aria-hidden="true">ℹ️</div>
                    <div className="text-xs md:text-sm text-gray-600">
                      <span className="font-medium text-gray-700">Aviso:</span> Esta plataforma no es una página oficial del Gobierno ni de la OGTIC. 
                      Es un esfuerzo independiente de la comunidad tecnológica del país para apoyar buenas prácticas y transparencia.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Dialog */}
          {showProgressDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 modal-overlay flex items-center justify-center z-50">
              <div className="bg-white/80 backdrop-blur-lg rounded-xl p-8 max-w-md w-full mx-4 shadow-lg border border-white/60">
                <div className="text-center">
                  <div className="mb-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4 ring-8 ring-blue-50">
                      <svg className="w-8 h-8 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Analizando sitio web
                  </h3>
                  
                  {progressUpdate && (
                    <>
                      <div className="mb-4">
                        <div className="text-sm text-gray-600 mb-2">
                          {progressUpdate.currentTest || 'Preparando análisis...'}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300 progress-pulse"
                            style={{ width: `${progressUpdate.progress}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {progressUpdate.progress}% completado ({progressUpdate.completedTests}/{progressUpdate.totalTests} pruebas)
                        </div>
                      </div>
                    </>
                  )}
                  
                  <button
                    onClick={closeProgressDialog}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation Dialog */}
          {showDeleteDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <div className="text-center">
                  <div className="mb-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                      <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    ¿Confirmar eliminación?
                  </h3>
                  
                  <p className="text-sm text-gray-600 mb-6">
                    Esta acción eliminará permanentemente el análisis y todos sus datos relacionados. 
                    Esta acción no se puede deshacer.
                  </p>
                  
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={cancelDelete}
                      disabled={isDeleting}
                      className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors disabled:bg-gray-400"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={executeDelete}
                      disabled={isDeleting}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:bg-red-400"
                    >
                      {isDeleting ? 'Eliminando...' : 'Eliminar'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 card-hover">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
                <button
                  onClick={closeError}
                  className="text-red-400 hover:text-red-600"
                >
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Analysis Form */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6 mb-8 border border-white/60 card-hover">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Nuevo análisis
            </h2>
            <div className="flex gap-4">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">🔗</span>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://ejemplo.gob.do"
                  className="pl-9 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                  disabled={isAnalyzing}
                />
              </div>
              <button
                onClick={analizar}
                disabled={isAnalyzing || !url}
                className="px-6 py-2 primary-btn disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? 'Analizando...' : 'Analizar'}
              </button>
            </div>
          </div>

          {/* Results Section - Grouped with original header */}
          {showResults && analysisResult && (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6 mb-8 border border-white/60">
              {/* Header with institution info and close button */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">Resultados del análisis</h2>
                  <div className="mt-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                      <span aria-hidden="true">🏛️</span>
                      {extractInstitutionFromUrl(analysisResult.url)}
                    </div>
                    <div className="mt-2 text-sm text-gray-700">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">🔗</span>
                        <a href={analysisResult.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline underline-offset-2">
                          {analysisResult.url}
                        </a>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-gray-400">🕒</span>
                        <span className="text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                          Ejecutado el {formatDate(analysisResult.startTime)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={closeResults}
                  className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                  title="Cerrar"
                >
                  ✕
                </button>
              </div>

              {/* Basic Results */}
              <div className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="text-center kpi-card">
                    <div className="text-4xl font-extrabold text-blue-700 mb-1 leading-none">
                      {analysisResult.overallScore}
                    </div>
                    <div className="text-xs uppercase tracking-wide text-gray-600">Puntuación general</div>
                  </div>
                  <div className="text-center kpi-card">
                    <div className="text-xl font-bold text-gray-900 mb-1">
                      {analysisResult.complianceLevel}
                    </div>
                    <div className="text-xs uppercase tracking-wide text-gray-600">Nivel de cumplimiento</div>
                  </div>
                  <div className="text-center kpi-card">
                    <div className="text-xl font-bold text-gray-900 mb-1">
                      {analysisResult.duration}s
                    </div>
                    <div className="text-xs uppercase tracking-wide text-gray-600">Duración</div>
                  </div>
                </div>

                {/* Categories */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  {Object.entries(analysisResult.categories).map(([category, result]) => (
                    <div key={category} className="bg-gray-50 rounded-lg p-4 border border-gray-200 card-hover">
                      <div className="text-sm font-medium text-gray-900 mb-1">
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </div>
                      <div className="text-2xl font-bold text-blue-600 mb-1">
                        {result.score}
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        result.status === 'passed' ? 'bg-green-100 text-green-800' :
                        result.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {result.status === 'passed' ? 'Aprobado' :
                         result.status === 'warning' ? 'Advertencia' : 'Fallido'}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Toggle Button */}
                <button
                  onClick={toggleDetailedResults}
                  className="w-full px-4 py-2 ghost-btn"
                >
                  {showDetailedResults ? 'Cerrar' : 'Ver'} Resultados Detallados
                </button>
              </div>

              {/* Detailed Results - Collapsible */}
              {showDetailedResults && detailedResults && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Resultados Detallados</h3>
                  
                  {(() => {
                    const groups = buildGroupedResults(detailedResults.testResults);
                    const ORDER = ['Usabilidad', 'Diseño y Layout', 'Contenido', 'Seguridad', 'SEO', 'Accesibilidad'];
                    const sortedGroupNames = [
                      ...ORDER.filter((g) => g in groups),
                      ...Object.keys(groups).filter((g) => !ORDER.includes(g)).sort()
                    ];

                    return (
                      <div className="space-y-4">
                        {sortedGroupNames.map((groupName, gi) => {
                          const groupKey = `group-${groupName.toLowerCase().replace(/\s+/g, '-')}-${gi}`;
                          const isGroupExpanded = expandedDetails.has(groupKey);
                          const toggleGroup = () => toggleTestDetails(groupKey);

                          return (
                            <div key={groupKey} className="border rounded-lg">
                              <button
                                onClick={toggleGroup}
                                className={`w-full flex items-center justify-between px-4 py-3 ${isGroupExpanded ? 'bg-blue-50 border-b border-blue-100' : 'bg-gray-50'} rounded-t-lg`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-gray-800">{groupName}</span>
                                  <span className="text-xs text-gray-600 bg-white px-2 py-0.5 rounded-full border border-gray-200">
                                    {groups[groupName].length} pruebas
                                  </span>
                                </div>
                                <span className="text-blue-600 text-sm">{isGroupExpanded ? '▼' : '►'}</span>
                              </button>

                              {isGroupExpanded && (
                                <div className="p-4 space-y-4">
                                  {groups[groupName].map((test, ti) => {
                                    const testKey = `${groupKey}-${test.category}-${test.test_name}-${ti}`;
                                    const isExpanded = expandedDetails.has(testKey);
                                    const toggle = () => toggleTestDetails(testKey);
                                    
                                    return (
                                      <div key={testKey} className={`border rounded-lg p-4 ${isExpanded ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200 bg-white'}`}>
                                        <div className="flex justify-between items-start mb-2">
                                          <div className="flex-1">
                                            <h4 className="font-medium text-gray-900">{test.test_name}</h4>
                                            <p className="text-xs text-gray-500 capitalize">{test.category}</p>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-lg font-bold text-blue-600">{test.score}</span>
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                              test.status === 'passed' ? 'bg-green-100 text-green-800' :
                                              test.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                                              'bg-red-100 text-red-800'
                                            }`}>
                                              {test.status === 'passed' ? 'Aprobado' :
                                              test.status === 'warning' ? 'Advertencia' : 'Fallido'}
                                            </span>
                                          </div>
                                        </div>

                                        <p className="text-sm text-gray-700 mb-3">{test.message}</p>

                                        <button onClick={toggle} className="text-sm link-btn">
                                          {isExpanded ? 'Ocultar' : 'Ver'} detalles técnicos
                                        </button>

                                        {isExpanded && (
                                          <div className="mt-3 p-3 bg-gray-50 rounded border border-blue-200">
                                            <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto custom-scrollbar">
                                              {formatTestDetails(test.details)}
                                            </pre>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Accessibility Violations */}
                  {detailedResults.violations && detailedResults.violations.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">
                        Violaciones de Accesibilidad ({detailedResults.violations.length})
                      </h4>
                      <div className="space-y-3">
                        {detailedResults.violations.map((violation, index) => (
                          <div key={index} className="border border-red-200 rounded-lg p-3 bg-red-50">
                            <div className="flex justify-between items-start mb-2">
                              <h5 className="font-medium text-red-900">{violation.rule_id}</h5>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                violation.impact === 'critical' ? 'bg-red-100 text-red-800' :
                                violation.impact === 'serious' ? 'bg-orange-100 text-orange-800' :
                                violation.impact === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {violation.impact}
                              </span>
                            </div>
                            <p className="text-sm text-red-700 mb-2">{violation.description}</p>
                            {violation.selector && (
                              <p className="text-xs text-red-600 font-mono">{violation.selector}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* History Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6 border border-white/60">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-gray-900">Historial de Análisis</h2>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 primary-btn"
              >
                {showFilters ? 'Ocultar' : 'Mostrar'} Filtros
              </button>
            </div>

            {/* Filters Section */}
            {showFilters && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                    <input
                      type="text"
                      value={filters.url}
                      onChange={(e) => handleFilterChange('url', e.target.value)}
                      placeholder="Filtrar por URL..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                    <select
                      value={filters.status}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Todos los estados</option>
                      <option value="completed">Completado</option>
                      <option value="failed">Fallido</option>
                      <option value="in_progress">En Progreso</option>
                      <option value="pending">Pendiente</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Institución</label>
                    <select
                      value={filters.institution}
                      onChange={(e) => handleFilterChange('institution', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Todas las instituciones</option>
                      {institutions.map(institution => (
                        <option key={institution} value={institution}>
                          {institution.charAt(0).toUpperCase() + institution.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
                    <input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={clearFilters}
                      className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                    >
                      Limpiar Filtros
                    </button>
                  </div>
                </div>

                {/* Sorting Controls */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">Ordenar por:</div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { field: 'created_at' as const, label: 'Fecha' },
                      { field: 'overall_score' as const, label: 'Puntuación' },
                      { field: 'status' as const, label: 'Estado' },
                      { field: 'url' as const, label: 'URL' },
                      { field: 'compliance_level' as const, label: 'Cumplimiento' }
                    ].map(({ field, label }) => (
                      <button
                        key={field}
                        onClick={() => handleSortChange(field)}
                        className={`px-3 py-1 text-sm rounded-md border transition-colors flex items-center gap-1 ${
                          sorting.field === field
                            ? 'bg-blue-50 border-blue-300 text-blue-700'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {label} {getSortIcon(field)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* History List - Back to original card design */}
            {historyData.analyses.length > 0 ? (
              <>
                <div className="space-y-4 mb-6">
                  {historyData.analyses.map((analysis) => (
                    <div key={analysis.id} className="border border-gray-200 rounded-lg p-4 card-hover">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{analysis.url}</div>
                          <div className="text-sm text-gray-600">
                            {formatDate(analysis.created_at)} • 
                            {analysis.overall_score ? ` ${analysis.overall_score} puntos` : ' Pendiente'} • 
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              (analysis.compliance_level || 'Pendiente') === 'Excelente' ? 'bg-green-100 text-green-800' :
                              (analysis.compliance_level || 'Pendiente') === 'Cumple' ? 'bg-blue-100 text-blue-800' :
                              (analysis.compliance_level || 'Pendiente') === 'Parcial' ? 'bg-yellow-100 text-yellow-800' :
                              (analysis.compliance_level || 'Pendiente') === 'No Cumple' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {analysis.compliance_level || 'Pendiente'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            analysis.status === 'completed' ? 'bg-green-100 text-green-800' :
                            analysis.status === 'failed' ? 'bg-red-100 text-red-800' :
                            analysis.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {analysis.status === 'completed' ? 'Completado' :
                             analysis.status === 'failed' ? 'Fallido' : 
                             analysis.status === 'in_progress' ? 'En Progreso' : 'Pendiente'}
                          </span>
                          {analysis.status === 'completed' && (
                            <button
                              onClick={() => verResultados(analysis.id)}
                              className="px-3 py-1 primary-btn text-sm"
                            >
                              Ver Resultados
                            </button>
                          )}
                          <button
                            onClick={() => confirmDelete(analysis.id)}
                            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors cursor-pointer"
                            title="Eliminar análisis"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {historyData.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Página {historyData.pagination.page} de {historyData.pagination.totalPages} 
                      ({historyData.pagination.total} análisis total)
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => cargarProyectos(currentPage - 1)}
                        disabled={!historyData.pagination.hasPrev}
                        className="px-3 py-1 ghost-btn disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() => cargarProyectos(currentPage + 1)}
                        disabled={!historyData.pagination.hasNext}
                        className="px-3 py-1 ghost-btn disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        Siguiente
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No hay análisis disponibles
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
