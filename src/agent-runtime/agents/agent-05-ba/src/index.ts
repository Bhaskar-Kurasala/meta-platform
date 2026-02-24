/**
 * Agent 05 - Business Analyst
 *
 * Specialized agent for business analysis, requirements, and process modeling.
 *
 * @module Agent05BA
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

export interface TechnicalRequirement {
  id: string;
  title: string;
  description: string;
  type: 'functional' | 'non-functional' | 'constraint';
  priority: 'critical' | 'high' | 'medium' | 'low';
  acceptance_criteria: string[];
  test_scenarios: TestScenario[];
  dependencies: string[];
}

export interface TestScenario {
  id: string;
  name: string;
  input: string;
  expected_output: string;
  preconditions: string[];
}

export interface APIEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  summary: string;
  description: string;
  request_body?: SchemaDefinition;
  response: Record<string, SchemaDefinition>;
  errors: APIError[];
  tags: string[];
}

export interface SchemaDefinition {
  type: string;
  properties?: Record<string, { type: string; description?: string; format?: string }>;
  required?: string[];
  description?: string;
}

export interface APIError {
  code: string;
  message: string;
  status: number;
}

export interface DomainModel {
  name: string;
  description: string;
  properties: DomainProperty[];
  relationships: Relationship[];
}

export interface DomainProperty {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

export interface Relationship {
  from: string;
  to: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

export interface TechnicalSpec {
  id: string;
  title: string;
  version: string;
  requirements: TechnicalRequirement[];
  api_contracts: APIEndpoint[];
  domain_models: DomainModel[];
  data_flows: DataFlow[];
}

export interface DataFlow {
  from: string;
  to: string;
  description: string;
  protocol: string;
}

// ============================================================================
// Configuration
// ============================================================================

export interface BAConfig {
  eventPublisher: EventPublisher;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ============================================================================
// Main Agent Class
// ============================================================================

export class BusinessAnalystAgent {
  private config: BAConfig;
  private manifest: AgentManifest | null = null;

  constructor(config: BAConfig) {
    this.config = config;
  }

  async initialize(manifestPath: string): Promise<void> {
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    this.manifest = yaml.parse(manifestContent) as AgentManifest;
    console.log(`[BusinessAnalyst] Initialized with manifest: ${this.manifest.id}`);
  }

  async executeTask(envelope: TaskEnvelope): Promise<AgentResult> {
    const startTime = Date.now();
    const taskId = envelope.taskId || this.generateId();

    try {
      const inputs = envelope.inputs || {};

      // Phase 1: Parse business requirements
      const requirements = this.translateRequirements(inputs);

      // Phase 2: Create technical requirements
      const technicalReqs = await this.createTechnicalRequirements(requirements, inputs);

      // Phase 3: Define API contracts
      const apiContracts = await this.createAPIContracts(technicalReqs);

      // Phase 4: Design domain models
      const domainModels = await this.createDomainModels(technicalReqs);

      // Phase 5: Validate all specs
      const spec: TechnicalSpec = {
        id: this.generateId(),
        title: inputs.spec_title as string || 'Technical Specification',
        version: '1.0.0',
        requirements: technicalReqs,
        api_contracts: apiContracts,
        domain_models: domainModels,
        data_flows: [],
      };

      this.validateSpec(spec);

      const artifacts: Artifact[] = [
        {
          id: this.generateId(),
          type: 'technical-spec',
          summary: `Technical specification: ${spec.title}`,
          content: JSON.stringify(spec, null, 2),
          produced_by: 'agent-05-ba',
          created_at: new Date().toISOString(),
        },
      ];

      const decisions: Decision[] = [
        {
          type: 'requirements_translation',
          reason: 'Translated BRD to technical requirements',
          confidence: 0.9,
          inputs: { requirements_count: technicalReqs.length },
        },
      ];

      await this.config.eventPublisher.publish('agent.05.requirements-complete', {
        spec_id: spec.id,
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
      console.error(`[BusinessAnalyst] Task ${taskId} failed:`, error);

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
          code: 'BA_TASK_FAILED',
          message: error instanceof Error ? error.message : String(error),
          recoverable: true,
        },
      };
    }
  }

  private translateRequirements(inputs: Record<string, unknown>): {
    features: string[];
    constraints: string[];
  } {
    return {
      features: (inputs.features as string[]) || ['Feature 1'],
      constraints: (inputs.constraints as string[]) || ['Performance < 200ms'],
    };
  }

  private async createTechnicalRequirements(
    requirements: { features: string[]; constraints: string[] },
    inputs: Record<string, unknown>
  ): Promise<TechnicalRequirement[]> {
    return requirements.features.map((feature, index) => ({
      id: this.generateId(),
      title: feature,
      description: `Technical implementation for ${feature}`,
      type: 'functional' as const,
      priority: index === 0 ? 'critical' : 'high',
      acceptance_criteria: [
        `${feature} returns correct data`,
        `${feature} handles errors gracefully`,
        `${feature} meets performance requirements`,
      ],
      test_scenarios: [
        {
          id: this.generateId(),
          name: `${feature} - Happy Path`,
          input: 'Valid request',
          expected_output: 'Success response with data',
          preconditions: ['Service running', 'Valid credentials'],
        },
      ],
      dependencies: [],
    }));
  }

  private async createAPIContracts(requirements: TechnicalRequirement[]): Promise<APIEndpoint[]> {
    const endpoints: APIEndpoint[] = [];

    for (const req of requirements) {
      endpoints.push({
        path: `/api/v1/${req.title.toLowerCase().replace(/\s+/g, '-')}`,
        method: 'GET',
        summary: `Get ${req.title}`,
        description: `Retrieve ${req.title} data`,
        response: {
          '200': {
            type: 'object',
            properties: {
              data: { type: 'array', description: 'Results' },
              meta: { type: 'object', description: 'Metadata' },
            },
          },
        },
        errors: [
          { code: 'NOT_FOUND', message: 'Resource not found', status: 404 },
          { code: 'INTERNAL_ERROR', message: 'Server error', status: 500 },
        ],
        tags: [req.title],
      });
    }

    return endpoints;
  }

  private async createDomainModels(requirements: TechnicalRequirement[]): Promise<DomainModel[]> {
    return [
      {
        name: 'Feature',
        description: 'Core feature entity',
        properties: [
          { name: 'id', type: 'string', description: 'Unique identifier', required: true },
          { name: 'name', type: 'string', description: 'Feature name', required: true },
          { name: 'status', type: 'string', description: 'Feature status', required: true },
          { name: 'created_at', type: 'timestamp', description: 'Creation time', required: false },
        ],
        relationships: [],
      },
    ];
  }

  private validateSpec(spec: TechnicalSpec): void {
    // Validate requirements
    for (const req of spec.requirements) {
      if (!req.acceptance_criteria || req.acceptance_criteria.length === 0) {
        throw new Error(`Invariant violation: Requirement ${req.id} has no acceptance criteria`);
      }
    }

    // Validate API contracts
    for (const api of spec.api_contracts) {
      if (!api.errors || api.errors.length === 0) {
        throw new Error(`Invariant violation: API ${api.path} has no error codes defined`);
      }
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export function createBusinessAnalystAgent(config: BAConfig): BusinessAnalystAgent {
  return new BusinessAnalystAgent(config);
}

async function main() {
  const agent = createBusinessAnalystAgent({
    eventPublisher: {
      publish: async () => {},
      subscribe: async () => {},
    },
  });

  await agent.initialize('./manifest.yaml');

  const result = await agent.executeTask({
    taskId: 'test-task',
    agentId: 'agent-05-ba',
    goal: 'Create technical specification for analytics API',
    inputs: {
      features: ['Dashboard', 'Reports', 'Exports'],
      constraints: ['Response time < 200ms'],
      spec_title: 'Analytics API Technical Spec',
    },
    constraints: { maxTokens: 50000, maxLatency: 180000 },
  });

  console.log('Result:', result);
}

if (require.main === module) {
  main().catch(console.error);
}

export default BusinessAnalystAgent;
