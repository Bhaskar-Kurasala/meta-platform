/**
 * Agent 27 - Feedback
 *
 * Specialized agent for feedback collection, sentiment analysis, and NPS tracking.
 *
 * @module Agent27Feedback
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

export interface FeedbackEntry {
  feedback_id: string;
  source: 'support_ticket' | 'nps_survey' | 'email' | 'social' | 'review';
  customer_id?: string;
  content: string;
  sentiment: Sentiment;
  categories: string[];
  nps_score?: number;
  timestamp: string;
}

export interface Sentiment {
  label: 'positive' | 'neutral' | 'negative';
  score: number;
  emotions: string[];
}

export interface NPSMetrics {
  score: number;
  promoters: number;
  passives: number;
  detractors: number;
  total_responses: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface FeedbackAnalysis {
  analysis_id: string;
  period: { start: string; end: string };
  summary: {
    total_feedback: number;
    sentiment_breakdown: { positive: number; neutral: number; negative: number };
    avg_sentiment_score: number;
  };
  nps: NPSMetrics;
  top_themes: Theme[];
  urgent_issues: UrgentIssue[];
}

export interface Theme {
  theme: string;
  count: number;
  sentiment: string;
}

export interface UrgentIssue {
  issue: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  count: number;
}

// ============================================================================
// Configuration
// ============================================================================

export interface FeedbackConfig {
  eventPublisher: EventPublisher;
  projectRoot?: string;
}

// ============================================================================
// Main Agent Class
// ============================================================================

export class FeedbackAgent {
  private config: FeedbackConfig;
  private manifest: AgentManifest | null = null;

  constructor(config: FeedbackConfig) {
    this.config = config;
  }

  async initialize(manifestPath: string): Promise<void> {
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    this.manifest = yaml.parse(manifestContent) as AgentManifest;
    console.log(`[Feedback] Initialized with manifest: ${this.manifest?.id}`);
  }

  async executeTask(envelope: TaskEnvelope): Promise<AgentResult> {
    const startTime = Date.now();
    const taskId = envelope.taskId || this.generateId();

    try {
      const inputs = envelope.inputs || {};
      const taskType = inputs.type as string || 'analyze';

      let result: {
        analysis?: FeedbackAnalysis;
        feedback?: FeedbackEntry;
        sentiment?: Sentiment;
      };

      if (taskType === 'analyze') {
        result = await this.analyzeFeedback(inputs);
      } else if (taskType === 'collect') {
        result = await this.collectFeedback(inputs);
      } else if (taskType === 'sentiment') {
        result = await this.analyzeSentiment(inputs);
      } else if (taskType === 'nps') {
        result = await this.calculateNPS(inputs);
      } else {
        throw new Error(`Unknown task type: ${taskType}`);
      }

      const artifacts: Artifact[] = [
        {
          id: this.generateId(),
          type: 'feedback-output',
          summary: `Feedback: ${taskType}`,
          content: JSON.stringify(result, null, 2),
          produced_by: 'agent-27-feedback',
          created_at: new Date().toISOString(),
        },
      ];

      const decisions: Decision[] = [
        {
          type: 'feedback_action',
          reason: `Executed ${taskType} task`,
          confidence: 0.9,
          inputs: { task_type: taskType },
        },
      ];

      // Publish relevant events
      if (taskType === 'analyze' && (result as any).analysis) {
        await this.config.eventPublisher.publish('agent.27.feedback-analyzed', {
          analysis_id: (result as any).analysis.analysis_id,
          total_feedback: (result as any).analysis.summary.total_feedback,
          timestamp: new Date().toISOString(),
        });

        // Check for urgent issues
        const urgentIssues = (result as any).analysis.urgent_issues;
        if (urgentIssues && urgentIssues.length > 0) {
          await this.config.eventPublisher.publish('agent.27.sentiment-alert', {
            alert_type: 'urgent_issues_detected',
            count: urgentIssues.length,
            timestamp: new Date().toISOString(),
          });
        }
      }

      if (taskType === 'sentiment' && (result as any).sentiment) {
        const sentiment = (result as any).sentiment;
        if (sentiment.label === 'negative' && sentiment.score > 0.7) {
          await this.config.eventPublisher.publish('agent.27.sentiment-alert', {
            alert_type: 'high_negative_sentiment',
            score: sentiment.score,
            timestamp: new Date().toISOString(),
          });
        }
      }

      if (taskType === 'nps' && (result as any).nps) {
        await this.config.eventPublisher.publish('agent.27.nps-updated', {
          score: (result as any).nps.score,
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
      console.error(`[Feedback] Task ${taskId} failed:`, error);

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
          code: 'FEEDBACK_TASK_FAILED',
          message: error instanceof Error ? error.message : String(error),
          recoverable: true,
        },
      };
    }
  }

  private async analyzeFeedback(inputs: Record<string, unknown>): Promise<{
    analysis: FeedbackAnalysis;
  }> {
    const feedbackList = (inputs.feedback as FeedbackEntry[]) || this.generateSampleFeedback();

    // Analyze sentiment for each
    const analyzed = feedbackList.map(fb => ({
      ...fb,
      sentiment: this.analyzeSentimentText(fb.content),
    }));

    // Calculate summary
    const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
    let totalSentimentScore = 0;

    analyzed.forEach(fb => {
      sentimentCounts[fb.sentiment.label]++;
      totalSentimentScore += fb.sentiment.score;
    });

    // Calculate NPS
    const npsResponses = analyzed.filter(fb => fb.nps_score !== undefined);
    const promoters = npsResponses.filter(fb => (fb.nps_score || 0) >= 9).length;
    const passives = npsResponses.filter(fb => (fb.nps_score || 0) >= 7 && (fb.nps_score || 0) <= 8).length;
    const detractors = npsResponses.filter(fb => (fb.nps_score || 0) < 7).length;
    const total = npsResponses.length || 1;

    const npsScore = Math.round(((promoters - detractors) / total) * 100);

    // Extract themes
    const themes = this.extractThemes(analyzed);

    // Detect urgent issues
    const urgentIssues = this.detectUrgentIssues(analyzed);

    const analysis: FeedbackAnalysis = {
      analysis_id: this.generateId(),
      period: {
        start: inputs.start_date as string || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: inputs.end_date as string || new Date().toISOString(),
      },
      summary: {
        total_feedback: analyzed.length,
        sentiment_breakdown: sentimentCounts,
        avg_sentiment_score: totalSentimentScore / analyzed.length,
      },
      nps: {
        score: npsScore,
        promoters,
        passives,
        detractors,
        total_responses: npsResponses.length,
        trend: 'stable',
      },
      top_themes: themes,
      urgent_issues: urgentIssues,
    };

    return { analysis };
  }

  private generateSampleFeedback(): FeedbackEntry[] {
    return [
      { feedback_id: 'fb-001', source: 'nps_survey', content: 'Great product! Really love the ease of use.', sentiment: { label: 'positive', score: 0.9, emotions: ['joy', 'satisfaction'] }, categories: ['product_quality'], nps_score: 10, timestamp: '2026-02-15T10:00:00Z' },
      { feedback_id: 'fb-002', source: 'support_ticket', content: 'API documentation is confusing and needs more examples.', sentiment: { label: 'negative', score: 0.6, emotions: ['frustration'] }, categories: ['documentation'], nps_score: 5, timestamp: '2026-02-16T10:00:00Z' },
      { feedback_id: 'fb-003', source: 'review', content: 'Good tool but needs more features.', sentiment: { label: 'neutral', score: 0.5, emotions: ['neutral'] }, categories: ['features'], nps_score: 7, timestamp: '2026-02-17T10:00:00Z' },
      { feedback_id: 'fb-004', source: 'social', content: 'Amazing customer support!', sentiment: { label: 'positive', score: 0.95, emotions: ['joy', 'gratitude'] }, categories: ['support'], nps_score: 10, timestamp: '2026-02-18T10:00:00Z' },
      { feedback_id: 'fb-005', source: 'email', content: 'The new update broke our integration. Critical bug!', sentiment: { label: 'negative', score: 0.9, emotions: ['anger', 'frustration'] }, categories: ['bug', 'integration'], nps_score: 3, timestamp: '2026-02-19T10:00:00Z' },
    ];
  }

  private analyzeSentimentText(text: string): Sentiment {
    const lowerText = text.toLowerCase();

    // Positive keywords
    const positiveKeywords = ['great', 'amazing', 'love', 'excellent', 'fantastic', 'wonderful', 'good', 'best'];
    // Negative keywords
    const negativeKeywords = ['bad', 'broken', 'bug', 'issue', 'problem', 'confusing', 'frustrating', 'hate', 'terrible', 'worst'];

    let positiveCount = 0;
    let negativeCount = 0;

    positiveKeywords.forEach(kw => { if (lowerText.includes(kw)) positiveCount++; });
    negativeKeywords.forEach(kw => { if (lowerText.includes(kw)) negativeCount++; });

    const score = positiveCount / (positiveCount + negativeCount + 1);

    let label: Sentiment['label'] = 'neutral';
    if (positiveCount > negativeCount) label = 'positive';
    else if (negativeCount > positiveCount) label = 'negative';

    const emotions: string[] = [];
    if (lowerText.includes('love') || lowerText.includes('amazing')) emotions.push('joy');
    if (lowerText.includes('frustrat')) emotions.push('frustration');
    if (lowerText.includes('ang')) emotions.push('anger');
    if (lowerText.includes('confus')) emotions.push('confusion');
    if (emotions.length === 0) emotions.push('neutral');

    return {
      label,
      score: Math.round(score * 100) / 100,
      emotions,
    };
  }

  private extractThemes(feedback: FeedbackEntry[]): Theme[] {
    const themeCounts: Record<string, { count: number; sentiment: string }> = {};

    feedback.forEach(fb => {
      fb.categories.forEach(cat => {
        if (!themeCounts[cat]) {
          themeCounts[cat] = { count: 0, sentiment: fb.sentiment.label };
        }
        themeCounts[cat].count++;
      });
    });

    return Object.entries(themeCounts)
      .map(([theme, data]) => ({
        theme,
        count: data.count,
        sentiment: data.sentiment,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private detectUrgentIssues(feedback: FeedbackEntry[]): UrgentIssue[] {
    const issues: Record<string, { count: number; severity: UrgentIssue['severity'] }> = {};

    feedback.forEach(fb => {
      const text = fb.content.toLowerCase();

      if (fb.sentiment.label === 'negative' && fb.sentiment.score > 0.7) {
        if (text.includes('bug') || text.includes('broken') || text.includes('critical')) {
          const issue = 'critical_bug';
          issues[issue] = issues[issue] || { count: 0, severity: 'high' };
          issues[issue].count++;
        }
        if (text.includes('integration')) {
          const issue = 'integration_issue';
          issues[issue] = issues[issue] || { count: 0, severity: 'medium' };
          issues[issue].count++;
        }
      }
    });

    return Object.entries(issues)
      .map(([issue, data]) => ({
        issue,
        severity: data.severity,
        count: data.count,
      }))
      .sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });
  }

  private async collectFeedback(inputs: Record<string, unknown>): Promise<{
    feedback: FeedbackEntry;
  }> {
    const feedback: FeedbackEntry = {
      feedback_id: this.generateId(),
      source: inputs.source as FeedbackEntry['source'] || 'nps_survey',
      customer_id: inputs.customer_id as string,
      content: inputs.content as string || '',
      sentiment: this.analyzeSentimentText(inputs.content as string || ''),
      categories: (inputs.categories as string[]) || [],
      nps_score: inputs.nps_score as number,
      timestamp: new Date().toISOString(),
    };

    return { feedback };
  }

  private async analyzeSentiment(inputs: Record<string, unknown>): Promise<{
    sentiment: Sentiment;
  }> {
    const content = inputs.content as string || '';
    const sentiment = this.analyzeSentimentText(content);

    return { sentiment };
  }

  private async calculateNPS(inputs: Record<string, unknown>): Promise<{
    nps: NPSMetrics;
  }> {
    const scores = (inputs.scores as number[]) || [7, 8, 9, 10, 6, 5, 8, 9, 10, 7];

    const promoters = scores.filter(s => s >= 9).length;
    const passives = scores.filter(s => s >= 7 && s <= 8).length;
    const detractors = scores.filter(s => s < 7).length;
    const total = scores.length;

    const nps: NPSMetrics = {
      score: Math.round(((promoters - detractors) / total) * 100),
      promoters,
      passives,
      detractors,
      total_responses: total,
      trend: inputs.trend as NPSMetrics['trend'] || 'stable',
    };

    return { nps };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export function createFeedbackAgent(config: FeedbackConfig): FeedbackAgent {
  return new FeedbackAgent(config);
}

async function main() {
  const agent = createFeedbackAgent({
    eventPublisher: {
      publish: async () => {},
      subscribe: async () => {},
    },
  });

  await agent.initialize('./manifest.yaml');

  // Test analysis
  const analysisResult = await agent.executeTask({
    taskId: 'test-analysis',
    agentId: 'agent-27-feedback',
    goal: 'Analyze recent customer feedback',
    inputs: {
      type: 'analyze',
      start_date: '2026-01-01',
      end_date: '2026-02-24',
    },
    constraints: { maxTokens: 50000, maxLatency: 180000 },
  });

  console.log('Analysis Result:', JSON.stringify(analysisResult, null, 2));

  // Test sentiment analysis
  const sentimentResult = await agent.executeTask({
    taskId: 'test-sentiment',
    agentId: 'agent-27-feedback',
    goal: 'Analyze sentiment of feedback',
    inputs: {
      type: 'sentiment',
      content: 'The new update is amazing! Love all the new features.',
    },
    constraints: { maxTokens: 50000, maxLatency: 180000 },
  });

  console.log('Sentiment Result:', JSON.stringify(sentimentResult, null, 2));
}

if (require.main === module) {
  main().catch(console.error);
}

export default FeedbackAgent;
