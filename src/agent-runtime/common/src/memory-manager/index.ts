/**
 * Memory Manager Component
 *
 * Manages all 6 memory layers: read, write, sync, and prune operations.
 *
 * L1: Working Context (managed by Context Compiler)
 * L2: Episodic - Timestamped interactions, decisions, tool calls
 * L3: Semantic - Facts, entities, relationships, rules
 * L4: Procedural - Versioned prompts, skills, procedures
 * L5: Shared - Cross-agent knowledge
 * L6: Resource - Indexed pointers to artifacts
 *
 * @module MemoryManager
 */

import { v4 as uuidv4 } from 'uuid';
import {
  MemoryEpisode,
  SemanticEntity,
  SharedKnowledge,
  ResourcePointer,
  ChassisError,
  L1WorkingContext,
} from '../types';

/**
 * Configuration for memory manager
 */
export interface MemoryConfig {
  // L2 Episodic settings
  episodicRetentionDays: number;
  maxEpisodesPerAgent: number;

  // L3 Semantic settings
  semanticRetentionDays: number;
  maxEntitiesPerAgent: number;

  // L5 Shared settings
  sharedRetentionDays: number;
  maxSharedPerDomain: number;

  // L6 Resource settings
  resourceRetentionDays: number;
  freshnessDecayDays: number;
  minFreshnessScore: number;

  // Cache settings
  enableCache: boolean;
  cacheTtlMs: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: MemoryConfig = {
  episodicRetentionDays: 90,
  maxEpisodesPerAgent: 10000,
  semanticRetentionDays: 365,
  maxEntitiesPerAgent: 5000,
  sharedRetentionDays: 180,
  maxSharedPerDomain: 1000,
  resourceRetentionDays: 90,
  freshnessDecayDays: 90,
  minFreshnessScore: 0.3,
  enableCache: true,
  cacheTtlMs: 300000, // 5 minutes
};

/**
 * Memory layer interfaces (to be implemented with actual storage)
 */
export interface EpisodicStorage {
  write(episode: MemoryEpisode): Promise<void>;
  query(correlationId: string, agentId: string, goal: string, limit: number): Promise<MemoryEpisode[]>;
  prune(olderThan: Date, agentId?: string): Promise<number>;
  count(agentId: string): Promise<number>;
}

export interface SemanticStorage {
  write(entity: SemanticEntity): Promise<void>;
  query(entities: string[], goal: string, limit: number): Promise<SemanticEntity[]>;
  prune(olderThan: Date): Promise<number>;
}

export interface SharedStorage {
  write(knowledge: SharedKnowledge): Promise<void>;
  query(domain: string, agentId: string, limit: number): Promise<SharedKnowledge[]>;
  prune(olderThan: Date): Promise<number>;
}

export interface ResourceStorage {
  write(pointer: ResourcePointer): Promise<void>;
  query(goal: string, minFreshness: number, limit: number): Promise<ResourcePointer[]>;
  prune(olderThan: Date): Promise<number>;
}

/**
 * Memory Manager
 *
 * Responsibilities:
 * - Coordinate read/write operations across all 6 layers
 * - Handle memory sync between layers
 * - Implement pruning strategies
 * - Maintain cache for frequently accessed data
 */
export class MemoryManager {
  private config: MemoryConfig;
  private episodicStorage: EpisodicStorage | null = null;
  private semanticStorage: SemanticStorage | null = null;
  private sharedStorage: SharedStorage | null = null;
  private resourceStorage: ResourceStorage | null = null;
  private cache: Map<string, { data: unknown; expiresAt: number }> = new Map();

  /**
   * Create a new MemoryManager instance
   */
  constructor(config: Partial<MemoryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Set storage implementations
   */
  setStorages(storages: {
    episodic?: EpisodicStorage;
    semantic?: SemanticStorage;
    shared?: SharedStorage;
    resource?: ResourceStorage;
  }): void {
    if (storages.episodic) this.episodicStorage = storages.episodic;
    if (storages.semantic) this.semanticStorage = storages.semantic;
    if (storages.shared) this.sharedStorage = storages.shared;
    if (storages.resource) this.resourceStorage = storages.resource;
  }

  // ===========================================================================
  // L2 Episodic Operations
  // ===========================================================================

  /**
   * Write to episodic memory (L2)
   * Called after every LLM interaction
   */
  async writeEpisodic(
    correlationId: string,
    agentId: string,
    content: string,
    type: 'interaction' | 'decision' | 'tool_call',
    metadata?: Record<string, unknown>
  ): Promise<MemoryEpisode> {
    const episode: MemoryEpisode = {
      memoryId: uuidv4(),
      correlationId,
      agentId,
      timestamp: new Date(),
      content,
      type,
      importance: this.calculateImportance(type),
      // Embedding would be generated here in production
    };

    if (this.episodicStorage) {
      await this.episodicStorage.write(episode);
    }

    // Invalidate cache
    this.invalidateCache(`episodic:${agentId}:${correlationId}`);

    return episode;
  }

  /**
   * Query episodic memory (L2)
   */
  async queryEpisodic(
    correlationId: string,
    agentId: string,
    goal: string,
    maxTokens: number
  ): Promise<MemoryEpisode[]> {
    const cacheKey = `episodic:${agentId}:${correlationId}`;
    const cached = this.getFromCache<MemoryEpisode[]>(cacheKey);
    if (cached) {
      return cached;
    }

    if (!this.episodicStorage) {
      return [];
    }

    // Estimate max episodes based on token budget (~500 tokens per episode)
    const maxEpisodes = Math.floor(maxTokens / 500);

    const episodes = await this.episodicStorage.query(
      correlationId,
      agentId,
      goal,
      maxEpisodes
    );

    // Sort by recency, relevance, importance (Section 12.3)
    const ranked = this.rankEpisodes(episodes, goal);

    // Truncate to budget
    const truncated = this.truncateEpisodes(ranked, maxTokens);

    if (this.config.enableCache) {
      this.setCache(cacheKey, truncated);
    }

    return truncated;
  }

  /**
   * Prune old episodic memories
   */
  async pruneEpisodic(agentId?: string): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.episodicRetentionDays);

    if (!this.episodicStorage) {
      return 0;
    }

    return this.episodicStorage.prune(cutoffDate, agentId);
  }

  // ===========================================================================
  // L3 Semantic Operations
  // ===========================================================================

  /**
   * Write to semantic memory (L3)
   * Called when new facts are discovered
   */
  async writeSemantic(
    agentId: string,
    name: string,
    type: string,
    properties: Record<string, unknown>,
    relationships: { targetId: string; relationship: string }[]
  ): Promise<SemanticEntity> {
    const entity: SemanticEntity = {
      entityId: uuidv4(),
      name,
      type,
      properties,
      relationships,
      // Embedding would be generated here in production
    };

    if (this.semanticStorage) {
      await this.semanticStorage.write(entity);
    }

    this.invalidateCache(`semantic:${agentId}`);

    return entity;
  }

  /**
   * Query semantic memory (L3)
   */
  async querySemantic(
    entities: string[],
    goal: string,
    maxTokens: number
  ): Promise<SemanticEntity[]> {
    const cacheKey = `semantic:${entities.join(',')}`;
    const cached = this.getFromCache<SemanticEntity[]>(cacheKey);
    if (cached) {
      return cached;
    }

    if (!this.semanticStorage) {
      return [];
    }

    // Estimate max entities (~300 tokens per entity)
    const maxEntities = Math.floor(maxTokens / 300);

    const semanticEntities = await this.semanticStorage.query(
      entities,
      goal,
      maxEntities
    );

    if (this.config.enableCache) {
      this.setCache(cacheKey, semanticEntities);
    }

    return semanticEntities;
  }

  /**
   * Prune old semantic memories
   */
  async pruneSemantic(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.semanticRetentionDays);

    if (!this.semanticStorage) {
      return 0;
    }

    return this.semanticStorage.prune(cutoffDate);
  }

  // ===========================================================================
  // L5 Shared Knowledge Operations
  // ===========================================================================

  /**
   * Write to shared knowledge (L5)
   * Called when cross-agent relevant information is discovered
   */
  async writeShared(
    domain: string,
    content: string,
    contributors: string[]
  ): Promise<SharedKnowledge> {
    const knowledge: SharedKnowledge = {
      knowledgeId: uuidv4(),
      domain,
      content,
      contributors,
      timestamp: new Date(),
    };

    if (this.sharedStorage) {
      await this.sharedStorage.write(knowledge);
    }

    this.invalidateCache(`shared:${domain}`);

    return knowledge;
  }

  /**
   * Query shared knowledge (L5)
   */
  async queryShared(
    domain: string,
    agentId: string,
    maxTokens: number
  ): Promise<SharedKnowledge[]> {
    const cacheKey = `shared:${domain}:${agentId}`;
    const cached = this.getFromCache<SharedKnowledge[]>(cacheKey);
    if (cached) {
      return cached;
    }

    if (!this.sharedStorage) {
      return [];
    }

    // Estimate max entries (~400 tokens per entry)
    const maxEntries = Math.floor(maxTokens / 400);

    const sharedKnowledge = await this.sharedStorage.query(
      domain,
      agentId,
      maxEntries
    );

    // Sort by timestamp (newest first)
    const sorted = sharedKnowledge.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    if (this.config.enableCache) {
      this.setCache(cacheKey, sorted);
    }

    return sorted;
  }

  /**
   * Prune old shared knowledge
   */
  async pruneShared(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.sharedRetentionDays);

    if (!this.sharedStorage) {
      return 0;
    }

    return this.sharedStorage.prune(cutoffDate);
  }

  // ===========================================================================
  // L6 Resource Pointer Operations
  // ===========================================================================

  /**
   * Register artifact in resource index (L6)
   */
  async registerResource(
    path: string,
    summary: string,
    owner: string
  ): Promise<ResourcePointer> {
    const pointer: ResourcePointer = {
      resourceId: uuidv4(),
      path,
      summary,
      owner,
      lastModified: new Date(),
      freshnessScore: 1.0, // Freshly created
    };

    if (this.resourceStorage) {
      await this.resourceStorage.write(pointer);
    }

    this.invalidateCache('resources:*');

    return pointer;
  }

  /**
   * Update resource freshness (on artifact modification)
   */
  async updateResourceFreshness(path: string): Promise<void> {
    // This would typically update the lastModified and reset freshnessScore
    // Implementation depends on storage
    this.invalidateCache('resources:*');
  }

  /**
   * Query resources (L6)
   */
  async queryResources(
    goal: string,
    maxTokens: number
  ): Promise<ResourcePointer[]> {
    const cacheKey = `resources:${goal.slice(0, 50)}`;
    const cached = this.getFromCache<ResourcePointer[]>(cacheKey);
    if (cached) {
      return cached;
    }

    if (!this.resourceStorage) {
      return [];
    }

    // Estimate max resources (~200 tokens per resource)
    const maxResources = Math.floor(maxTokens / 200);

    const resources = await this.resourceStorage.query(
      goal,
      this.config.minFreshnessScore,
      maxResources
    );

    // Sort by freshness
    const sorted = resources.sort((a, b) => b.freshnessScore - a.freshnessScore);

    if (this.config.enableCache) {
      this.setCache(cacheKey, sorted);
    }

    return sorted;
  }

  /**
   * Prune old resources
   */
  async pruneResources(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.resourceRetentionDays);

    if (!this.resourceStorage) {
      return 0;
    }

    return this.resourceStorage.prune(cutoffDate);
  }

  // ===========================================================================
  // Memory Sync
  // ===========================================================================

  /**
   * Sync memory across layers
   * Called periodically or on significant events
   */
  async syncMemory(agentId: string): Promise<void> {
    // Prune old memories across all layers
    await Promise.all([
      this.pruneEpisodic(agentId),
      this.pruneSemantic(),
      this.pruneShared(),
      this.pruneResources(),
    ]);
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Calculate importance based on memory type
   */
  private calculateImportance(type: 'interaction' | 'decision' | 'tool_call'): number {
    switch (type) {
      case 'tool_call':
        return 1.0;
      case 'decision':
        return 0.8;
      case 'interaction':
        return 0.5;
    }
  }

  /**
   * Rank episodes by recency, relevance, and importance (Section 12.3)
   */
  private rankEpisodes(episodes: MemoryEpisode[], goal: string): MemoryEpisode[] {
    const now = new Date();
    const halfLifeDays = 7;

    return episodes.map(ep => {
      const ageDays = (now.getTime() - new Date(ep.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      const recency = Math.exp(-ageDays / halfLifeDays);

      // Simple relevance: does episode content match goal keywords
      const goalLower = goal.toLowerCase();
      const contentLower = ep.content.toLowerCase();
      const relevance = goalLower.split(' ').filter(w => w.length > 3).some(w => contentLower.includes(w))
        ? 1.0
        : 0.5;

      // Weighted score: recency(0.4) × relevance(0.4) × importance(0.2)
      const score = recency * 0.4 + relevance * 0.4 + ep.importance * 0.2;

      return { ...ep, importance: score };
    }).sort((a, b) => b.importance - a.importance);
  }

  /**
   * Truncate episodes to fit token budget
   */
  private truncateEpisodes(episodes: MemoryEpisode[], maxTokens: number): MemoryEpisode[] {
    let currentTokens = 0;
    const result: MemoryEpisode[] = [];

    for (const ep of episodes) {
      const epTokens = Math.ceil(ep.content.length / 4);
      if (currentTokens + epTokens <= maxTokens) {
        result.push(ep);
        currentTokens += epTokens;
      } else if (result.length > 0) {
        // Always keep at least one, even if it exceeds budget
        break;
      }
    }

    return result;
  }

  /**
   * Calculate freshness score (Section 8.3)
   */
  calculateFreshnessScore(lastModified: Date): number {
    const now = new Date();
    const ageDays = (now.getTime() - new Date(lastModified).getTime()) / (1000 * 60 * 60 * 24);

    if (ageDays <= 7) return 1.0;
    if (ageDays >= this.config.freshnessDecayDays) return 0.0;

    return 1.0 - (ageDays - 7) / (this.config.freshnessDecayDays - 7);
  }

  // ===========================================================================
  // Cache Operations
  // ===========================================================================

  private getFromCache<T>(key: string): T | null {
    if (!this.config.enableCache) return null;

    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  private setCache(key: string, data: unknown): void {
    if (!this.config.enableCache) return;

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + this.config.cacheTtlMs,
    });
  }

  private invalidateCache(pattern: string): void {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.delete(pattern);
    }
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Shutdown
   */
  async shutdown(): Promise<void> {
    this.cache.clear();
    this.episodicStorage = null;
    this.semanticStorage = null;
    this.sharedStorage = null;
    this.resourceStorage = null;
  }
}

/**
 * Factory function to create MemoryManager instance
 */
export function createMemoryManager(config?: Partial<MemoryConfig>): MemoryManager {
  return new MemoryManager(config);
}
