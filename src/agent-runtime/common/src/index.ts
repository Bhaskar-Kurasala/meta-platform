/**
 * Agent Runtime Common Chassis
 *
 * This is the shared foundation used by all 33 agents.
 * Contains 13 core components for agent execution.
 *
 * @module AgentRuntimeCommon
 */

// Re-export all types
export * from './types';

// Component Exports

// 1. Identity & Auth
export { IdentityAuth, createIdentityAuth } from './identity-auth';

// 2. Skills Reader
export { SkillsReader, createSkillsReader } from './skills-reader';

// 3. Project Context
export { ProjectContextManager, createProjectContext } from './project-context';

// 4. Context Compiler
export {
  ContextCompiler,
  createContextCompiler,
  type ContextCompilerConfig,
  type TokenBudget,
  type MemoryServiceInterface,
  type ContextProvider,
} from './context-compiler';

// 5. Memory Manager
export {
  MemoryManager,
  createMemoryManager,
  type MemoryConfig,
  type EpisodicStorage,
  type SemanticStorage,
  type SharedStorage,
  type ResourceStorage,
} from './memory-manager';

// 6. Reasoning Engine
export {
  ReasoningEngine,
  createReasoningEngine,
  type ReasoningConfig,
  type ReasoningState,
  type ReasoningContext,
  type ActionResult,
} from './reasoning-engine';

// 7. Invariants Engine
export {
  InvariantsEngine,
  createInvariantsEngine,
  BUILT_IN_INVARIANTS,
  type InvariantsEngineConfig,
} from './invariants-engine';

// 8. Execution Guard
export {
  ExecutionGuard,
  createExecutionGuard,
  type ExecutionGuardConfig,
  type EvaluationResult,
  type PlanEvaluationResult,
} from './execution-guard';

// 9. Tool Belt (MCP)
export {
  ToolBelt,
  createToolBelt,
  type ToolBeltConfig,
  type ToolGatewayClient,
  type ToolMetadata,
} from './tool-belt';

// 10. Plugin Manager
export {
  PluginManager,
  createPluginManager,
  type PluginManagerConfig,
  type PluginHooks,
} from './plugin-manager';

// 11. Action Executor
export {
  ActionExecutor,
  createActionExecutor,
  type ActionExecutorConfig,
  type SandboxProfile,
  type ExecutionResult,
  type RollbackHandler,
} from './action-executor';

// 12. Self-Monitor
export {
  SelfMonitor,
  createSelfMonitor,
  type SelfMonitorConfig,
  type TaskMetrics,
} from './self-monitor';

// 13. HITL Gate
export {
  HITLGate,
  createHITLGate,
  type HITLGateConfig,
  type HITLCheckResult,
  type HITLQueueStorage,
} from './hitl-gate';

/**
 * AgentRuntimeChassis - Combines all 13 components into a unified chassis
 */
import {
  IdentityAuth,
  SkillsReader,
  ProjectContextManager,
  ContextCompiler,
  MemoryManager,
  ReasoningEngine,
  InvariantsEngine,
  ExecutionGuard,
  ToolBelt,
  PluginManager,
  ActionExecutor,
  SelfMonitor,
  HITLGate,
} from './types';

import type { AgentManifest, TaskEnvelope, AgentResult } from './types';

/**
 * Complete chassis configuration
 */
export interface ChassisConfig {
  identity?: Partial<ConstructorParameters<typeof IdentityAuth>[0]>;
  skills?: Partial<ConstructorParameters<typeof SkillsReader>[0]>;
  projectContext?: Partial<ConstructorParameters<typeof ProjectContextManager>[0]>;
  contextCompiler?: Partial<ConstructorParameters<typeof ContextCompiler>[0]>;
  memory?: Partial<ConstructorParameters<typeof MemoryManager>[0]>;
  reasoning?: Partial<ConstructorParameters<typeof ReasoningEngine>[0]>;
  invariants?: Partial<ConstructorParameters<typeof InvariantsEngine>[0]>;
  executionGuard?: Partial<ConstructorParameters<typeof ExecutionGuard>[0]>;
  toolBelt?: Partial<ConstructorParameters<typeof ToolBelt>[0]>;
  pluginManager?: Partial<ConstructorParameters<typeof PluginManager>[0]>;
  actionExecutor?: Partial<ConstructorParameters<typeof ActionExecutor>[0]>;
  selfMonitor?: Partial<ConstructorParameters<typeof SelfMonitor>[0]>;
  hitlGate?: Partial<ConstructorParameters<typeof HITLGate>[0]>;
}

/**
 * Agent Runtime Chassis
 *
 * Combines all 13 components into a unified runtime environment
 * for agent execution.
 */
export class AgentRuntimeChassis {
  // Component instances
  public identityAuth: IdentityAuth;
  public skillsReader: SkillsReader;
  public projectContext: ProjectContextManager;
  public contextCompiler: ContextCompiler;
  public memoryManager: MemoryManager;
  public reasoningEngine: ReasoningEngine;
  public invariantsEngine: InvariantsEngine;
  public executionGuard: ExecutionGuard;
  public toolBelt: ToolBelt;
  public pluginManager: PluginManager;
  public actionExecutor: ActionExecutor;
  public selfMonitor: SelfMonitor;
  public hitlGate: HITLGate;

  private agentId: string = '';
  private initialized: boolean = false;

  constructor(config: ChassisConfig = {}) {
    // Initialize all components with provided config
    this.identityAuth = new IdentityAuth(config.identity);
    this.skillsReader = new SkillsReader(config.skills);
    this.projectContext = new ProjectContextManager(config.projectContext);
    this.contextCompiler = new ContextCompiler(config.contextCompiler);
    this.memoryManager = new MemoryManager(config.memory);
    this.reasoningEngine = new ReasoningEngine(config.reasoning);
    this.invariantsEngine = new InvariantsEngine(config.invariants);
    this.executionGuard = new ExecutionGuard(config.executionGuard);
    this.toolBelt = new ToolBelt(config.toolBelt);
    this.pluginManager = new PluginManager(config.pluginManager);
    this.actionExecutor = new ActionExecutor(config.actionExecutor);
    selfMonitor = new SelfMonitor(config.selfMonitor);
    this.hitlGate = new HITLGate(config.hitlGate);

    // Wire up dependencies
    this.setupDependencies();
  }

  /**
   * Setup component dependencies
   */
  private setupDependencies(): void {
    // Context compiler needs context provider and memory service
    this.contextCompiler.setContextProvider({
      getIdentity: () => this.identityAuth.getRole(),
      getInvariants: () => '', // Would be loaded from invariants engine
      getSkills: (maxTokens: number) => this.skillsReader.formatSkillsForContext(maxTokens),
      getProjectContext: (maxTokens: number) => this.projectContext.formatForContext(maxTokens),
    });

    // Action executor needs tool belt
    this.actionExecutor.setToolBelt(this.toolBelt);
  }

  /**
   * Initialize the chassis with agent manifest
   */
  async initialize(manifest: AgentManifest): Promise<void> {
    this.agentId = manifest.id;

    // Initialize identity
    await this.identityAuth.initialize(manifest, async () => {
      // Token callback - would call Auth Service
      return `token_${Date.now()}`;
    });

    // Initialize skills
    await this.skillsReader.initialize(manifest.id);

    // Initialize project context
    await this.projectContext.initialize();

    // Initialize memory manager
    // (Would set storage implementations here)

    // Initialize invariants
    await this.invariantsEngine.initialize();

    // Initialize tool belt
    await this.toolBelt.initialize();

    // Initialize plugin manager
    await this.pluginManager.initialize();

    // Initialize self monitor
    this.selfMonitor.initialize(manifest.id);

    this.initialized = true;
  }

  /**
   * Execute a task through the chassis
   */
  async executeTask(task: TaskEnvelope): Promise<AgentResult> {
    if (!this.initialized) {
      throw new Error('Chassis not initialized');
    }

    // Start metrics tracking
    this.selfMonitor.startTask(task.taskId);

    try {
      // 1. Compile context
      const context = await this.contextCompiler.compileContext(task);

      // 2. Reasoning (would call LLM with context)
      // For now, return success
      const plan = {
        steps: [],
        confidence: 0.9,
        risks: [],
      };

      // 3. Execute plan steps
      for (const step of plan.steps) {
        // Check execution guard
        const evaluation = await this.executionGuard.evaluateAction(
          step.action,
          plan.confidence
        );

        if (!evaluation.allowed) {
          // Handle block/defer
          if (evaluation.decision === 'block') {
            throw new Error(`Action blocked: ${evaluation.reason}`);
          }
          // Would handle defer (HITL) here
        }

        // Execute action
        await this.actionExecutor.execute(step.action);
      }

      // Record success
      this.selfMonitor.endTask(task.taskId, 'completed');

      return {
        taskId: task.taskId,
        status: 'success',
        artifacts: [],
        decisions: [],
        telemetry: {
          tokensUsed: 0,
          latencyMs: 0,
          cost: 0,
          errors: 0,
          actionsExecuted: 0,
        },
      };
    } catch (error) {
      this.selfMonitor.endTask(task.taskId, 'failed');

      return {
        taskId: task.taskId,
        status: 'failure',
        artifacts: [],
        decisions: [],
        telemetry: {
          tokensUsed: 0,
          latencyMs: 0,
          cost: 0,
          errors: 1,
          actionsExecuted: 0,
        },
        error: {
          code: 'EXECUTION_ERROR',
          message: error instanceof Error ? error.message : String(error),
          recoverable: true,
        },
      };
    }
  }

  /**
   * Shutdown the chassis
   */
  async shutdown(): Promise<void> {
    await Promise.all([
      this.identityAuth.shutdown(),
      this.skillsReader.shutdown(),
      this.projectContext.shutdown(),
      this.memoryManager.shutdown(),
      this.reasoningEngine.shutdown(),
      this.invariantsEngine.shutdown(),
      this.toolBelt.shutdown(),
      this.pluginManager.shutdown(),
      this.actionExecutor.shutdown(),
      this.selfMonitor.shutdown(),
      this.hitlGate.shutdown(),
    ]);

    this.initialized = false;
  }
}

/**
 * Create a complete agent runtime chassis
 */
export function createChassis(config?: ChassisConfig): AgentRuntimeChassis {
  return new AgentRuntimeChassis(config);
}
