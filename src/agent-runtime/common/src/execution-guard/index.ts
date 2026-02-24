/**
 * Execution Guard Component
 *
 * Risk scoring (5 dimensions), pre-action checklists, confidence thresholds.
 * Implements the Confidence × Risk Matrix.
 *
 * @module ExecutionGuard
 */

import {
  Action,
  RiskScore,
  RiskDimension,
  RiskDecision,
  ExecutionChecklist,
  ChecklistItem,
  ReasoningPlan,
  InvariantContext,
  RiskThresholdExceededError,
  ChassisError,
} from '../types';

/**
 * Configuration for execution guard
 */
export interface ExecutionGuardConfig {
  // Risk dimension weights (must sum to 1.0)
  reversibilityWeight: number;
  blastRadiusWeight: number;
  dataSensitivityWeight: number;
  costImpactWeight: number;
  noveltyWeight: number;

  // Thresholds
  autoThreshold: number;
  deferThreshold: number;
  blockThreshold: number;

  // Confidence thresholds
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;

  // Checklist
  enableChecklist: boolean;
}

/**
 * Default configuration (matches Section 10.2)
 */
const DEFAULT_CONFIG: ExecutionGuardConfig = {
  reversibilityWeight: 0.25,
  blastRadiusWeight: 0.25,
  dataSensitivityWeight: 0.20,
  costImpactWeight: 0.15,
  noveltyWeight: 0.15,

  autoThreshold: 1.5,   // Risk <= 1.5 = AUTO
  deferThreshold: 2.5, // 1.5 < Risk <= 2.5 = DEFER
  blockThreshold: 3.0, // Risk > 3.0 = BLOCK

  highConfidence: 0.85,
  mediumConfidence: 0.70,
  lowConfidence: 0.30,
};

/**
 * Risk dimension definitions
 */
const RISK_DIMENSION_LABELS: Record<RiskDimension, string> = {
  reversibility: 'Reversibility',
  blast_radius: 'Blast Radius',
  data_sensitivity: 'Data Sensitivity',
  cost_impact: 'Cost Impact',
  novelty: 'Novelty',
};

/**
 * Risk levels
 */
type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Execution Guard
 *
 * Responsibilities:
 * - Compute risk scores for actions (5 dimensions)
 * - Apply confidence × risk matrix
 * - Run pre-action checklists
 * - Make go/no-go decisions
 */
export class ExecutionGuard {
  private config: ExecutionGuardConfig;
  private checklistCallbacks: ((action: Action) => Promise<ChecklistItem[]>)[] = [];
  private invariantChecker: ((ctx: InvariantContext) => Promise<boolean>) | null = null;

  /**
   * Create a new ExecutionGuard instance
   */
  constructor(config: Partial<ExecutionGuardConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Set checklist callback
   */
  addChecklistCallback(callback: (action: Action) => Promise<ChecklistItem[]>): void {
    this.checklistCallbacks.push(callback);
  }

  /**
   * Set invariant checker
   */
  setInvariantChecker(checker: (ctx: InvariantContext) => Promise<boolean>): void {
    this.invariantChecker = checker;
  }

  /**
   * Evaluate an action for execution
   */
  async evaluateAction(
    action: Action,
    confidence: number
  ): Promise<EvaluationResult> {
    // 1. Run checklist
    let checklist: ExecutionChecklist | undefined;
    if (this.config.enableChecklist) {
      checklist = await this.runChecklist(action);
      if (!checklist.passed) {
        return {
          allowed: false,
          decision: 'block',
          reason: 'Checklist failed',
          checklist,
        };
      }
    }

    // 2. Run invariant checks
    if (this.invariantChecker) {
      const invariantsPassed = await this.invariantChecker({ action });
      if (!invariantsPassed) {
        return {
          allowed: false,
          decision: 'block',
          reason: 'Invariant check failed',
          checklist,
        };
      }
    }

    // 3. Compute risk score
    const riskScore = await this.computeRiskScore(action);

    // 4. Apply confidence × risk matrix
    const decision = this.applyRiskMatrix(confidence, riskScore);

    return {
      allowed: decision !== 'block',
      decision,
      riskScore,
      confidence,
      checklist,
    };
  }

  /**
   * Compute risk score for an action (5 dimensions)
   */
  async computeRiskScore(action: Action): Promise<RiskScore> {
    const dimensions = await this.evaluateDimensions(action);

    // Calculate weighted total
    const total =
      dimensions.reversibility * this.config.reversibilityWeight +
      dimensions.blast_radius * this.config.blastRadiusWeight +
      dimensions.data_sensitivity * this.config.dataSensitivityWeight +
      dimensions.cost_impact * this.config.costImpactWeight +
      dimensions.novelty * this.config.noveltyWeight;

    return {
      total,
      dimensions,
      decision: this.calculateDecision(total),
    };
  }

  /**
   * Evaluate each risk dimension
   */
  private async evaluateDimensions(action: Action): Promise<Record<RiskDimension, number>> {
    return {
      reversibility: this.evaluateReversibility(action),
      blast_radius: this.evaluateBlastRadius(action),
      data_sensitivity: this.evaluateDataSensitivity(action),
      cost_impact: this.evaluateCostImpact(action),
      novelty: this.evaluateNovelty(action),
    };
  }

  /**
   * Evaluate reversibility
   * LOW (1): Fully reversible | MEDIUM (2): Partially | HIGH (3): Difficult | CRITICAL (4): Irreversible
   */
  private evaluateReversibility(action: Action): number {
    const tool = action.tool?.toLowerCase() || '';

    // Read-only operations are fully reversible
    if (['read', 'search', 'query', 'get'].includes(tool)) {
      return 1;
    }

    // Some operations are partially reversible
    if (['write', 'create', 'update'].includes(tool)) {
      return 2;
    }

    // Destructive operations
    if (['delete', 'drop', 'destroy', 'terminate'].includes(tool)) {
      return 4;
    }

    return 2; // Default to partially reversible
  }

  /**
   * Evaluate blast radius
   * LOW (1): Single file/record | MEDIUM (2): Single service | HIGH (3): Multiple services | CRITICAL (4): Production-wide
   */
  private evaluateBlastRadius(action: Action): number {
    const params = action.parameters || {};
    const scope = (params.scope as string) || 'single';

    switch (scope) {
      case 'single':
        return 1;
      case 'module':
        return 2;
      case 'service':
        return 3;
      case 'production':
        return 4;
      default:
        return 1;
    }
  }

  /**
   * Evaluate data sensitivity
   * LOW (1): Public | MEDIUM (2): Internal | HIGH (3): Confidential | CRITICAL (4): PII/Regulated
   */
  private evaluateDataSensitivity(action: Action): number {
    const params = action.parameters || {};
    const dataType = (params.dataType as string) || 'internal';

    switch (dataType) {
      case 'public':
        return 1;
      case 'internal':
        return 2;
      case 'confidential':
        return 3;
      case 'pii':
      case 'regulated':
        return 4;
      default:
        return 2;
    }
  }

  /**
   * Evaluate cost impact
   * LOW (1): < $1 | MEDIUM (2): $1-$50 | HIGH (3): $50-$500 | CRITICAL (4): > $500
   */
  private evaluateCostImpact(action: Action): number {
    const params = action.parameters || {};
    const estimatedCost = (params.estimatedCost as number) || 0;

    if (estimatedCost < 1) return 1;
    if (estimatedCost <= 50) return 2;
    if (estimatedCost <= 500) return 3;
    return 4;
  }

  /**
   * Evaluate novelty
   * LOW (1): Routine (>100) | MEDIUM (2): Familiar (5-100) | HIGH (3): Uncommon (1-5) | CRITICAL (4): First-time
   */
  private evaluateNovelty(action: Action): number {
    const params = action.parameters || {};
    const frequency = (params.frequency as number) || 10;

    if (frequency > 100) return 1;
    if (frequency >= 5) return 2;
    if (frequency >= 1) return 3;
    return 4;
  }

  /**
   * Apply confidence × risk matrix (Section 10.3)
   */
  private applyRiskMatrix(confidence: number, riskScore: RiskScore): RiskDecision {
    const risk = riskScore.total;

    // Confidence >= 0.85
    if (confidence >= this.config.highConfidence) {
      if (risk <= this.config.autoThreshold) return 'auto';
      if (risk <= this.config.deferThreshold) return 'auto'; // AUTO+LOG would be logged
      if (risk <= this.config.blockThreshold) return 'defer';
      return 'block';
    }

    // Confidence 0.70-0.84
    if (confidence >= this.config.mediumConfidence) {
      if (risk <= this.config.autoThreshold) return 'auto';
      if (risk <= this.config.deferThreshold) return 'reflect';
      if (risk <= this.config.blockThreshold) return 'defer';
      return 'block';
    }

    // Confidence 0.50-0.69
    if (confidence >= 0.50) {
      if (risk <= this.config.autoThreshold) return 'auto';
      return 'defer';
    }

    // Confidence 0.30-0.49
    if (confidence >= this.config.lowConfidence) {
      if (risk <= this.config.autoThreshold) return 'reflect';
      if (risk <= this.config.blockThreshold) return 'defer';
      return 'block';
    }

    // Confidence < 0.30
    return 'block';
  }

  /**
   * Calculate decision from total risk
   */
  private calculateDecision(totalRisk: number): RiskDecision {
    if (totalRisk <= this.config.autoThreshold) return 'auto';
    if (totalRisk <= this.config.deferThreshold) return 'defer';
    if (totalRisk <= this.config.blockThreshold) return 'defer';
    return 'block';
  }

  /**
   * Run pre-action checklist
   */
  private async runChecklist(action: Action): Promise<ExecutionChecklist> {
    const items: ChecklistItem[] = [];

    // Run all checklist callbacks
    for (const callback of this.checklistCallbacks) {
      const callbackItems = await callback(action);
      items.push(...callbackItems);
    }

    // Add default checklist items
    items.push(
      {
        id: 'has_parameters',
        description: 'Action has valid parameters',
        passed: action.parameters !== undefined && Object.keys(action.parameters).length > 0,
        reason: 'Action missing parameters',
      },
      {
        id: 'has_description',
        description: 'Action has description',
        passed: action.description !== undefined && action.description.length > 0,
        reason: 'Action missing description',
      }
    );

    const passed = items.every(item => item.passed);

    return {
      actionId: `${action.tool}-${Date.now()}`,
      checks: items,
      passed,
    };
  }

  /**
   * Evaluate a plan
   */
  async evaluatePlan(
    plan: ReasoningPlan,
    confidence: number
  ): Promise<PlanEvaluationResult> {
    const results: EvaluationResult[] = [];

    for (const step of plan.steps) {
      if (!step.action.tool) continue;

      const result = await this.evaluateAction(step.action, confidence);
      results.push(result);

      // Stop on first block
      if (!result.allowed) {
        return {
          allowed: false,
          stepResults: results,
          blockedAt: step.stepId,
          reason: result.reason || 'Action blocked by risk assessment',
        };
      }
    }

    return {
      allowed: true,
      stepResults: results,
    };
  }

  /**
   * Get risk level label
   */
  getRiskLevel(score: number): RiskLevel {
    if (score <= 1.0) return 'LOW';
    if (score <= 2.0) return 'MEDIUM';
    if (score <= 3.0) return 'HIGH';
    return 'CRITICAL';
  }

  /**
   * Format risk score for display
   */
  formatRiskScore(riskScore: RiskScore): string {
    const lines = [
      `Total Risk: ${riskScore.total.toFixed(2)} (${this.getRiskLevel(riskScore.total)})`,
      '',
      'Dimensions:',
    ];

    for (const [dim, score] of Object.entries(riskScore.dimensions)) {
      lines.push(`  ${RISK_DIMENSION_LABELS[dim as RiskDimension]}: ${score} (${this.getRiskLevel(score)})`);
    }

    lines.push('', `Decision: ${riskScore.decision.toUpperCase()}`);

    return lines.join('\n');
  }
}

/**
 * Evaluation result
 */
export interface EvaluationResult {
  allowed: boolean;
  decision: RiskDecision;
  reason?: string;
  riskScore?: RiskScore;
  confidence?: number;
  checklist?: ExecutionChecklist;
}

/**
 * Plan evaluation result
 */
export interface PlanEvaluationResult {
  allowed: boolean;
  stepResults: EvaluationResult[];
  blockedAt?: string;
  reason?: string;
}

/**
 * Factory function to create ExecutionGuard instance
 */
export function createExecutionGuard(config?: Partial<ExecutionGuardConfig>): ExecutionGuard {
  return new ExecutionGuard(config);
}
