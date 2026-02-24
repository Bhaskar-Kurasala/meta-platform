/**
 * Agent 07 - Technical Architect
 *
 * Specialized agent for technical architecture, system design, and tech stack decisions.
 *
 * @module Agent07Architect
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

export interface ArchitectureDecision {
  id: string;
  title: string;
  status: 'proposed' | 'accepted' | 'deprecated' | 'superseded';
  context: string;
  decision: string;
  consequences: {
    positive: string[];
    negative: string[];
  };
  alternatives: Alternative[];
}

export interface Alternative {
  name: string;
  description: string;
  pros: string[];
  cons: string[];
}

export interface Component {
  id: string;
  name: string;
  type: 'service' | 'database' | 'cache' | 'queue' | 'gateway';
  responsibility: string;
  technology: string;
  dependencies: string[];
  interfaces: Interface[];
}

export interface Interface {
  name: string;
  protocol: string;
  description: string;
}

export interface ArchitectureSpec {
  id: string;
  title: string;
  overview: string;
  components: Component[];
  decisions: ArchitectureDecision[];
  security: SecuritySpec;
  scalability: ScalabilitySpec;
  integrations: IntegrationSpec[];
}

export interface SecuritySpec {
  authentication: string;
  authorization: string;
  encryption: {
    in_transit: boolean;
    at_rest: boolean;
  };
  compliance: string[];
}

export interface ScalabilitySpec {
  scaling_strategy: 'horizontal' | 'vertical' | 'both';
  caching_strategy: string;
  database_sharding: boolean;
  load_balancing: string;
}

export interface IntegrationSpec {
  name: string;
  type: 'internal' | 'external';
  protocol: string;
  description: string;
}

// ============================================================================
// Configuration
// ============================================================================

export interface ArchitectConfig {
  eventPublisher: EventPublisher;
}

// ============================================================================
// Main Agent Class
// ============================================================================

export class TechnicalArchitectAgent {
  private config: ArchitectConfig;
  private manifest: AgentManifest | null = null;

  constructor(config: ArchitectConfig) {
    this.config = config;
  }

  async initialize(manifestPath: string): Promise<void> {
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    this.manifest = yaml.parse(manifestContent) as AgentManifest;
    console.log(`[Architect] Initialized with manifest: ${this.manifest.id}`);
  }

  async executeTask(envelope: TaskEnvelope): Promise<AgentResult> {
    const startTime = Date.now();
    const taskId = envelope.taskId || this.generateId();

    try {
      const inputs = envelope.inputs || {};

      // Phase 1: Design system architecture
      const components = await this.designComponents(inputs);

      // Phase 2: Create architecture decisions
      const decisions = await this.createADRs(components);

      // Phase 3: Define security architecture
      const security = this.defineSecurity(inputs);

      // Phase 4: Define scalability
      const scalability = this.defineScalability(inputs);

      // Phase 5: Define integrations
      const integrations = this.defineIntegrations(components);

      const spec: ArchitectureSpec = {
        id: this.generateId(),
        title: inputs.architecture_name as string || 'System Architecture',
        overview: `Architecture for ${inputs.architecture_name || 'new system'}`,
        components,
        decisions,
        security,
        scalability,
        integrations,
      };

      // Validate
      this.validateArchitecture(spec);

      const artifacts: Artifact[] = [
        {
          id: this.generateId(),
          type: 'architecture-spec',
          summary: `Architecture: ${spec.title}`,
          content: JSON.stringify(spec, null, 2),
          produced_by: 'agent-07-architect',
          created_at: new Date().toISOString(),
        },
      ];

      const decisionsOutput: Decision[] = [
        {
          type: 'architecture_design',
          reason: 'Based on technical requirements and best practices',
          confidence: 0.9,
          inputs: { components_count: components.length },
        },
      ];

      await this.config.eventPublisher.publish('agent.07.architecture-complete', {
        spec_id: spec.id,
        timestamp: new Date().toISOString(),
      });

      return {
        taskId,
        status: 'success',
        artifacts,
        decisions: decisionsOutput,
        telemetry: {
          tokensUsed: 0,
          latencyMs: Date.now() - startTime,
          cost: 0,
          errors: 0,
          actionsExecuted: 5,
        },
      };
    } catch (error) {
      console.error(`[Architect] Task ${taskId} failed:`, error);

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
          code: 'ARCHITECTURE_TASK_FAILED',
          message: error instanceof Error ? error.message : String(error),
          recoverable: true,
        },
      };
    }
  }

  private async designComponents(inputs: Record<string, unknown>): Promise<Component[]> {
    return [
      {
        id: this.generateId(),
        name: 'API Gateway',
        type: 'gateway',
        responsibility: 'Request routing, auth, rate limiting',
        technology: 'Kong/AWS API Gateway',
        dependencies: [],
        interfaces: [
          { name: 'REST API', protocol: 'HTTPS', description: 'Public API' },
        ],
      },
      {
        id: this.generateId(),
        name: 'Core Service',
        type: 'service',
        responsibility: 'Business logic processing',
        technology: 'Node.js/TypeScript',
        dependencies: ['API Gateway', 'Database'],
        interfaces: [
          { name: 'Internal API', protocol: 'gRPC', description: 'Internal communication' },
        ],
      },
      {
        id: this.generateId(),
        name: 'PostgreSQL',
        type: 'database',
        responsibility: 'Primary data storage',
        technology: 'PostgreSQL 15',
        dependencies: [],
        interfaces: [
          { name: 'SQL', protocol: 'PostgreSQL', description: 'Data access' },
        ],
      },
      {
        id: this.generateId(),
        name: 'Redis Cache',
        type: 'cache',
        responsibility: 'Session and query caching',
        technology: 'Redis 7',
        dependencies: [],
        interfaces: [
          { name: 'Redis Protocol', protocol: 'Redis', description: 'Cache access' },
        ],
      },
      {
        id: this.generateId(),
        name: 'Event Bus',
        type: 'queue',
        responsibility: 'Async communication',
        technology: 'NATS JetStream',
        dependencies: [],
        interfaces: [
          { name: 'Pub/Sub', protocol: 'NATS', description: 'Event streaming' },
        ],
      },
    ];
  }

  private async createADRs(components: Component[]): Promise<ArchitectureDecision[]> {
    return [
      {
        id: this.generateId(),
        title: 'Use Microservices Architecture',
        status: 'accepted',
        context: 'Need to build scalable, maintainable system',
        decision: 'Use microservices with event-driven communication',
        consequences: {
          positive: ['Independent scaling', 'Technology flexibility', 'Team autonomy'],
          increased_complexity: ['Distributed system challenges', 'Network latency', 'Operational overhead'],
        },
        alternatives: [
          {
            name: 'Monolith',
            description: 'Single unified application',
            pros: ['Simpler deployment', 'Easier debugging'],
            cons: ['Scaling limitations', 'Technology lock-in'],
          },
        ],
      },
      {
        id: this.generateId(),
        title: 'Use Event-Driven Communication',
        status: 'accepted',
        context: 'Need loose coupling between services',
        decision: 'Use NATS JetStream for async communication',
        consequences: {
          positive: ['Loose coupling', 'Scalability', 'Audit trail'],
          negative: ['Eventual consistency', 'Complexity in ordering'],
        },
        alternatives: [
          {
            name: 'Synchronous REST',
            description: 'Direct HTTP calls between services',
            pros: ['Simple to understand'],
            cons: ['Tight coupling', 'Cascading failures'],
          },
        ],
      },
    ];
  }

  private defineSecurity(inputs: Record<string, unknown>): SecuritySpec {
    return {
      authentication: 'JWT with refresh tokens',
      authorization: 'RBAC with role-based permissions',
      encryption: {
        in_transit: true,
        at_rest: true,
      },
      compliance: ['GDPR', 'SOC2'],
    };
  }

  private defineScalability(inputs: Record<string, unknown>): ScalabilitySpec {
    return {
      scaling_strategy: 'horizontal',
      caching_strategy: 'Redis with cache invalidation',
      database_sharding: true,
      load_balancing: 'Round-robin with health checks',
    };
  }

  private defineIntegrations(components: Component[]): IntegrationSpec[] {
    return [
      {
        name: 'Analytics Service',
        type: 'internal',
        protocol: 'gRPC',
        description: 'Analytics data pipeline',
      },
      {
        name: 'Payment Gateway',
        type: 'external',
        protocol: 'REST',
        description: 'Third-party payment processing',
      },
    ];
  }

  private validateArchitecture(spec: ArchitectureSpec): void {
    // Check ADRs documented
    if (spec.decisions.length === 0) {
      throw new Error('Invariant violation: No architecture decisions documented');
    }

    // Check security defined
    if (!spec.security.authentication) {
      throw new Error('Invariant violation: No authentication defined');
    }

    // Check scalability defined
    if (!spec.scalability.scaling_strategy) {
      throw new Error('Invariant violation: No scaling strategy defined');
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export function createTechnicalArchitectAgent(config: ArchitectConfig): TechnicalArchitectAgent {
  return new TechnicalArchitectAgent(config);
}

async function main() {
  const agent = createTechnicalArchitectAgent({
    eventPublisher: {
      publish: async () => {},
      subscribe: async () => {},
    },
  });

  await agent.initialize('./manifest.yaml');

  const result = await agent.executeTask({
    taskId: 'test-task',
    agentId: 'agent-07-architect',
    goal: 'Design architecture for analytics platform',
    inputs: {
      architecture_name: 'Analytics Platform',
    },
    constraints: { maxTokens: 50000, maxLatency: 180000 },
  });

  console.log('Result:', result);
}

if (require.main === module) {
  main().catch(console.error);
}

export default TechnicalArchitectAgent;
