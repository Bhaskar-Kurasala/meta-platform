/**
 * Agent 32 - Governance
 *
 * Specialized agent for agent governance, quality scoring, and policy enforcement.
 *
 * @module Agent32Governance
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

export interface QualityScore {
  score_id: string;
  agent_id: string;
  task_id: string;
  dimensions: {
    accuracy: number;
    completeness: number;
    efficiency: number;
    security: number;
  };
  overall_score: number;
  threshold: number;
  passed: boolean;
  timestamp: string;
}

export interface EvaluationResult {
  evaluation_id: string;
  agent_id: string;
  task_id: string;
  status: 'passed' | 'failed' | 'needs_review';
  dimensions: {
    accuracy: number;
    completeness: number;
    efficiency: number;
    security: number;
  };
  overall_score: number;
  threshold: number;
  issues: string[];
  recommendations: string[];
  timestamp: string;
}

export interface PolicyViolation {
  violation_id: string;
  agent_id: string;
  task_id: string;
  policy: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  remediation: string;
  escalation_required: boolean;
  timestamp: string;
}

export interface AuditEntry {
  audit_id: string;
  action: string;
  actor: string;
  target: string;
  details: Record<string, unknown>;
  timestamp: string;
}

export interface PromptVersion {
  prompt_id: string;
  version: string;
  content: string;
  changes: string[];
  created_at: string;
  status: 'active' | 'deprecated' | 'testing';
}

// ============================================================================
// Configuration
// ============================================================================

export interface GovernanceConfig {
  eventPublisher: EventPublisher;
  projectRoot?: string;
}

// ============================================================================
// Main Agent Class
// ============================================================================

export class GovernanceAgent {
  private config: GovernanceConfig;
  private manifest: AgentManifest | null = null;

  constructor(config: GovernanceConfig) {
    this.config = config;
  }

  async initialize(manifestPath: string): Promise<void> {
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    this.manifest = yaml.parse(manifestContent) as AgentManifest;
    console.log(`[Governance] Initialized with manifest: ${this.manifest?.id}`);
  }

  async executeTask(envelope: TaskEnvelope): Promise<AgentResult> {
    const startTime = Date.now();
    const taskId = envelope.taskId || this.generateId();

    try {
      const inputs = envelope.inputs || {};
      const taskType = inputs.type as string || 'evaluate';

      let result: {
        evaluation?: EvaluationResult;
        quality_score?: QualityScore;
        violation?: PolicyViolation;
        audit?: AuditEntry;
        prompt_version?: PromptVersion;
      };

      if (taskType === 'evaluate') {
        result = await this.evaluateAgent(inputs);
      } else if (taskType === 'score') {
        result = await this.scoreQuality(inputs);
      } else if (taskType === 'enforce-policy') {
        result = await this.enforcePolicy(inputs);
      } else if (taskType === 'audit') {
        result = await this.createAuditEntry(inputs);
      } else if (taskType === 'version-prompt') {
        result = await this.versionPrompt(inputs);
      } else {
        throw new Error(`Unknown task type: ${taskType}`);
      }

      const artifacts: Artifact[] = [
        {
          id: this.generateId(),
          type: 'governance-output',
          summary: `Governance: ${taskType}`,
          content: JSON.stringify(result, null, 2),
          produced_by: 'agent-32-governance',
          created_at: new Date().toISOString(),
        },
      ];

      const decisions: Decision[] = [
        {
          type: 'governance_action',
          reason: `Executed ${taskType} task`,
          confidence: 0.95,
          inputs: { task_type: taskType },
        },
      ];

      // Publish relevant events
      if ((result as any).evaluation) {
        await this.config.eventPublisher.publish('agent.32.evaluation-complete', {
          evaluation_id: (result as any).evaluation.evaluation_id,
          status: (result as any).evaluation.status,
          score: (result as any).evaluation.overall_score,
          timestamp: new Date().toISOString(),
        });
      }

      if ((result as any).quality_score) {
        await this.config.eventPublisher.publish('agent.32.quality-score', {
          agent_id: (result as any).quality_score.agent_id,
          score: (result as any).quality_score.overall_score,
          passed: (result as any).quality_score.passed,
          timestamp: new Date().toISOString(),
        });
      }

      if ((result as any).violation) {
        await this.config.eventPublisher.publish('agent.32.policy-violation', {
          violation_id: (result as any).violation.violation_id,
          severity: (result as any).violation.severity,
          agent_id: (result as any).violation.agent_id,
          timestamp: new Date().toISOString(),
        });
      }

      if ((result as any).audit) {
        await this.config.eventPublisher.publish('agent.32.audit-logged', {
          audit_id: (result as any).audit.audit_id,
          action: (result as any).audit.action,
          timestamp: new Date().toISOString(),
        });
      }

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
          actionsExecuted: 1,
        },
      };
    } catch (error) {
      console.error(`[Governance] Task ${taskId} failed:`, error);

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
          code: 'GOVERNANCE_TASK_FAILED',
          message: error instanceof Error ? error.message : String(error),
          recoverable: true,
        },
      };
    }
  }

  private async evaluateAgent(inputs: Record<string, unknown>): Promise<{
    evaluation: EvaluationResult;
  }> {
    const agentId = inputs.agent_id as string || 'unknown';
    const taskId = inputs.task_id as string || this.generateId();

    // Generate evaluation dimensions
    const dimensions = {
      accuracy: Math.random() * 0.3 + 0.7, // 0.7-1.0
      completeness: Math.random() * 0.3 + 0.7,
      efficiency: Math.random() * 0.3 + 0.7,
      security: Math.random() * 0.2 + 0.8, // 0.8-1.0 (security is important)
    };

    // Calculate overall score with weights
    const weights = { accuracy: 0.3, completeness: 0.25, efficiency: 0.25, security: 0.2 };
    const overallScore = (
      dimensions.accuracy * weights.accuracy +
      dimensions.completeness * weights.completeness +
      dimensions.efficiency * weights.efficiency +
      dimensions.security * weights.security
    );

    const threshold = 0.8;
    const passed = overallScore >= threshold;

    const issues: string[] = [];
    if (dimensions.accuracy < 0.8) issues.push('Accuracy below threshold');
    if (dimensions.completeness < 0.8) issues.push('Incomplete output');
    if (dimensions.efficiency > 0.95) issues.push('Could be more efficient');

    const evaluation: EvaluationResult = {
      evaluation_id: this.generateId(),
      agent_id: agentId,
      task_id: taskId,
      status: passed ? 'passed' : 'failed',
      dimensions,
      overall_score: Math.round(overallScore * 100) / 100,
      threshold,
      issues,
      recommendations: this.generateRecommendations(dimensions),
      timestamp: new Date().toISOString(),
    };

    return { evaluation };
  }

  private generateRecommendations(dimensions: Record<string, number>): string[] {
    const recommendations: string[] = [];
    if (dimensions.accuracy < 0.85) recommendations.push('Improve output accuracy with better validation');
    if (dimensions.completeness < 0.85) recommendations.push('Ensure all requirements are addressed');
    if (dimensions.efficiency < 0.85) recommendations.push('Optimize resource usage');
    if (dimensions.security < 0.95) recommendations.push('Add security checks and validation');
    return recommendations;
  }

  private async scoreQuality(inputs: Record<string, unknown>): Promise<{
    quality_score: QualityScore;
  }> {
    const agentId = inputs.agent_id as string || 'unknown';
    const taskId = inputs.task_id as string || this.generateId();

    const dimensions = {
      accuracy: inputs.accuracy as number || Math.random() * 0.3 + 0.7,
      completeness: inputs.completeness as number || Math.random() * 0.3 + 0.7,
      efficiency: inputs.efficiency as number || Math.random() * 0.3 + 0.7,
      security: inputs.security as number || Math.random() * 0.2 + 0.8,
    };

    const overallScore = (
      dimensions.accuracy * 0.3 +
      dimensions.completeness * 0.25 +
      dimensions.efficiency * 0.25 +
      dimensions.security * 0.2
    );

    const threshold = 0.8;

    const quality_score: QualityScore = {
      score_id: this.generateId(),
      agent_id: agentId,
      task_id: taskId,
      dimensions,
      overall_score: Math.round(overallScore * 100) / 100,
      threshold,
      passed: overallScore >= threshold,
      timestamp: new Date().toISOString(),
    };

    return { quality_score };
  }

  private async enforcePolicy(inputs: Record<string, unknown>): Promise<{
    violation: PolicyViolation;
  }> {
    const agentId = inputs.agent_id as string || 'unknown';
    const taskId = inputs.task_id as string || this.generateId();
    const policy = inputs.policy as string || 'MUST_validate_inputs';
    const severity = inputs.severity as PolicyViolation['severity'] || 'medium';

    const violation: PolicyViolation = {
      violation_id: this.generateId(),
      agent_id: agentId,
      task_id: taskId,
      policy,
      severity,
      description: inputs.description as string || `Policy ${policy} was violated`,
      remediation: inputs.remediation as string || 'Review and fix the issue',
      escalation_required: severity === 'high' || severity === 'critical',
      timestamp: new Date().toISOString(),
    };

    return { violation };
  }

  private async createAuditEntry(inputs: Record<string, unknown>): Promise<{
    audit: AuditEntry;
  }> {
    const audit: AuditEntry = {
      audit_id: this.generateId(),
      action: inputs.action as string || 'evaluation_complete',
      actor: inputs.actor as string || 'agent-32-governance',
      target: inputs.target as string || 'unknown',
      details: (inputs.details as Record<string, unknown>) || {},
      timestamp: new Date().toISOString(),
    };

    return { audit };
  }

  private async versionPrompt(inputs: Record<string, unknown>): Promise<{
    prompt_version: PromptVersion;
  }> {
    const promptId = inputs.prompt_id as string || 'prompt-001';
    const content = inputs.content as string || '';
    const changes = (inputs.changes as string[]) || ['Initial version'];

    const versionParts = (inputs.version as string || '1.0.0').split('.');
    const newVersion = `${versionParts[0]}.${parseInt(versionParts[1]) + 1}.0`;

    const prompt_version: PromptVersion = {
      prompt_id: promptId,
      version: newVersion,
      content,
      changes,
      created_at: new Date().toISOString(),
      status: 'active',
    };

    return { prompt_version };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export function createGovernanceAgent(config: GovernanceConfig): GovernanceAgent {
  return new GovernanceAgent(config);
}

async function main() {
  const agent = createGovernanceAgent({
    eventPublisher: {
      publish: async () => {},
      subscribe: async () => {},
    },
  });

  await agent.initialize('./manifest.yaml');

  // Test evaluation
  const evalResult = await agent.executeTask({
    taskId: 'test-evaluation',
    agentId: 'agent-32-governance',
    goal: 'Evaluate agent performance',
    inputs: {
      type: 'evaluate',
      agent_id: 'agent-08-coder',
      task_id: 'task-456',
    },
    constraints: { maxTokens: 50000, maxLatency: 180000 },
  });

  console.log('Evaluation Result:', JSON.stringify(evalResult, null, 2));

  // Test quality scoring
  const scoreResult = await agent.executeTask({
    taskId: 'test-score',
    agentId: 'agent-32-governance',
    goal: 'Score quality of agent output',
    inputs: {
      type: 'score',
      agent_id: 'agent-08-coder',
      task_id: 'task-789',
      accuracy: 0.92,
      completeness: 0.88,
      efficiency: 0.95,
      security: 1.0,
    },
    constraints: { maxTokens: 50000, maxLatency: 180000 },
  });

  console.log('Quality Score Result:', JSON.stringify(scoreResult, null, 2));

  // Test policy enforcement
  const policyResult = await agent.executeTask({
    taskId: 'test-policy',
    agentId: 'agent-32-governance',
    goal: 'Enforce policy violation',
    inputs: {
      type: 'enforce-policy',
      agent_id: 'agent-08-coder',
      task_id: 'task-123',
      policy: 'MUST_validate_inputs',
      severity: 'high',
      description: 'Input validation missing for user ID parameter',
      remediation: 'Add input validation before processing user data',
    },
    constraints: { maxTokens: 50000, maxLatency: 180000 },
  });

  console.log('Policy Result:', JSON.stringify(policyResult, null, 2));
}

if (require.main === module) {
  main().catch(console.error);
}

export default GovernanceAgent;
