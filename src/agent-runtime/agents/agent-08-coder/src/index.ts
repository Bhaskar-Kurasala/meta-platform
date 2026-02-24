/**
 * Agent 08 - Coder
 *
 * Specialized agent for code implementation, refactoring, and code quality.
 *
 * @module Agent08Coder
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
import * as path from 'path';
import * as yaml from 'yaml';

// ============================================================================
// Types
// ============================================================================

export interface CodeFile {
  path: string;
  content: string;
  language: string;
  description: string;
}

export interface ImplementationPlan {
  id: string;
  feature_name: string;
  files: CodeFile[];
  tests: CodeFile[];
  dependencies: string[];
}

export interface CodeReview {
  id: string;
  files_reviewed: string[];
  issues: ReviewIssue[];
  suggestions: string[];
}

export interface ReviewIssue {
  severity: 'critical' | 'major' | 'minor';
  type: 'bug' | 'security' | 'performance' | 'style' | 'documentation';
  file: string;
  line?: number;
  description: string;
  suggestion?: string;
}

// ============================================================================
// Configuration
// ============================================================================

export interface CoderConfig {
  eventPublisher: EventPublisher;
  projectRoot?: string;
}

// ============================================================================
// Main Agent Class
// ============================================================================

export class CoderAgent {
  private config: CoderConfig;
  private manifest: AgentManifest | null = null;

  constructor(config: CoderConfig) {
    this.config = config;
  }

  async initialize(manifestPath: string): Promise<void> {
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    this.manifest = yaml.parse(manifestContent) as AgentManifest;
    console.log(`[Coder] Initialized with manifest: ${this.manifest.id}`);
  }

  async executeTask(envelope: TaskEnvelope): Promise<AgentResult> {
    const startTime = Date.now();
    const taskId = envelope.taskId || this.generateId();

    try {
      const inputs = envelope.inputs || {};
      const implementationType = inputs.type as string || 'feature';

      let plan: ImplementationPlan;

      if (implementationType === 'feature') {
        // Implement new feature
        plan = await this.implementFeature(inputs);
      } else if (implementationType === 'refactor') {
        // Refactor existing code
        plan = await this.refactorCode(inputs);
      } else if (implementationType === 'bugfix') {
        // Fix bug
        plan = await this.fixBug(inputs);
      } else {
        throw new Error(`Unknown implementation type: ${implementationType}`);
      }

      // Write files to disk (simulated)
      await this.writeFiles(plan);

      // Create code review
      const review = await this.performCodeReview(plan);

      // Validate code
      this.validateCode(plan, review);

      const artifacts: Artifact[] = [
        {
          id: this.generateId(),
          type: 'implementation',
          summary: `Implementation: ${plan.feature_name}`,
          content: JSON.stringify(plan, null, 2),
          produced_by: 'agent-08-coder',
          created_at: new Date().toISOString(),
        },
        {
          id: this.generateId(),
          type: 'code-review',
          summary: `Code review: ${review.files_reviewed.length} files`,
          content: JSON.stringify(review, null, 2),
          produced_by: 'agent-08-coder',
          created_at: new Date().toISOString(),
        },
      ];

      const decisions: Decision[] = [
        {
          type: 'implementation_approach',
          reason: 'Based on technical requirements',
          confidence: 0.9,
          inputs: { files_count: plan.files.length },
        },
      ];

      await this.config.eventPublisher.publish('agent.08.implementation-complete', {
        plan_id: plan.id,
        files_count: plan.files.length,
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
          actionsExecuted: plan.files.length,
        },
      };
    } catch (error) {
      console.error(`[Coder] Task ${taskId} failed:`, error);

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
          code: 'IMPLEMENTATION_FAILED',
          message: error instanceof Error ? error.message : String(error),
          recoverable: true,
        },
      };
    }
  }

  private async implementFeature(inputs: Record<string, unknown>): Promise<ImplementationPlan> {
    const featureName = inputs.feature_name as string || 'NewFeature';

    return {
      id: this.generateId(),
      feature_name: featureName,
      files: [
        {
          path: `src/services/${featureName}.ts`,
          language: 'typescript',
          description: `Main service for ${featureName}`,
          content: this.generateServiceCode(featureName),
        },
        {
          path: `src/controllers/${featureName}Controller.ts`,
          language: 'typescript',
          description: `Controller for ${featureName}`,
          content: this.generateControllerCode(featureName),
        },
        {
          path: `src/types/${featureName}.ts`,
          language: 'typescript',
          description: `Type definitions for ${featureName}`,
          content: this.generateTypesCode(featureName),
        },
      ],
      tests: [
        {
          path: `tests/services/${featureName}.test.ts`,
          language: 'typescript',
          description: `Unit tests for ${featureName}`,
          content: this.generateTestCode(featureName),
        },
      ],
      dependencies: [],
    };
  }

  private async refactorCode(inputs: Record<string, unknown>): Promise<ImplementationPlan> {
    const targetFile = inputs.target_file as string || 'src/Service.ts';
    const refactorType = inputs.refactor_type as string || 'extract-method';

    return {
      id: this.generateId(),
      feature_name: `Refactor: ${targetFile}`,
      files: [
        {
          path: targetFile,
          language: 'typescript',
          description: `Refactored ${refactorType}`,
          content: '// Refactored code here',
        },
      ],
      tests: [],
      dependencies: [],
    };
  }

  private async fixBug(inputs: Record<string, unknown>): Promise<ImplementationPlan> {
    const bugId = inputs.bug_id as string || 'BUG-001';
    const description = inputs.description as string || 'Bug description';

    return {
      id: this.generateId(),
      feature_name: `Fix: ${bugId}`,
      files: [
        {
          path: 'src/services/BugFix.ts',
          language: 'typescript',
          description: `Bug fix for ${bugId}: ${description}`,
          content: '// Bug fix implementation',
        },
      ],
      tests: [
        {
          path: 'tests/BugFix.test.ts',
          language: 'typescript',
          description: `Test for bug fix ${bugId}`,
          content: '// Test for bug fix',
        },
      ],
      dependencies: [],
    };
  }

  private generateServiceCode(featureName: string): string {
    return `/**
 * Service for ${featureName}
 * Handles business logic for ${featureName} operations
 */
export class ${featureName}Service {
  private readonly logger;

  constructor() {
    this.logger = console;
  }

  /**
   * Process ${featureName} data
   * @param data - Input data to process
   * @returns Processed result
   */
  async process(data: ${featureName}Data): Promise<${featureName}Result> {
    try {
      this.logger.info(\`Processing ${featureName}:\`, data);

      // Business logic here
      const result: ${featureName}Result = {
        success: true,
        data: this.transform(data),
      };

      return result;
    } catch (error) {
      this.logger.error(\`Error processing ${featureName}:\`, error);
      throw error;
    }
  }

  private transform(data: ${featureName}Data): unknown {
    // Transform logic
    return { ...data, processed: true };
  }
}

export interface ${featureName}Data {
  id: string;
  value: string;
}

export interface ${featureName}Result {
  success: boolean;
  data: unknown;
  error?: string;
}
`;
  }

  private generateControllerCode(featureName: string): string {
    return `import { Request, Response } from 'express';
import { ${featureName}Service } from '../services/${featureName}';

/**
 * Controller for ${featureName} endpoints
 */
export class ${featureName}Controller {
  private service: ${featureName}Service;

  constructor() {
    this.service = new ${featureName}Service();
  }

  /**
   * Handle POST request for ${featureName}
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.service.process(req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Handle GET request for ${featureName}
   */
  async get(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.service.process({ id, value: '' });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
`;
  }

  private generateTypesCode(featureName: string): string {
    return `/**
 * Type definitions for ${featureName}
 */

export interface ${featureName}Config {
  enabled: boolean;
  timeout: number;
}

export interface ${featureName}Options {
  verbose?: boolean;
  debug?: boolean;
}
`;
  }

  private generateTestCode(featureName: string): string {
    return `import { describe, it, expect, beforeEach } from 'vitest';
import { ${featureName}Service } from '../../src/services/${featureName}';

describe('${featureName}Service', () => {
  let service: ${featureName}Service;

  beforeEach(() => {
    service = new ${featureName}Service();
  });

  it('should process data successfully', async () => {
    const input = { id: '1', value: 'test' };
    const result = await service.process(input);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('should handle errors gracefully', async () => {
    const input = { id: '', value: '' };
    await expect(service.process(input)).rejects.toThrow();
  });
});
`;
  }

  private async writeFiles(plan: ImplementationPlan): Promise<void> {
    const projectRoot = this.config.projectRoot || process.cwd();

    for (const file of [...plan.files, ...plan.tests]) {
      const fullPath = path.join(projectRoot, file.path);
      const dir = path.dirname(fullPath);

      // Check for secrets
      if (this.containsSecrets(file.content)) {
        throw new Error(`Invariant violation: File ${file.path} contains secrets`);
      }

      console.log(`[Coder] Would write file: ${fullPath}`);
      // In production: fs.mkdirSync(dir, { recursive: true });
      // In production: fs.writeFileSync(fullPath, file.content);
    }
  }

  private containsSecrets(content: string): boolean {
    const secretPatterns = [
      /api[_-]?key/i,
      /password/i,
      /secret/i,
      /token/i,
      /credential/i,
    ];

    return secretPatterns.some(pattern => pattern.test(content));
  }

  private async performCodeReview(plan: ImplementationPlan): Promise<CodeReview> {
    const issues: ReviewIssue[] = [];

    // Check for common issues
    for (const file of plan.files) {
      if (!file.content.includes('TODO') && !file.content.includes('FIXME')) {
        // Good - no obvious placeholders
      }

      // Check for error handling
      if (file.language === 'typescript' && file.content.includes('async') && !file.content.includes('try')) {
        issues.push({
          severity: 'major',
          type: 'bug',
          file: file.path,
          description: 'Async function without try-catch',
          suggestion: 'Add try-catch for error handling',
        });
      }
    }

    return {
      id: this.generateId(),
      files_reviewed: plan.files.map(f => f.path),
      issues,
      suggestions: [
        'Consider adding integration tests',
        'Add performance benchmarks',
      ],
    };
  }

  private validateCode(plan: ImplementationPlan, review: CodeReview): void {
    // Check for critical issues
    const criticalIssues = review.issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      throw new Error(`Code validation failed: ${criticalIssues.length} critical issues found`);
    }

    // Check files exist
    if (plan.files.length === 0) {
      throw new Error('Invariant violation: No files implemented');
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export function createCoderAgent(config: CoderConfig): CoderAgent {
  return new CoderAgent(config);
}

async function main() {
  const agent = createCoderAgent({
    eventPublisher: {
      publish: async () => {},
      subscribe: async () => {},
    },
  });

  await agent.initialize('./manifest.yaml');

  const result = await agent.executeTask({
    taskId: 'test-task',
    agentId: 'agent-08-coder',
    goal: 'Implement analytics dashboard feature',
    inputs: {
      type: 'feature',
      feature_name: 'AnalyticsDashboard',
    },
    constraints: { maxTokens: 50000, maxLatency: 300000 },
  });

  console.log('Result:', result);
}

if (require.main === module) {
  main().catch(console.error);
}

export default CoderAgent;
