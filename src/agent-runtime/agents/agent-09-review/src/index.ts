/**
 * Agent 09 - Review
 *
 * Specialized agent for code review, PR feedback, and quality gates.
 *
 * @module Agent09Review
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

export interface ReviewRequest {
  pr_id: string;
  repository: string;
  files: string[];
  author: string;
  title: string;
  description: string;
}

export interface CodeReview {
  id: string;
  pr_id: string;
  files_reviewed: FileReview[];
  summary: string;
  verdict: 'approved' | 'changes_requested' | 'blocked';
  issues_count: {
    critical: number;
    major: number;
    minor: number;
  };
  suggestions: string[];
}

export interface FileReview {
  path: string;
  issues: ReviewIssue[];
  comments: ReviewComment[];
  line_count: number;
}

export interface ReviewIssue {
  id: string;
  severity: 'critical' | 'major' | 'minor';
  type: 'bug' | 'security' | 'performance' | 'style' | 'documentation' | 'best-practice';
  line: number;
  message: string;
  suggestion?: string;
}

export interface ReviewComment {
  line: number;
  body: string;
  author: string;
}

// ============================================================================
// Configuration
// ============================================================================

export interface ReviewConfig {
  eventPublisher: EventPublisher;
  projectRoot?: string;
}

// ============================================================================
// Main Agent Class
// ============================================================================

export class ReviewAgent {
  private config: ReviewConfig;
  private manifest: AgentManifest | null = null;

  constructor(config: ReviewConfig) {
    this.config = config;
  }

  async initialize(manifestPath: string): Promise<void> {
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    this.manifest = yaml.parse(manifestContent) as AgentManifest;
    console.log(`[Review] Initialized with manifest: ${this.manifest.id}`);
  }

  async executeTask(envelope: TaskEnvelope): Promise<AgentResult> {
    const startTime = Date.now();
    const taskId = envelope.taskId || this.generateId();

    try {
      const inputs = envelope.inputs || {};
      const reviewType = inputs.type as string || 'standard';

      let review: CodeReview;

      if (reviewType === 'standard') {
        review = await this.performStandardReview(inputs);
      } else if (reviewType === 'security') {
        review = await this.performSecurityReview(inputs);
      } else if (reviewType === 'quick') {
        review = await this.performQuickReview(inputs);
      } else {
        throw new Error(`Unknown review type: ${reviewType}`);
      }

      // Validate invariants
      this.validateReview(review);

      const artifacts: Artifact[] = [
        {
          id: this.generateId(),
          type: 'code-review',
          summary: `Code Review: PR ${review.pr_id}`,
          content: JSON.stringify(review, null, 2),
          produced_by: 'agent-09-review',
          created_at: new Date().toISOString(),
        },
      ];

      const decisions: Decision[] = [
        {
          type: 'review_verdict',
          reason: `Found ${review.issues_count.critical} critical, ${review.issues_count.major} major issues`,
          confidence: review.verdict === 'approved' ? 0.95 : 0.85,
          inputs: { issues_count: review.issues_count },
        },
      ];

      await this.config.eventPublisher.publish('agent.09.review-complete', {
        pr_id: review.pr_id,
        verdict: review.verdict,
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
          actionsExecuted: review.files_reviewed.length,
        },
      };
    } catch (error) {
      console.error(`[Review] Task ${taskId} failed:`, error);

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
          code: 'REVIEW_FAILED',
          message: error instanceof Error ? error.message : String(error),
          recoverable: true,
        },
      };
    }
  }

  private async performStandardReview(inputs: Record<string, unknown>): Promise<CodeReview> {
    const prId = inputs.pr_id as string || 'PR-001';
    const files = inputs.files as string[] || ['src/index.ts'];
    const repository = inputs.repository as string || 'main';

    const fileReviews: FileReview[] = [];

    for (const file of files) {
      const fileReview = await this.reviewFile(file);
      fileReviews.push(fileReview);
    }

    const issuesCount = this.countIssues(fileReviews);
    const verdict = this.determineVerdict(issuesCount);

    return {
      id: this.generateId(),
      pr_id: prId,
      files_reviewed: fileReviews,
      summary: this.generateSummary(fileReviews),
      verdict,
      issues_count: issuesCount,
      suggestions: this.generateSuggestions(fileReviews),
    };
  }

  private async performSecurityReview(inputs: Record<string, unknown>): Promise<CodeReview> {
    const prId = inputs.pr_id as string || 'PR-001';
    const files = inputs.files as string[] || ['src/index.ts'];

    const fileReviews: FileReview[] = [];

    for (const file of files) {
      const fileReview = await this.reviewFile(file, true);
      fileReviews.push(fileReview);
    }

    const issuesCount = this.countIssues(fileReviews);
    const verdict = this.determineVerdict(issuesCount);

    return {
      id: this.generateId(),
      pr_id: prId,
      files_reviewed: fileReviews,
      summary: 'Security-focused review completed',
      verdict,
      issues_count: issuesCount,
      suggestions: this.generateSuggestions(fileReviews),
    };
  }

  private async performQuickReview(inputs: Record<string, unknown>): Promise<CodeReview> {
    const prId = inputs.pr_id as string || 'PR-001';
    const files = inputs.files as string[] || ['src/index.ts'];

    // Quick review - just check critical issues
    const fileReviews: FileReview[] = [];

    for (const file of files) {
      const fileReview = await this.reviewFile(file, false, true);
      fileReviews.push(fileReview);
    }

    const issuesCount = this.countIssues(fileReviews);
    const verdict = issuesCount.critical > 0 ? 'blocked' : 'approved';

    return {
      id: this.generateId(),
      pr_id: prId,
      files_reviewed: fileReviews,
      summary: 'Quick review completed',
      verdict,
      issues_count: issuesCount,
      suggestions: ['Run full review before merging'],
    };
  }

  private async reviewFile(filePath: string, securityOnly = false, quickMode = false): Promise<FileReview> {
    const issues: ReviewIssue[] = [];

    // In production: read actual file content
    // For simulation: generate mock issues based on patterns

    if (!quickMode) {
      // Check for common issues
      issues.push({
        id: this.generateId(),
        severity: 'minor',
        type: 'style',
        line: 10,
        message: 'Consider adding JSDoc comments',
        suggestion: 'Add documentation for better maintainability',
      });

      if (!securityOnly) {
        issues.push({
          id: this.generateId(),
          severity: 'major',
          type: 'best-practice',
          line: 25,
          message: 'Function too long, consider extracting',
          suggestion: 'Split into smaller, focused functions',
        });
      }
    }

    // Security checks
    issues.push({
      id: this.generateId(),
      severity: 'critical',
      type: 'security',
      line: 42,
      message: 'Potential SQL injection risk',
      suggestion: 'Use parameterized queries',
    });

    return {
      path: filePath,
      issues,
      comments: [],
      line_count: 100,
    };
  }

  private countIssues(fileReviews: FileReview[]): { critical: number; major: number; minor: number } {
    const counts = { critical: 0, major: 0, minor: 0 };

    for (const file of fileReviews) {
      for (const issue of file.issues) {
        counts[issue.severity]++;
      }
    }

    return counts;
  }

  private determineVerdict(issues: { critical: number; major: number; minor: number }): 'approved' | 'changes_requested' | 'blocked' {
    if (issues.critical > 0) return 'blocked';
    if (issues.major > 0) return 'changes_requested';
    return 'approved';
  }

  private generateSummary(fileReviews: FileReview[]): string {
    const totalIssues = fileReviews.reduce((sum, f) => sum + f.issues.length, 0);
    return `Reviewed ${fileReviews.length} files, found ${totalIssues} issues`;
  }

  private generateSuggestions(fileReviews: FileReview[]): string[] {
    const suggestions: string[] = [];

    const hasSecurity = fileReviews.some(f => f.issues.some(i => i.type === 'security'));
    if (hasSecurity) {
      suggestions.push('Address security issues before merging');
    }

    const hasStyle = fileReviews.some(f => f.issues.some(i => i.type === 'style'));
    if (hasStyle) {
      suggestions.push('Run linter to fix style issues');
    }

    suggestions.push('Consider adding integration tests');
    suggestions.push('Update documentation if needed');

    return suggestions;
  }

  private validateReview(review: CodeReview): void {
    // Check invariants
    if (review.verdict === 'approved' && review.issues_count.critical > 0) {
      throw new Error('Invariant violation: Cannot approve code with critical issues');
    }

    if (review.files_reviewed.length === 0) {
      throw new Error('Invariant violation: No files reviewed');
    }

    // Check for actionable feedback
    for (const file of review.files_reviewed) {
      for (const issue of file.issues) {
        if (!issue.message || issue.message.length < 10) {
          throw new Error('Invariant violation: Feedback must be actionable');
        }
      }
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export function createReviewAgent(config: ReviewConfig): ReviewAgent {
  return new ReviewAgent(config);
}

async function main() {
  const agent = createReviewAgent({
    eventPublisher: {
      publish: async () => {},
      subscribe: async () => {},
    },
  });

  await agent.initialize('./manifest.yaml');

  const result = await agent.executeTask({
    taskId: 'test-task',
    agentId: 'agent-09-review',
    goal: 'Review PR for new feature',
    inputs: {
      type: 'standard',
      pr_id: 'PR-123',
      repository: 'main',
      files: ['src/services/Feature.ts', 'src/controllers/Feature.ts'],
      author: 'developer',
      title: 'Add new feature',
      description: 'This PR adds a new feature',
    },
    constraints: { maxTokens: 50000, maxLatency: 300000 },
  });

  console.log('Result:', result);
}

if (require.main === module) {
  main().catch(console.error);
}

export default ReviewAgent;
