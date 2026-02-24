/**
 * Project Context Component
 *
 * Loads PLATFORM.md, ARCHITECTURE.md, CONVENTIONS.md files for agent context.
 *
 * @module ProjectContext
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  ProjectContext,
  PlatformContext,
  ArchitectureContext,
  ConventionsContext,
  ChassisError,
} from '../types';

/**
 * Configuration for project context
 */
export interface ProjectContextConfig {
  contextBasePath: string;
  files: {
    platform: string;
    architecture: string;
    conventions: string;
  };
  maxTokensPerFile: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ProjectContextConfig = {
  contextBasePath: './docs',
  files: {
    platform: 'PLATFORM.md',
    architecture: 'ARCHITECTURE.md',
    conventions: 'CONVENTIONS.md',
  },
  maxTokensPerFile: 4000,
};

/**
 * Project Context Manager
 *
 * Responsibilities:
 * - Load and cache PLATFORM.md
 * - Load and cache ARCHITECTURE.md
 * - Load and cache CONVENTIONS.md
 * - Provide formatted context for LLM
 * - Handle file changes gracefully
 */
export class ProjectContextManager {
  private config: ProjectContextConfig;
  private context: ProjectContext | null = null;
  private loadedAt: Date | null = null;

  /**
   * Create a new ProjectContextManager instance
   */
  constructor(config: Partial<ProjectContextConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize by loading all context files
   */
  async initialize(): Promise<ProjectContext> {
    const [platform, architecture, conventions] = await Promise.all([
      this.loadFile('platform'),
      this.loadFile('architecture'),
      this.loadFile('conventions'),
    ]);

    this.context = {
      platform,
      architecture,
      conventions,
    };

    this.loadedAt = new Date();
    return this.context;
  }

  /**
   * Load a specific context file
   */
  private async loadFile(
    type: 'platform' | 'architecture' | 'conventions'
  ): Promise<PlatformContext | ArchitectureContext | ConventionsContext> {
    const filePath = path.join(this.config.contextBasePath, this.config.files[type]);

    if (!this.fileExists(filePath)) {
      // Return default empty context
      return this.getDefaultContext(type);
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');

      // Parse based on type
      switch (type) {
        case 'platform':
          return this.parsePlatformContext(content);
        case 'architecture':
          return this.parseArchitectureContext(content);
        case 'conventions':
          return this.parseConventionsContext(content);
      }
    } catch (error) {
      console.warn(`Failed to load ${type} context:`, error);
      return this.getDefaultContext(type);
    }
  }

  /**
   * Check if file exists
   */
  private fileExists(filePath: string): boolean {
    try {
      return fs.statSync(filePath).isFile();
    } catch {
      return false;
    }
  }

  /**
   * Parse PLATFORM.md content
   */
  private parsePlatformContext(content: string): PlatformContext {
    // Extract key sections from markdown
    const nameMatch = content.match(/^#\s+(.+)$/m);
    const versionMatch = content.match(/version:\s*(\S+)/i);
    const descMatch = content.match(/^##?\s+Overview\s*\n([\s\S]+?)(?=^##|\n$)/m);

    // Extract components list
    const componentsMatch = content.match(/##?\s+Components?\s*\n([\s\S]+?)(?=^##|\n$)/);

    return {
      name: nameMatch?.[1]?.trim() || 'Unknown Platform',
      version: versionMatch?.[1] || '1.0.0',
      description: descMatch?.[1]?.trim() || '',
      components: componentsMatch
        ? componentsMatch[1].split('\n').map(c => c.replace(/^[-*]\s+/, '').trim()).filter(Boolean)
        : [],
    };
  }

  /**
   * Parse ARCHITECTURE.md content
   */
  private parseArchitectureContext(content: string): ArchitectureContext {
    // Extract layers
    const layersMatch = content.match(/##?\s+Layers?\s*\n([\s\S]+?)(?=^##|\n$)/);
    const patternsMatch = content.match(/##?\s+Patterns?\s*\n([\s\S]+?)(?=^##|\n$)/);
    const integrationsMatch = content.match(/##?\s+Integrations?\s*\n([\s\S]+?)(?=^##|\n$)/);

    const parseSection = (match: RegExpMatchArray | null): string[] => {
      if (!match) return [];
      return match[1]
        .split('\n')
        .map(line => line.replace(/^[-*]\s+/, '').trim())
        .filter(Boolean);
    };

    return {
      layers: this.parseLayers(content),
      patterns: parseSection(patternsMatch),
      integrations: parseSection(integrationsMatch),
    };
  }

  /**
   * Parse layers from architecture content
   */
  private parseLayers(content: string): ArchitectureLayer[] {
    const layers: ArchitectureLayer[] = [];
    const layerRegex = /^##?\s+(Layer \d+):\s*(.+)$/gm;
    let match;

    while ((match = layerRegex.exec(content)) !== null) {
      const layerNum = match[1];
      const layerName = match[2];

      // Find content after this layer header until next ## or end
      const start = match.index + match[0].length;
      const end = content.indexOf('\n##', start);
      const layerContent = content.slice(start, end === -1 ? content.length : end);

      const components = layerContent
        .split('\n')
        .filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'))
        .map(line => line.replace(/^[-*]\s+/, '').trim())
        .filter(Boolean);

      layers.push({
        name: layerNum,
        purpose: layerName,
        components,
      });
    }

    return layers;
  }

  /**
   * Parse CONVENTIONS.md content
   */
  private parseConventionsContext(content: string): ConventionsContext {
    const codeStylesMatch = content.match(/##?\s+Code Style\s*\n([\s\S]+?)(?=^##|\n$)/);
    const namingMatch = content.match(/##?\s+Naming\s*\n([\s\S]+?)(?=^##|\n$)/);
    const bestPracticesMatch = content.match(/##?\s+Best Practices\s*\n([\s\S]+?)(?=^##|\n$)/);

    const parseKeyValue = (match: RegExpMatchArray | null): Record<string, string> => {
      const result: Record<string, string> = {};
      if (!match) return result;

      const lines = match[1].split('\n');
      for (const line of lines) {
        const kvMatch = line.match(/^[-*]\s+(\w+):\s*(.+)$/);
        if (kvMatch) {
          result[kvMatch[1].trim()] = kvMatch[2].trim();
        }
      }
      return result;
    };

    return {
      codeStyles: parseKeyValue(codeStylesMatch),
      namingConventions: parseKeyValue(namingMatch),
      bestPractices: bestPracticesMatch
        ? bestPracticesMatch[1].split('\n').map(l => l.replace(/^[-*]\s+/, '').trim()).filter(Boolean)
        : [],
    };
  }

  /**
   * Get default context for missing files
   */
  private getDefaultContext(
    type: 'platform' | 'architecture' | 'conventions'
  ): PlatformContext | ArchitectureContext | ConventionsContext {
    switch (type) {
      case 'platform':
        return {
          name: 'DA Platform',
          version: '1.0.0',
          description: 'AI-first analytics platform with multi-agent architecture',
          components: [],
        };
      case 'architecture':
        return {
          layers: [],
          patterns: [],
          integrations: [],
        };
      case 'conventions':
        return {
          codeStyles: {},
          namingConventions: {},
          bestPractices: [],
        };
    }
  }

  /**
   * Get current context
   */
  getContext(): ProjectContext | null {
    return this.context;
  }

  /**
   * Format context for LLM (within token budget)
   */
  formatForContext(maxTokens: number): string {
    if (!this.context) {
      return 'No project context available.';
    }

    const sections: string[] = [];
    let totalTokens = 0;

    // Platform section
    const platformText = this.formatPlatform(this.context.platform);
    const platformTokens = Math.ceil(platformText.length / 4);
    if (totalTokens + platformTokens <= maxTokens) {
      sections.push(platformText);
      totalTokens += platformTokens;
    }

    // Architecture section
    const archText = this.formatArchitecture(this.context.architecture);
    const archTokens = Math.ceil(archText.length / 4);
    if (totalTokens + archTokens <= maxTokens) {
      sections.push(archText);
      totalTokens += archTokens;
    }

    // Conventions section
    const convText = this.formatConventions(this.context.conventions);
    const convTokens = Math.ceil(convText.length / 4);
    if (totalTokens + convTokens <= maxTokens) {
      sections.push(convText);
    }

    return sections.join('\n\n---\n\n');
  }

  /**
   * Format platform context
   */
  private formatPlatform(platform: PlatformContext): string {
    return `## Platform: ${platform.name} (${platform.version})

${platform.description}

### Components
${platform.components.map(c => `- ${c}`).join('\n')}`;
  }

  /**
   * Format architecture context
   */
  private formatArchitecture(arch: ArchitectureContext): string {
    const layers = arch.layers
      .map(l => `- ${l.name}: ${l.purpose}`)
      .join('\n');

    const patterns = arch.patterns.length > 0
      ? `\n### Patterns\n${arch.patterns.map(p => `- ${p}`).join('\n')}`
      : '';

    return `## Architecture

### Layers
${layers}${patterns}`;
  }

  /**
   * Format conventions context
   */
  private formatConventions(conv: ConventionsContext): string {
    const sections: string[] = ['## Conventions'];

    if (conv.namingConventions && Object.keys(conv.namingConventions).length > 0) {
      sections.push('\n### Naming Conventions');
      for (const [key, value] of Object.entries(conv.namingConventions)) {
        sections.push(`- ${key}: ${value}`);
      }
    }

    if (conv.bestPractices && conv.bestPractices.length > 0) {
      sections.push('\n### Best Practices');
      sections.push(conv.bestPractices.map(p => `- ${p}`).join('\n'));
    }

    return sections.join('\n');
  }

  /**
   * Get last load timestamp
   */
  getLastLoadedAt(): Date | null {
    return this.loadedAt;
  }

  /**
   * Reload context from files
   */
  async reload(): Promise<ProjectContext> {
    return this.initialize();
  }

  /**
   * Shutdown
   */
  async shutdown(): Promise<void> {
    this.context = null;
    this.loadedAt = null;
  }
}

/**
 * Factory function to create ProjectContextManager instance
 */
export function createProjectContext(config?: Partial<ProjectContextConfig>): ProjectContextManager {
  return new ProjectContextManager(config);
}

// Type for parsed architecture layers
interface ArchitectureLayer {
  name: string;
  purpose: string;
  components: string[];
}
