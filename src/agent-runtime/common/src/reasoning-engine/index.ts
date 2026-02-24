/**
 * Reasoning Engine Component
 *
 * Loop-optimized reasoning: plan → act → verify → adjust
 *
 * @module ReasoningEngine
 */

import {
  TaskEnvelope,
  ReasoningPlan,
  PlanStep,
  Action,
  ToolResult,
  ChassisError,
} from '../types';

/**
 * Configuration for reasoning engine
 */
export interface ReasoningConfig {
  maxRetriesPerAction: number;
  confidenceThresholdHigh: number;
  confidenceThresholdLow: number;
  enableReflexion: boolean;
  maxPlanSteps: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ReasoningConfig = {
  maxRetriesPerAction: 3,
  confidenceThresholdHigh: 0.85,
  confidenceThresholdLow: 0.30,
  enableReflexion: true,
  maxPlanSteps: 20,
};

/**
 * Reasoning state machine states
 */
export type ReasoningState =
  | 'idle'
  | 'planning'
  | 'acting'
  | 'verifying'
  | 'adjusting'
  | 'completed'
  | 'failed';

/**
 * Reasoning event for state machine
 */
export interface ReasoningEvent {
  type: string;
  timestamp: Date;
  data?: unknown;
}

/**
 * Reasoning context
 */
export interface ReasoningContext {
  task: TaskEnvelope;
  plan: ReasoningPlan;
  currentStepIndex: number;
  completedSteps: string[];
  results: ActionResult[];
  state: ReasoningState;
}

/**
 * Action result
 */
export interface ActionResult {
  stepId: string;
  action: Action;
  toolResult?: ToolResult;
  success: boolean;
  error?: string;
  retryCount: number;
}

/**
 * Reasoning Engine
 *
 * Responsibilities:
 * - Generate plan from task goal
 * - Execute actions in plan
 * - Verify action outcomes
 * - Adjust plan based on results
 * - Handle retries and fallback
 */
export class ReasoningEngine {
  private config: ReasoningConfig;
  private context: ReasoningContext | null = null;
  private history: ReasoningEvent[] = [];

  // Callbacks
  private onPlanGenerated?: (plan: ReasoningPlan) => Promise<void>;
  private onActionExecute?: (action: Action) => Promise<ToolResult>;
  private onActionVerify?: (action: Action, result: ToolResult) => Promise<boolean>;
  private onPlanAdjust?: (plan: ReasoningPlan, failure: ActionResult) => Promise<ReasoningPlan>;

  /**
   * Create a new ReasoningEngine instance
   */
  constructor(config: Partial<ReasoningConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Set callbacks
   */
  setCallbacks(callbacks: {
    onPlanGenerated?: (plan: ReasoningPlan) => Promise<void>;
    onActionExecute?: (action: Action) => Promise<ToolResult>;
    onActionVerify?: (action: Action, result: ToolResult) => Promise<boolean>;
    onPlanAdjust?: (plan: ReasoningPlan, failure: ActionResult) => Promise<ReasoningPlan>;
  }): void {
    this.onPlanGenerated = callbacks.onPlanGenerated;
    this.onActionExecute = callbacks.onActionExecute;
    this.onActionVerify = callbacks.onActionVerify;
    this.onPlanAdjust = callbacks.onPlanAdjust;
  }

  /**
   * Start reasoning process for a task
   */
  async start(task: TaskEnvelope, initialPlan: ReasoningPlan): Promise<ReasoningContext> {
    this.context = {
      task,
      plan: initialPlan,
      currentStepIndex: 0,
      completedSteps: [],
      results: [],
      state: 'planning',
    };

    this.emitEvent('reasoning:started', { taskId: task.taskId });

    // Execute the reasoning loop
    return this.runReasoningLoop();
  }

  /**
   * Run the reasoning loop: plan → act → verify → adjust
   */
  private async runReasoningLoop(): Promise<ReasoningContext> {
    if (!this.context) {
      throw new ChassisError('Reasoning not initialized', 'NOT_INITIALIZED', 'ReasoningEngine');
    }

    while (this.context.state !== 'completed' && this.context.state !== 'failed') {
      switch (this.context.state) {
        case 'planning':
          await this.handlePlanning();
          break;
        case 'acting':
          await this.handleActing();
          break;
        case 'verifying':
          await this.handleVerifying();
          break;
        case 'adjusting':
          await this.handleAdjusting();
          break;
        default:
          break;
      }
    }

    return this.context;
  }

  /**
   * Handle planning state
   */
  private async handlePlanning(): Promise<void> {
    if (!this.context) return;

    this.context.state = 'acting';

    // Notify plan generation
    if (this.onPlanGenerated) {
      await this.onPlanGenerated(this.context.plan);
    }

    this.emitEvent('plan:generated', { stepCount: this.context.plan.steps.length });
  }

  /**
   * Handle acting state
   */
  private async handleActing(): Promise<void> {
    if (!this.context) return;

    const { plan, currentStepIndex } = this.context;

    // Check if all steps completed
    if (currentStepIndex >= plan.steps.length) {
      this.context.state = 'completed';
      this.emitEvent('reasoning:completed', { resultCount: this.context.results.length });
      return;
    }

    const step = plan.steps[currentStepIndex];

    // Execute action
    if (this.onActionExecute && step.action.tool) {
      try {
        this.emitEvent('action:executing', { stepId: step.stepId, action: step.action });

        const toolResult = await this.onActionExecute(step.action);

        // Record result
        const actionResult: ActionResult = {
          stepId: step.stepId,
          action: step.action,
          toolResult,
          success: toolResult.status === 'success',
          retryCount: 0,
        };

        this.context.results.push(actionResult);

        // Proceed to verify
        this.context.state = 'verifying';
        this.emitEvent('action:executed', { stepId: step.stepId, success: toolResult.status === 'success' });
      } catch (error) {
        const actionResult: ActionResult = {
          stepId: step.stepId,
          action: step.action,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          retryCount: 0,
        };

        this.context.results.push(actionResult);

        // Check for retry
        if (actionResult.retryCount < this.config.maxRetriesPerAction) {
          // Stay in acting state to retry
          actionResult.retryCount++;
          this.emitEvent('action:retrying', { stepId: step.stepId, retryCount: actionResult.retryCount });
        } else {
          // Move to adjusting to modify plan
          this.context.state = 'adjusting';
        }
      }
    } else {
      // No tool execution needed, move to next step
      this.context.completedSteps.push(step.stepId);
      this.context.currentStepIndex++;
    }
  }

  /**
   * Handle verifying state
   */
  private async handleVerifying(): Promise<void> {
    if (!this.context) return;

    const currentResult = this.context.results[this.context.results.length - 1];

    if (!currentResult || !currentResult.toolResult) {
      // No result to verify, move to next step
      this.context.currentStepIndex++;
      this.context.state = 'acting';
      return;
    }

    // Check confidence threshold
    const confidence = this.context.plan.confidence;
    if (confidence < this.config.confidenceThresholdLow) {
      // Low confidence - need adjustment
      this.context.state = 'adjusting';
      this.emitEvent('verify:low_confidence', { confidence });
      return;
    }

    // Verify outcome if callback provided
    let verified = true;
    if (this.onActionVerify) {
      verified = await this.onActionVerify(currentResult.action, currentResult.toolResult);
    }

    if (verified && currentResult.success) {
      // Action verified, move to next step
      this.context.completedSteps.push(currentResult.stepId);
      this.context.currentStepIndex++;
      this.context.state = 'acting';
      this.emitEvent('verify:success', { stepId: currentResult.stepId });
    } else if (!verified || !currentResult.success) {
      // Verification failed, try to adjust
      this.context.state = 'adjusting';
      this.emitEvent('verify:failed', { stepId: currentResult.stepId });
    }
  }

  /**
   * Handle adjusting state
   */
  private async handleAdjusting(): Promise<void> {
    if (!this.context) return;

    const failedResult = this.context.results[this.context.results.length - 1];

    // Try to adjust plan
    if (this.onPlanAdjust && failedResult) {
      try {
        const adjustedPlan = await this.onPlanAdjust(this.context.plan, failedResult);
        this.context.plan = adjustedPlan;
        this.context.state = 'acting';

        // Reset current step index to retry from failed step
        this.emitEvent('plan:adjusted', { newStepCount: adjustedPlan.steps.length });
      } catch (error) {
        // Adjustment failed
        this.context.state = 'failed';
        this.emitEvent('reasoning:failed', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    } else {
      // No adjustment callback, mark as failed
      this.context.state = 'failed';
    }
  }

  /**
   * Get current reasoning state
   */
  getState(): ReasoningState | null {
    return this.context?.state ?? null;
  }

  /**
   * Get current context
   */
  getContext(): ReasoningContext | null {
    return this.context;
  }

  /**
   * Get reasoning history
   */
  getHistory(): ReasoningEvent[] {
    return [...this.history];
  }

  /**
   * Emit an event
   */
  private emitEvent(type: string, data?: unknown): void {
    const event: ReasoningEvent = {
      type,
      timestamp: new Date(),
      data,
    };
    this.history.push(event);
  }

  /**
   * Pause reasoning
   */
  pause(): void {
    if (this.context && this.context.state !== 'completed' && this.context.state !== 'failed') {
      this.emitEvent('reasoning:paused', {
        currentStep: this.context.currentStepIndex,
        completedSteps: this.context.completedSteps,
      });
    }
  }

  /**
   * Resume reasoning
   */
  async resume(context: ReasoningContext): Promise<ReasoningContext> {
    this.context = context;
    this.context.state = 'acting';
    return this.runReasoningLoop();
  }

  /**
   * Reset reasoning engine
   */
  reset(): void {
    this.context = null;
    this.history = [];
  }

  /**
   * Shutdown
   */
  async shutdown(): Promise<void> {
    this.reset();
    this.onPlanGenerated = undefined;
    this.onActionExecute = undefined;
    this.onActionVerify = undefined;
    this.onPlanAdjust = undefined;
  }
}

/**
 * Factory function to create ReasoningEngine instance
 */
export function createReasoningEngine(config?: Partial<ReasoningConfig>): ReasoningEngine {
  return new ReasoningEngine(config);
}
