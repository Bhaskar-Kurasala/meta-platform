/**
 * Action Executor Component
 *
 * Sandboxed tool execution with rollback capability.
 *
 * @module ActionExecutor
 */

import {
  Action,
  ToolCall,
  ToolResult,
  ChassisError,
  ToolExecutionError,
} from '../types';

/**
 * Configuration for action executor
 */
export interface ActionExecutorConfig {
  timeout: number;
  maxRetries: number;
  enableSandbox: boolean;
  enableRollback: boolean;
  sandboxProfile?: SandboxProfile;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ActionExecutorConfig = {
  timeout: 30000,
  maxRetries: 3,
  enableSandbox: true,
  enableRollback: true,
};

/**
 * Sandbox profile
 */
export interface SandboxProfile {
  allowedPaths: string[];
  allowedNetwork: boolean;
  allowedCommands: string[];
  maxMemoryMb: number;
  maxCpuPercent: number;
}

/**
 * Execution result
 */
export interface ExecutionResult {
  action: Action;
  result: ToolResult;
  rollbackAvailable: boolean;
  rollbackAction?: Action;
  executionTimeMs: number;
}

/**
 * Rollback handler
 */
export interface RollbackHandler {
  canRollback(action: Action, result: ToolResult): boolean;
  createRollbackAction(action: Action, result: ToolResult): Action | undefined;
  execute(rollbackAction: Action): Promise<ToolResult>;
}

/**
 * Action Executor
 *
 * Responsibilities:
 * - Execute actions in sandboxed environment
 * - Handle timeouts and errors
 * - Manage rollback capability
 * - Validate results
 */
export class ActionExecutor {
  private config: ActionExecutorConfig;
  private toolBelt: any = null; // ToolBelt reference
  private executionHistory: ExecutionResult[] = [];
  private rollbackHandlers: RollbackHandler[] = [];

  /**
   * Create a new ActionExecutor instance
   */
  constructor(config: Partial<ActionExecutorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Set tool belt
   */
  setToolBelt(toolBelt: any): void {
    this.toolBelt = toolBelt;
  }

  /**
   * Register rollback handler
   */
  registerRollbackHandler(handler: RollbackHandler): void {
    this.rollbackHandlers.push(handler);
  }

  /**
   * Execute an action
   */
  async execute(action: Action): Promise<ExecutionResult> {
    const startTime = Date.now();

    // Validate action
    this.validateAction(action);

    // Check if rollback is available for previous action
    let rollbackAvailable = false;
    let rollbackAction: Action | undefined;

    if (this.executionHistory.length > 0) {
      const lastExecution = this.executionHistory[this.executionHistory.length - 1];
      if (lastExecution.result.rollbackAvailable && lastExecution.result.rollbackAction) {
        rollbackAvailable = true;
        rollbackAction = lastExecution.result.rollbackAction;
      }
    }

    // Execute in sandbox
    let result: ToolResult;

    if (this.config.enableSandbox) {
      result = await this.executeInSandbox(action);
    } else {
      result = await this.executeDirect(action);
    }

    const executionTimeMs = Date.now() - startTime;

    // Store execution result
    const executionResult: ExecutionResult = {
      action,
      result,
      rollbackAvailable: this.config.enableRollback && result.rollbackAvailable,
      rollbackAction: result.rollbackAction,
      executionTimeMs,
    };

    this.executionHistory.push(executionResult);

    return executionResult;
  }

  /**
   * Validate action before execution
   */
  private validateAction(action: Action): void {
    if (!action.tool && !action.description) {
      throw new ToolExecutionError(
        'Action must have either a tool or description',
        action.tool || ''
      );
    }

    if (action.tool && !this.toolBelt?.hasTool(action.tool)) {
      throw new ToolExecutionError(
        `Tool not found: ${action.tool}`,
        action.tool
      );
    }
  }

  /**
   * Execute action in sandbox
   */
  private async executeInSandbox(action: Action): Promise<ToolResult> {
    // Apply sandbox profile if configured
    if (this.config.sandboxProfile) {
      this.enforceSandboxProfile(action, this.config.sandboxProfile);
    }

    return this.executeDirect(action);
  }

  /**
   * Enforce sandbox profile
   */
  private enforceSandboxProfile(action: Action, profile: SandboxProfile): void {
    // Check path restrictions
    if (action.parameters?.path) {
      const path = action.parameters.path as string;
      const isAllowed = profile.allowedPaths.some(allowed =>
        path.startsWith(allowed) || path === allowed
      );

      if (!isAllowed && profile.allowedPaths.length > 0) {
        throw new ToolExecutionError(
          `Path not allowed in sandbox: ${path}`,
          action.tool || ''
        );
      }
    }

    // Check command restrictions
    if (action.parameters?.command) {
      const command = action.parameters.command as string;
      const isAllowed = profile.allowedCommands.some(cmd =>
        command.startsWith(cmd)
      );

      if (!isAllowed && profile.allowedCommands.length > 0) {
        throw new ToolExecutionError(
          `Command not allowed in sandbox`,
          action.tool || ''
        );
      }
    }
  }

  /**
   * Execute action directly
   */
  private async executeDirect(action: Action): Promise<ToolResult> {
    if (!action.tool || !this.toolBelt) {
      // Mock execution
      return {
        toolId: `mock-${Date.now()}`,
        toolName: action.tool || 'unknown',
        status: 'success',
        output: { executed: true, action },
        latencyMs: 0,
        rollbackAvailable: false,
      };
    }

    const toolCall: ToolCall = {
      toolId: `${action.tool}-${Date.now()}`,
      toolName: action.tool,
      parameters: action.parameters || {},
    };

    try {
      return await this.toolBelt.executeTool(toolCall);
    } catch (error) {
      return {
        toolId: toolCall.toolId,
        toolName: toolCall.toolName,
        status: 'failure',
        error: error instanceof Error ? error.message : String(error),
        latencyMs: 0,
        rollbackAvailable: false,
      };
    }
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timeoutHandle: NodeJS.Timeout;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error(`Execution timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      clearTimeout(timeoutHandle!);
    }
  }

  /**
   * Rollback last action
   */
  async rollback(): Promise<ExecutionResult | null> {
    if (this.executionHistory.length === 0) {
      return null;
    }

    const lastExecution = this.executionHistory[this.executionHistory.length - 1];

    if (!lastExecution.result.rollbackAvailable || !lastExecution.result.rollbackAction) {
      throw new ChassisError(
        'No rollback available for last action',
        'NO_ROLLBACK',
        'ActionExecutor'
      );
    }

    // Execute rollback action
    const rollbackResult = await this.execute(lastExecution.result.rollbackAction);

    return rollbackResult;
  }

  /**
   * Get execution history
   */
  getHistory(): ExecutionResult[] {
    return [...this.executionHistory];
  }

  /**
   * Clear execution history
   */
  clearHistory(): void {
    this.executionHistory = [];
  }

  /**
   * Get last execution
   */
  getLastExecution(): ExecutionResult | undefined {
    return this.executionHistory[this.executionHistory.length - 1];
  }

  /**
   * Get execution count
   */
  getExecutionCount(): number {
    return this.executionHistory.length;
  }

  /**
   * Check if rollback is available
   */
  canRollback(): boolean {
    if (this.executionHistory.length === 0) {
      return false;
    }

    const lastExecution = this.executionHistory[this.executionHistory.length - 1];
    return lastExecution.result.rollbackAvailable;
  }

  /**
   * Shutdown
   */
  async shutdown(): Promise<void> {
    this.executionHistory = [];
    this.rollbackHandlers = [];
    this.toolBelt = null;
  }
}

/**
 * Factory function to create ActionExecutor instance
 */
export function createActionExecutor(config?: Partial<ActionExecutorConfig>): ActionExecutor {
  return new ActionExecutor(config);
}
