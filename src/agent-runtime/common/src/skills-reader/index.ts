/**
 * Skills Reader Component
 *
 * Loads SKILL.md files before acting - supports platform, domain, and learned skills.
 *
 * @module SkillsReader
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  Skill,
  SkillsManifest,
  ChassisError,
} from '../types';

/**
 * Configuration for skills reader
 */
export interface SkillsConfig {
  skillsBasePath: string;
  maxSkillsTokens: number;
  enableVersionPinning: boolean;
  defaultVersion: string;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: SkillsConfig = {
  skillsBasePath: './skills',
  maxSkillsTokens: 10000,
  enableVersionPinning: true,
  defaultVersion: 'latest',
};

/**
 * Skill types
 */
export type SkillType = 'platform' | 'domain' | 'learned';

/**
 * Skills Reader
 *
 * Responsibilities:
 * - Discover and load skill files (SKILL.md)
 * - Support version pinning from TaskPins
 * - Manage platform, domain, and learned skills
 * - Provide skills content within token budget
 */
export class SkillsReader {
  private config: SkillsConfig;
  private loadedSkills: Map<string, Skill> = new Map();
  private skillsManifest: SkillsManifest | null = null;
  private agentId: string = '';

  /**
   * Create a new SkillsReader instance
   */
  constructor(config: Partial<SkillsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize with agent ID and base path
   */
  async initialize(agentId: string): Promise<SkillsManifest> {
    this.agentId = agentId;
    this.loadedSkills.clear();

    // Load platform skills (shared across all agents)
    await this.loadSkillType('platform');

    // Load domain-specific skills
    await this.loadSkillType('domain');

    // Load agent-specific learned skills
    await this.loadLearnedSkills();

    return this.buildManifest();
  }

  /**
   * Load skills of a specific type
   */
  private async loadSkillType(type: SkillType): Promise<void> {
    const basePath = path.join(this.config.skillsBasePath, type);

    if (!this.directoryExists(basePath)) {
      return;
    }

    try {
      const entries = fs.readdirSync(basePath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile() && entry.name === 'SKILL.md') {
          const skillPath = path.join(basePath, entry.name);
          const skill = await this.loadSkillFile(skillPath, type);
          this.loadedSkills.set(`${type}:${path.basename(basePath)}`, skill);
        }
      }
    } catch (error) {
      console.warn(`Failed to load ${type} skills:`, error);
    }
  }

  /**
   * Load learned skills specific to this agent
   */
  private async loadLearnedSkills(): Promise<void> {
    const learnedPath = path.join(this.config.skillsBasePath, 'learned', this.agentId);

    if (!this.directoryExists(learnedPath)) {
      return;
    }

    try {
      const entries = fs.readdirSync(learnedPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile() && entry.name === 'SKILL.md') {
          const skillPath = path.join(learnedPath, entry.name);
          const skill = await this.loadSkillFile(skillPath, 'learned', entry.name);
          this.loadedSkills.set(`learned:${this.agentId}:${entry.name}`, skill);
        }
      }
    } catch (error) {
      console.warn(`Failed to load learned skills:`, error);
    }
  }

  /**
   * Load a single skill file
   */
  private async loadSkillFile(
    filePath: string,
    type: SkillType,
    name?: string
  ): Promise<Skill> {
    const content = fs.readFileSync(filePath, 'utf-8');

    return {
      skillId: `${type}:${name || path.basename(path.dirname(filePath))}`,
      name: name || path.basename(path.dirname(filePath)),
      version: this.config.defaultVersion,
      type,
      content,
      loadedAt: new Date(),
    };
  }

  /**
   * Check if directory exists
   */
  private directoryExists(dirPath: string): boolean {
    try {
      return fs.statSync(dirPath).isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Get skills with optional version pinning
   */
  getSkills(version?: string): Skill[] {
    const targetVersion = version || this.config.defaultVersion;

    return Array.from(this.loadedSkills.values())
      .filter(skill => skill.version === targetVersion || skill.version === 'latest');
  }

  /**
   * Get skills formatted for LLM context
   */
  formatSkillsForContext(maxTokens: number): string {
    const skills = this.getSkills();
    let totalTokens = 0;
    const selectedSkills: string[] = [];

    // Prioritize: platform > domain > learned
    const priority: SkillType[] = ['platform', 'domain', 'learned'];

    const sortedSkills = [...skills].sort((a, b) => {
      const aIdx = priority.indexOf(a.type);
      const bIdx = priority.indexOf(b.type);
      return aIdx - bIdx;
    });

    for (const skill of sortedSkills) {
      // Estimate tokens (rough: 1 token ≈ 4 characters)
      const skillTokens = Math.ceil(skill.content.length / 4);

      if (totalTokens + skillTokens <= maxTokens) {
        selectedSkills.push(`## ${skill.name} (${skill.type})\n${skill.content}`);
        totalTokens += skillTokens;
      }
    }

    return selectedSkills.join('\n\n---\n\n');
  }

  /**
   * Get a specific skill by ID
   */
  getSkill(skillId: string): Skill | undefined {
    return this.loadedSkills.get(skillId);
  }

  /**
   * Build and cache skills manifest
   */
  private buildManifest(): SkillsManifest {
    const skills = Array.from(this.loadedSkills.values());
    const totalTokens = skills.reduce((sum, s) => sum + Math.ceil(s.content.length / 4), 0);

    this.skillsManifest = {
      skills,
      loadedAt: new Date(),
      totalTokens,
    };

    return this.skillsManifest;
  }

  /**
   * Get current manifest
   */
  getManifest(): SkillsManifest | null {
    return this.skillsManifest;
  }

  /**
   * Reload skills from disk
   */
  async reload(): Promise<SkillsManifest> {
    return this.initialize(this.agentId);
  }

  /**
   * Get skill count by type
   */
  getSkillCount(): Record<SkillType, number> {
    const counts: Record<SkillType, number> = {
      platform: 0,
      domain: 0,
      learned: 0,
    };

    for (const skill of this.loadedSkills.values()) {
      counts[skill.type]++;
    }

    return counts;
  }

  /**
   * Shutdown - clean up
   */
  async shutdown(): Promise<void> {
    this.loadedSkills.clear();
    this.skillsManifest = null;
  }
}

/**
 * Factory function to create SkillsReader instance
 */
export function createSkillsReader(config?: Partial<SkillsConfig>): SkillsReader {
  return new SkillsReader(config);
}
