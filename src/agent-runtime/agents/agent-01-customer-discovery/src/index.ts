/**
 * Agent 01 - Customer Discovery
 *
 * Specialized agent for customer research, needs gathering, and pain point identification.
 *
 * @module Agent01CustomerDiscovery
 */

import {
  AgentManifest,
  TaskEnvelope,
  AgentResult,
  AgentError,
  EventPublisher,
  MemoryClient,
  Artifact,
  Decision,
} from '@dap/agent-runtime-common';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

// ============================================================================
// Types
// ============================================================================

export interface CustomerInsight {
  id: string;
  category: 'need' | 'pain_point' | 'motivation' | 'behavior';
  description: string;
  evidence: Evidence[];
  confidence: number;
  impact: 'low' | 'medium' | 'high';
}

export interface Evidence {
  type: 'interview' | 'survey' | 'ticket' | 'analytics' | 'crm';
  source_id: string;
  date: string;
  sample_size?: number;
  quote?: string;
}

export interface CustomerPersona {
  id: string;
  name: string;
  demographics: {
    role: string;
    company_size?: string;
    industry?: string;
  };
  goals: string[];
  pain_points: string[];
  behaviors: string[];
  icp_score: number;  // Ideal Customer Profile match score
}

export interface ResearchRequest {
  target_segment?: string;
  goals: string[];
  methods: ('interview' | 'survey' | 'analytics' | 'support_tickets')[];
  scope?: {
    geography?: string[];
    timeframe?: { start: string; end: string };
  };
}

// ============================================================================
// Configuration
// ============================================================================

export interface CustomerDiscoveryConfig {
  memoryClient: MemoryClient;
  eventPublisher: EventPublisher;
  crmClient?: CRMClient;
  analyticsClient?: AnalyticsClient;
}

export interface CRMClient {
  getCustomers(filters: unknown): Promise<CustomerRecord[]>;
  getInteractions(customerId: string): Promise<Interaction[]>;
}

export interface AnalyticsClient {
  getUserBehavior(segment: string): Promise<BehaviorData>;
  getFeatureUsage(): Promise<FeatureUsage[]>;
}

export interface CustomerRecord {
  id: string;
  name: string;
  company: string;
  industry: string;
  arr?: number;
}

export interface Interaction {
  id: string;
  customer_id: string;
  type: string;
  date: string;
  summary: string;
}

export interface BehaviorData {
  segment: string;
  metrics: Record<string, number>;
}

export interface FeatureUsage {
  feature: string;
  users: number;
  frequency: number;
}

// ============================================================================
// Main Agent Class
// ============================================================================

export class CustomerDiscoveryAgent {
  private config: CustomerDiscoveryConfig;
  private manifest: AgentManifest | null = null;

  constructor(config: CustomerDiscoveryConfig) {
    this.config = config;
  }

  /**
   * Initialize the agent with manifest
   */
  async initialize(manifestPath: string): Promise<void> {
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    this.manifest = yaml.parse(manifestContent) as AgentManifest;

    console.log(`[CustomerDiscovery] Initialized with manifest: ${this.manifest.id}`);
  }

  /**
   * Execute customer discovery research
   */
  async executeTask(envelope: TaskEnvelope): Promise<AgentResult> {
    const startTime = Date.now();
    const taskId = envelope.taskId || this.generateId();

    try {
      // Parse research request from inputs
      const request = this.parseRequest(envelope);

      // Phase 1: Gather existing customer data
      const existingData = await this.gatherExistingData(request);

      // Phase 2: Identify customer segments
      const segments = await this.identifySegments(existingData);

      // Phase 3: Analyze pain points and needs
      const insights = await this.analyzeInsights(existingData, segments);

      // Phase 4: Create customer personas
      const personas = await this.createPersonas(segments, insights);

      // Phase 5: Validate findings with evidence
      const validatedInsights = await this.validateInsights(insights);

      // Build artifacts
      const artifacts: Artifact[] = [
        {
          id: this.generateId(),
          type: 'customer-insights',
          summary: `Customer discovery completed: ${validatedInsights.length} insights identified`,
          content: JSON.stringify(validatedInsights, null, 2),
          produced_by: 'agent-01-customer-discovery',
          created_at: new Date().toISOString(),
        },
        {
          id: this.generateId(),
          type: 'customer-personas',
          summary: `${personas.length} customer personas created`,
          content: JSON.stringify(personas, null, 2),
          produced_by: 'agent-01-customer-discovery',
          created_at: new Date().toISOString(),
        },
      ];

      // Build decisions
      const decisions: Decision[] = [
        {
          type: 'research_scope',
          reason: 'Based on target segment and available data sources',
          confidence: 0.85,
          inputs: { segment: request.target_segment },
        },
      ];

      // Publish events
      await this.publishFindings(validatedInsights, personas);

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
          actionsExecuted: 5,
        },
      };
    } catch (error) {
      console.error(`[CustomerDiscovery] Task ${taskId} failed:`, error);

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
          code: 'DISCOVERY_FAILED',
          message: error instanceof Error ? error.message : String(error),
          recoverable: true,
        },
      };
    }
  }

  /**
   * Parse research request from envelope
   */
  private parseRequest(envelope: TaskEnvelope): ResearchRequest {
    const inputs = envelope.inputs || {};

    return {
      target_segment: inputs.target_segment as string | undefined,
      goals: (inputs.goals as string[]) || ['identify_customer_needs'],
      methods: (inputs.methods as ('interview' | 'survey' | 'analytics' | 'support_tickets')[]) || ['analytics'],
      scope: inputs.scope as ResearchRequest['scope'] | undefined,
    };
  }

  /**
   * Gather existing customer data from various sources
   */
  private async gatherExistingData(request: ResearchRequest): Promise<{
    customers: CustomerRecord[];
    interactions: Interaction[];
    behavior: BehaviorData[];
    featureUsage: FeatureUsage[];
  }> {
    const results = {
      customers: [] as CustomerRecord[],
      interactions: [] as Interaction[],
      behavior: [] as BehaviorData[],
      featureUsage: [] as FeatureUsage[],
    };

    // Gather from CRM if available
    if (this.config.crmClient && request.methods.includes('analytics')) {
      try {
        results.customers = await this.config.crmClient.getCustomers({});

        // Get recent interactions
        for (const customer of results.customers.slice(0, 10)) {
          const interactions = await this.config.crmClient.getInteractions(customer.id);
          results.interactions.push(...interactions);
        }
      } catch (error) {
        console.warn('[CustomerDiscovery] CRM client unavailable:', error);
      }
    }

    // Gather from analytics if available
    if (this.config.analyticsClient && request.methods.includes('analytics')) {
      try {
        results.behavior = await this.config.analyticsClient.getUserBehavior(
          request.target_segment || 'all'
        );
        results.featureUsage = await this.config.analyticsClient.getFeatureUsage();
      } catch (error) {
        console.warn('[CustomerDiscovery] Analytics client unavailable:', error);
      }
    }

    return results;
  }

  /**
   * Identify customer segments from data
   */
  private async identifySegments(data: {
    customers: CustomerRecord[];
    interactions: Interaction[];
  }): Promise<{ name: string; size: number; characteristics: string[] }[]> {
    const segments: Map<string, { size: number; characteristics: Set<string> }> = new Map();

    // Simple segment by industry
    for (const customer of data.customers) {
      const industry = customer.industry || 'unknown';

      if (!segments.has(industry)) {
        segments.set(industry, { size: 0, characteristics: new Set() });
      }

      const segment = segments.get(industry)!;
      segment.size++;
      segment.characteristics.add(`industry:${industry}`);

      if (customer.arr) {
        if (customer.arr > 100000) {
          segment.characteristics.add('tier:enterprise');
        } else if (customer.arr > 10000) {
          segment.characteristics.add('tier:mid-market');
        } else {
          segment.characteristics.add('tier:smb');
        }
      }
    }

    return Array.from(segments.entries()).map(([name, data]) => ({
      name,
      size: data.size,
      characteristics: Array.from(data.characteristics),
    }));
  }

  /**
   * Analyze customer insights from data
   */
  private async analyzeInsights(
    data: {
      customers: CustomerRecord[];
      interactions: Interaction[];
      behavior: BehaviorData[];
      featureUsage: FeatureUsage[];
    },
    segments: { name: string }[]
  ): Promise<CustomerInsight[]> {
    const insights: CustomerInsight[] = [];

    // Analyze interactions for pain points
    const painPointKeywords = ['frustrat', 'issue', 'problem', 'slow', 'broken', 'difficult', 'confus'];

    for (const interaction of data.interactions) {
      const summary = interaction.summary.toLowerCase();

      if (painPointKeywords.some(keyword => summary.includes(keyword))) {
        insights.push({
          id: this.generateId(),
          category: 'pain_point',
          description: interaction.summary,
          evidence: [
            {
              type: 'ticket',
              source_id: interaction.id,
              date: interaction.date,
            },
          ],
          confidence: 0.7,
          impact: 'high',
        });
      }
    }

    // Analyze feature usage for needs
    for (const usage of data.featureUsage) {
      if (usage.users > 100) {
        insights.push({
          id: this.generateId(),
          category: 'need',
          description: `High demand for feature: ${usage.feature}`,
          evidence: [
            {
              type: 'analytics',
              source_id: 'feature-usage',
              date: new Date().toISOString(),
              sample_size: usage.users,
            },
          ],
          confidence: 0.85,
          impact: usage.frequency > 10 ? 'high' : 'medium',
        });
      }
    }

    return insights;
  }

  /**
   * Create customer personas
   */
  private async createPersonas(
    segments: { name: string; size: number; characteristics: string[] }[],
    insights: CustomerInsight[]
  ): Promise<CustomerPersona[]> {
    return segments.map((segment, index) => {
      const segmentPainPoints = insights
        .filter(i => i.category === 'pain_point')
        .slice(0, 3)
        .map(i => i.description);

      return {
        id: this.generateId(),
        name: `${segment.name} Segment ${index + 1}`,
        demographics: {
          role: 'Primary Decision Maker',
          company_size: segment.characteristics.includes('tier:enterprise') ? 'Enterprise' :
            segment.characteristics.includes('tier:mid-market') ? 'Mid-Market' : 'SMB',
          industry: segment.name,
        },
        goals: ['Improve efficiency', 'Reduce costs', 'Scale operations'],
        pain_points: segmentPainPoints,
        behaviors: ['Daily active user', 'Feature explorer'],
        icp_score: 0.75 + Math.random() * 0.2,
      };
    });
  }

  /**
   * Validate insights meet invariant requirements
   */
  private async validateInsights(insights: CustomerInsight[]): Promise<CustomerInsight[]> {
    return insights.filter(insight => {
      // MUST have evidence
      if (!insight.evidence || insight.evidence.length === 0) {
        console.warn(`[CustomerDiscovery] Insight ${insight.id} removed: no evidence`);
        return false;
      }

      // MUST have source documentation
      for (const evidence of insight.evidence) {
        if (!evidence.date || !evidence.type) {
          console.warn(`[CustomerDiscovery] Evidence missing required fields`);
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Publish findings to event bus
   */
  private async publishFindings(
    insights: CustomerInsight[],
    personas: CustomerPersona[]
  ): Promise<void> {
    await this.config.eventPublisher.publish('agent.01.customer-insights', {
      insight_count: insights.length,
      personas_count: personas.length,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createCustomerDiscoveryAgent(config: CustomerDiscoveryConfig): CustomerDiscoveryAgent {
  return new CustomerDiscoveryAgent(config);
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main() {
  const agent = createCustomerDiscoveryAgent({
    memoryClient: {
      store: async () => {},
      retrieve: async () => null,
    },
    eventPublisher: {
      publish: async () => {},
      subscribe: async () => {},
    },
  });

  await agent.initialize('./manifest.yaml');

  const result = await agent.executeTask({
    taskId: 'test-task',
    agentId: 'agent-01-customer-discovery',
    goal: 'Research customer needs and pain points',
    inputs: {
      target_segment: 'Enterprise',
      goals: ['identify_customer_needs'],
      methods: ['analytics'],
    },
    constraints: {
      maxTokens: 50000,
      maxLatency: 180000,
    },
  });

  console.log('Result:', result);
}

// Run if main
if (require.main === module) {
  main().catch(console.error);
}

export default CustomerDiscoveryAgent;
