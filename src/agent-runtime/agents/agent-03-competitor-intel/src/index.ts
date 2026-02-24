/**
 * Agent 03 - Competitor Intelligence
 *
 * Specialized agent for competitor analysis, feature comparison, and pricing intelligence.
 *
 * @module Agent03CompetitorIntel
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

export interface CompetitorProfile {
  id: string;
  name: string;
  website: string;
  description: string;
  founded?: number;
  funding?: string;
  employees?: string;
  headquarters?: string;
}

export interface ProductFeature {
  name: string;
  category: string;
  description: string;
  maturity: 'beta' | 'ga' | 'legacy';
  competitor_has: boolean;
  evidence: string;
}

export interface PricingModel {
  competitor_id: string;
  model: 'per_user' | 'per_seat' | 'tiered' | 'usage' | 'enterprise';
  tiers?: PricingTier[];
  starting_price?: number;
  currency: string;
}

export interface PricingTier {
  name: string;
  price: number;
  features: string[];
  limits: Record<string, number>;
}

export interface SWOTAnalysis {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface CompetitiveReport {
  id: string;
  title: string;
  competitors: CompetitorProfile[];
  feature_matrix: ProductFeature[];
  pricing_comparison: PricingModel[];
  swot: SWOTAnalysis;
  gaps: string[];
  recommendations: string[];
  sources: string[];
  created_at: string;
}

// ============================================================================
// Configuration
// ============================================================================

export interface CompetitorIntelConfig {
  eventPublisher: EventPublisher;
  webSearchClient?: WebSearchClient;
}

export interface WebSearchClient {
  search(query: string, options?: { limit?: number }): Promise<SearchResult[]>;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  date?: string;
}

// ============================================================================
// Main Agent Class
// ============================================================================

export class CompetitorIntelAgent {
  private config: CompetitorIntelConfig;
  private manifest: AgentManifest | null = null;

  constructor(config: CompetitorIntelConfig) {
    this.config = config;
  }

  async initialize(manifestPath: string): Promise<void> {
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    this.manifest = yaml.parse(manifestContent) as AgentManifest;
    console.log(`[CompetitorIntel] Initialized with manifest: ${this.manifest.id}`);
  }

  async executeTask(envelope: TaskEnvelope): Promise<AgentResult> {
    const startTime = Date.now();
    const taskId = envelope.taskId || this.generateId();

    try {
      const inputs = envelope.inputs || {};

      // Phase 1: Identify competitors
      const competitors = await this.researchCompetitors(inputs.target_competitors as string[]);

      // Phase 2: Analyze features
      const featureMatrix = await this.analyzeFeatures(competitors, inputs.focus_features as string[]);

      // Phase 3: Analyze pricing
      const pricing = await this.analyzePricing(competitors);

      // Phase 4: Conduct SWOT
      const swot = await this.performSWOT(competitors, featureMatrix);

      // Phase 5: Identify gaps
      const gaps = this.identifyGaps(featureMatrix, swot);

      // Build report
      const report: CompetitiveReport = {
        id: this.generateId(),
        title: 'Competitive Intelligence Report',
        competitors,
        feature_matrix: featureMatrix,
        pricing_comparison: pricing,
        swot,
        gaps,
        recommendations: this.generateRecommendations(gaps, swot),
        sources: ['Competitor websites', 'Product documentation', 'Pricing pages'],
        created_at: new Date().toISOString(),
      };

      // Validate
      this.validateReport(report);

      const artifacts: Artifact[] = [
        {
          id: this.generateId(),
          type: 'competitive-analysis',
          summary: `Competitive analysis: ${competitors.length} competitors analyzed`,
          content: JSON.stringify(report, null, 2),
          produced_by: 'agent-03-competitor-intel',
          created_at: new Date().toISOString(),
        },
      ];

      const decisions: Decision[] = [
        {
          type: 'competitor_scope',
          reason: 'Based on target competitors and market focus',
          confidence: 0.85,
          inputs: { competitors: inputs.target_competitors },
        },
      ];

      await this.config.eventPublisher.publish('agent.03.competitive-analysis', {
        report_id: report.id,
        competitors_count: competitors.length,
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
          actionsExecuted: 5,
        },
      };
    } catch (error) {
      console.error(`[CompetitorIntel] Task ${taskId} failed:`, error);

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
          code: 'COMPETITOR_INTEL_FAILED',
          message: error instanceof Error ? error.message : String(error),
          recoverable: true,
        },
      };
    }
  }

  private async researchCompetitors(targetCompetitors?: string[]): Promise<CompetitorProfile[]> {
    // In production, would use web search to gather competitor info
    const defaults: CompetitorProfile[] = [
      {
        id: 'comp-1',
        name: 'Competitor A',
        website: 'https://competitor-a.example.com',
        description: 'Enterprise analytics platform',
        founded: 2018,
        funding: 'Series C',
        employees: '500-1000',
        headquarters: 'San Francisco',
      },
      {
        id: 'comp-2',
        name: 'Competitor B',
        website: 'https://competitor-b.example.com',
        description: 'Cloud-native data platform',
        founded: 2020,
        funding: 'Series B',
        employees: '200-500',
        headquarters: 'New York',
      },
    ];

    return targetCompetitors?.length ? defaults.filter(c => targetCompetitors.includes(c.name)) : defaults;
  }

  private async analyzeFeatures(competitors: CompetitorProfile[], focusFeatures?: string[]): Promise<ProductFeature[]> {
    const features: ProductFeature[] = [
      {
        name: 'Real-time Analytics',
        category: 'Analytics',
        description: 'Real-time data processing and visualization',
        maturity: 'ga',
        competitor_has: true,
        evidence: 'Product documentation',
      },
      {
        name: 'AI/ML Integration',
        category: 'Intelligence',
        description: 'Machine learning model deployment',
        maturity: 'beta',
        competitor_has: true,
        evidence: 'Beta announcement 2025',
      },
      {
        name: 'Custom Dashboards',
        category: 'Visualization',
        description: 'User-customizable dashboard builder',
        maturity: 'ga',
        competitor_has: true,
        evidence: 'Product features page',
      },
      {
        name: 'API Access',
        category: 'Integration',
        description: 'Full REST and GraphQL API access',
        maturity: 'ga',
        competitor_has: false,
        evidence: 'Limited to export features',
      },
    ];

    return focusFeatures?.length ? features.filter(f => focusFeatures.includes(f.name)) : features;
  }

  private async analyzePricing(competitors: CompetitorProfile[]): Promise<PricingModel[]> {
    return competitors.map(c => ({
      competitor_id: c.id,
      model: 'tiered' as const,
      tiers: [
        {
          name: 'Starter',
          price: 99,
          features: ['Basic analytics', '5 users'],
          limits: { queries_per_day: 1000 },
        },
        {
          name: 'Professional',
          price: 299,
          features: ['Advanced analytics', '25 users', 'API access'],
          limits: { queries_per_day: 10000 },
        },
        {
          name: 'Enterprise',
          price: 0,  # Custom pricing
          features: ['Full platform', 'Unlimited users', 'SLA'],
          limits: {},
        },
      ],
      starting_price: 99,
      currency: 'USD',
    }));
  }

  private async performSWOT(competitors: CompetitorProfile[], features: ProductFeature[]): Promise<SWOTAnalysis> {
    return {
      strengths: [
        'Faster time-to-value',
        'Better integration ecosystem',
        'Modern architecture',
        'Competitive pricing',
      ],
      weaknesses: [
        'Smaller partner network',
        'Limited enterprise features',
        'Newer market entrant',
      ],
      opportunities: [
        'Growing demand for AI/ML',
        'Market shift to cloud-native',
        'Unserved SMB segment',
      ],
      threats: [
        'Well-funded competitors',
        'Market consolidation',
        'Economic downturn',
      ],
    };
  }

  private identifyGaps(features: ProductFeature[], swot: SWOTAnalysis): string[] {
    return features
      .filter(f => !f.competitor_has)
      .map(f => `Our unique feature: ${f.name}`);
  }

  private generateRecommendations(gaps: string[], swot: SWOTAnalysis): string[] {
    return [
      'Continue investing in differentiated features',
      'Build out enterprise feature set',
      'Expand partner ecosystem',
      'Consider strategic acquisitions',
    ];
  }

  private validateReport(report: CompetitiveReport): void {
    if (report.competitors.length === 0) {
      throw new Error('Invariant violation: No competitors analyzed');
    }
    if (report.sources.length === 0) {
      throw new Error('Invariant violation: No sources cited');
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export function createCompetitorIntelAgent(config: CompetitorIntelConfig): CompetitorIntelAgent {
  return new CompetitorIntelAgent(config);
}

async function main() {
  const agent = createCompetitorIntelAgent({
    eventPublisher: {
      publish: async () => {},
      subscribe: async () => {},
    },
  });

  await agent.initialize('./manifest.yaml');

  const result = await agent.executeTask({
    taskId: 'test-task',
    agentId: 'agent-03-competitor-intel',
    goal: 'Analyze competitive landscape for analytics platform',
    inputs: {
      target_competitors: ['Competitor A', 'Competitor B'],
      focus_features: ['Real-time Analytics', 'AI/ML Integration'],
    },
    constraints: { maxTokens: 50000, maxLatency: 180000 },
  });

  console.log('Result:', result);
}

if (require.main === module) {
  main().catch(console.error);
}

export default CompetitorIntelAgent;
