/**
 * Agent 04 - Product Manager
 *
 * Specialized agent for product management, roadmap planning, and feature prioritization.
 *
 * @module Agent04PM
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

export interface UserStory {
  id: string;
  title: string;
  description: string;
  acceptance_criteria: string[];
  priority: 'must' | 'should' | 'could' | 'won't';
  story_points?: number;
  dependencies: string[];
}

export interface BRD {
  id: string;
  title: string;
  version: string;
  status: 'draft' | 'review' | 'approved';
  problem_statement: string;
  goals: string[];
  scope: {
    in_scope: string[];
    out_of_scope: string[];
  };
  stakeholders: Stakeholder[];
  user_stories: UserStory[];
  success_metrics: string[];
  timeline?: string;
  risks: string[];
}

export interface Stakeholder {
  name: string;
  role: string;
  input: string;
}

export interface RoadmapItem {
  id: string;
  feature_name: string;
  quarter: string;
  year: number;
  status: 'planned' | 'in_progress' | 'completed' | 'deferred';
  priority: number;
  dependencies: string[];
}

export interface PrioritizationScore {
  reach: number;
  impact: number;
  confidence: number;
  effort: number;
  rice_score: number;
}

// ============================================================================
// Configuration
// ============================================================================

export interface PMConfig {
  eventPublisher: EventPublisher;
  memoryClient?: MemoryClient;
}

export interface MemoryClient {
  retrieve(query: string): Promise<unknown>;
  store(key: string, value: unknown): Promise<void>;
}

// ============================================================================
// Main Agent Class
// ============================================================================

export class ProductManagerAgent {
  private config: PMConfig;
  private manifest: AgentManifest | null = null;

  constructor(config: PMConfig) {
    this.config = config;
  }

  async initialize(manifestPath: string): Promise<void> {
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    this.manifest = yaml.parse(manifestContent) as AgentManifest;
    console.log(`[ProductManager] Initialized with manifest: ${this.manifest.id}`);
  }

  async executeTask(envelope: TaskEnvelope): Promise<AgentResult> {
    const startTime = Date.now();
    const taskId = envelope.taskId || this.generateId();

    try {
      const inputs = envelope.inputs || {};
      const taskType = inputs.type as string || 'brd';

      let brd: BRD | null = null;
      let roadmap: RoadmapItem[] = [];
      let prioritizedStories: UserStory[] = [];

      // Phase 1: Gather requirements from various sources
      const requirements = await this.gatherRequirements(inputs);

      if (taskType === 'brd' || taskType === 'full') {
        // Phase 2: Create Business Requirements Document
        brd = await this.createBRD(requirements, inputs);

        // Phase 3: Create user stories
        prioritizedStories = await this.createUserStories(brd, requirements);
      }

      if (taskType === 'roadmap' || taskType === 'full') {
        // Phase 4: Plan roadmap
        roadmap = await this.planRoadmap(prioritizedStories, inputs);
      }

      const artifacts: Artifact[] = [];

      if (brd) {
        artifacts.push({
          id: this.generateId(),
          type: 'brd',
          summary: `BRD created: ${brd.title}`,
          content: JSON.stringify(brd, null, 2),
          produced_by: 'agent-04-pm',
          created_at: new Date().toISOString(),
        });
      }

      if (roadmap.length > 0) {
        artifacts.push({
          id: this.generateId(),
          type: 'roadmap',
          summary: `Roadmap planned: ${roadmap.length} features`,
          content: JSON.stringify(roadmap, null, 2),
          produced_by: 'agent-04-pm',
          created_at: new Date().toISOString(),
        });
      }

      const decisions: Decision[] = [
        {
          type: 'product_scope',
          reason: 'Based on customer discovery and market research',
          confidence: 0.85,
          inputs: { type: taskType },
        },
      ];

      await this.config.eventPublisher.publish('agent.04.brd-created', {
        brd_id: brd?.id,
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
          actionsExecuted: 4,
        },
      };
    } catch (error) {
      console.error(`[ProductManager] Task ${taskId} failed:`, error);

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
          code: 'PM_TASK_FAILED',
          message: error instanceof Error ? error.message : String(error),
          recoverable: true,
        },
      };
    }
  }

  private async gatherRequirements(inputs: Record<string, unknown>): Promise<{
    customer_problems: string[];
    market_opportunities: string[];
    stakeholder_requests: string[];
    technical_constraints: string[];
  }> {
    return {
      customer_problems: [
        'Slow data processing',
        'Difficult to customize dashboards',
        'Limited integration options',
      ],
      market_opportunities: [
        'AI/ML capabilities in demand',
        'Growing enterprise segment',
        'Competitor feature gaps',
      ],
      stakeholder_requests: [
        'Sales: Need enterprise features',
        'Support: Reduce ticket volume',
        'Engineering: Technical debt reduction',
      ],
      technical_constraints: [
        'Must maintain backward compatibility',
        'Cloud-native architecture required',
      ],
    };
  }

  private async createBRD(requirements: {
    customer_problems: string[];
    market_opportunities: string[];
    stakeholder_requests: string[];
    technical_constraints: string[];
  }, inputs: Record<string, unknown>): Promise<BRD> {
    const brdId = this.generateId();

    return {
      id: brdId,
      title: inputs.feature_name as string || 'New Feature Request',
      version: '1.0.0',
      status: 'draft',
      problem_statement: requirements.customer_problems[0] || 'Customer need identified',
      goals: [
        'Solve customer problem',
        'Meet market demand',
        'Align with product strategy',
      ],
      scope: {
        in_scope: [
          'Core feature implementation',
          'User interface',
          'Basic analytics',
        ],
        out_of_scope: [
          'Advanced ML features',
          'Mobile app',
          'On-premise deployment',
        ],
      },
      stakeholders: requirements.stakeholder_requests.map((req, i) => ({
        name: `Stakeholder ${i + 1}`,
        role: req.split(':')[0],
        input: req.split(':')[1] || req,
      })),
      user_stories: [],
      success_metrics: [
        'User adoption rate > 50%',
        'Customer satisfaction > 4.0',
        'Support tickets reduced by 20%',
      ],
      timeline: inputs.timeline as string || 'Q2 2026',
      risks: [
        'Technical complexity',
        'Timeline constraints',
      ],
    };
  }

  private async createUserStories(brd: BRD, requirements: {
    customer_problems: string[];
  }): Promise<UserStory[]> {
    const stories: UserStory[] = [
      {
        id: this.generateId(),
        title: 'User can view dashboard',
        description: 'As a user, I want to view my personalized dashboard so that I can see key metrics',
        acceptance_criteria: [
          'Dashboard loads within 2 seconds',
          'All widgets display data correctly',
          'User can customize widget layout',
        ],
        priority: 'must',
        story_points: 3,
        dependencies: [],
      },
      {
        id: this.generateId(),
        title: 'User can export data',
        description: 'As a user, I want to export data so that I can use it in other tools',
        acceptance_criteria: [
          'Supports CSV and Excel export',
          'Export completes within 10 seconds',
          'Large datasets handled gracefully',
        ],
        priority: 'should',
        story_points: 5,
        dependencies: ['User can view dashboard'],
      },
    ];

    return stories;
  }

  private async planRoadmap(stories: UserStory[], inputs: Record<string, unknown>): Promise<RoadmapItem[]> {
    return stories.map((story, index) => ({
      id: this.generateId(),
      feature_name: story.title,
      quarter: inputs.quarter as string || 'Q2',
      year: inputs.year as number || 2026,
      status: index === 0 ? 'in_progress' : 'planned',
      priority: index + 1,
      dependencies: story.dependencies,
    }));
  }

  private calculateRICEScore(story: UserStory): PrioritizationScore {
    return {
      reach: 1000,
      impact: 3,
      confidence: 0.8,
      effort: 5,
      rice_score: (1000 * 3 * 0.8) / 5,
    };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export function createProductManagerAgent(config: PMConfig): ProductManagerAgent {
  return new ProductManagerAgent(config);
}

async function main() {
  const agent = createProductManagerAgent({
    eventPublisher: {
      publish: async () => {},
      subscribe: async () => {},
    },
  });

  await agent.initialize('./manifest.yaml');

  const result = await agent.executeTask({
    taskId: 'test-task',
    agentId: 'agent-04-pm',
    goal: 'Create feature specification for analytics dashboard',
    inputs: {
      type: 'full',
      feature_name: 'Advanced Analytics Dashboard',
      timeline: 'Q2 2026',
    },
    constraints: { maxTokens: 50000, maxLatency: 180000 },
  });

  console.log('Result:', result);
}

if (require.main === module) {
  main().catch(console.error);
}

export default ProductManagerAgent;
