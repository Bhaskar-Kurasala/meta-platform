/**
 * Plugin Manager Component
 *
 * Runtime extensibility for tools, knowledge, and workflows.
 *
 * @module PluginManager
 */

import {
  Plugin,
  PluginContext,
  PluginResult,
  ChassisError,
} from '../types';

/**
 * Configuration for plugin manager
 */
export interface PluginManagerConfig {
  pluginDirectory: string;
  autoLoad: boolean;
  isolatedExecution: boolean;
  enableHooks: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: PluginManagerConfig = {
  pluginDirectory: './plugins',
  autoLoad: true,
  isolatedExecution: true,
  enableHooks: true,
};

/**
 * Plugin lifecycle hooks
 */
export interface PluginHooks {
  onTaskStart?: (context: PluginContext) => Promise<void>;
  onTaskEnd?: (context: PluginContext, result: PluginResult) => Promise<void>;
  onActionExecute?: (action: unknown) => Promise<void>;
  onActionComplete?: (action: unknown, result: unknown) => Promise<void>;
  onError?: (error: Error) => Promise<void>;
}

/**
 * Plugin Manager
 *
 * Responsibilities:
 * - Discover and load plugins
 * - Manage plugin lifecycle
 * - Execute plugins in isolation
 * - Handle plugin hooks
 */
export class PluginManager {
  private config: PluginManagerConfig;
  private plugins: Map<string, Plugin> = new Map();
  private hooks: PluginHooks = {};
  private initialized = false;

  /**
   * Create a new PluginManager instance
   */
  constructor(config: Partial<PluginManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Set plugin lifecycle hooks
   */
  setHooks(hooks: PluginHooks): void {
    this.hooks = { ...this.hooks, ...hooks };
  }

  /**
   * Initialize and load plugins
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.config.autoLoad) {
      await this.discoverPlugins();
    }

    this.initialized = true;
  }

  /**
   * Discover plugins from plugin directory
   */
  private async discoverPlugins(): Promise<void> {
    // In production, this would scan the plugin directory
    // For now, we'll load plugins programmatically
    console.log(`Discovering plugins in ${this.config.pluginDirectory}...`);
  }

  /**
   * Register a plugin
   */
  async register(plugin: Plugin): Promise<void> {
    if (this.plugins.has(plugin.id)) {
      throw new ChassisError(
        `Plugin already registered: ${plugin.id}`,
        'PLUGIN_EXISTS',
        'PluginManager'
      );
    }

    // Initialize plugin
    await plugin.initialize();

    this.plugins.set(plugin.id, plugin);
  }

  /**
   * Unregister a plugin
   */
  async unregister(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);

    if (!plugin) {
      return false;
    }

    // Call shutdown if available
    if (plugin.shutdown) {
      await plugin.shutdown();
    }

    return this.plugins.delete(pluginId);
  }

  /**
   * Get plugin by ID
   */
  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get all plugins
   */
  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugins by type
   */
  getPluginsByType(type: Plugin['type']): Plugin[] {
    return Array.from(this.plugins.values()).filter(p => p.type === type);
  }

  /**
   * Execute a plugin
   */
  async execute(pluginId: string, context: PluginContext): Promise<PluginResult> {
    const plugin = this.plugins.get(pluginId);

    if (!plugin) {
      throw new ChassisError(
        `Plugin not found: ${pluginId}`,
        'PLUGIN_NOT_FOUND',
        'PluginManager'
      );
    }

    try {
      const result = await plugin.execute(context);

      // Call onTaskEnd hook if enabled
      if (this.config.enableHooks && this.hooks.onTaskEnd) {
        await this.hooks.onTaskEnd(context, result);
      }

      return result;
    } catch (error) {
      // Call onError hook
      if (this.config.enableHooks && this.hooks.onError) {
        await this.hooks.onError(error instanceof Error ? error : new Error(String(error)));
      }

      throw error;
    }
  }

  /**
   * Execute all plugins of a specific type
   */
  async executeAll(type: Plugin['type'], context: PluginContext): Promise<PluginResult[]> {
    const plugins = this.getPluginsByType(type);
    const results: PluginResult[] = [];

    for (const plugin of plugins) {
      try {
        const result = await plugin.execute(context);
        results.push(result);
      } catch (error) {
        console.error(`Plugin ${plugin.id} failed:`, error);
      }
    }

    return results;
  }

  /**
   * Check if plugin is registered
   */
  hasPlugin(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * Get plugin count
   */
  getPluginCount(): number {
    return this.plugins.size;
  }

  /**
   * Call onTaskStart hook
   */
  async triggerTaskStart(context: PluginContext): Promise<void> {
    if (this.config.enableHooks && this.hooks.onTaskStart) {
      await this.hooks.onTaskStart(context);
    }
  }

  /**
   * Call onActionExecute hook
   */
  async triggerActionExecute(action: unknown): Promise<void> {
    if (this.config.enableHooks && this.hooks.onActionExecute) {
      await this.hooks.onActionExecute(action);
    }
  }

  /**
   * Call onActionComplete hook
   */
  async triggerActionComplete(action: unknown, result: unknown): Promise<void> {
    if (this.config.enableHooks && this.hooks.onActionComplete) {
      await this.hooks.onActionComplete(action, result);
    }
  }

  /**
   * Shutdown all plugins
   */
  async shutdown(): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.shutdown) {
        try {
          await plugin.shutdown();
        } catch (error) {
          console.error(`Plugin ${plugin.id} shutdown failed:`, error);
        }
      }
    }

    this.plugins.clear();
    this.hooks = {};
    this.initialized = false;
  }
}

/**
 * Factory function to create PluginManager instance
 */
export function createPluginManager(config?: Partial<PluginManagerConfig>): PluginManager {
  return new PluginManager(config);
}
