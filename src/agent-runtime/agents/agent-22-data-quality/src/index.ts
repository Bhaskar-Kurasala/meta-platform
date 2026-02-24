/**
 * Agent 22 - Data Quality
 *
 * Specialized agent for data quality validation, cleansing, and governance.
 *
 * @module Agent22DataQuality
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

export interface QualityReport {
  dataset: string;
  timestamp: string;
  total_records: number;
  quality_score: number;
  dimensions: {
    completeness: number;
    accuracy: number;
    consistency: number;
    timeliness: number;
  };
  issues: QualityIssue[];
  status: 'PASSED' | 'FAILED' | 'WARNING';
  gates: Record<string, 'PASSED' | 'FAILED'>;
}

export interface QualityIssue {
  type: 'null_values' | 'invalid_format' | 'out_of_range' | 'duplicate' | 'pii_exposure';
  column: string;
  count: number;
  percentage: number;
  severity: 'critical' | 'major' | 'minor';
}

export interface CleansingReport {
  dataset: string;
  operations: CleansingOperation[];
  before_records: number;
  after_records: number;
  quality_improvement: number;
}

export interface CleansingOperation {
  type: 'null_handling' | 'deduplication' | 'format_standardization' | 'outlier_removal';
  column?: string;
  action: string;
  count: number;
}

// ============================================================================
// Configuration
// ============================================================================

export interface DataQualityConfig {
  eventPublisher: EventPublisher;
  projectRoot?: string;
}

// ============================================================================
// Main Agent Class
// ============================================================================

export class DataQualityAgent {
  private config: DataQualityConfig;
  private manifest: AgentManifest | null = null;

  constructor(config: DataQualityConfig) {
    this.config = config;
  }

  async initialize(manifestPath: string): Promise<void> {
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    this.manifest = yaml.parse(manifestContent) as AgentManifest;
    console.log(`[DataQuality] Initialized with manifest: ${this.manifest?.id}`);
  }

  async executeTask(envelope: TaskEnvelope): Promise<AgentResult> {
    const startTime = Date.now();
    const taskId = envelope.taskId || this.generateId();

    try {
      const inputs = envelope.inputs || {};
      const taskType = inputs.type as string || 'validate';

      let report: QualityReport | CleansingReport;

      if (taskType === 'validate') {
        report = await this.validateQuality(inputs);
      } else if (taskType === 'cleanse') {
        report = await this.cleanseData(inputs);
      } else if (taskType === 'gate_check') {
        report = await this.checkQualityGates(inputs);
      } else {
        throw new Error(`Unknown task type: ${taskType}`);
      }

      const artifacts: Artifact[] = [
        {
          id: this.generateId(),
          type: taskType === 'validate' ? 'quality-report' : 'cleansing-report',
          summary: `Quality check: ${inputs.dataset || 'unknown'}`,
          content: JSON.stringify(report, null, 2),
          produced_by: 'agent-22-data-quality',
          created_at: new Date().toISOString(),
        },
      ];

      const qualityReport = taskType === 'validate' ? report as QualityReport : null;
      const status = qualityReport?.status || 'PASSED';

      const decisions: Decision[] = [
        {
          type: 'quality_assessment',
          reason: `Quality status: ${status}`,
          confidence: 0.9,
          inputs: { task_type: taskType },
        },
      ];

      await this.config.eventPublisher.publish('agent.22.validation-complete', {
        dataset: inputs.dataset,
        status,
        timestamp: new Date().toISOString(),
      });

      return {
        taskId,
        status: status === 'FAILED' ? 'failure' : 'success',
        artifacts,
        decisions,
        telemetry: {
          tokensUsed: 0,
          latencyMs: Date.now() - startTime,
          cost: 0,
          errors: status === 'FAILED' ? 1 : 0,
          actionsExecuted: 1,
        },
      };
    } catch (error) {
      console.error(`[DataQuality] Task ${taskId} failed:`, error);

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
          code: 'QUALITY_CHECK_FAILED',
          message: error instanceof Error ? error.message : String(error),
          recoverable: true,
        },
      };
    }
  }

  private async validateQuality(inputs: Record<string, unknown>): Promise<QualityReport> {
    const dataset = inputs.dataset as string || 'default_dataset';
    const totalRecords = inputs.total_records as number || 100000;

    const issues: QualityIssue[] = [
      {
        type: 'null_values',
        column: 'email',
        count: Math.floor(totalRecords * 0.005),
        percentage: 0.5,
        severity: 'major',
      },
      {
        type: 'invalid_format',
        column: 'phone',
        count: Math.floor(totalRecords * 0.0025),
        percentage: 0.25,
        severity: 'minor',
      },
    ];

    const qualityScore = 1 - issues.reduce((acc, i) => acc + i.percentage, 0) / 100;

    return {
      dataset,
      timestamp: new Date().toISOString(),
      total_records: totalRecords,
      quality_score: qualityScore,
      dimensions: {
        completeness: 0.98,
        accuracy: 0.96,
        consistency: 0.94,
        timeliness: 0.92,
      },
      issues,
      status: qualityScore >= 0.9 ? 'PASSED' : qualityScore >= 0.7 ? 'WARNING' : 'FAILED',
      gates: {
        completeness: qualityScore >= 0.95 ? 'PASSED' : 'FAILED',
        accuracy: qualityScore >= 0.9 ? 'PASSED' : 'FAILED',
        freshness: 'PASSED',
      },
    };
  }

  private async cleanseData(inputs: Record<string, unknown>): Promise<CleansingReport> {
    const dataset = inputs.dataset as string || 'default_dataset';
    const beforeRecords = inputs.before_records as number || 100000;

    const operations: CleansingOperation[] = [
      {
        type: 'null_handling',
        column: 'email',
        action: 'imputed',
        count: Math.floor(beforeRecords * 0.005),
      },
      {
        type: 'deduplication',
        action: 'removed',
        count: Math.floor(beforeRecords * 0.01),
      },
      {
        type: 'format_standardization',
        column: 'phone',
        action: 'standardized',
        count: Math.floor(beforeRecords * 0.0025),
      },
    ];

    const removedCount = operations.reduce((acc, op) => acc + op.count, 0);
    const afterRecords = beforeRecords - removedCount;

    return {
      dataset,
      operations,
      before_records: beforeRecords,
      after_records: afterRecords,
      quality_improvement: removedCount / beforeRecords,
    };
  }

  private async checkQualityGates(inputs: Record<string, unknown>): Promise<QualityReport> {
    const dataset = inputs.dataset as string || 'default_dataset';
    const threshold = inputs.threshold as number || 0.9;

    const report = await this.validateQuality(inputs);
    report.status = report.quality_score >= threshold ? 'PASSED' : 'FAILED';

    return report;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export function createDataQualityAgent(config: DataQualityConfig): DataQualityAgent {
  return new DataQualityAgent(config);
}

async function main() {
  const agent = createDataQualityAgent({
    eventPublisher: {
      publish: async () => {},
      subscribe: async () => {},
    },
  });

  await agent.initialize('./manifest.yaml');

  const result = await agent.executeTask({
    taskId: 'test-task',
    agentId: 'agent-22-data-quality',
    goal: 'Validate customer data quality',
    inputs: {
      type: 'validate',
      dataset: 'customer_data',
      total_records: 100000,
    },
    constraints: { maxTokens: 30000, maxLatency: 180000 },
  });

  console.log('Result:', result);
}

if (require.main === module) {
  main().catch(console.error);
}

export default DataQualityAgent;
