/**
 * Agent 26 - Support
 *
 * Specialized agent for technical support, ticket triage, and resolution.
 *
 * @module Agent26Support
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

export interface Ticket {
  ticket_id: string;
  customer_id: string;
  subject: string;
  description: string;
  category: 'technical' | 'feature' | 'how_to' | 'billing' | 'account' | 'security';
  subcategory?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  component?: string;
  status: 'new' | 'open' | 'pending' | 'resolved' | 'closed';
  priority: number;
  affected_users: number;
  created_at: string;
  updated_at: string;
}

export interface TriageResult {
  ticket_id: string;
  classification: {
    category: string;
    subcategory: string;
    severity: string;
    component: string;
  };
  priority: number;
  routing: {
    team: string;
    assignee?: string;
    escalation_path: string[];
  };
  sla: {
    response_deadline: string;
    resolution_target: string;
  };
}

export interface ResolutionSuggestion {
  ticket_id: string;
  diagnosis: {
    likely_cause: string;
    confidence: number;
  };
  suggestions: {
    step: number;
    action: string;
    kb_article?: string;
  }[];
  workaround?: string;
  escalation_needed: boolean;
}

export interface KBArticle {
  article_id: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
}

// ============================================================================
// Configuration
// ============================================================================

export interface SupportConfig {
  eventPublisher: EventPublisher;
  projectRoot?: string;
}

// ============================================================================
// Main Agent Class
// ============================================================================

export class SupportAgent {
  private config: SupportConfig;
  private manifest: AgentManifest | null = null;

  constructor(config: SupportConfig) {
    this.config = config;
  }

  async initialize(manifestPath: string): Promise<void> {
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    this.manifest = yaml.parse(manifestContent) as AgentManifest;
    console.log(`[Support] Initialized with manifest: ${this.manifest?.id}`);
  }

  async executeTask(envelope: TaskEnvelope): Promise<AgentResult> {
    const startTime = Date.now();
    const taskId = envelope.taskId || this.generateId();

    try {
      const inputs = envelope.inputs || {};
      const taskType = inputs.type as string || 'triage';

      let result: {
        triage?: TriageResult;
        resolution?: ResolutionSuggestion;
        kb_articles?: KBArticle[];
      };

      if (taskType === 'triage') {
        result = await this.triageTicket(inputs);
      } else if (taskType === 'resolve') {
        result = await this.provideResolution(inputs);
      } else if (taskType === 'lookup') {
        result = await this.lookupKnowledgeBase(inputs);
      } else {
        throw new Error(`Unknown task type: ${taskType}`);
      }

      const artifacts: Artifact[] = [
        {
          id: this.generateId(),
          type: 'support-output',
          summary: `Support: ${taskType}`,
          content: JSON.stringify(result, null, 2),
          produced_by: 'agent-26-support',
          created_at: new Date().toISOString(),
        },
      ];

      const decisions: Decision[] = [
        {
          type: 'support_action',
          reason: `Executed ${taskType} task`,
          confidence: 0.9,
          inputs: { task_type: taskType },
        },
      ];

      // Publish relevant events
      if (taskType === 'triage' && (result as any).triage) {
        await this.config.eventPublisher.publish('agent.26.ticket-triaged', {
          ticket_id: inputs.ticket_id,
          category: (result as any).triage.classification.category,
          severity: (result as any).triage.classification.severity,
          timestamp: new Date().toISOString(),
        });

        if ((result as any).triage.classification.severity === 'critical' ||
            (result as any).triage.classification.category === 'security') {
          await this.config.eventPublisher.publish('agent.26.ticket-escalated', {
            ticket_id: inputs.ticket_id,
            reason: 'security_or_critical',
            timestamptoISOString(),
          });
        }
: new Date().      }

      if (taskType === 'resolve' && (result as any).resolution?.escalation_needed) {
        await this.config.eventPublisher.publish('agent.26.ticket-escalated', {
          ticket_id: inputs.ticket_id,
          reason: 'needs_escalation',
          timestamp: new Date().toISOString(),
        });
      }

      if ((result as any).resolution && !(result as any).resolution.escalation_needed) {
        await this.config.eventPublisher.publish('agent.26.resolution-found', {
          ticket_id: inputs.ticket_id,
          confidence: (result as any).resolution.diagnosis.confidence,
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
      console.error(`[Support] Task ${taskId} failed:`, error);

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
          code: 'SUPPORT_TASK_FAILED',
          message: error instanceof Error ? error.message : String(error),
          recoverable: true,
        },
      };
    }
  }

  private async triageTicket(inputs: Record<string, unknown>): Promise<{
    triage: TriageResult;
  }> {
    const ticketId = inputs.ticket_id as string || this.generateId();
    const subject = inputs.subject as string || '';
    const description = inputs.description as string || '';
    const customerId = inputs.customer_id as string || 'unknown';
    const category = inputs.category as string || this.detectCategory(subject, description);
    const severity = inputs.severity as Ticket['severity'] || this.detectSeverity(subject, description);
    const affectedUsers = inputs.affected_users as number || 1;

    // Determine component
    const component = inputs.component as string || this.detectComponent(subject, description);

    // Determine subcategory
    const subcategory = inputs.subcategory as string || this.detectSubcategory(subject, description);

    // Calculate priority
    const priority = this.calculatePriority(severity, affectedUsers);

    // Determine routing team
    const team = this.determineRoutingTeam(category, component);

    // Calculate SLA
    const now = new Date();
    const responseDeadline = new Date(now);
    const resolutionTarget = new Date(now);

    // Response time based on severity (in hours)
    const responseHours = severity === 'critical' ? 1 : severity === 'high' ? 4 : severity === 'medium' ? 24 : 48;
    responseDeadline.setHours(responseDeadline.getHours() + responseHours);

    // Resolution time based on severity (in hours)
    const resolutionHours = severity === 'critical' ? 4 : severity === 'high' ? 24 : severity === 'medium' ? 72 : 168;
    resolutionTarget.setHours(resolutionTarget.getHours() + resolutionHours);

    const triage: TriageResult = {
      ticket_id: ticketId,
      classification: {
        category,
        subcategory,
        severity,
        component,
      },
      priority,
      routing: {
        team,
        escalation_path: this.getEscalationPath(severity),
      },
      sla: {
        response_deadline: responseDeadline.toISOString(),
        resolution_target: resolutionTarget.toISOString(),
      },
    };

    return { triage };
  }

  private detectCategory(subject: string, description: string): string {
    const text = `${subject} ${description}`.toLowerCase();

    if (text.includes('security') || text.includes('breach') || text.includes('vulnerability')) {
      return 'security';
    }
    if (text.includes('bill') || text.includes('payment') || text.includes('invoice') || text.includes('subscription')) {
      return 'billing';
    }
    if (text.includes('login') || text.includes('password') || text.includes('permission') || text.includes('access')) {
      return 'account';
    }
    if (text.includes('bug') || text.includes('error') || text.includes('crash') || text.includes('broken')) {
      return 'technical';
    }
    if (text.includes('feature') || text.includes('request') || text.includes('add')) {
      return 'feature';
    }
    return 'how_to';
  }

  private detectSeverity(subject: string, description: string): Ticket['severity'] {
    const text = `${subject} ${description}`.toLowerCase();

    if (text.includes('critical') || text.includes('down') || text.includes('outage') || text.includes('emergency')) {
      return 'critical';
    }
    if (text.includes('urgent') || text.includes('asap') || text.includes('important')) {
      return 'high';
    }
    if (text.includes('minor') || text.includes('cosmetic')) {
      return 'low';
    }
    return 'medium';
  }

  private detectComponent(subject: string, description: string): string {
    const text = `${subject} ${description}`.toLowerCase();

    if (text.includes('api')) return 'api';
    if (text.includes('ui') || text.includes('frontend') || text.includes('button') || text.includes('page')) return 'frontend';
    if (text.includes('database') || text.includes('db')) return 'database';
    if (text.includes('integration') || text.includes('webhook')) return 'integration';
    if (text.includes('mobile')) return 'mobile';
    return 'general';
  }

  private detectSubcategory(subject: string, description: string): string {
    const text = `${subject} ${description}`.toLowerCase();

    if (text.includes('rate limit')) return 'rate_limiting';
    if (text.includes('timeout')) return 'timeout';
    if (text.includes('authentication') || text.includes('oauth')) return 'authentication';
    if (text.includes('permission') || text.includes('access denied')) return 'permissions';
    return 'general';
  }

  private calculatePriority(severity: Ticket['severity'], affectedUsers: number): number {
    const severityPriority: Record<Ticket['severity'], number> = {
      critical: 1,
      high: 2,
      medium: 3,
      low: 4,
    };

    let priority = severityPriority[severity];

    // Reduce priority if multiple users affected
    if (affectedUsers > 10) {
      priority = Math.max(1, priority - 1);
    } else if (affectedUsers > 1) {
      priority = Math.max(1, priority - 0.5) as number;
    }

    return Math.round(priority);
  }

  private determineRoutingTeam(category: string, component: string): string {
    if (category === 'security') return 'security-team';
    if (category === 'billing') return 'billing-team';
    if (category === 'account') return 'account-team';
    if (component === 'frontend') return 'frontend-team';
    if (component === 'api') return 'backend-team';
    if (component === 'mobile') return 'mobile-team';
    if (component === 'integration') return 'integration-team';
    return 'support-general';
  }

  private getEscalationPath(severity: Ticket['severity']): string[] {
    if (severity === 'critical') {
      return ['team-lead', 'engineering-manager', 'vp-engineering', 'cto'];
    }
    if (severity === 'high') {
      return ['team-lead', 'engineering-manager'];
    }
    return ['team-lead'];
  }

  private async provideResolution(inputs: Record<string, unknown>): Promise<{
    resolution: ResolutionSuggestion;
    kb_articles: KBArticle[];
  }> {
    const ticketId = inputs.ticket_id as string || this.generateId();
    const subject = inputs.subject as string || '';
    const description = inputs.description as string || '';

    // Diagnose the issue
    const diagnosis = this.diagnoseIssue(subject, description);

    // Generate suggestions
    const suggestions = this.generateSuggestions(diagnosis.likely_cause);

    // Check if escalation is needed
    const escalationNeeded = this.checkEscalationNeeded(diagnosis.confidence, subject, description);

    // Get KB articles
    const kbArticles = this.findRelevantKBArticles(diagnosis.likely_cause);

    const resolution: ResolutionSuggestion = {
      ticket_id: ticketId,
      diagnosis,
      suggestions,
      escalation_needed: escalationNeeded,
    };

    return { resolution, kb_articles: kbArticles };
  }

  private diagnoseIssue(subject: string, description: string): { likely_cause: string; confidence: number } {
    const text = `${subject} ${description}`.toLowerCase();

    if (text.includes('rate limit')) {
      return { likely_cause: 'API rate limiting exceeded', confidence: 0.9 };
    }
    if (text.includes('timeout')) {
      return { likely_cause: 'Request timeout', confidence: 0.85 };
    }
    if (text.includes('401') || text.includes('unauthorized')) {
      return { likely_cause: 'Authentication failure', confidence: 0.9 };
    }
    if (text.includes('403') || text.includes('forbidden') || text.includes('permission')) {
      return { likely_cause: 'Permission denied', confidence: 0.85 };
    }
    if (text.includes('500') || text.includes('internal error')) {
      return { likely_cause: 'Internal server error', confidence: 0.7 };
    }
    if (text.includes('404') || text.includes('not found')) {
      return { likely_cause: 'Resource not found', confidence: 0.9 };
    }
    if (text.includes('slow') || text.includes('performance')) {
      return { likely_cause: 'Performance degradation', confidence: 0.75 };
    }

    return { likely_cause: 'Unknown issue', confidence: 0.3 };
  }

  private generateSuggestions(cause: string): { step: number; action: string; kb_article?: string }[] {
    const suggestionsMap: Record<string, { step: number; action: string; kb_article?: string }[]> = {
      'API rate limiting exceeded': [
        { step: 1, action: 'Check current API usage against rate limits', kb_article: 'KB-101' },
        { step: 2, action: 'Implement exponential backoff in client', kb_article: 'KB-102' },
        { step: 3, action: 'Consider upgrading to higher rate limit tier', kb_article: 'KB-103' },
      ],
      'Request timeout': [
        { step: 1, action: 'Check network connectivity', kb_article: 'KB-201' },
        { step: 2, action: 'Increase timeout settings', kb_article: 'KB-202' },
        { step: 3, action: 'Split large requests into batches', kb_article: 'KB-203' },
      ],
      'Authentication failure': [
        { step: 1, action: 'Verify API credentials are valid', kb_article: 'KB-301' },
        { step: 2, action: 'Check token expiration', kb_article: 'KB-302' },
        { step: 3, action: 'Refresh authentication token', kb_article: 'KB-303' },
      ],
      'Permission denied': [
        { step: 1, action: 'Verify user has required permissions', kb_article: 'KB-401' },
        { step: 2, action: 'Check API scopes in token', kb_article: 'KB-402' },
        { step: 3, action: 'Request additional permissions from admin', kb_article: 'KB-403' },
      ],
    };

    return suggestionsMap[cause] || [
      { step: 1, action: 'Gather additional information about the issue' },
      { step: 2, action: 'Search knowledge base for similar issues' },
      { step: 3, action: 'Escalate to technical team if unresolved' },
    ];
  }

  private checkEscalationNeeded(confidence: number, subject: string, description: string): boolean {
    // Low confidence needs escalation
    if (confidence < 0.5) return true;

    // Security issues need escalation
    const text = `${subject} ${description}`.toLowerCase();
    if (text.includes('security') || text.includes('breach')) return true;

    // Critical severity needs escalation
    if (text.includes('critical') || text.includes('down')) return true;

    return false;
  }

  private findRelevantKBArticles(cause: string): KBArticle[] {
    const articles: KBArticle[] = [
      {
        article_id: 'KB-101',
        title: 'Understanding API Rate Limits',
        summary: 'Learn about rate limits and how to handle them',
        category: 'api',
        tags: ['rate-limit', 'api', 'limits'],
      },
      {
        article_id: 'KB-102',
        title: 'Implementing Exponential Backoff',
        summary: 'Best practices for retry logic',
        category: 'api',
        tags: ['retry', 'backoff', 'best-practices'],
      },
      {
        article_id: 'KB-301',
        title: 'Authentication Guide',
        summary: 'How to authenticate API requests',
        category: 'security',
        tags: ['auth', 'api-key', 'oauth'],
      },
    ];

    return articles.filter(a =>
      a.tags.some(tag => cause.toLowerCase().includes(tag)) ||
      a.title.toLowerCase().includes(cause.split(' ')[0].toLowerCase())
    ).slice(0, 3);
  }

  private async lookupKnowledgeBase(inputs: Record<string, unknown>): Promise<{
    kb_articles: KBArticle[];
  }> {
    const query = inputs.query as string || '';
    const category = inputs.category as string || '';

    // Search KB (simplified - in production would query actual KB)
    const allArticles: KBArticle[] = [
      { article_id: 'KB-100', title: 'Getting Started Guide', summary: 'Complete guide to getting started', category: 'general', tags: ['getting-started', 'tutorial'] },
      { article_id: 'KB-101', title: 'API Rate Limits', summary: 'Understanding API rate limits', category: 'api', tags: ['rate-limit', 'api'] },
      { article_id: 'KB-102', title: 'Exponential Backoff', summary: 'Implementing retry logic', category: 'api', tags: ['retry', 'backoff'] },
      { article_id: 'KB-103', title: 'Billing FAQ', summary: 'Common billing questions', category: 'billing', tags: ['billing', 'faq'] },
      { article_id: 'KB-104', title: 'Account Setup', summary: 'Setting up your account', category: 'account', tags: ['account', 'setup'] },
    ];

    let filtered = allArticles;

    if (query) {
      const queryLower = query.toLowerCase();
      filtered = filtered.filter(a =>
        a.title.toLowerCase().includes(queryLower) ||
        a.summary.toLowerCase().includes(queryLower) ||
        a.tags.some(t => t.includes(queryLower))
      );
    }

    if (category) {
      filtered = filtered.filter(a => a.category === category);
    }

    return { kb_articles: filtered };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export function createSupportAgent(config: SupportConfig): SupportAgent {
  return new SupportAgent(config);
}

async function main() {
  const agent = createSupportAgent({
    eventPublisher: {
      publish: async () => {},
      subscribe: async () => {},
    },
  });

  await agent.initialize('./manifest.yaml');

  // Test triage
  const triageResult = await agent.executeTask({
    taskId: 'test-triage',
    agentId: 'agent-26-support',
    goal: 'Triage new support ticket',
    inputs: {
      type: 'triage',
      ticket_id: 'TKT-001',
      customer_id: 'cust-123',
      subject: 'API returning 429 errors',
      description: 'We are getting rate limited when making API calls. This is urgent as our production system is affected.',
      affected_users: 50,
    },
    constraints: { maxTokens: 50000, maxLatency: 180000 },
  });

  console.log('Triage Result:', JSON.stringify(triageResult, null, 2));

  // Test resolution
  const resolutionResult = await agent.executeTask({
    taskId: 'test-resolution',
    agentId: 'agent-26-support',
    goal: 'Provide resolution for ticket',
    inputs: {
      type: 'resolve',
      ticket_id: 'TKT-002',
      subject: 'API timeout errors',
      description: 'Our API calls are timing out after 30 seconds',
    },
    constraints: { maxTokens: 50000, maxLatency: 180000 },
  });

  console.log('Resolution Result:', JSON.stringify(resolutionResult, null, 2));
}

if (require.main === module) {
  main().catch(console.error);
}

export default SupportAgent;
