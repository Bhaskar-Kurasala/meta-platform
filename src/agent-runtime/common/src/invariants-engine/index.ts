/**
 * Invariants Engine Component
 *
 * Code-enforced non-negotiable rules (not prompts).
 * Runs checks before actions to ensure safety and correctness.
 *
 * @module InvariantsEngine
 */

import {
  Invariant,
  InvariantContext,
  InvariantResult,
  InvariantsConfig,
  Action,
  ReasoningPlan,
  TaskEnvelope,
  AgentIdentity,
  InvariantViolationError,
  ChassisError,
} from '../types';

/**
 * Configuration for invariants engine
 */
export interface InvariantsEngineConfig {
  failOnWarning: boolean;
  enableCaching: boolean;
  cacheTtlMs: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: InvariantsEngineConfig = {
  failOnWarning: false,
  enableCaching: true,
  cacheTtlMs: 60000, // 1 minute
};

/**
 * Built-in invariant definitions
 */
export const BUILT_IN_INVARIANTS: Omit<Invariant, 'id'>[] = [
  {
    name: 'no_hardcoded_secrets',
    description: 'Actions must not contain hardcoded secrets, API keys, or passwords',
    severity: 'error',
    check: async (ctx: InvariantContext): Promise<InvariantResult> => {
      if (!ctx.action?.parameters) {
        return { passed: true };
      }

      const paramsStr = JSON.stringify(ctx.action.parameters);
      const secretPatterns = [
        /password["']?\s*[:=]\s*["'][^"']+["']/i,
        /api[_-]?key["']?\s*[:=]\s*["'][^"']+["']/i,
        /secret["']?\s*[:=]\s*["'][^"']+["']/i,
        /token["']?\s*[:=]\s*["'][^"']+["']/i,
        /Bearer\s+[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/,
      ];

      const hasSecret = secretPatterns.some(pattern => pattern.test(paramsStr));

      return {
        passed: !hasSecret,
        message: hasSecret ? 'Action contains potential hardcoded secret' : undefined,
        remediation: 'Use environment variables or secret management instead',
      };
    },
  },
  {
    name: 'no_destructive_git_force_push',
    description: 'Git operations must not use force push to protected branches',
    severity: 'error',
    check: async (ctx: InvariantContext): Promise<InvariantResult> => {
      if (!ctx.action || ctx.action.tool !== 'git') {
        return { passed: true };
      }

      const params = ctx.action.parameters as Record<string, unknown>;
      const command = (params.command as string) || '';

      if (command.includes('--force') || command.includes('-f')) {
        const branch = params.branch as string || '';
        if (branch === 'main' || branch === 'master') {
          return {
            passed: false,
            message: 'Force push to protected branch is not allowed',
            remediation: 'Use standard push and resolve conflicts manually',
          };
        }
      }

      return { passed: true };
    },
  },
  {
    name: 'no_production_database_writes',
    description: 'Direct database writes to production are not allowed without approval',
    severity: 'error',
    check: async (ctx: InvariantContext): Promise<InvariantResult> => {
      if (!ctx.action || ctx.action.tool !== 'database') {
        return { passed: true };
      }

      const params = ctx.action.parameters as Record<string, unknown>;
      const environment = (params.environment as string) || 'production';
      const operation = (params.operation as string) || '';

      if (environment === 'production' && ['INSERT', 'UPDATE', 'DELETE', 'DROP'].includes(operation.toUpperCase())) {
        return {
          passed: false,
          message: `Direct ${operation} to production database requires HITL approval`,
          remediation: 'Use migration scripts with approval workflow or staging first',
        };
      }

      return { passed: true };
    },
  },
  {
    name: 'input_validation_required',
    description: 'All tool inputs must be validated before execution',
    severity: 'error',
    check: async (ctx: InvariantContext): Promise<InvariantResult> => {
      if (!ctx.action?.parameters) {
        return {
          passed: false,
          message: 'Action has no parameters',
          remediation: 'Provide valid parameters for the action',
        };
      }

      // Check for empty or undefined required parameters
      const params = ctx.action.parameters;
      const hasNullParams = Object.values(params).some(v => v === null || v === undefined);

      return {
        passed: !hasNullParams,
        message: hasNullParams ? 'Action has null/undefined parameters' : undefined,
        remediation: 'Provide valid values for all required parameters',
      };
    },
  },
  {
    name: 'file_path_safety',
    description: 'File operations must not access paths outside allowed directories',
    severity: 'error',
    check: async (ctx: InvariantContext): Promise<InvariantResult> => {
      if (!ctx.action || !['filesystem', 'file', 'read', 'write'].includes(ctx.action.tool || '')) {
        return { passed: true };
      }

      const params = ctx.action.parameters as Record<string, unknown>;
      const path = (params.path as string) || '';

      // Check for path traversal attempts
      if (path.includes('..') || path.startsWith('/etc') || path.startsWith('/root') || path.startsWith('~')) {
        return {
          passed: false,
          message: 'Path traversal or restricted path access detected',
          remediation: 'Use paths within the project workspace only',
        };
      }

      return { passed: true };
    },
  },
  {
    name: 'rate_limit_respect',
    description: 'External API calls must respect rate limits',
    severity: 'warning',
    check: async (ctx: InvariantContext): Promise<InvariantResult> => {
      // This would typically check a rate limit tracker
      // For now, return passed
      return { passed: true };
    },
  },
  {
    name: 'cost_threshold',
    description: 'Actions exceeding cost threshold require approval',
    severity: 'warning',
    check: async (ctx: InvariantContext): Promise<InvariantResult> => {
      // Cost check would be handled by Execution Guard
      // This is a placeholder
      return { passed: true };
    },
  },
];

/**
 * Invariants Engine
 *
 * Responsibilities:
 * - Load and manage invariant definitions
 * - Run invariant checks before actions
 * - Enforce non-negotiable rules (code, not prompts)
 * - Cache check results for performance
 */
export class InvariantsEngine {
  private config: InvariantsEngineConfig;
  private invariants: Map<string, Invariant> = new Map();
  private cache: Map<string, { result: InvariantResult; expiresAt: number }> = new Map();

  /**
   * Create a new InvariantsEngine instance
   */
  constructor(config: Partial<InvariantsEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize with built-in and custom invariants
   */
  async initialize(customInvariants: Invariant[] = []): Promise<void> {
    // Add built-in invariants
    for (const inv of BUILT_IN_INVARIANTS) {
      const id = `builtin:${inv.name}`;
      this.invariants.set(id, {
        id,
        ...inv,
      });
    }

    // Add custom invariants
    for (const inv of customInvariants) {
      this.invariants.set(inv.id, inv);
    }
  }

  /**
   * Add a custom invariant
   */
  addInvariant(invariant: Invariant): void {
    this.invariants.set(invariant.id, invariant);
  }

  /**
   * Remove an invariant
   */
  removeInvariant(id: string): boolean {
    return this.invariants.delete(id);
  }

  /**
   * Get all invariants
   */
  getInvariants(): Invariant[] {
    return Array.from(this.invariants.values());
  }

  /**
   * Run all invariants against context
   */
  async checkAll(context: InvariantContext): Promise<InvariantResult[]> {
    const results: InvariantResult[] = [];

    for (const invariant of this.invariants.values()) {
      const result = await this.checkInvariant(invariant.id, context);
      results.push(result);
    }

    return results;
  }

  /**
   * Run specific invariant
   */
  async checkInvariant(id: string, context: InvariantContext): Promise<InvariantResult> {
    const invariant = this.invariants.get(id);
    if (!invariant) {
      return { passed: true };
    }

    // Check cache
    if (this.config.enableCaching) {
      const cacheKey = this.getCacheKey(id, context);
      const cached = this.cache.get(cacheKey);

      if (cached && Date.now() < cached.expiresAt) {
        return cached.result;
      }
    }

    // Run check
    try {
      const result = await invariant.check(context);

      // Cache result
      if (this.config.enableCaching) {
        const cacheKey = this.getCacheKey(id, context);
        this.cache.set(cacheKey, {
          result,
          expiresAt: Date.now() + this.config.cacheTtlMs,
        });
      }

      return result;
    } catch (error) {
      return {
        passed: false,
        message: `Invariant check failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Run invariants for an action
   */
  async checkAction(action: Action): Promise<void> {
    const context: InvariantContext = { action };
    const results = await this.checkAll(context);

    // Find failures
    const failures = results.filter(r => !r.passed);
    const warnings = results.filter(r => r.passed && r.message);

    // Throw on errors
    const errors = failures.filter(f => {
      const inv = Array.from(this.invariants.values()).find(i => i.severity === 'error');
      return inv !== undefined;
    });

    if (errors.length > 0 || (this.config.failOnWarning && warnings.length > 0)) {
      const errorMessages = errors.map(e => e.message).join('; ');
      throw new InvariantViolationError(
        `Invariant violations: ${errorMessages}`,
        errors[0]?.message || 'unknown'
      );
    }

    // Log warnings
    if (warnings.length > 0) {
      console.warn('Invariant warnings:', warnings.map(w => w.message).join('; '));
    }
  }

  /**
   * Run invariants for a plan
   */
  async checkPlan(plan: ReasoningPlan): Promise<void> {
    const context: InvariantContext = { plan };

    // Check plan-level invariants
    const results = await this.checkAll(context);

    const failures = results.filter(r => !r.passed);

    if (failures.length > 0) {
      const errorMessages = failures.map(f => f.message).join('; ');
      throw new InvariantViolationError(`Plan invariant violations: ${errorMessages}`, plan.steps[0]?.stepId || 'unknown');
    }
  }

  /**
   * Run invariants for a task
   */
  async checkTask(task: TaskEnvelope): Promise<void> {
    const context: InvariantContext = { task };

    const results = await this.checkAll(context);

    const failures = results.filter(r => !r.passed);

    if (failures.length > 0) {
      const errorMessages = failures.map(f => f.message).join('; ');
      throw new InvariantViolationError(`Task invariant violations: ${errorMessages}`, task.taskId);
    }
  }

  /**
   * Get cache key for invariant
   */
  private getCacheKey(id: string, context: InvariantContext): string {
    const actionHash = context.action
      ? JSON.stringify(context.action)
      : 'no-action';
    return `${id}:${actionHash.slice(0, 50)}`;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get invariant by ID
   */
  getInvariant(id: string): Invariant | undefined {
    return this.invariants.get(id);
  }

  /**
   * Get invariant count
   */
  getInvariantCount(): { total: number; errors: number; warnings: number } {
    let errors = 0;
    let warnings = 0;

    for (const inv of this.invariants.values()) {
      if (inv.severity === 'error') errors++;
      else warnings++;
    }

    return {
      total: this.invariants.size,
      errors,
      warnings,
    };
  }

  /**
   * Shutdown
   */
  async shutdown(): Promise<void> {
    this.invariants.clear();
    this.cache.clear();
  }
}

/**
 * Factory function to create InvariantsEngine instance
 */
export function createInvariantsEngine(config?: Partial<InvariantsEngineConfig>): InvariantsEngine {
  return new InvariantsEngine(config);
}
