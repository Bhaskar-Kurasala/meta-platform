/**
 * Agent 24 - Content
 *
 * Specialized agent for content creation, copywriting, and marketing.
 *
 * @module Agent24Content
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

export interface ContentBrief {
  content_type: 'blog_post' | 'article' | 'case_study' | 'whitepaper' | 'social_media';
  topic: string;
  target_audience: string;
  primary_keywords: string[];
  secondary_keywords: string[];
  word_count: number;
  tone: string;
  cta?: string;
}

export interface ContentDraft {
  content_id: string;
  title: string;
  type: string;
  word_count: number;
  sections: ContentSection[];
  seo: SEOData;
  status: 'draft' | 'review' | 'published';
}

export interface ContentSection {
  heading: string;
  content: string;
}

export interface SEOData {
  meta_title: string;
  meta_description: string;
  keywords: string[];
  readability_score?: number;
}

export interface ContentPerformance {
  content_id: string;
  metrics: {
    views: number;
    unique_visitors: number;
    time_on_page: string;
    bounce_rate: number;
    shares: number;
    conversions: number;
  };
  seo_score: number;
  readability_score: number;
}

// ============================================================================
// Configuration
// ============================================================================

export interface ContentConfig {
  eventPublisher: EventPublisher;
  projectRoot?: string;
}

// ============================================================================
// Main Agent Class
// ============================================================================

export class ContentAgent {
  private config: ContentConfig;
  private manifest: AgentManifest | null = null;

  constructor(config: ContentConfig) {
    this.config = config;
  }

  async initialize(manifestPath: string): Promise<void> {
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    this.manifest = yaml.parse(manifestContent) as AgentManifest;
    console.log(`[Content] Initialized with manifest: ${this.manifest?.id}`);
  }

  async executeTask(envelope: TaskEnvelope): Promise<AgentResult> {
    const startTime = Date.now();
    const taskId = envelope.taskId || this.generateId();

    try {
      const inputs = envelope.inputs || {};
      const taskType = inputs.type as string || 'create';

      let contentDraft: ContentDraft;
      let brief: ContentBrief;
      let performance: ContentPerformance;

      if (taskType === 'create') {
        const result = await this.createContent(inputs);
        contentDraft = result.content;
        brief = result.brief;
        performance = this.createEmptyPerformance();
      } else if (taskType === 'optimize') {
        const result = await this.optimizeContent(inputs);
        contentDraft = result;
        brief = this.createDefaultBrief();
        performance = this.createEmptyPerformance();
      } else if (taskType === 'analyze') {
        const result = await this.analyzeContent(inputs);
        performance = result;
        contentDraft = this.createEmptyDraft();
        brief = this.createDefaultBrief();
      } else {
        throw new Error(`Unknown task type: ${taskType}`);
      }

      const artifacts: Artifact[] = [
        {
          id: this.generateId(),
          type: taskType === 'analyze' ? 'performance-report' : 'content-draft',
          summary: `Content: ${contentDraft.title || 'Untitled'}`,
          content: JSON.stringify(
            taskType === 'analyze' ? performance : contentDraft,
            null,
            2
          ),
          produced_by: 'agent-24-content',
          created_at: new Date().toISOString(),
        },
      ];

      const decisions: Decision[] = [
        {
          type: 'content_strategy',
          reason: `Based on ${taskType} task`,
          confidence: 0.85,
          inputs: { task_type: taskType },
        },
      ];

      await this.config.eventPublisher.publish('agent.24.content-created', {
        content_id: contentDraft.content_id,
        type: contentDraft.type,
        status: contentDraft.status,
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
      console.error(`[Content] Task ${taskId} failed:`, error);

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
          code: 'CONTENT_CREATION_FAILED',
          message: error instanceof Error ? error.message : String(error),
          recoverable: true,
        },
      };
    }
  }

  private async createContent(inputs: Record<string, unknown>): Promise<{
    content: ContentDraft;
    brief: ContentBrief;
  }> {
    const contentType = inputs.content_type as ContentBrief['content_type'] || 'blog_post';
    const topic = inputs.topic as string || 'Default Topic';
    const audience = inputs.target_audience as string || 'General audience';
    const wordCount = inputs.word_count as number || 1000;

    const primaryKeywords = (inputs.primary_keywords as string[]) || ['keyword'];
    const secondaryKeywords = (inputs.secondary_keywords as string[]) || [];

    const brief: ContentBrief = {
      content_type: contentType,
      topic,
      target_audience: audience,
      primary_keywords: primaryKeywords,
      secondary_keywords: secondaryKeywords,
      word_count: wordCount,
      tone: inputs.tone as string || 'professional',
      cta: inputs.cta as string,
    };

    // Generate content sections based on type
    const sections = this.generateSections(contentType, topic, wordCount);

    const content: ContentDraft = {
      content_id: this.generateId(),
      title: this.generateTitle(topic),
      type: contentType,
      word_count: wordCount,
      sections,
      seo: {
        meta_title: `${this.generateTitle(topic)} | Company`,
        meta_description: `Learn about ${topic} in this comprehensive guide.`,
        keywords: primaryKeywords,
        readability_score: 65,
      },
      status: 'draft',
    };

    return { content, brief };
  }

  private async optimizeContent(inputs: Record<string, unknown>): Promise<ContentDraft> {
    const contentId = inputs.content_id as string || this.generateId();
    const seoKeywords = (inputs.seo_keywords as string[]) || ['keyword'];

    return {
      content_id: contentId,
      title: inputs.title as string || 'Optimized Content',
      type: inputs.content_type as string || 'blog_post',
      word_count: inputs.word_count as number || 1000,
      sections: (inputs.sections as ContentSection[]) || [],
      seo: {
        meta_title: `${inputs.title} | Company`,
        meta_description: inputs.meta_description as string || 'Optimized content description',
        keywords: seoKeywords,
        readability_score: 70,
      },
      status: 'review',
    };
  }

  private async analyzeContent(inputs: Record<string, unknown>): Promise<ContentPerformance> {
    return {
      content_id: inputs.content_id as string || this.generateId(),
      metrics: {
        views: inputs.views as number || 5000,
        unique_visitors: inputs.unique_visitors as number || 3500,
        time_on_page: inputs.time_on_page as string || '4:30',
        bounce_rate: inputs.bounce_rate as number || 0.35,
        shares: inputs.shares as number || 150,
        conversions: inputs.conversions as number || 50,
      },
      seo_score: inputs.seo_score as number || 85,
      readability_score: inputs.readability_score as number || 70,
    };
  }

  private generateSections(type: string, topic: string, wordCount: number): ContentSection[] {
    const sectionsPerType: Record<string, ContentSection[]> = {
      blog_post: [
        {
          heading: 'Introduction',
          content: `In this article, we'll explore ${topic} and its importance for modern businesses.`,
        },
        {
          heading: 'Key Concepts',
          content: `Understanding ${topic} is crucial for success. Let's dive into the core principles.`,
        },
        {
          heading: 'Best Practices',
          content: `Here are the top strategies for implementing ${topic} effectively.`,
        },
        {
          heading: 'Conclusion',
          content: `To summarize, ${topic} offers significant benefits when done correctly.`,
        },
      ],
      case_study: [
        {
          heading: 'Background',
          content: `This case study examines how a company tackled ${topic}.`,
        },
        {
          heading: 'Challenge',
          content: `The main challenges included understanding the problem space around ${topic}.`,
        },
        {
          heading: 'Solution',
          content: `The approach taken involved implementing comprehensive ${topic} strategies.`,
        },
        {
          heading: 'Results',
          content: `The outcomes demonstrated significant improvements after focusing on ${topic}.`,
        },
      ],
    };

    return sectionsPerType[type] || sectionsPerType.blog_post;
  }

  private generateTitle(topic: string): string {
    const templates = [
      `The Ultimate Guide to ${topic}`,
      `${topic}: Everything You Need to Know`,
      `How to Master ${topic} in 2026`,
      `5 Strategies for ${topic} Success`,
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  private createDefaultBrief(): ContentBrief {
    return {
      content_type: 'blog_post',
      topic: 'Default Topic',
      target_audience: 'General audience',
      primary_keywords: ['keyword'],
      secondary_keywords: [],
      word_count: 1000,
      tone: 'professional',
    };
  }

  private createEmptyDraft(): ContentDraft {
    return {
      content_id: this.generateId(),
      title: '',
      type: 'blog_post',
      word_count: 0,
      sections: [],
      seo: {
        meta_title: '',
        meta_description: '',
        keywords: [],
      },
      status: 'draft',
    };
  }

  private createEmptyPerformance(): ContentPerformance {
    return {
      content_id: this.generateId(),
      metrics: {
        views: 0,
        unique_visitors: 0,
        time_on_page: '0:00',
        bounce_rate: 0,
        shares: 0,
        conversions: 0,
      },
      seo_score: 0,
      readability_score: 0,
    };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export function createContentAgent(config: ContentConfig): ContentAgent {
  return new ContentAgent(config);
}

async function main() {
  const agent = createContentAgent({
    eventPublisher: {
      publish: async () => {},
      subscribe: async () => {},
    },
  });

  await agent.initialize('./manifest.yaml');

  const result = await agent.executeTask({
    taskId: 'test-task',
    agentId: 'agent-24-content',
    goal: 'Create blog post about customer retention',
    inputs: {
      type: 'create',
      content_type: 'blog_post',
      topic: 'Customer Retention Strategies',
      target_audience: 'B2B SaaS founders',
      primary_keywords: ['customer retention', 'saas growth'],
      word_count: 1500,
      tone: 'professional',
    },
    constraints: { maxTokens: 50000, maxLatency: 180000 },
  });

  console.log('Result:', result);
}

if (require.main === module) {
  main().catch(console.error);
}

export default ContentAgent;
