/**
 * Agent 20 - Labeling
 *
 * Specialized agent for data labeling, annotation, and quality assurance.
 *
 * @module Agent20Labeling
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

export interface LabelingTask {
  task_id: string;
  dataset: string;
  total_items: number;
  labeled_items: number;
  pending_items: number;
  progress_percentage: number;
  quality_metrics: {
    agreement_score: number;
    review_pass_rate: number;
    average_time_per_item: string;
  };
  estimated_completion: string;
}

export interface QualityReport {
  dataset_id: string;
  total_labels: number;
  quality_score: number;
  inter_annotator_agreement: number;
  issues_found: number;
  issues_resolved: number;
  categories: {
    correct: number;
    needs_review: number;
    disputed: number;
  };
}

export interface AnnotationConfig {
  project_name: string;
  labeling_type: string;
  labels: string[];
  guidelines: string;
  quality_checks: {
    sample_size: number;
    agreement_threshold: number;
    review_rate: number;
  };
}

// ============================================================================
// Configuration
// ============================================================================

export interface LabelingConfig {
  eventPublisher: EventPublisher;
  projectRoot?: string;
}

// ============================================================================
// Main Agent Class
// ============================================================================

export class LabelingAgent {
  private config: LabelingConfig;
  private manifest: AgentManifest | null = null;

  constructor(config: LabelingConfig) {
    this.config = config;
  }

  async initialize(manifestPath: string): Promise<void> {
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    this.manifest = yaml.parse(manifestContent) as AgentManifest;
    console.log(`[Labeling] Initialized with manifest: ${this.manifest?.id}`);
  }

  async executeTask(envelope: TaskEnvelope): Promise<AgentResult> {
    const startTime = Date.now();
    const taskId = envelope.taskId || this.generateId();

    try {
      const inputs = envelope.inputs || {};
      const taskType = inputs.type as string || 'label';

      let labelingTask: LabelingTask;
      let qualityReport: QualityReport;

      if (taskType === 'label') {
        const result = await this.createLabelingTask(inputs);
        labelingTask = result.task;
        qualityReport = result.quality;
      } else if (taskType === 'qa') {
        const result = await this.performQA(inputs);
        labelingTask = result.task;
        qualityReport = result.quality;
      } else if (taskType === 'curate') {
        const result = await this.curateDataset(inputs);
        labelingTask = result.task;
        qualityReport = result.quality;
      } else {
        throw new Error(`Unknown task type: ${taskType}`);
      }

      const artifacts: Artifact[] = [
        {
          id: this.generateId(),
          type: 'labeling-task',
          summary: `Labeling: ${labelingTask.dataset}`,
          content: JSON.stringify(labelingTask, null, 2),
          produced_by: 'agent-20-labeling',
          created_at: new Date().toISOString(),
        },
        {
          id: this.generateId(),
          type: 'quality-report',
          summary: `Quality report: ${qualityReport.dataset_id}`,
          content: JSON.stringify(qualityReport, null, 2),
          produced_by: 'agent-20-labeling',
          created_at: new Date().toISOString(),
        },
      ];

      const decisions: Decision[] = [
        {
          type: 'labeling_strategy',
          reason: 'Based on dataset size and labeling complexity',
          confidence: 0.85,
          inputs: { task_type: taskType },
        },
      ];

      await this.config.eventPublisher.publish('agent.20.labeling-complete', {
        dataset: labelingTask.dataset,
        progress: labelingTask.progress_percentage,
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
          actionsExecuted: labelingTask.labeled_items,
        },
      };
    } catch (error) {
      console.error(`[Labeling] Task ${taskId} failed:`, error);

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
          code: 'LABELING_FAILED',
          message: error instanceof Error ? error.message : String(error),
          recoverable: true,
        },
      };
    }
  }

  private async createLabelingTask(inputs: Record<string, unknown>): Promise<{
    task: LabelingTask;
    quality: QualityReport;
  }> {
    const dataset = inputs.dataset as string || 'training_data';
    const totalItems = inputs.total_items as number || 10000;
    const labeledItems = inputs.labeled_items as number || 0;

    const task: LabelingTask = {
      task_id: this.generateId(),
      dataset,
      total_items: totalItems,
      labeled_items: labeledItems,
      pending_items: totalItems - labeledItems,
      progress_percentage: (labeledItems / totalItems) * 100,
      quality_metrics: {
        agreement_score: 0.85,
        review_pass_rate: 0.9,
        average_time_per_item: '30s',
      },
      estimated_completion: new Date(Date.now() + 86400000).toISOString(),
    };

    const quality: QualityReport = {
      dataset_id: this.generateId(),
      total_labels: labeledItems,
      quality_score: 0.9,
      inter_annotator_agreement: 0.85,
      issues_found: Math.floor(labeledItems * 0.05),
      issues_resolved: Math.floor(labeledItems * 0.04),
      categories: {
        correct: Math.floor(labeledItems * 0.95),
        needs_review: Math.floor(labeledItems * 0.04),
        disputed: Math.floor(labeledItems * 0.01),
      },
    };

    return { task, quality };
  }

  private async performQA(inputs: Record<string, unknown>): Promise<{
    task: LabelingTask;
    quality: QualityReport;
  }> {
    const dataset = inputs.dataset as string || 'training_data';
    const sampleSize = inputs.sample_size as number || 100;

    const task: LabelingTask = {
      task_id: this.generateId(),
      dataset: `${dataset}_qa`,
      total_items: sampleSize,
      labeled_items: sampleSize,
      pending_items: 0,
      progress_percentage: 100,
      quality_metrics: {
        agreement_score: 0.92,
        review_pass_rate: 0.95,
        average_time_per_item: '45s',
      },
      estimated_completion: new Date().toISOString(),
    };

    const quality: QualityReport = {
      dataset_id: this.generateId(),
      total_labels: sampleSize,
      quality_score: 0.94,
      inter_annotator_agreement: 0.89,
      issues_found: Math.floor(sampleSize * 0.05),
      issues_resolved: Math.floor(sampleSize * 0.05),
      categories: {
        correct: Math.floor(sampleSize * 0.95),
        needs_review: Math.floor(sampleSize * 0.04),
        disputed: Math.floor(sampleSize * 0.01),
      },
    };

    return { task, quality };
  }

  private async curateDataset(inputs: Record<string, unknown>): Promise<{
    task: LabelingTask;
    quality: QualityReport;
  }> {
    const dataset = inputs.dataset as string || 'training_data';
    const totalItems = inputs.total_items as number || 10000;

    const curatedCount = Math.floor(totalItems * 0.8);

    const task: LabelingTask = {
      task_id: this.generateId(),
      dataset: `${dataset}_curated`,
      total_items: curatedCount,
      labeled_items: curatedCount,
      pending_items: 0,
      progress_percentage: 100,
      quality_metrics: {
        agreement_score: 0.95,
        review_pass_rate: 0.98,
        average_time_per_item: '20s',
      },
      estimated_completion: new Date().toISOString(),
    };

    const quality: QualityReport = {
      dataset_id: this.generateId(),
      total_labels: curatedCount,
      quality_score: 0.96,
      inter_annotator_agreement: 0.92,
      issues_found: Math.floor(curatedCount * 0.02),
      issues_resolved: Math.floor(curatedCount * 0.02),
      categories: {
        correct: curatedCount,
        needs_review: 0,
        disputed: 0,
      },
    };

    return { task, quality };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export function createLabelingAgent(config: LabelingConfig): LabelingAgent {
  return new LabelingAgent(config);
}

async function main() {
  const agent = createLabelingAgent({
    eventPublisher: {
      publish: async () => {},
      subscribe: async () => {},
    },
  });

  await agent.initialize('./manifest.yaml');

  const result = await agent.executeTask({
    taskId: 'test-task',
    agentId: 'agent-20-labeling',
    goal: 'Label customer review sentiment data',
    inputs: {
      type: 'label',
      dataset: 'customer_reviews',
      total_items: 10000,
      labeled_items: 0,
    },
    constraints: { maxTokens: 30000, maxLatency: 180000 },
  });

  console.log('Result:', result);
}

if (require.main === module) {
  main().catch(console.error);
}

export default LabelingAgent;
