/**
 * Context Compiler Component
 *
 * Assembles L1 Working Context within token budget.
 * This is the most critical algorithm in the platform.
 *
 * @module ContextCompiler
 */

import {
  TaskEnvelope,
  L1WorkingContext,
  L1MemorySections,
  MemoryEpisode,
  SemanticEntity,
  SharedKnowledge,
  ResourcePointer,
  ChassisError,
} from '../types';

/**
 * Configuration for context compiler
 */
export interface ContextCompilerConfig {
  totalBudget: number;              // Total token budget
  llmResponseReserve: number;        // Percentage for LLM response (0.3 = 30%)

  // Section allocations (percentages of L1 context budget)
  identityTokens: number;            // Fixed tokens
  invariantsTokens: number;          // Fixed tokens
  outputFormatTokens: number;        // Fixed tokens
  skillsPercent: number;             // Percentage
  projectContextPercent: number;     // Percentage
  memoryPercent: number;             // Percentage
  taskPercent: number;               // Percentage
  bufferPercent: number;             // Percentage

  // Memory allocation within memory section
  episodicPercent: number;           // Percentage of memory
  semanticPercent: number;           // Percentage of memory
  sharedPercent: number;             // Percentage of memory
  resourcesPercent: number;         // Percentage of memory
}

/**
 * Default configuration (matches Section 12.2)
 */
const DEFAULT_CONFIG: ContextCompilerConfig = {
  totalBudget: 120000,
  llmResponseReserve: 0.30,

  identityTokens: 200,
  invariantsTokens: 400,
  outputFormatTokens: 100,
  skillsPercent: 0.20,
  projectContextPercent: 0.10,
  memoryPercent: 0.40,
  taskPercent: 0.25,
  bufferPercent: 0.05,

  episodicPercent: 0.30,
  semanticPercent: 0.25,
  sharedPercent: 0.20,
  resourcesPercent: 0.25,
};

/**
 * Memory service interface (to be implemented by Memory Manager)
 */
export interface MemoryServiceInterface {
  queryEpisodic(correlationId: string, agentId: string, goal: string, maxTokens: number): Promise<MemoryEpisode[]>;
  querySemantic(entities: string[], goal: string, maxTokens: number): Promise<SemanticEntity[]>;
  queryShared(domain: string, agentId: string, maxTokens: number): Promise<SharedKnowledge[]>;
  queryResources(goal: string, maxTokens: number): Promise<ResourcePointer[]>;
}

/**
 * Context Provider Interface
 */
export interface ContextProvider {
  getIdentity(): string;
  getInvariants(): string;
  getSkills(maxTokens: number): string;
  getProjectContext(maxTokens: number): string;
}

/**
 * Token budget breakdown
 */
export interface TokenBudget {
  total: number;
  llmResponse: number;
  l1Context: number;
  sections: {
    identity: number;
    invariants: number;
    skills: number;
    projectContext: number;
    memory: number;
    task: number;
    outputFormat: number;
    buffer: number;
  };
  memory: {
    episodic: number;
    semantic: number;
    shared: number;
    resources: number;
  };
}

/**
 * Context Compiler
 *
 * Responsibilities:
 * - Calculate token budget allocation
 * - Query memory layers (L2, L3, L5, L6)
 * - Assemble L1 Working Context
 * - Handle budget constraints
 * - Cache compiled context
 */
export class ContextCompiler {
  private config: ContextCompilerConfig;
  private memoryService: MemoryServiceInterface | null = null;
  private contextProvider: ContextProvider | null = null;
  private cache: Map<string, L1WorkingContext> = new Map();

  /**
   * Create a new ContextCompiler instance
   */
  constructor(config: Partial<ContextCompilerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Set memory service
   */
  setMemoryService(service: MemoryServiceInterface): void {
    this.memoryService = service;
  }

  /**
   * Set context provider
   */
  setContextProvider(provider: ContextProvider): void {
    this.contextProvider = provider;
  }

  /**
   * Compile L1 working context for a task
   */
  async compileContext(task: TaskEnvelope): Promise<L1WorkingContext> {
    // Check cache first
    const cacheKey = `l1:${task.agentId}:${task.taskId}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Calculate token budget
    const budget = this.calculateBudget(task.constraints.maxTokens);

    // Build each section
    const identity = this.buildIdentitySection(budget.sections.identity);
    const invariants = this.buildInvariantsSection(budget.sections.invariants);
    const skills = this.buildSkillsSection(budget.sections.skills);
    const projectContext = this.buildProjectContextSection(budget.sections.projectContext);
    const memory = await this.buildMemorySection(task, budget.memory);
    const taskSection = this.buildTaskSection(task, budget.sections.task);
    const outputFormat = this.buildOutputFormatSection(budget.sections.outputFormat);
    const buffer = this.buildBufferSection(budget.sections.buffer);

    const context: L1WorkingContext = {
      identity,
      invariants,
      skills,
      projectContext,
      memory,
      task: taskSection,
      outputFormat,
      buffer,
    };

    // Cache the result
    this.cache.set(cacheKey, context);

    return context;
  }

  /**
   * Calculate token budget allocation
   */
  calculateBudget(maxTokens?: number): TokenBudget {
    const total = maxTokens || this.config.totalBudget;
    const llmResponse = Math.floor(total * this.config.llmResponseReserve);
    const l1Context = total - llmResponse;

    // Fixed sections
    const identity = this.config.identityTokens;
    const invariants = this.config.invariantsTokens;
    const outputFormat = this.config.outputFormatTokens;

    // Remaining after fixed sections
    const remaining = l1Context - identity - invariants - outputFormat;

    // Calculate percentages of remaining
    const skills = Math.floor(remaining * this.config.skillsPercent);
    const projectContext = Math.floor(remaining * this.config.projectContextPercent);
    const memory = Math.floor(remaining * this.config.memoryPercent);
    const task = Math.floor(remaining * this.config.taskPercent);
    const buffer = Math.floor(remaining * this.config.bufferPercent);

    // Memory allocation
    const episodic = Math.floor(memory * this.config.episodicPercent);
    const semantic = Math.floor(memory * this.config.semanticPercent);
    const shared = Math.floor(memory * this.config.sharedPercent);
    const resources = Math.floor(memory * this.config.resourcesPercent);

    return {
      total,
      llmResponse,
      l1Context,
      sections: {
        identity,
        invariants,
        skills,
        projectContext,
        memory,
        task,
        outputFormat,
        buffer,
      },
      memory: {
        episodic,
        semantic,
        shared,
        resources,
      },
    };
  }

  /**
   * Build identity section (~200 tokens)
   */
  private buildIdentitySection(budget: number): string {
    const identity = this.contextProvider?.getIdentity() || '';
    return this.truncateToTokens(identity, budget);
  }

  /**
   * Build invariants section (~400 tokens)
   */
  private buildInvariantsSection(budget: number): string {
    const invariants = this.contextProvider?.getInvariants() || '';
    return this.truncateToTokens(invariants, budget);
  }

  /**
   * Build skills section (~20% budget)
   */
  private buildSkillsSection(budget: number): string {
    if (!this.contextProvider) {
      return 'Skills: No skills loaded.';
    }
    return this.contextProvider.getSkills(budget);
  }

  /**
   * Build project context section (~10% budget)
   */
  private buildProjectContextSection(budget: number): string {
    if (!this.contextProvider) {
      return 'Project Context: No context loaded.';
    }
    return this.contextProvider.getProjectContext(budget);
  }

  /**
   * Build memory section (~40% budget)
   */
  private async buildMemorySection(task: TaskEnvelope, budget: TokenBudget['memory']): Promise<L1MemorySections> {
    const episodic = await this.queryEpisodicLayer(task, budget.episodic);
    const semantic = await this.querySemanticLayer(task, budget.semantic);
    const shared = await this.querySharedLayer(task, budget.shared);
    const resources = await this.queryResourcesLayer(task, budget.resources);

    return {
      episodic,
      semantic,
      shared,
      resources,
    };
  }

  /**
   * Query L2 Episodic memory
   */
  private async queryEpisodicLayer(task: TaskEnvelope, maxTokens: number): Promise<string> {
    if (!this.memoryService) {
      return 'No episodic memory available.';
    }

    try {
      const episodes = await this.memoryService.queryEpisodic(
        task.correlationId,
        task.agentId,
        task.goal,
        maxTokens
      );

      if (episodes.length === 0) {
        return 'No relevant history found.';
      }

      // Format episodes
      const formatted = episodes.map(ep => {
        const date = new Date(ep.timestamp).toISOString().split('T')[0];
        return `[${date}] ${ep.type}: ${ep.content}`;
      });

      return this.truncateToTokens(formatted.join('\n'), maxTokens);
    } catch (error) {
      console.error('Failed to query episodic memory:', error);
      return 'Error loading episodic memory.';
    }
  }

  /**
   * Query L3 Semantic memory
   */
  private async querySemanticLayer(task: TaskEnvelope, maxTokens: number): Promise<string> {
    if (!this.memoryService) {
      return 'No semantic memory available.';
    }

    try {
      // Extract entities from task
      const entities = this.extractEntities(task.goal, task.inputs);

      const semanticEntities = await this.memoryService.querySemantic(
        entities,
        task.goal,
        maxTokens
      );

      if (semanticEntities.length === 0) {
        return 'No relevant knowledge found.';
      }

      // Format entities
      const formatted = semanticEntities.map(entity => {
        const relations = entity.relationships
          .map(r => `${entity.name} --[${r.relationship}]--> ${r.targetId}`)
          .join(', ');
        return `Entity: ${entity.name} (${entity.type}) | Relations: ${relations || 'none'}`;
      });

      return this.truncateToTokens(formatted.join('\n'), maxTokens);
    } catch (error) {
      console.error('Failed to query semantic memory:', error);
      return 'Error loading semantic memory.';
    }
  }

  /**
   * Query L5 Shared memory
   */
  private async querySharedLayer(task: TaskEnvelope, maxTokens: number): Promise<string> {
    if (!this.memoryService) {
      return 'No shared knowledge available.';
    }

    try {
      const domain = this.extractDomain(task.goal);

      const sharedKnowledge = await this.memoryService.queryShared(
        domain,
        task.agentId,
        maxTokens
      );

      if (sharedKnowledge.length === 0) {
        return 'No shared team knowledge found.';
      }

      // Format shared knowledge
      const formatted = sharedKnowledge.map(k => {
        const date = new Date(k.timestamp).toISOString().split('T')[0];
        return `[${date}] ${k.domain}: ${k.content}`;
      });

      return this.truncateToTokens(formatted.join('\n'), maxTokens);
    } catch (error) {
      console.error('Failed to query shared memory:', error);
      return 'Error loading shared knowledge.';
    }
  }

  /**
   * Query L6 Resources
   */
  private async queryResourcesLayer(task: TaskEnvelope, maxTokens: number): Promise<string> {
    if (!this.memoryService) {
      return 'No resource pointers available.';
    }

    try {
      const resources = await this.memoryService.queryResources(
        task.goal,
        maxTokens
      );

      if (resources.length === 0) {
        return 'No relevant artifacts found.';
      }

      // Filter by freshness
      const freshResources = resources.filter(r => r.freshnessScore > 0.3);

      // Format resources
      const formatted = freshResources.map(r => {
        const date = new Date(r.lastModified).toISOString().split('T')[0];
        return `${r.path} (${r.owner}, ${date}): ${r.summary}`;
      });

      return this.truncateToTokens(formatted.join('\n'), maxTokens);
    } catch (error) {
      console.error('Failed to query resources:', error);
      return 'Error loading resources.';
    }
  }

  /**
   * Extract entities from task goal and inputs
   */
  private extractEntities(goal: string, inputs: Record<string, unknown>): string[] {
    const entities: string[] = [];

    // Extract from goal (simple approach - look for capitalized words)
    const goalMatches = goal.match(/[A-Z][a-z]+/g);
    if (goalMatches) {
      entities.push(...goalMatches.slice(0, 10));
    }

    // Extract from inputs
    for (const value of Object.values(inputs)) {
      if (typeof value === 'string') {
        const matches = value.match(/[A-Z][a-z]+/g);
        if (matches) {
          entities.push(...matches.slice(0, 5));
        }
      }
    }

    return [...new Set(entities)].slice(0, 20);
  }

  /**
   * Extract domain from goal
   */
  private extractDomain(goal: string): string {
    // Simple domain extraction
    const domainKeywords: Record<string, string[]> = {
      'development': ['code', 'implement', 'build', 'create', 'file'],
      'testing': ['test', 'verify', 'validate', 'qa'],
      'security': ['security', 'vulnerability', 'scan', 'audit'],
      'infrastructure': ['deploy', 'infrastructure', 'config', 'docker'],
      'data': ['data', 'database', 'query', 'pipeline'],
      'analytics': ['analytics', 'metric', 'dashboard', 'report'],
    };

    const lowerGoal = goal.toLowerCase();

    for (const [domain, keywords] of Object.entries(domainKeywords)) {
      if (keywords.some(k => lowerGoal.includes(k))) {
        return domain;
      }
    }

    return 'general';
  }

  /**
   * Build task section (~25% budget)
   */
  private buildTaskSection(task: TaskEnvelope, budget: number): string {
    const lines = [
      `GOAL: ${task.goal}`,
      '',
    ];

    if (task.inputs && Object.keys(task.inputs).length > 0) {
      lines.push('INPUTS:');
      for (const [key, value] of Object.entries(task.inputs)) {
        lines.push(`  ${key}: ${JSON.stringify(value)}`);
      }
      lines.push('');
    }

    if (task.constraints) {
      lines.push('CONSTRAINTS:');
      lines.push(`  maxTokens: ${task.constraints.maxTokens}`);
      lines.push(`  maxLatency: ${task.constraints.maxLatency}ms`);
      if (task.constraints.allowedTools) {
        lines.push(`  allowedTools: ${task.constraints.allowedTools.join(', ')}`);
      }
    }

    return this.truncateToTokens(lines.join('\n'), budget);
  }

  /**
   * Build output format section (~100 tokens)
   */
  private buildOutputFormatSection(budget: number): string {
    const outputFormat = `Respond with a structured response containing:
- PLAN: Array of steps to achieve the goal
- ACTIONS: Array of tool calls to execute (each with tool name and parameters)
- CONFIDENCE: Number between 0 and 1 indicating confidence in the plan
- RISKS: Array of potential risks or concerns

Format your response as JSON with keys: plan, actions, confidence, risks`;

    return this.truncateToTokens(outputFormat, budget);
  }

  /**
   * Build buffer section (~5%)
   */
  private buildBufferSection(budget: number): string {
    return this.truncateToTokens('(Reserved for unexpected context needs)', budget);
  }

  /**
   * Truncate text to approximately fit token budget
   * (rough estimate: 1 token ≈ 4 characters)
   */
  private truncateToTokens(text: string, maxTokens: number): string {
    const maxChars = maxTokens * 4;
    if (text.length <= maxChars) {
      return text;
    }
    return text.slice(0, maxChars - 100) + '... [truncated]';
  }

  /**
   * Get cached context
   */
  getCachedContext(agentId: string, taskId: string): L1WorkingContext | undefined {
    return this.cache.get(`l1:${agentId}:${taskId}`);
  }

  /**
   * Clear cache
   */
  clearCache(agentId?: string, taskId?: string): void {
    if (!agentId && !taskId) {
      this.cache.clear();
    } else if (agentId && taskId) {
      this.cache.delete(`l1:${agentId}:${taskId}`);
    } else if (agentId) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(`l1:${agentId}:`)) {
          this.cache.delete(key);
        }
      }
    }
  }

  /**
   * Get current budget calculation
   */
  getBudgetCalculation(maxTokens?: number): TokenBudget {
    return this.calculateBudget(maxTokens);
  }
}

/**
 * Factory function to create ContextCompiler instance
 */
export function createContextCompiler(config?: Partial<ContextCompilerConfig>): ContextCompiler {
  return new ContextCompiler(config);
}
