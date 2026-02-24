/**
 * Agent 11 - Security
 *
 * Specialized agent for security scanning, vulnerability assessment, and trust enforcement.
 *
 * @module Agent11Security
 */

import {
  AgentManifest,
  TaskEnvelope,
  AgentResult,
  EventPublisher,
  Artifact,
  Decision,
} from '@dap/agent-runtime-common';
import * as fs from 'fs';
import * as yaml from 'yaml';

// ============================================================================
// Types
// ============================================================================

export interface SecurityScanRequest {
  target: string;
  scan_types: ('sast' | 'dependency' | 'secret' | 'owasp')[];
  pr_id?: string;
  repository?: string;
}

export interface SecurityReport {
  id: string;
  target: string;
  scan_date: string;
  scans: ScanResult[];
  summary: ScanSummary;
  verdict: 'pass' | 'warning' | 'blocked';
}

export interface ScanResult {
  type: 'sast' | 'dependency' | 'secret' | 'owasp';
  findings: SecurityFinding[];
  duration_ms: number;
}

export interface SecurityFinding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  title: string;
  description: string;
  file?: string;
  line?: number;
  cwe?: string;
  cvss?: number;
  recommendation: string;
  false_positive?: boolean;
}

export interface ScanSummary {
  total_findings: number;
  by_severity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  by_category: { [key: string]: number };
}

// ============================================================================
// Configuration
// ============================================================================

export interface SecurityConfig {
  eventPublisher: EventPublisher;
  projectRoot?: string;
}

// ============================================================================
// Main Agent Class
// ============================================================================

export class SecurityAgent {
  private config: SecurityConfig;
  private manifest: AgentManifest | null = null;

  // Known vulnerability patterns
  private readonly vulnerabilityPatterns = [
    { pattern: /eval\s*\(/, category: 'Code Injection', severity: 'critical' },
    { pattern: /exec\s*\(/, category: 'Command Injection', severity: 'critical' },
    { pattern: /process\.exec\s*\(/, category: 'Command Injection', severity: 'critical' },
    { pattern: /innerHTML\s*=/, category: 'XSS', severity: 'high' },
    { pattern: /dangerouslySetInnerHTML/, category: 'XSS', severity: 'high' },
    { pattern: /SELECT.*FROM.*WHERE.*\+/i, category: 'SQL Injection', severity: 'critical' },
    { pattern: /password\s*=\s*['"]/, category: 'Hardcoded Secret', severity: 'critical' },
    { pattern: /api[_-]?key\s*=\s*['"]/i, category: 'Hardcoded Secret', severity: 'critical' },
    { pattern: /token\s*=\s*['"]/i, category: 'Hardcoded Secret', severity: 'critical' },
    { pattern: /crypto\s*\.\s*createHash\s*\(\s*['"]md5/, category: 'Weak Cryptography', severity: 'medium' },
  ];

  constructor(config: SecurityConfig) {
    this.config = config;
  }

  async initialize(manifestPath: string): Promise<void> {
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    this.manifest = yaml.parse(manifestContent) as AgentManifest;
    console.log(`[Security] Initialized with manifest: ${this.manifest.id}`);
  }

  async executeTask(envelope: TaskEnvelope): Promise<AgentResult> {
    const startTime = Date.now();
    const taskId = envelope.taskId || this.generateId();

    try {
      const inputs = envelope.inputs || {};
      const scanTypes = inputs.scan_types as string[] || ['sast', 'dependency', 'secret'];

      const scanResults: ScanResult[] = [];

      if (scanTypes.includes('sast')) {
        scanResults.push(await this.runSAST(inputs));
      }
      if (scanTypes.includes('secret')) {
        scanResults.push(await this.runSecretScan(inputs));
      }
      if (scanTypes.includes('dependency')) {
        scanResults.push(await this.runDependencyAudit(inputs));
      }
      if (scanTypes.includes('owasp')) {
        scanResults.push(await this.runOWASPCheck(inputs));
      }

      const report = this.generateReport(inputs, scanResults);
      this.validateReport(report);

      const artifacts: Artifact[] = [
        {
          id: this.generateId(),
          type: 'security-report',
          summary: `Security Scan: ${report.target}`,
          content: JSON.stringify(report, null, 2),
          produced_by: 'agent-11-security',
          created_at: new Date().toISOString(),
        },
      ];

      const decisions: Decision[] = [
        {
          type: 'security_verdict',
          reason: `Found ${report.summary.by_severity.critical} critical, ${report.summary.by_severity.high} high issues`,
          confidence: 0.95,
          inputs: { findings: report.summary.total_findings },
        },
      ];

      if (report.verdict === 'blocked') {
        await this.config.eventPublisher.publish('agent.11.issues-blocked', {
          target: report.target,
          critical_count: report.summary.by_severity.critical,
          timestamp: new Date().toISOString(),
        });
      }

      await this.config.eventPublisher.publish('agent.11.scan-complete', {
        target: report.target,
        verdict: report.verdict,
        timestamp: new Date().toISOString(),
      });

      return {
        taskId,
        status: 'success',
        artifacts,
        decisions,
        telemetry: {
          tokensUsed: 0,
          latencyMs: Date.now() - startTime,
          cost: 0,
          errors: 0,
          actionsExecuted: scanResults.length,
        },
      };
    } catch (error) {
      console.error(`[Security] Task ${taskId} failed:`, error);

      return {
        taskId,
        status: 'failure',
        artifacts: [],
        decisions: [],
        telemetry: {
          tokensUsed: 0,
          latencyMs: Date.now() - startTime,
          cost: 0,
          errors: 1,
          actionsExecuted: 0,
        },
        error: {
          code: 'SECURITY_SCAN_FAILED',
          message: error instanceof Error ? error.message : String(error),
          recoverable: true,
        },
      };
    }
  }

  private async runSAST(inputs: Record<string, unknown>): Promise<ScanResult> {
    const target = inputs.target as string || 'src/';
    const findings: SecurityFinding[] = [];

    // Simulate SAST scanning - in production, integrate with Semgrep, SonarQube, etc.
    // Check for common vulnerability patterns
    findings.push({
      id: this.generateId(),
      severity: 'high',
      category: 'Code Injection',
      title: 'Potential Code Injection Risk',
      description: 'Use of eval() detected which can lead to code injection',
      file: 'src/services/UserService.ts',
      line: 42,
      cwe: 'CWE-94',
      cvss: 8.5,
      recommendation: 'Avoid using eval(). Use safer alternatives like JSON.parse()',
    });

    findings.push({
      id: this.generateId(),
      severity: 'medium',
      category: 'XSS',
      title: 'Potential XSS Vulnerability',
      description: 'Direct DOM manipulation with user input',
      file: 'src/controllers/UIController.ts',
      line: 15,
      cwe: 'CWE-79',
      cvss: 6.1,
      recommendation: 'Use textContent instead of innerHTML or sanitize input',
    });

    return {
      type: 'sast',
      findings,
      duration_ms: 1500,
    };
  }

  private async runSecretScan(inputs: Record<string, unknown>): Promise<ScanResult> {
    const findings: SecurityFinding[] = [];

    // Simulate secret scanning - in production, integrate with GitLeaks, TruffleHog
    findings.push({
      id: this.generateId(),
      severity: 'critical',
      category: 'Hardcoded Secret',
      title: 'Hardcoded API Key Detected',
      description: 'API key found in source code',
      file: 'src/config/api.ts',
      line: 10,
      cwe: 'CWE-798',
      cvss: 9.1,
      recommendation: 'Move secrets to environment variables or secure vault',
    });

    return {
      type: 'secret',
      findings,
      duration_ms: 800,
    };
  }

  private async runDependencyAudit(inputs: Record<string, unknown>): Promise<ScanResult> {
    const findings: SecurityFinding[] = [];

    // Simulate dependency audit - in production, integrate with npm audit, Snyk, Dependabot
    findings.push({
      id: this.generateId(),
      severity: 'high',
      category: 'Vulnerable Dependency',
      title: 'Known CVE in lodash < 4.17.21',
      description: 'Prototype pollution vulnerability in lodash',
      cwe: 'CWE-1321',
      cvss: 7.4,
      recommendation: 'Update lodash to version 4.17.21 or later',
    });

    return {
      type: 'dependency',
      findings,
      duration_ms: 2000,
    };
  }

  private async runOWASPCheck(inputs: Record<string, unknown>): Promise<ScanResult> {
    const findings: SecurityFinding[] = [];

    // OWASP Top 10 checks
    findings.push({
      id: this.generateId(),
      severity: 'medium',
      category: 'A01 - Broken Access Control',
      title: 'Missing Authorization Check',
      description: 'Endpoint may not verify user permissions',
      file: 'src/controllers/AdminController.ts',
      line: 25,
      cwe: 'CWE-862',
      cvss: 5.3,
      recommendation: 'Add authorization checks to all admin endpoints',
    });

    findings.push({
      id: this.generateId(),
      severity: 'low',
      category: 'A05 - Security Misconfiguration',
      title: 'Verbose Error Messages',
      description: 'Error messages may reveal internal system details',
      file: 'src/middleware/errorHandler.ts',
      line: 30,
      cwe: 'CWE-11',
      cvss: 3.1,
      recommendation: 'Use generic error messages in production',
    });

    return {
      type: 'owasp',
      findings,
      duration_ms: 1200,
    };
  }

  private generateReport(inputs: Record<string, unknown>, scans: ScanResult[]): SecurityReport {
    const allFindings = scans.flatMap(s => s.findings);

    const bySeverity = {
      critical: allFindings.filter(f => f.severity === 'critical').length,
      high: allFindings.filter(f => f.severity === 'high').length,
      medium: allFindings.filter(f => f.severity === 'medium').length,
      low: allFindings.filter(f => f.severity === 'low').length,
      info: allFindings.filter(f => f.severity === 'info').length,
    };

    const byCategory: { [key: string]: number } = {};
    for (const finding of allFindings) {
      byCategory[finding.category] = (byCategory[finding.category] || 0) + 1;
    }

    const verdict = bySeverity.critical > 0 ? 'blocked' : bySeverity.high > 0 ? 'warning' : 'pass';

    return {
      id: this.generateId(),
      target: inputs.target as string || 'repository',
      scan_date: new Date().toISOString(),
      scans,
      summary: {
        total_findings: allFindings.length,
        by_severity: bySeverity,
        by_category: byCategory,
      },
      verdict,
    };
  }

  private validateReport(report: SecurityReport): void {
    // Check critical findings invariant
    const criticalCount = report.summary.by_severity.critical;
    if (criticalCount > 0 && report.verdict !== 'blocked') {
      throw new Error('Invariant violation: Critical findings must result in blocked verdict');
    }

    // Check that all findings have recommendations
    for (const scan of report.scans) {
      for (const finding of scan.findings) {
        if (!finding.recommendation || finding.recommendation.length < 10) {
          throw new Error('Invariant violation: All findings must have recommendations');
        }
      }
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export function createSecurityAgent(config: SecurityConfig): SecurityAgent {
  return new SecurityAgent(config);
}

async function main() {
  const agent = createSecurityAgent({
    eventPublisher: {
      publish: async () => {},
      subscribe: async () => {},
    },
  });

  await agent.initialize('./manifest.yaml');

  const result = await agent.executeTask({
    taskId: 'test-task',
    agentId: 'agent-11-security',
    goal: 'Scan codebase for security vulnerabilities',
    inputs: {
      target: 'src/',
      scan_types: ['sast', 'secret', 'dependency', 'owasp'],
      pr_id: 'PR-123',
    },
    constraints: { maxTokens: 50000, maxLatency: 600000 },
  });

  console.log('Result:', result);
}

if (require.main === module) {
  main().catch(console.error);
}

export default SecurityAgent;
