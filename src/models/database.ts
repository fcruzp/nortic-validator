import { Database, open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

export interface NorticAnalysis {
  id: string;
  url: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  overall_score?: number;
  compliance_level?: string;
  start_time: string;
  end_time?: string;
  duration?: number;
  created_at: string;
  updated_at: string;
}

export interface TestResult {
  id?: number;
  analysis_id: string;
  category: string;
  test_name: string;
  status: 'passed' | 'failed' | 'warning' | 'skipped';
  score?: number;
  message?: string;
  details?: any;
  created_at?: string;
}

export interface AccessibilityViolation {
  id?: number;
  analysis_id: string;
  rule_id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  help_url?: string;
  selector?: string;
  html?: string;
  created_at?: string;
}

export interface AnalysisFilters {
  url?: string;
  status?: string;
  institution?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface AnalysisSorting {
  field: 'created_at' | 'overall_score' | 'status' | 'url' | 'compliance_level';
  direction: 'ASC' | 'DESC';
}

export interface PaginationOptions {
  page: number;
  limit: number;
  filters?: AnalysisFilters;
  sorting?: AnalysisSorting;
}

export class DatabaseManager {
  private db: Database | null = null;

  async initialize(): Promise<void> {
    // Resolve DB path cross-environment:
    // - In Docker: DATABASE_PATH is set to /data/nortic_validator.sqlite
    // - Local: fallback to ./nortic_validator.sqlite in project root (process.cwd())
    const resolvedEnvPath = process.env.DATABASE_PATH && process.env.DATABASE_PATH.trim().length > 0
      ? process.env.DATABASE_PATH.trim()
      : '';

    const fallbackPath = path.resolve(process.cwd(), 'nortic_validator.sqlite');
    const dbPath = resolvedEnvPath || fallbackPath;

    // Ensure parent directory exists if path points to a folder not present (for Docker /data case)
    try {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch {
      // ignore dir creation errors; open() will throw if it's a real issue
    }

    this.db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    await this.createTables();
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Create nortic_analyses table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS nortic_analyses (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
        overall_score INTEGER,
        compliance_level TEXT,
        start_time TEXT DEFAULT CURRENT_TIMESTAMP,
        end_time TEXT,
        duration INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create test_results table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS test_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        analysis_id TEXT NOT NULL,
        category TEXT NOT NULL,
        test_name TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('passed', 'failed', 'warning', 'skipped')),
        score INTEGER,
        message TEXT,
        details TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (analysis_id) REFERENCES nortic_analyses(id) ON DELETE CASCADE
      )
    `);

    // Create accessibility_violations table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS accessibility_violations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        analysis_id TEXT NOT NULL,
        rule_id TEXT NOT NULL,
        impact TEXT NOT NULL,
        description TEXT NOT NULL,
        help_url TEXT,
        selector TEXT,
        html TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (analysis_id) REFERENCES nortic_analyses(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better performance
    await this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON nortic_analyses(created_at);
      CREATE INDEX IF NOT EXISTS idx_analyses_status ON nortic_analyses(status);
      CREATE INDEX IF NOT EXISTS idx_analyses_score ON nortic_analyses(overall_score);
      CREATE INDEX IF NOT EXISTS idx_analyses_url ON nortic_analyses(url);
      CREATE INDEX IF NOT EXISTS idx_test_results_analysis_id ON test_results(analysis_id);
      CREATE INDEX IF NOT EXISTS idx_violations_analysis_id ON accessibility_violations(analysis_id);
    `);
  }

  // Helper function to extract institution name from URL
  private extractInstitutionName(url: string): string {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      // Remove www. prefix
      const cleanHostname = hostname.replace(/^www\./, '');
      
      // Extract institution name from government domains
      if (cleanHostname.endsWith('.gob.do')) {
        const parts = cleanHostname.split('.');
        return parts[0]; // e.g., "presidencia" from "presidencia.gob.do"
      } else if (cleanHostname.endsWith('.gov.do')) {
        const parts = cleanHostname.split('.');
        return parts[0]; // e.g., "senado" from "senado.gov.do"
      } else {
        // For other domains, try to extract meaningful name
        const parts = cleanHostname.split('.');
        return parts[0];
      }
    } catch (error) {
      return '';
    }
  }

  async createAnalysis(analysis: Omit<NorticAnalysis, 'created_at' | 'updated_at'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date().toISOString();
    await this.db.run(`
      INSERT INTO nortic_analyses (id, url, status, overall_score, compliance_level, start_time, end_time, duration, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      analysis.id,
      analysis.url,
      analysis.status,
      analysis.overall_score,
      analysis.compliance_level,
      analysis.start_time,
      analysis.end_time,
      analysis.duration,
      now,
      now
    ]);
  }

  async updateAnalysis(id: string, updates: Partial<NorticAnalysis>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const fields = Object.keys(updates).filter(key => key !== 'id');
    if (fields.length === 0) return;

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => (updates as any)[field]);
    values.push(new Date().toISOString()); // updated_at
    values.push(id); // WHERE condition

    await this.db.run(`
      UPDATE nortic_analyses 
      SET ${setClause}, updated_at = ?
      WHERE id = ?
    `, values);
  }

  async getAnalysis(id: string): Promise<NorticAnalysis | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.get('SELECT * FROM nortic_analyses WHERE id = ?', [id]);
    return result || null;
  }

  async deleteAnalysis(id: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Start transaction
      await this.db.run('BEGIN TRANSACTION');

      // Delete from test_results first (due to foreign key constraint)
      await this.db.run('DELETE FROM test_results WHERE analysis_id = ?', [id]);
      
      // Delete from accessibility_violations
      await this.db.run('DELETE FROM accessibility_violations WHERE analysis_id = ?', [id]);
      
      // Delete from nortic_analyses
      const result = await this.db.run('DELETE FROM nortic_analyses WHERE id = ?', [id]);
      
      // Commit transaction
      await this.db.run('COMMIT');
      
      // Return true if at least one row was deleted
      return (result.changes || 0) > 0;
    } catch (error) {
      // Rollback transaction on error
      await this.db.run('ROLLBACK');
      throw error;
    }
  }

  async getAnalyses(options: PaginationOptions): Promise<{
    analyses: (NorticAnalysis & { institution_name: string })[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    if (!this.db) throw new Error('Database not initialized');

    const { page = 1, limit = 10, filters = {}, sorting } = options;
    const offset = (page - 1) * limit;

    // Build WHERE clause
    const whereConditions: string[] = [];
    const params: any[] = [];

    if (filters.url) {
      whereConditions.push('url LIKE ?');
      params.push(`%${filters.url}%`);
    }

    if (filters.status) {
      whereConditions.push('status = ?');
      params.push(filters.status);
    }

    if (filters.institution) {
      whereConditions.push('url LIKE ?');
      params.push(`%${filters.institution}%`);
    }

    if (filters.dateFrom) {
      whereConditions.push('created_at >= ?');
      params.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      whereConditions.push('created_at <= ?');
      params.push(filters.dateTo);
    }

    const whereClause = whereConditions.length > 0 ? ` WHERE ${whereConditions.join(' AND ')}` : '';

    // Build ORDER BY clause
    let orderClause = ' ORDER BY created_at DESC'; // Default sorting
    if (sorting) {
      const validFields = ['created_at', 'overall_score', 'status', 'url', 'compliance_level'];
      const validDirections = ['ASC', 'DESC'];
      
      if (validFields.includes(sorting.field) && validDirections.includes(sorting.direction)) {
        orderClause = ` ORDER BY ${sorting.field} ${sorting.direction}`;
        
        // Add secondary sort for consistency
        if (sorting.field !== 'created_at') {
          orderClause += ', created_at DESC';
        }
      }
    }

    // Count query
    const countQuery = `SELECT COUNT(*) as total FROM nortic_analyses${whereClause}`;
    
    // Data query
    const dataQuery = `SELECT * FROM nortic_analyses${whereClause}${orderClause} LIMIT ? OFFSET ?`;
    const dataParams = [...params, limit, offset];

    const [countResult, analyses] = await Promise.all([
      this.db.get(countQuery, params),
      this.db.all(dataQuery, dataParams)
    ]);

    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);

    // Add institution name to each analysis
    const analysesWithInstitution = analyses.map(analysis => ({
      ...analysis,
      institution_name: this.extractInstitutionName(analysis.url)
    }));

    return {
      analyses: analysesWithInstitution,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  // Legacy method for backward compatibility
  async getAnalysesLegacy(page: number = 1, limit: number = 10, url?: string): Promise<{
    analyses: NorticAnalysis[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const options: PaginationOptions = {
      page,
      limit,
      filters: url ? { url } : {}
    };

    const result = await this.getAnalyses(options);
    
    return {
      analyses: result.analyses,
      pagination: result.pagination
    };
  }

  async getLatestAnalysis(): Promise<NorticAnalysis | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.get('SELECT * FROM nortic_analyses ORDER BY created_at DESC LIMIT 1');
    return result || null;
  }

  async createTestResult(result: Omit<TestResult, 'id' | 'created_at'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.run(`
      INSERT INTO test_results (analysis_id, category, test_name, status, score, message, details)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      result.analysis_id,
      result.category,
      result.test_name,
      result.status,
      result.score,
      result.message,
      JSON.stringify(result.details)
    ]);
  }

  async getTestResults(analysisId: string): Promise<TestResult[]> {
    if (!this.db) throw new Error('Database not initialized');

    const results = await this.db.all(
      'SELECT * FROM test_results WHERE analysis_id = ? ORDER BY created_at',
      [analysisId]
    );

    return results.map(result => ({
      ...result,
      details: result.details ? JSON.parse(result.details) : null
    }));
  }

  async createAccessibilityViolation(violation: Omit<AccessibilityViolation, 'id' | 'created_at'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.run(`
      INSERT INTO accessibility_violations (analysis_id, rule_id, impact, description, help_url, selector, html)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      violation.analysis_id,
      violation.rule_id,
      violation.impact,
      violation.description,
      violation.help_url,
      violation.selector,
      violation.html
    ]);
  }

  async getAccessibilityViolations(analysisId: string): Promise<AccessibilityViolation[]> {
    if (!this.db) throw new Error('Database not initialized');

    return await this.db.all(
      'SELECT * FROM accessibility_violations WHERE analysis_id = ? ORDER BY impact, created_at',
      [analysisId]
    );
  }

  // New method to get unique institutions for filter dropdown
  async getInstitutions(): Promise<string[]> {
    if (!this.db) throw new Error('Database not initialized');

    const results = await this.db.all('SELECT DISTINCT url FROM nortic_analyses ORDER BY url');
    
    const institutions = new Set<string>();
    results.forEach(result => {
      const institutionName = this.extractInstitutionName(result.url);
      if (institutionName) {
        institutions.add(institutionName);
      }
    });

    return Array.from(institutions).sort();
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}

export const dbManager = new DatabaseManager();
