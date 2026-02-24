/**
 * Agent 31 - Documentation
 *
 * Specialized agent for documentation, API docs, and knowledge base.
 *
 * @module Agent31Docs
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

export interface APIEndpoint {
  path: string;
  method: string;
  description: string;
  authentication?: string;
  rate_limit?: string;
  parameters: APIParameter[];
  responses: Record<string, APIResponse>;
}

export interface APIParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface APIResponse {
  description: string;
  schema?: string;
}

export interface APIDocumentation {
  doc_id: string;
  title: string;
  version: string;
  endpoints: APIEndpoint[];
  last_updated: string;
}

export interface Runbook {
  runbook_id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  steps: RunbookStep[];
  escalation?: string;
  last_updated: string;
}

export interface RunbookStep {
  step: number;
  action: string;
  command?: string;
  expected_output?: string;
}

export interface Changelog {
  version: string;
  date: string;
  changes: {
    added: string[];
    fixed: string[];
    changed: string[];
    deprecated: string[];
    removed: string[];
  };
  breaking: string[];
}

export interface KBArticle {
  article_id: string;
  title: string;
  category: string;
  tags: string[];
  content: string;
  last_updated: string;
}

// ============================================================================
// Configuration
// ============================================================================

export interface DocsConfig {
  eventPublisher: EventPublisher;
  projectRoot?: string;
}

// ============================================================================
// Main Agent Class
// ============================================================================

export class DocsAgent {
  private config: DocsConfig;
  private manifest: AgentManifest | null = null;

  constructor(config: DocsConfig) {
    this.config = config;
  }

  async initialize(manifestPath: string): Promise<void> {
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    this.manifest = yaml.parse(manifestContent) as AgentManifest;
    console.log(`[Docs] Initialized with manifest: ${this.manifest?.id}`);
  }

  async executeTask(envelope: TaskEnvelope): Promise<AgentResult> {
    const startTime = Date.now();
    const taskId = envelope.taskId || this.generateId();

    try {
      const inputs = envelope.inputs || {};
      const taskType = inputs.type as string || 'api-docs';

      let result: {
        api_docs?: APIDocumentation;
        runbook?: Runbook;
        changelog?: Changelog;
        kb_article?: KBArticle;
      };

      if (taskType === 'api-docs') {
        result = await this.generateAPIDocs(inputs);
      } else if (taskType === 'runbook') {
        result = await this.createRunbook(inputs);
      } else if (taskType === 'changelog') {
        result = await this.generateChangelog(inputs);
      } else if (taskType === 'kb-article') {
        result = await this.writeKBArticle(inputs);
      } else {
        throw new Error(`Unknown task type: ${taskType}`);
      }

      const artifacts: Artifact[] = [
        {
          id: this.generateId(),
          type: 'docs-output',
          summary: `Documentation: ${taskType}`,
          content: JSON.stringify(result, null, 2),
          produced_by: 'agent-31-docs',
          created_at: new Date().toISOString(),
        },
      ];

      const decisions: Decision[] = [
        {
          type: 'docs_action',
          reason: `Executed ${taskType} task`,
          confidence: 0.9,
          inputs: { task_type: taskType },
        },
      ];

      // Publish relevant events
      await this.config.eventPublisher.publish('agent.31.docs-created', {
        type: taskType,
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
      console.error(`[Docs] Task ${taskId} failed:`, error);

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
          code: 'DOCS_TASK_FAILED',
          message: error instanceof Error ? error.message : String(error),
          recoverable: true,
        },
      };
    }
  }

  private async generateAPIDocs(inputs: Record<string, unknown>): Promise<{
    api_docs: APIDocumentation;
  }> {
    const apiName = inputs.api_name as string || 'Users API';
    const version = inputs.version as string || '1.0.0';

    const endpoints: APIEndpoint[] = [
      {
        path: '/users',
        method: 'GET',
        description: 'Get list of users',
        authentication: 'Bearer token',
        rate_limit: '100/minute',
        parameters: [
          { name: 'page', type: 'integer', required: false, description: 'Page number' },
          { name: 'limit', type: 'integer', required: false, description: 'Items per page' },
        ],
        responses: {
          '200': { description: 'Success', schema: 'UserList' },
          '401': { description: 'Unauthorized' },
          '500': { description: 'Internal Server Error' },
        },
      },
      {
        path: '/users/{id}',
        method: 'GET',
        description: 'Get user by ID',
        authentication: 'Bearer token',
        rate_limit: '100/minute',
        parameters: [
          { name: 'id', type: 'string', required: true, description: 'User ID' },
        ],
        responses: {
          '200': { description: 'Success', schema: 'User' },
          '404': { description: 'Not Found' },
        },
      },
      {
        path: '/users',
        method: 'POST',
        description: 'Create new user',
        authentication: 'Bearer token',
        rate_limit: '50/minute',
        parameters: [],
        responses: {
          '201': { description: 'Created', schema: 'User' },
          '400': { description: 'Bad Request' },
        },
      },
    ];

    const api_docs: APIDocumentation = {
      doc_id: this.generateId(),
      title: apiName,
      version,
      endpoints,
      last_updated: new Date().toISOString(),
    };

    return { api_docs };
  }

  private async createRunbook(inputs: Record<string, unknown>): Promise<{
    runbook: Runbook;
  }> {
    const title = inputs.title as string || 'API Gateway 5xx Errors';
    const severity = inputs.severity as Runbook['severity'] || 'high';

    const steps: RunbookStep[] = [
      {
        step: 1,
        action: 'Check gateway logs for errors',
        command: 'kubectl logs -l app=gateway --tail=100 | grep ERROR',
        expected_output: 'Error messages with stack traces',
      },
      {
        step: 2,
        action: 'Check upstream service health',
        command: 'curl -f http://service/health',
        expected_output: '200 OK',
      },
      {
        step: 3,
        action: 'Check database connection pool',
        command: 'SELECT count(*) FROM pg_stat_activity WHERE datname = \'main\'',
        expected_output: 'Connection count < pool limit',
      },
      {
        step: 4,
        action: 'Restart gateway pods if needed',
        command: 'kubectl rollout restart deployment/api-gateway',
        expected_output: 'Pods restarted successfully',
      },
    ];

    const runbook: Runbook = {
      runbook_id: this.generateId(),
      title,
      severity,
      steps,
      escalation: 'on-call-engineer@company.com',
      last_updated: new Date().toISOString(),
    };

    return { runbook };
  }

  private async generateChangelog(inputs: Record<string, unknown>): Promise<{
    changelog: Changelog;
  }> {
    const version = inputs.version as string || '2.1.0';

    const changelog: Changelog = {
      version,
      date: new Date().toISOString().split('T')[0],
      changes: {
        added: (inputs.added as string[]) || [
          'New analytics dashboard with custom reports',
          'API rate limiting per endpoint',
          'Dark mode support in UI',
        ],
        fixed: (inputs.fixed as string[]) || [
          'Login timeout issue on mobile',
          'Memory leak in background worker',
          'Pagination error on large datasets',
        ],
        changed: (inputs.changed as string[]) || [
          'Improved API response times by 30%',
          'Updated dependencies to latest versions',
        ],
        deprecated: (inputs.deprecated as string[]) || [
          'Legacy v1 API (will be removed in v3.0)',
          'Old authentication method',
        ],
        removed: [],
      },
      breaking: (inputs.breaking as string[]) || [],
    };

    return { changelog };
  }

  private async writeKBArticle(inputs: Record<string, unknown>): Promise<{
    kb_article: KBArticle;
  }> {
    const title = inputs.title as string || 'How to Reset Your Password';
    const category = inputs.category as string || 'account';

    const content = inputs.content as string || `# ${title}

## Overview
This guide explains how to reset your password.

## Steps

1. Go to the login page
2. Click "Forgot Password"
3. Enter your email address
4. Check your inbox for the reset link
5. Click the link and create a new password

## Requirements
- Valid email address
- Access to email inbox

## Troubleshooting

If you don't receive the email:
- Check spam folder
- Verify email address is correct
- Contact support
`;

    const kb_article: KBArticle = {
      article_id: this.generateId(),
      title,
      category,
      tags: (inputs.tags as string[]) || ['password', 'reset', 'account'],
      content,
      last_updated: new Date().toISOString(),
    };

    return { kb_article };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export function createDocsAgent(config: DocsConfig): DocsAgent {
  return new DocsAgent(config);
}

async function main() {
  const agent = createDocsAgent({
    eventPublisher: {
      publish: async () => {},
      subscribe: async () => {},
    },
  });

  await agent.initialize('./manifest.yaml');

  // Test API docs generation
  const apiResult = await agent.executeTask({
    taskId: 'test-api-docs',
    agentId: 'agent-31-docs',
    goal: 'Generate API documentation',
    inputs: {
      type: 'api-docs',
      api_name: 'Users API',
      version: '1.0.0',
    },
    constraints: { maxTokens: 50000, maxLatency: 180000 },
  });

  console.log('API Docs Result:', JSON.stringify(apiResult, null, 2));

  // Test runbook creation
  const runbookResult = await agent.executeTask({
    taskId: 'test-runbook',
    agentId: 'agent-31-docs',
    goal: 'Create runbook for incident response',
    inputs: {
      type: 'runbook',
      title: 'Database Connection Failure',
      severity: 'high',
    },
    constraints: { maxTokens: 50000, maxLatency: 180000 },
  });

  console.log('Runbook Result:', JSON.stringify(runbookResult, null, 2));

  // Test changelog generation
  const changelogResult = await agent.executeTask({
    taskId: 'test-changelog',
    agentId: 'agent-31-docs',
    goal: 'Generate changelog for release',
    inputs: {
      type: 'changelog',
      version: '2.1.0',
    },
    constraints: { maxTokens: 50000, maxLatency: 180000 },
  });

  console.log('Changelog Result:', JSON.stringify(changelogResult, null, 2));
}

if (require.main === module) {
  main().catch(console.error);
}

export default DocsAgent;
