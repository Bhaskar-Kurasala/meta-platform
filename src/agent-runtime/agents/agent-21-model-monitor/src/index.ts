/**
 * Agent 21 - Model Monitor
 *
 * Specialized agent for model monitoring, drift detection, and performance tracking.
 *
 * @module Agent21ModelMonitor
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

export interface MonitoringReport {
  model_name: string;
  period: string;
  metrics: {
    total_requests: number;
    avg_latency_ms: number;
    p99_latency_ms: number;
    error_rate: number;
    accuracy: number;
  };
  drift: {
    data_drift_score: number;
    concept_drift_detected: boolean;
    features_drifted: string[];
  };
  anomalies: {
    total: number;
    high_confidence_low: number;
    outliers: number;
  };
  alerts: Alert[];
}

export interface Alert {
  alert_id: string;
  model_name: string;
  type: 'data_drift' | 'concept_drift' | 'performance' | 'anomaly';
  severity: 'info' | 'warning' | 'critical';
  feature?: string;
  drift_score?: number;
  threshold?: number;
  recommendation: string;
  timestamp: string;
}

// ============================================================================
// Configuration
// ============================================================================

export interface ModelMonitorConfig {
  eventPublisher: EventPublisher;
  projectRoot?: string;
}

// ============================================================================
// Main Agent Class
// ============================================================================

export class ModelMonitorAgent {
  private config: ModelMonitorConfig;
  private manifest: AgentManifest | null = null;

  constructor(config: ModelMonitorConfig) {
    this.config = config;
  }

  async initialize(manifestPath: string): Promise<void> {
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    this.manifest = yaml.parse(manifestContent) as AgentManifest;
    console.log(`[ModelMonitor] Initialized with manifest: ${this.manifest?.id}`);
  }

  async executeTask(envelope: TaskEnvelope): Promise<AgentResult> {
    const startTime = Date.now();
    const taskId = envelope.taskId || this.generateId();

    try {
      const inputs = envelope.inputs || {};
      const taskType = inputs.type as string || 'monitor';

      let report: MonitoringReport;

      if (taskType === 'monitor') {
        report = await this.performMonitoring(inputs);
      } else if (taskType === 'drift_check') {
        report = await this.checkDrift(inputs);
      } else if (taskType === 'anomaly_check') {
        report = await this.checkAnomalies(inputs);
      } else {
        throw new Error(`Unknown task type: ${taskType}`);
      }

      // Generate alerts if needed
      const alerts = this.generateAlerts(report);

      const artifacts: Artifact[] = [
        {
          id: this.generateId(),
          type: 'monitoring-report',
          summary: `Monitoring: ${report.model_name}`,
          content: JSON.stringify(report, null, 2),
          produced_by: 'agent-21-model-monitor',
          created_at: new Date().toISOString(),
        },
      ];

      if (alerts.length > 0) {
        artifacts.push({
          id: this.generateId(),
          type: 'alerts',
          summary: `${alerts.length} alerts generated`,
          content: JSON.stringify(alerts, null, 2),
          produced_by: 'agent-21-model-monitor',
          created_at: new Date().toISOString(),
        });

        // Publish drift event if detected
        for (const alert of alerts) {
          await this.config.eventPublisher.publish('model.drift-detected', {
            alert_id: alert.alert_id,
            model_name: alert.model_name,
            type: alert.type,
            severity: alert.severity,
            timestamp: alert.timestamp,
          });
        }
      }

      const decisions: Decision[] = [
        {
          type: 'monitoring_status',
          reason: 'Continuous monitoring for model health',
          confidence: 0.95,
          inputs: { model_name: inputs.model_name },
        },
      ];

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
      console.error(`[ModelMonitor] Task ${taskId} failed:`, error);

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
          code: 'MONITORING_FAILED',
          message: error instanceof Error ? error.message : String(error),
          recoverable: true,
        },
      };
    }
  }

  private async performMonitoring(inputs: Record<string, unknown>): Promise<MonitoringReport> {
    const modelName = inputs.model_name as string || 'default_model';

    return {
      model_name: modelName,
      period: `${new Date(Date.now() - 86400000).toISOString()} to ${new Date().toISOString()}`,
      metrics: {
        total_requests: 50000,
        avg_latency_ms: 45,
        p99_latency_ms: 150,
        error_rate: 0.001,
        accuracy: 0.94,
      },
      drift: {
        data_drift_score: 0.05,
        concept_drift_detected: false,
        features_drifted: [],
      },
      anomalies: {
        total: 50,
        high_confidence_low: 30,
        outliers: 20,
      },
      alerts: [],
    };
  }

  private async checkDrift(inputs: Record<string, unknown>): Promise<MonitoringReport> {
    const modelName = inputs.model_name as string || 'default_model';
    const driftScore = inputs.drift_score as number || 0.05;

    const featuresDrifted = driftScore > 0.1 ? ['income', 'age'] : [];

    return {
      model_name: modelName,
      period: `${new Date(Date.now() - 86400000).toISOString()} to ${new Date().toISOString()}`,
      metrics: {
        total_requests: 50000,
        avg_latency_ms: 45,
        p99_latency_ms: 150,
        error_rate: 0.001,
        accuracy: 0.94,
      },
      drift: {
        data_drift_score: driftScore,
        concept_drift_detected: driftScore > 0.15,
        features_drifted: featuresDrifted,
      },
      anomalies: {
        total: 50,
        high_confidence_low: 30,
        outliers: 20,
      },
      alerts: [],
    };
  }

  private async checkAnomalies(inputs: Record<string, unknown>): Promise<MonitoringReport> {
    const modelName = inputs.model_name as string || 'default_model';

    return {
      model_name: modelName,
      period: `${new Date(Date.now() - 3600000).toISOString()} to ${new Date().toISOString()}`,
      metrics: {
        total_requests: 5000,
        avg_latency_ms: 45,
        p99_latency_ms: 150,
        error_rate: 0.001,
        accuracy: 0.94,
      },
      drift: {
        data_drift_score: 0.03,
        concept_drift_detected: false,
        features_drifted: [],
      },
      anomalies: {
        total: inputs.anomaly_count as number || 50,
        high_confidence_low: 30,
        outliers: 20,
      },
      alerts: [],
    };
  }

  private generateAlerts(report: MonitoringReport): Alert[] {
    const alerts: Alert[] = [];

    // Check drift
    if (report.drift.data_drift_score > 0.1) {
      alerts.push({
        alert_id: this.generateId(),
        model_name: report.model_name,
        type: 'data_drift',
        severity: report.drift.data_drift_score > 0.15 ? 'critical' : 'warning',
        drift_score: report.drift.data_drift_score,
        threshold: 0.1,
        recommendation: 'Review training data and consider retraining',
        timestamp: new Date().toISOString(),
      });
    }

    // Check concept drift
    if (report.drift.concept_drift_detected) {
      alerts.push({
        alert_id: this.generateId(),
        model_name: report.model_name,
        type: 'concept_drift',
        severity: 'critical',
        recommendation: 'Model may need retraining - label distribution has changed',
        timestamp: new Date().toISOString(),
      });
    }

    // Check anomalies
    if (report.anomalies.total > 100) {
      alerts.push({
        alert_id: this.generateId(),
        model_name: report.model_name,
        type: 'anomaly',
        severity: 'warning',
        recommendation: 'High number of anomalies detected - investigate input data',
        timestamp: new Date().toISOString(),
      });
    }

    return alerts;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export function createModelMonitorAgent(config: ModelMonitorConfig): ModelMonitorAgent {
  return new ModelMonitorAgent(config);
}

async function main() {
  const agent = createModelMonitorAgent({
    eventPublisher: {
      publish: async () => {},
      subscribe: async () => {},
    },
  });

  await agent.initialize('./manifest.yaml');

  const result = await agent.executeTask({
    taskId: 'test-task',
    agentId: 'agent-21-model-monitor',
    goal: 'Monitor churn prediction model',
    inputs: {
      type: 'monitor',
      model_name: 'churn_predictor',
    },
    constraints: { maxTokens: 30000, maxLatency: 120000 },
  });

  console.log('Result:', result);
}

if (require.main === module) {
  main().catch(console.error);
}

export default ModelMonitorAgent;
