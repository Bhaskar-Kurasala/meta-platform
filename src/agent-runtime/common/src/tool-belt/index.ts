/**
 * Tool Belt (MCP) Component
 *
 * Connects to domain-specific MCP servers via Tool Gateway.
 *
 * @module ToolBelt
 */

import {
  ToolCall,
  ToolResult,
  MCPServer,
  MCPTool,
  ChassisError,
  ToolExecutionError,
} from '../types';

/**
 * Configuration for tool belt
 */
export interface ToolBeltConfig {
  toolGatewayUrl: string;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
  enableSchemaValidation: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ToolBeltConfig = {
  toolGatewayUrl: 'localhost:50051',
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
  enableSchemaValidation: true,
};

/**
 * Tool Gateway client interface
 */
export interface ToolGatewayClient {
  callTool(toolCall: ToolCall): Promise<ToolResult>;
  listTools(serverId?: string): Promise<MCPTool[]>;
  getServerStatus(serverId: string): Promise<MCPServer>;
}

/**
 * Tool metadata
 */
export interface ToolMetadata {
  toolId: string;
  name: string;
  description: string;
  serverId: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  permissions?: string[];
}

/**
 * Tool Belt (MCP)
 *
 * Responsibilities:
 * - Connect to MCP servers via Tool Gateway
 * - Manage available tools
 * - Route tool calls to appropriate servers
 * - Handle tool execution with retries
 */
export class ToolBelt {
  private config: ToolBeltConfig;
  private tools: Map<string, ToolMetadata> = new Map();
  private servers: Map<string, MCPServer> = new Map();
  private client: ToolGatewayClient | null = null;

  /**
   * Create a new ToolBelt instance
   */
  constructor(config: Partial<ToolBeltConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Set tool gateway client
   */
  setClient(client: ToolGatewayClient): void {
    this.client = client;
  }

  /**
   * Initialize by discovering available tools
   */
  async initialize(): Promise<void> {
    if (!this.client) {
      // Use mock client for development
      console.warn('ToolGatewayClient not set, using mock tool belt');
      return;
    }

    try {
      // Discover all available tools
      const tools = await this.client.listTools();

      for (const tool of tools) {
        this.registerTool({
          toolId: tool.toolId,
          name: tool.name,
          description: tool.description,
          serverId: '', // Will be set per server
          inputSchema: tool.inputSchema,
          outputSchema: tool.outputSchema,
        });
      }
    } catch (error) {
      console.error('Failed to initialize tool belt:', error);
    }
  }

  /**
   * Register a tool
   */
  registerTool(tool: ToolMetadata): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Unregister a tool
   */
  unregisterTool(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Get tool by name
   */
  getTool(name: string): ToolMetadata | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all available tools
   */
  getAllTools(): ToolMetadata[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools by server
   */
  getToolsByServer(serverId: string): ToolMetadata[] {
    return Array.from(this.tools.values()).filter(t => t.serverId === serverId);
  }

  /**
   * Get tool names
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Execute a tool call
   */
  async executeTool(toolCall: ToolCall): Promise<ToolResult> {
    const tool = this.tools.get(toolCall.toolName);

    if (!tool) {
      throw new ToolExecutionError(
        `Tool not found: ${toolCall.toolName}`,
        toolCall.toolName
      );
    }

    // Validate input schema
    if (this.config.enableSchemaValidation && tool.inputSchema) {
      this.validateInput(toolCall.parameters, tool.inputSchema);
    }

    // Execute with retries
    let lastError: Error | undefined;
    const retryPolicy = toolCall.retryPolicy || {
      maxRetries: this.config.maxRetries,
      backoffMs: this.config.retryDelay,
      exponentialBackoff: true,
    };

    for (let attempt = 0; attempt <= retryPolicy.maxRetries; attempt++) {
      try {
        const startTime = Date.now();

        if (this.client) {
          const result = await this.client.callTool(toolCall);
          return {
            ...result,
            latencyMs: Date.now() - startTime,
          };
        }

        // Mock execution if no client
        return await this.mockExecute(toolCall);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < retryPolicy.maxRetries) {
          const delay = retryPolicy.exponentialBackoff
            ? retryPolicy.backoffMs * Math.pow(2, attempt)
            : retryPolicy.backoffMs;

          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new ToolExecutionError(
      `Tool execution failed after ${retryPolicy.maxRetries + 1} attempts: ${lastError?.message}`,
      toolCall.toolName
    );
  }

  /**
   * Execute tool with validation
   */
  async execute(name: string, parameters: Record<string, unknown>): Promise<ToolResult> {
    return this.executeTool({
      toolId: `${name}-${Date.now()}`,
      toolName: name,
      parameters,
    });
  }

  /**
   * Mock tool execution for development
   */
  private async mockExecute(toolCall: ToolCall): Promise<ToolResult> {
    // Simulate execution delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      toolId: toolCall.toolId,
      toolName: toolCall.toolName,
      status: 'success',
      output: { mock: true, parameters: toolCall.parameters },
      latencyMs: 100,
      rollbackAvailable: false,
    };
  }

  /**
   * Validate input against schema
   */
  private validateInput(
    parameters: Record<string, unknown>,
    schema: Record<string, unknown>
  ): void {
    // Simple validation - check required fields
    const required = (schema.required as string[]) || [];

    for (const field of required) {
      if (!(field in parameters)) {
        throw new ToolExecutionError(
          `Missing required parameter: ${field}`,
          ''
        );
      }
    }
  }

  /**
   * Check if tool exists
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get tool count
   */
  getToolCount(): number {
    return this.tools.size;
  }

  /**
   * Search tools by name pattern
   */
  searchTools(pattern: string): ToolMetadata[] {
    const regex = new RegExp(pattern, 'i');
    return Array.from(this.tools.values()).filter(t =>
      regex.test(t.name) || regex.test(t.description)
    );
  }

  /**
   * Shutdown
   */
  async shutdown(): Promise<void> {
    this.tools.clear();
    this.servers.clear();
    this.client = null;
  }
}

/**
 * Factory function to create ToolBelt instance
 */
export function createToolBelt(config?: Partial<ToolBeltConfig>): ToolBelt {
  return new ToolBelt(config);
}
