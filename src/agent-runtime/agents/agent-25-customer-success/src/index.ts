/**
 * Agent 25 - Customer Success
 *
 * Specialized agent for customer onboarding, success planning, * @module Agent and retention.
 *
25CustomerSuccess
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

export interface CustomerProfile {
  customer_id: string;
  company: string;
  tier: 'starter' | 'professional' | 'enterprise';
  health_score: number;
  onboarding_status: 'not_started' | 'in_progress' | 'completed';
  success_plan?: SuccessPlan;
  risk_factors: string[];
  last_health_check: string;
}

export interface SuccessPlan {
  plan_id: string;
  goals: Goal[];
  milestones: Milestone[];
  stakeholders: Stakeholder[];
  next_review: string;
}

export interface Goal {
  goal: string;
  metric: string;
  timeline: string;
  status: 'not_started' | 'in_progress' | 'completed';
}

export interface Milestone {
  milestone: string;
  status: 'pending' | 'in_progress' | 'completed';
  date: string;
}

export interface Stakeholder {
  name: string;
  role: string;
  email: string;
}

export interface OnboardingPlan {
  customer_id: string;
  onboarding_id: string;
  phases: OnboardingPhase[];
  timeline_weeks: number;
  success_metrics: string[];
}

export interface OnboardingPhase {
  name: string;
  tasks: string[];
  status: 'pending' | 'in_progress' | 'completed';
}

export interface HealthAlert {
  alert_id: string;
  customer_id: string;
  health_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  triggers: string[];
  recommended_actions: string[];
  escalation_needed: boolean;
  timestamp: string;
}

// ============================================================================
// Configuration
// ============================================================================

export interface CustomerSuccessConfig {
  eventPublisher: EventPublisher;
  projectRoot?: string;
}

// ============================================================================
// Main Agent Class
// ============================================================================

export class CustomerSuccessAgent {
  private config: CustomerSuccessConfig;
  private manifest: AgentManifest | null = null;

  constructor(config: CustomerSuccessConfig) {
    this.config = config;
  }

  async initialize(manifestPath: string): Promise<void> {
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    this.manifest = yaml.parse(manifestContent) as AgentManifest;
    console.log(`[CustomerSuccess] Initialized with manifest: ${this.manifest?.id}`);
  }

  async executeTask(envelope: TaskEnvelope): Promise<AgentResult> {
    const startTime = Date.now();
    const taskId = envelope.taskId || this.generateId();

    try {
      const inputs = envelope.inputs || {};
      const taskType = inputs.type as string || 'onboard';

      let result: {
        onboarding?: OnboardingPlan;
        health?: HealthAlert;
        profile?: CustomerProfile;
        success?: SuccessPlan;
      };

      if (taskType === 'onboard') {
        result = await this.createOnboarding(inputs);
      } else if (taskType === 'health-check') {
        result = await this.performHealthCheck(inputs);
      } else if (taskType === 'success-plan') {
        result = await this.createSuccessPlan(inputs);
      } else if (taskType === 'churn-risk') {
        result = await this.assessChurnRisk(inputs);
      } else {
        throw new Error(`Unknown task type: ${taskType}`);
      }

      const artifacts: Artifact[] = [
        {
          id: this.generateId(),
          type: 'customer-success-output',
          summary: `Customer Success: ${taskType}`,
          content: JSON.stringify(result, null, 2),
          produced_by: 'agent-25-customer-success',
          created_at: new Date().toISOString(),
        },
      ];

      const decisions: Decision[] = [
        {
          type: 'customer_success_action',
          reason: `Executed ${taskType} task`,
          confidence: 0.9,
          inputs: { task_type: taskType },
        },
      ];

      // Publish relevant events
      if (taskType === 'onboarding' || (result as any).onboarding) {
        await this.config.eventPublisher.publish('agent.25.onboarding-started', {
          customer_id: inputs.customer_id,
          timestamp: new Date().toISOString(),
        });
      }

      if (taskType === 'health-check' && (result as any).health?.escalation_needed) {
        await this.config.eventPublisher.publish('agent.25.health-alert', {
          customer_id: inputs.customer_id,
          risk_level: (result as any).health.risk_level,
          timestamp: new Date().toISOString(),
        });
      }

      if (taskType === 'churn-risk' && (result as any).health?.risk_level === 'high') {
        await this.config.eventPublisher.publish('agent.25.churn-risk-detected', {
          customer_id: inputs.customer_id,
          risk_level: (result as any).health.risk_level,
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
      console.error(`[CustomerSuccess] Task ${taskId} failed:`, error);

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
          code: 'CUSTOMER_SUCCESS_FAILED',
          message: error instanceof Error ? error.message : String(error),
          recoverable: true,
        },
      };
    }
  }

  private async createOnboarding(inputs: Record<string, unknown>): Promise<{
    onboarding: OnboardingPlan;
    profile: CustomerProfile;
  }> {
    const customerId = inputs.customer_id as string || this.generateId();
    const company = inputs.company as string || 'Unknown Company';
    const tier = inputs.tier as CustomerProfile['tier'] || 'professional';

    const phases: OnboardingPhase[] = [
      {
        name: 'Week 1: Welcome & Discovery',
        tasks: [
          'Send welcome email with next steps',
          'Schedule kickoff call',
          'Collect initial requirements',
          'Identify key stakeholders',
        ],
        status: 'in_progress',
      },
      {
        name: 'Week 2-3: Implementation Planning',
        tasks: [
          'Create implementation roadmap',
          'Configure system settings',
          'Set up integrations',
          'Plan data migration (if applicable)',
        ],
        status: 'pending',
      },
      {
        name: 'Week 4-6: Training & Setup',
        tasks: [
          'Conduct admin training',
          'Conduct end-user training',
          'Configure initial workflows',
          'Complete security review',
        ],
        status: 'pending',
      },
      {
        name: 'Week 7-8: Go-Live & Value Realization',
        tasks: [
          'Launch to full team',
          'Conduct value check-in',
          'Review success metrics',
          'Plan next phase',
        ],
        status: 'pending',
      },
    ];

    const onboarding: OnboardingPlan = {
      customer_id: customerId,
      onboarding_id: this.generateId(),
      phases,
      timeline_weeks: 8,
      success_metrics: [
        '80% team adoption',
        '3 key features in use',
        'First success story documented',
      ],
    };

    const profile: CustomerProfile = {
      customer_id: customerId,
      company,
      tier,
      health_score: 100,
      onboarding_status: 'in_progress',
      risk_factors: [],
      last_health_check: new Date().toISOString(),
    };

    return { onboarding, profile };
  }

  private async performHealthCheck(inputs: Record<string, unknown>): Promise<{
    health: HealthAlert;
    profile: CustomerProfile;
  }> {
    const customerId = inputs.customer_id as string || this.generateId();

    // Simulated health metrics
    const usageScore = inputs.usage_score as number || Math.floor(Math.random() * 100);
    const adoptionScore = inputs.adoption_score as number || Math.floor(Math.random() * 100);
    const engagementScore = inputs.engagement_score as number || Math.floor(Math.random() * 100);
    const supportScore = inputs.support_score as number || Math.floor(Math.random() * 100);

    const healthScore = Math.round(
      usageScore * 0.4 + adoptionScore * 0.3 + engagementScore * 0.2 + supportScore * 0.1
    );

    const triggers: string[] = [];
    if (usageScore < 50) triggers.push('low_usage');
    if (adoptionScore < 50) triggers.push('low_adoption');
    if (engagementScore < 50) triggers.push('low_engagement');
    if (supportScore < 50) triggers.push('high_support_tickets');

    const riskLevel: HealthAlert['risk_level'] =
      healthScore >= 70 ? 'low' :
      healthScore >= 50 ? 'medium' :
      healthScore >= 30 ? 'high' : 'critical';

    const health: HealthAlert = {
      alert_id: this.generateId(),
      customer_id: customerId,
      health_score: healthScore,
      risk_level: riskLevel,
      triggers,
      recommended_actions: this.getRecommendedActions(riskLevel),
      escalation_needed: riskLevel === 'high' || riskLevel === 'critical',
      timestamp: new Date().toISOString(),
    };

    const profile: CustomerProfile = {
      customer_id: customerId,
      company: inputs.company as string || 'Unknown Company',
      tier: 'professional',
      health_score: healthScore,
      onboarding_status: 'completed',
      risk_factors: triggers,
      last_health_check: new Date().toISOString(),
    };

    return { health, profile };
  }

  private getRecommendedActions(riskLevel: HealthAlert['risk_level']): string[] {
    const actions: Record<HealthAlert['risk_level'], string[]> = {
      low: ['Continue regular check-ins', 'Share product updates'],
      medium: ['Schedule success review call', 'Offer training session'],
      high: ['Schedule executive review', 'Address immediate concerns', 'Create recovery plan'],
      critical: ['Immediate escalation required', 'Assign dedicated support', 'Executive involvement'],
    };
    return actions[riskLevel];
  }

  private async createSuccessPlan(inputs: Record<string, unknown>): Promise<{
    success: SuccessPlan;
    profile: CustomerProfile;
  }> {
    const customerId = inputs.customer_id as string || this.generateId();

    const success: SuccessPlan = {
      plan_id: this.generateId(),
      goals: (inputs.goals as Goal[]) || [
        { goal: 'Increase team adoption', metric: '80% active users', timeline: 'Q2', status: 'in_progress' },
        { goal: 'Reduce support tickets', metric: '50% reduction', timeline: 'Q3', status: 'not_started' },
      ],
      milestones: [
        { milestone: 'Initial training complete', status: 'completed', date: '2026-01-15' },
        { milestone: 'First integration live', status: 'in_progress', date: '2026-02-20' },
        { milestone: 'Value realization check', status: 'pending', date: '2026-03-15' },
      ],
      stakeholders: (inputs.stakeholders as Stakeholder[]) || [
        { name: 'John Doe', role: 'Champion', email: 'john@company.com' },
        { name: 'Jane Smith', role: 'Sponsor', email: 'jane@company.com' },
      ],
      next_review: '2026-03-01',
    };

    const profile: CustomerProfile = {
      customer_id: customerId,
      company: inputs.company as string || 'Unknown Company',
      tier: inputs.tier as CustomerProfile['tier'] || 'enterprise',
      health_score: 75,
      onboarding_status: 'completed',
      success_plan: success,
      risk_factors: [],
      last_health_check: new Date().toISOString(),
    };

    return { success, profile };
  }

  private async assessChurnRisk(inputs: Record<string, unknown>): Promise<{
    health: HealthAlert;
  }> {
    const customerId = inputs.customer_id as string || this.generateId();

    // Risk factors
    const signals = (inputs.signals as string[]) || [];

    let riskScore = 20; // Base risk

    if (signals.includes('login_decrease')) riskScore += 20;
    if (signals.includes('support_spike')) riskScore += 15;
    if (signals.includes('nps_drop')) riskScore += 25;
    if (signals.includes('champion_left')) riskScore += 30;
    if (signals.includes('budget_issues')) riskScore += 20;
    if (signals.includes('competitor_active')) riskScore += 15;

    const riskLevel: HealthAlert['risk_level'] =
      riskScore >= 80 ? 'critical' :
      riskScore >= 60 ? 'high' :
      riskScore >= 40 ? 'medium' : 'low';

    const health: HealthAlert = {
      alert_id: this.generateId(),
      customer_id: customerId,
      health_score: Math.max(0, 100 - riskScore),
      risk_level: riskLevel,
      triggers: signals,
      recommended_actions: this.getChurnPreventionActions(riskLevel),
      escalation_needed: riskLevel === 'high' || riskLevel === 'critical',
      timestamp: new Date().toISOString(),
    };

    return { health };
  }

  private getChurnPreventionActions(riskLevel: HealthAlert['risk_level']): string[] {
    const actions: Record<HealthAlert['risk_level'], string[]> = {
      low: ['Maintain regular engagement'],
      medium: ['Proactive check-in', 'Share success stories'],
      high: ['Schedule executive meeting', 'Offer incentives', 'Create retention plan'],
      critical: ['Immediate intervention required', 'Executive escalation', 'Custom retention offer'],
    };
    return actions[riskLevel];
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export function createCustomerSuccessAgent(config: CustomerSuccessConfig): CustomerSuccessAgent {
  return new CustomerSuccessAgent(config);
}

async function main() {
  const agent = createCustomerSuccessAgent({
    eventPublisher: {
      publish: async () => {},
      subscribe: async () => {},
    },
  });

  await agent.initialize('./manifest.yaml');

  // Test onboarding
  const onboardingResult = await agent.executeTask({
    taskId: 'test-onboarding',
    agentId: 'agent-25-customer-success',
    goal: 'Create onboarding plan for new enterprise customer',
    inputs: {
      type: 'onboard',
      customer_id: 'cust-enterprise-001',
      company: 'Acme Enterprise',
      tier: 'enterprise',
    },
    constraints: { maxTokens: 50000, maxLatency: 180000 },
  });

  console.log('Onboarding Result:', JSON.stringify(onboardingResult, null, 2));

  // Test health check
  const healthResult = await agent.executeTask({
    taskId: 'test-health',
    agentId: 'agent-25-customer-success',
    goal: 'Perform health check for customer',
    inputs: {
      type: 'health-check',
      customer_id: 'cust-001',
      company: 'Acme Corp',
      usage_score: 40,
      adoption_score: 35,
      engagement_score: 30,
      support_score: 80,
    },
    constraints: { maxTokens: 50000, maxLatency: 180000 },
  });

  console.log('Health Check Result:', JSON.stringify(healthResult, null, 2));
}

if (require.main === module) {
  main().catch(console.error);
}

export default CustomerSuccessAgent;
