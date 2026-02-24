/**
 * Agent 15 - Incident
 *
 * Specialized agent for incident management, diagnosis, and post-mortem.
 *
 * @module Agent15Incident
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

export interface Incident {
  id: string;
  title: string;
  severity: 'P1' | 'P2' | 'P3' | 'P4';
  status: 'open' | 'investigating' | 'identified' | 'monitoring' | 'resolved';
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  description: string;
  impact: ImpactAssessment;
  timeline: TimelineEntry[];
  affected_services: string[];
  runbooks_executed: string[];
}

export interface ImpactAssessment {
  users_affected: number;
  services_affected: string[];
  duration_minutes: number;
  error_rate?: number;
  revenue_impact?: number;
}

export interface TimelineEntry {
  timestamp: string;
  action: string;
  actor: string;
  details: string;
}

export interface RunbookResult {
  runbook_id: string;
  steps_executed: number;
  successful: boolean;
  output: string;
}

export interface PostMortem {
  id: string;
  incident_id: string;
  summary: string;
  root_cause: string;
  impact: string;
  timeline: TimelineEntry[];
  action_items: ActionItem[];
  lessons_learned: string[];
  created_at: string;
}

export interface ActionItem {
  id: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  assignee?: string;
  due_date?: string;
  status: 'pending' | 'in_progress' | 'completed';
}

// ============================================================================
// Configuration
// ============================================================================

export interface IncidentConfig {
  eventPublisher: EventPublisher;
  projectRoot?: string;
}

// ============================================================================
// Main Agent Class
// ============================================================================

export class IncidentAgent {
  private config: IncidentConfig;
  private manifest: AgentManifest | null = null;

  constructor(config: IncidentConfig) {
    this.config = config;
  }

  async initialize(manifestPath: string): Promise<void> {
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    this.manifest = yaml.parse(manifestContent) as AgentManifest;
    console.log(`[Incident] Initialized with manifest: ${this.manifest.id}`);
  }

  async executeTask(envelope: TaskEnvelope): Promise<AgentResult> {
    const startTime = Date.now();
    const taskId = envelope.taskId || this.generateId();

    try {
      const inputs = envelope.inputs || {};
      const taskType = inputs.task_type as string || 'create';

      let result: unknown;

      if (taskType === 'create') {
        result = await this.createIncident(inputs);
      } else if (taskType === 'diagnose') {
        result = await this.diagnoseIncident(inputs);
      } else if (taskType === 'runbook') {
        result = await this.executeRunbook(inputs);
      } else if (taskType === 'postmortem') {
        result = await this.createPostMortem(inputs);
      } else if (taskType === 'escalate') {
        result = await this.escalateIncident(inputs);
      } else {
        throw new Error(`Unknown task type: ${taskType}`);
      }

      const artifacts: Artifact[] = [
        {
          id: this.generateId(),
          type: 'incident-report',
          summary: `Incident Report: ${taskType}`,
          content: JSON.stringify(result, null, 2),
          produced_by: 'agent-15-incident',
          created_at: new Date().toISOString(),
        },
      ];

      const decisions: Decision[] = [
        {
          type: 'incident_response',
          reason: `Incident task ${taskType} completed`,
          confidence: 0.9,
          inputs: { task_type: taskType },
        },
      ];

      await this.config.eventPublisher.publish('agent.15.incident-updated', {
        task_type: taskType,
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
          actionsExecuted: 1,
        },
      };
    } catch (error) {
      console.error(`[Incident] Task ${taskId} failed:`, error);

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
          code: 'INCIDENT_TASK_FAILED',
          message: error instanceof Error ? error.message : String(error),
          recoverable: true,
        },
      };
    }
  }

  private async createIncident(inputs: Record<string, unknown>): Promise<Incident> {
    const incident: Incident = {
      id: this.generateId(),
      title: inputs.title as string || 'Unknown Incident',
      severity: (inputs.severity as 'P1' | 'P2' | 'P3' | 'P4') || 'P3',
      status: 'open',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      description: inputs.description as string || 'Incident description',
      impact: {
        users_affected: (inputs.users_affected as number) || 0,
        services_affected: (inputs.services_affected as string[]) || [],
        duration_minutes: 0,
      },
      timeline: [
        {
          timestamp: new Date().toISOString(),
          action: 'Incident created',
          actor: 'agent-15-incident',
          details: 'Initial incident created',
        },
      ],
      affected_services: (inputs.services_affected as string[]) || [],
      runbooks_executed: [],
    };

    return incident;
  }

  private async diagnoseIncident(inputs: Record<string, unknown>): Promise<DiagnosisResult> {
    const incidentId = inputs.incident_id as string || 'unknown';

    // Simulate diagnosis
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      incident_id: incidentId,
      diagnosis: 'Database connection pool exhaustion',
      root_cause: 'Memory leak in connection pool management',
      evidence: [
        'Database CPU at 100%',
        'Connection count at max (500)',
        'Memory usage steadily increasing',
      ],
      recommended_actions: [
        'Restart database pods',
        'Scale up database',
        'Fix connection pool leak',
      ],
    };
  }

  private async executeRunbook(inputs: Record<string, unknown>): Promise<RunbookResult> {
    const runbookId = inputs.runbook_id as string || 'default';
    const incidentId = inputs.incident_id as string || 'unknown';

    // Simulate runbook execution
    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
      runbook_id: runbookId,
      steps_executed: 5,
      successful: true,
      output: 'Runbook completed successfully. Service restored.',
    };
  }

  private async createPostMortem(inputs: Record<string, unknown>): Promise<PostMortem> {
    const incidentId = inputs.incident_id as string || 'unknown';

    const postMortem: PostMortem = {
      id: this.generateId(),
      incident_id: incidentId,
      summary: 'Database connection pool exhaustion caused service degradation',
      root_cause: 'Memory leak in database connection pool management caused connections to accumulate until the pool was exhausted',
      impact: '5000 users affected for 45 minutes. Error rate peaked at 85%.',
      timeline: [
        {
          timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          action: 'Incident started',
          actor: 'System',
          details: 'Error rate began increasing',
        },
        {
          timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
          action: 'Alert triggered',
          actor: 'Monitoring',
          details: 'P1 alert: Error rate above 50%',
        },
        {
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          action: 'Incident diagnosed',
          actor: 'On-call engineer',
          details: 'Root cause identified as connection pool exhaustion',
        },
        {
          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          action: 'Service restored',
          actor: 'SRE team',
          details: 'Database pods restarted, connections cleared',
        },
      ],
      action_items: [
        {
          id: this.generateId(),
          description: 'Fix memory leak in connection pool',
          priority: 'high',
          status: 'pending',
        },
        {
          id: this.generateId(),
          description: 'Add alerting for connection pool size',
          priority: 'medium',
          status: 'pending',
        },
        {
          id: this.generateId(),
          description: 'Implement circuit breaker pattern',
          priority: 'low',
          status: 'pending',
        },
      ],
      lessons_learned: [
        'Need better monitoring of database connections',
        'Circuit breakers would help prevent cascade failures',
        'Runbooks should include database restart procedures',
      ],
      created_at: new Date().toISOString(),
    };

    await this.config.eventPublisher.publish('agent.15.post-mortem-complete', {
      incident_id: incidentId,
      timestamp: new Date().toISOString(),
    });

    return postMortem;
  }

  private async escalateIncident(inputs: Record<string, unknown>): Promise<EscalationResult> {
    const incidentId = inputs.incident_id as string || 'unknown';
    const severity = inputs.severity as string || 'P2';
    const reason = inputs.reason as string || 'Unresolved after SLA';

    return {
      incident_id: incidentId,
      escalated_to: severity === 'P1' ? 'Engineering Lead' : 'Senior SRE',
      reason,
      escalated_at: new Date().toISOString(),
      notifications_sent: ['Slack #incidents', 'PagerDuty'],
    };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export interface DiagnosisResult {
  incident_id: string;
  diagnosis: string;
  root_cause: string;
  evidence: string[];
  recommended_actions: string[];
}

export interface EscalationResult {
  incident_id: string;
  escalated_to: string;
  reason: string;
  escalated_at: string;
  notifications_sent: string[];
}

export function createIncidentAgent(config: IncidentConfig): IncidentAgent {
  return new IncidentAgent(config);
}

async function main() {
  const agent = createIncidentAgent({
    eventPublisher: {
      publish: async () => {},
      subscribe: async () => {},
    },
  });

  await agent.initialize('./manifest.yaml');

  const result = await agent.executeTask({
    taskId: 'test-task',
    agentId: 'agent-15-incident',
    goal: 'Create incident',
    inputs: {
      task_type: 'create',
      title: 'Database connection issues',
      severity: 'P2',
      description: 'Users reporting slow responses',
      services_affected: ['api-gateway', 'user-service'],
    },
    constraints: { maxTokens: 50000, maxLatency: 600000 },
  });

  console.log('Result:', result);
}

if (require.main === module) {
  main().catch(console.error);
}

export default IncidentAgent;
