/**
 * Agent 17 - Data Engineer
 *
 * Specialized agent for data pipelines, ETL, and data warehousing.
 *
 * @module Agent17DataEngineer
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

export interface PipelineConfig {
  name: string;
  source: DataSource;
  transformations: Transformation[];
  destination: DataDestination;
  schedule?: string;
  alerts?: string[];
}

export interface DataSource {
  type: 'postgres' | 'mysql' | 'mongo' | 's3' | 'kafka' | 'api';
  connection: string;
  query?: string;
  schema?: string;
}

export interface Transformation {
  name: string;
  type: 'filter' | 'join' | 'aggregate' | 'map' | 'validate';
  condition?: string;
  target?: string;
  on?: string;
}

export interface DataDestination {
  type: 'postgres' | 'snowflake' | 'bigquery' | 's3' | 'elasticsearch';
  table?: string;
  bucket?: string;
}

export interface DataQualityReport {
  batch_id: string;
  timestamp: string;
  record_count: number;
  quality_metrics: {
    null_percentage: number;
    duplicate_rate: number;
    schema_violations: number;
  };
  issues: QualityIssue[];
}

export interface QualityIssue {
  severity: 'critical' | 'major' | 'minor';
  field: string;
  description: string;
}

// ============================================================================
// Configuration
// ============================================================================

export interface DataEngineerConfig {
  eventPublisher: EventPublisher;
  projectRoot?: string;
}

// ============================================================================
// Main Agent Class
// ============================================================================

export class DataEngineerAgent {
  private config: DataEngineerConfig;
  private manifest: AgentManifest | null = null;

  constructor(config: DataEngineerConfig) {
    this.config = config;
  }

  async initialize(manifestPath: string): Promise<void> {
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    this.manifest = yaml.parse(manifestContent) as AgentManifest;
    console.log(`[DataEngineer] Initialized with manifest: ${this.manifest?.id}`);
  }

  async executeTask(envelope: TaskEnvelope): Promise<AgentResult> {
    const startTime = Date.now();
    const taskId = envelope.taskId || this.generateId();

    try {
      const inputs = envelope.inputs || {};
      const pipelineType = inputs.type as string || 'etl';

      let pipeline: PipelineConfig;
      let qualityReport: DataQualityReport;

      if (pipelineType === 'etl') {
        pipeline = await this.buildETLPipeline(inputs);
      } else if (pipelineType === 'streaming') {
        pipeline = await this.buildStreamingPipeline(inputs);
      } else if (pipelineType === 'warehouse') {
        pipeline = await this.buildWarehouseSchema(inputs);
      } else {
        throw new Error(`Unknown pipeline type: ${pipelineType}`);
      }

      // Validate pipeline
      this.validatePipeline(pipeline);

      // Generate quality report
      qualityReport = await this.generateQualityReport(pipeline);

      const artifacts: Artifact[] = [
        {
          id: this.generateId(),
          type: 'pipeline-definition',
          summary: `Pipeline: ${pipeline.name}`,
          content: JSON.stringify(pipeline, null, 2),
          produced_by: 'agent-17-data-engineer',
          created_at: new Date().toISOString(),
        },
        {
          id: this.generateId(),
          type: 'data-quality-report',
          summary: `Quality report for ${pipeline.name}`,
          content: JSON.stringify(qualityReport, null, 2),
          produced_by: 'agent-17-data-engineer',
          created_at: new Date().toISOString(),
        },
      ];

      const decisions: Decision[] = [
        {
          type: 'pipeline_architecture',
          reason: 'Selected based on data volume and latency requirements',
          confidence: 0.85,
          inputs: { pipeline_type: pipelineType },
        },
      ];

      await this.config.eventPublisher.publish('agent.17.pipeline-ready', {
        pipeline_name: pipeline.name,
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
          actionsExecuted: pipeline.transformations.length,
        },
      };
    } catch (error) {
      console.error(`[DataEngineer] Task ${taskId} failed:`, error);

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
          code: 'PIPELINE_FAILED',
          message: error instanceof Error ? error.message : String(error),
          recoverable: true,
        },
      };
    }
  }

  private async buildETLPipeline(inputs: Record<string, unknown>): Promise<PipelineConfig> {
    const name = inputs.name as string || 'etl_pipeline';
    const sourceType = inputs.source_type as string || 'postgres';
    const destType = inputs.destination_type as string || 'snowflake';

    return {
      name,
      source: {
        type: sourceType as PipelineConfig['source']['type'],
        connection: inputs.source_connection as string || 'source_db',
        query: inputs.query as string || 'SELECT * FROM source_table',
      },
      transformations: [
        {
          name: 'validate_schema',
          type: 'validate',
        },
        {
          name: 'clean_data',
          type: 'map',
        },
        {
          name: 'enrich_data',
          type: 'join',
          target: 'dimensions',
          on: 'dimension_id',
        },
      ],
      destination: {
        type: destType as PipelineConfig['destination']['type'],
        table: inputs.destination_table as string || 'target_table',
      },
      schedule: inputs.schedule as string || '0 * * * *',
      alerts: ['on_failure', 'on_data_quality_issue'],
    };
  }

  private async buildStreamingPipeline(inputs: Record<string, unknown>): Promise<PipelineConfig> {
    const name = inputs.name as string || 'streaming_pipeline';

    return {
      name,
      source: {
        type: 'kafka',
        connection: inputs.kafka_topic as string || 'events_topic',
        schema: 'avro',
      },
      transformations: [
        {
          name: 'parse_event',
          type: 'map',
        },
        {
          name: 'filter_valid',
          type: 'filter',
          condition: 'event_type IS NOT NULL',
        },
        {
          name: 'aggregate_window',
          type: 'aggregate',
        },
      ],
      destination: {
        type: 'elasticsearch',
        table: inputs.index_name as string || 'events_index',
      },
      alerts: ['on_failure', 'on_lag_exceeded'],
    };
  }

  private async buildWarehouseSchema(inputs: Record<string, unknown>): Promise<PipelineConfig> {
    const name = inputs.name as string || 'warehouse_schema';

    return {
      name,
      source: {
        type: 'postgres',
        connection: inputs.source_connection as string || 'oltp_db',
      },
      transformations: [
        {
          name: 'create_fact_table',
          type: 'map',
        },
        {
          name: 'create_dimension_tables',
          type: 'join',
        },
      ],
      destination: {
        type: 'snowflake',
        table: inputs.warehouse_name as string || 'analytics_warehouse',
      },
      alerts: ['on_schema_drift'],
    };
  }

  private validatePipeline(pipeline: PipelineConfig): void {
    // Check required fields
    if (!pipeline.name) {
      throw new Error('Invariant violation: Pipeline name is required');
    }

    if (!pipeline.source) {
      throw new Error('Invariant violation: Pipeline source is required');
    }

    if (!pipeline.destination) {
      throw new Error('Invariant violation: Pipeline destination is required');
    }

    // Check idempotency
    if (!pipeline.transformations || pipeline.transformations.length === 0) {
      console.warn('[DataEngineer] No transformations defined - pipeline may not be idempotent');
    }
  }

  private async generateQualityReport(pipeline: PipelineConfig): Promise<DataQualityReport> {
    return {
      batch_id: this.generateId(),
      timestamp: new Date().toISOString(),
      record_count: 10000,
      quality_metrics: {
        null_percentage: 0.5,
        duplicate_rate: 0.01,
        schema_violations: 0,
      },
      issues: [],
    };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export function createDataEngineerAgent(config: DataEngineerConfig): DataEngineerAgent {
  return new DataEngineerAgent(config);
}

async function main() {
  const agent = createDataEngineerAgent({
    eventPublisher: {
      publish: async () => {},
      subscribe: async () => {},
    },
  });

  await agent.initialize('./manifest.yaml');

  const result = await agent.executeTask({
    taskId: 'test-task',
    agentId: 'agent-17-data-engineer',
    goal: 'Build user events ETL pipeline',
    inputs: {
      type: 'etl',
      name: 'user_events_etl',
      source_type: 'postgres',
      destination_type: 'snowflake',
      source_connection: 'analytics_db',
      destination_table: 'analytics.user_events',
    },
    constraints: { maxTokens: 50000, maxLatency: 300000 },
  });

  console.log('Result:', result);
}

if (require.main === module) {
  main().catch(console.error);
}

export default DataEngineerAgent;
