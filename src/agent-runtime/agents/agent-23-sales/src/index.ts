/**
 * Agent 23 - Sales
 *
 * Specialized agent for sales support, lead qualification, and CRM operations.
 *
 * @module Agent23Sales
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

export interface LeadScore {
  lead_id: string;
  score: number;
  dimensions: {
    fit_score: number;
    engagement_score: number;
    intent_score: number;
    budget_score: number;
  };
  qualification: {
    budget: 'qualified' | 'unqualified' | 'unknown';
    authority: 'qualified' | 'unqualified' | 'unknown';
    need: 'qualified' | 'unqualified' | 'unknown';
    timeline: 'qualified' | 'unqualified' | 'unknown';
  };
  recommendation: 'proceed_to_discovery' | 'nurture' | 'disqualify';
}

export interface Opportunity {
  opportunity_id: string;
  stage: string;
  value: number;
  probability: number;
  close_date: string;
  next_steps: string;
  barriers: string[];
  competition?: string;
}

export interface MeetingNotes {
  meeting_id: string;
  attendees: string[];
  summary: string;
  notes: string[];
  action_items: ActionItem[];
}

export interface ActionItem {
  owner: string;
  task: string;
  due_date: string;
}

// ============================================================================
// Configuration
// ============================================================================

export interface SalesConfig {
  eventPublisher: EventPublisher;
  projectRoot?: string;
}

// ============================================================================
// Main Agent Class
// ============================================================================

export class SalesAgent {
  private config: SalesConfig;
  private manifest: AgentManifest | null = null;

  constructor(config: SalesConfig) {
    this.config = config;
  }

  async initialize(manifestPath: string): Promise<void> {
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    this.manifest = yaml.parse(manifestContent) as AgentManifest;
    console.log(`[Sales] Initialized with manifest: ${this.manifest?.id}`);
  }

  async executeTask(envelope: TaskEnvelope): Promise<AgentResult> {
    const startTime = Date.now();
    const taskId = envelope.taskId || this.generateId();

    try {
      const inputs = envelope.inputs || {};
      const taskType = inputs.type as string || 'qualify';

      let leadScore: LeadScore;
      let opportunity: Opportunity;
      let meetingNotes: MeetingNotes;

      if (taskType === 'qualify') {
        const result = await this.qualifyLead(inputs);
        leadScore = result;
        opportunity = this.createEmptyOpportunity();
        meetingNotes = this.createEmptyMeetingNotes();
      } else if (taskType === 'opportunity') {
        const result = await this.updateOpportunity(inputs);
        opportunity = result;
        leadScore = this.createDefaultLeadScore();
        meetingNotes = this.createEmptyMeetingNotes();
      } else if (taskType === 'meeting') {
        const result = await this.logMeeting(inputs);
        meetingNotes = result;
        leadScore = this.createDefaultLeadScore();
        opportunity = this.createEmptyOpportunity();
      } else {
        throw new Error(`Unknown task type: ${taskType}`);
      }

      const artifacts: Artifact[] = [
        {
          id: this.generateId(),
          type: taskType === 'qualify' ? 'lead-score' : taskType === 'opportunity' ? 'opportunity' : 'meeting-notes',
          summary: `Sales task: ${taskType}`,
          content: JSON.stringify(
            taskType === 'qualify' ? leadScore : taskType === 'opportunity' ? opportunity : meetingNotes,
            null,
            2
          ),
          produced_by: 'agent-23-sales',
          created_at: new Date().toISOString(),
        },
      ];

      const decisions: Decision[] = [
        {
          type: 'sales_action',
          reason: `Based on ${taskType} task`,
          confidence: 0.85,
          inputs: { task_type: taskType },
        },
      ];

      if (taskType === 'qualify') {
        await this.config.eventPublisher.publish('agent.23.lead-qualified', {
          lead_id: leadScore.lead_id,
          recommendation: leadScore.recommendation,
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
      console.error(`[Sales] Task ${taskId} failed:`, error);

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
          code: 'SALES_TASK_FAILED',
          message: error instanceof Error ? error.message : String(error),
          recoverable: true,
        },
      };
    }
  }

  private async qualifyLead(inputs: Record<string, unknown>): Promise<LeadScore> {
    const leadId = inputs.lead_id as string || this.generateId();

    // Calculate scores based on inputs
    const fitScore = inputs.fit_score as number || 80;
    const engagementScore = inputs.engagement_score as number || 70;
    const intentScore = inputs.intent_score as number || 75;
    const budgetScore = inputs.budget_score as number || 85;

    const overallScore = (fitScore + engagementScore + intentScore + budgetScore) / 4;

    // Determine qualification
    const budgetQual = budgetScore >= 70 ? 'qualified' : budgetScore >= 50 ? 'unknown' : 'unqualified';
    const authorityQual = fitScore >= 70 ? 'qualified' : 'unknown';
    const needQual = intentScore >= 70 ? 'qualified' : 'unknown';
    const timelineQual = inputs.timeline_qualified as boolean ?? true ? 'qualified' : 'unknown';

    // Determine recommendation
    let recommendation: LeadScore['recommendation'] = 'nurture';
    if (overallScore >= 75 && budgetQual === 'qualified' && authorityQual === 'qualified') {
      recommendation = 'proceed_to_discovery';
    } else if (overallScore < 50 || budgetQual === 'unqualified') {
      recommendation = 'disqualify';
    }

    return {
      lead_id: leadId,
      score: overallScore,
      dimensions: {
        fit_score: fitScore,
        engagement_score: engagementScore,
        intent_score: intentScore,
        budget_score: budgetScore,
      },
      qualification: {
        budget: budgetQual,
        authority: authorityQual,
        need: needQual,
        timeline: timelineQual,
      },
      recommendation,
    };
  }

  private async updateOpportunity(inputs: Record<string, unknown>): Promise<Opportunity> {
    return {
      opportunity_id: inputs.opportunity_id as string || this.generateId(),
      stage: inputs.stage as string || 'discovery',
      value: inputs.value as number || 50000,
      probability: inputs.probability as number || 20,
      close_date: inputs.close_date as string || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      next_steps: inputs.next_steps as string || 'Follow up next week',
      barriers: (inputs.barriers as string[]) || [],
      competition: inputs.competition as string,
    };
  }

  private async logMeeting(inputs: Record<string, unknown>): Promise<MeetingNotes> {
    return {
      meeting_id: this.generateId(),
      attendees: (inputs.attendees as string[]) || [],
      summary: inputs.summary as string || 'Initial discovery call',
      notes: (inputs.notes as string[]) || [],
      action_items: (inputs.action_items as ActionItem[]) || [
        {
          owner: 'agent-23',
          task: 'Send follow-up materials',
          due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        },
      ],
    };
  }

  private createDefaultLeadScore(): LeadScore {
    return {
      lead_id: this.generateId(),
      score: 75,
      dimensions: {
        fit_score: 80,
        engagement_score: 70,
        intent_score: 75,
        budget_score: 80,
      },
      qualification: {
        budget: 'qualified',
        authority: 'qualified',
        need: 'qualified',
        timeline: 'qualified',
      },
      recommendation: 'proceed_to_discovery',
    };
  }

  private createEmptyOpportunity(): Opportunity {
    return {
      opportunity_id: this.generateId(),
      stage: 'new',
      value: 0,
      probability: 10,
      close_date: '',
      next_steps: '',
      barriers: [],
    };
  }

  private createEmptyMeetingNotes(): MeetingNotes {
    return {
      meeting_id: this.generateId(),
      attendees: [],
      summary: '',
      notes: [],
      action_items: [],
    };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export function createSalesAgent(config: SalesConfig): SalesAgent {
  return new SalesAgent(config);
}

async function main() {
  const agent = createSalesAgent({
    eventPublisher: {
      publish: async () => {},
      subscribe: async () => {},
    },
  });

  await agent.initialize('./manifest.yaml');

  const result = await agent.executeTask({
    taskId: 'test-task',
    agentId: 'agent-23-sales',
    goal: 'Qualify new lead from Acme Corp',
    inputs: {
      type: 'qualify',
      lead_id: 'lead-123',
      fit_score: 85,
      engagement_score: 80,
      intent_score: 75,
      budget_score: 90,
      timeline_qualified: true,
    },
    constraints: { maxTokens: 30000, maxLatency: 180000 },
  });

  console.log('Result:', result);
}

if (require.main === module) {
  main().catch(console.error);
}

export default SalesAgent;
