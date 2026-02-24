/**
 * Self-Monitor Component
 *
 * Tracks tokens, errors, confidence, cost, and latency.
 *
 * @module SelfMonitor
 */

import {
  AgentMetrics,
  MetricsSummary,
  TaskEnvelope,
  AgentIdentity,
  ChassisError,
} from '../types';

/**
 * Configuration for self-monitor
 */
export interface SelfMonitorConfig {
  enableMetrics: boolean;
  metricsFlushInterval: number;
  maxMetricsStored: number;
  costPerToken: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: SelfMonitorConfig = {
  enableMetrics: true,
  metricsFlushInterval: 60000, // 1 minute
  maxMetricsStored: 1000,
  costPerToken: 0.0001, // $0.0001 per token (adjust as needed)
};

/**
 * Task metrics tracker
 */
export interface TaskMetrics {
  taskId: string;
  agentId: string;
  startTime: Date;
  endTime?: Date;
  tokensInput: number;
  tokensOutput: number;
  tokensUsed: number;
  latencyMs: number;
  errors: number;
  actionsExecuted: number;
  actionsSucceeded: number;
  confidence: number;
  cost: number;
  status: 'running' | 'completed' | 'failed';
}

/**
 * Self Monitor
 *
 * Responsibilities:
 * - Track tokens used per task
 * - Monitor error rates
 * - Track confidence scores
 * - Calculate costs
 * - Measure latency
 * - Provide metrics summary
 */
export class SelfMonitor {
  private config: SelfMonitorConfig;
  private agentId: string = '';
  private currentTask: TaskMetrics | null = null;
  private metricsHistory: AgentMetrics[] = [];
  private taskMetrics: Map<string, TaskMetrics> = new Map();

  /**
   * Create a new SelfMonitor instance
   */
  constructor(config: Partial<SelfMonitorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize with agent identity
   */
  initialize(agentId: string): void {
    this.agentId = agentId;
  }

  /**
   * Start tracking a new task
   */
  startTask(taskId: string): void {
    this.currentTask = {
      taskId,
      agentId: this.agentId,
      startTime: new Date(),
      tokensInput: 0,
      tokensOutput: 0,
      tokensUsed: 0,
      latencyMs: 0,
      errors: 0,
      actionsExecuted: 0,
      actionsSucceeded: 0,
      confidence: 0,
      cost: 0,
      status: 'running',
    };

    this.taskMetrics.set(taskId, this.currentTask);
  }

  /**
   * End tracking current task
   */
  endTask(taskId: string, status: 'completed' | 'failed'): void {
    const task = this.taskMetrics.get(taskId);

    if (!task) {
      return;
    }

    task.endTime = new Date();
    task.latencyMs = task.endTime.getTime() - task.startTime.getTime();
    task.tokensUsed = task.tokensInput + task.tokensOutput;
    task.cost = task.tokensUsed * this.config.costPerToken;
    task.status = status;

    // Create metrics entry
    const metrics: AgentMetrics = {
      agentId: task.agentId,
      taskId: task.taskId,
      timestamp: new Date(),
      tokensUsed: task.tokensUsed,
      tokensInput: task.tokensInput,
      tokensOutput: task.tokensOutput,
      latencyMs: task.latencyMs,
      errors: task.errors,
      confidence: task.confidence,
      cost: task.cost,
      actionsExecuted: task.actionsExecuted,
      actionsSucceeded: task.actionsSucceeded,
    };

    this.metricsHistory.push(metrics);
    this.pruneMetrics();

    // Clear current task if it's the same
    if (this.currentTask?.taskId === taskId) {
      this.currentTask = null;
    }
  }

  /**
   * Record tokens used
   */
  recordTokens(taskId: string, input: number, output: number): void {
    const task = this.taskMetrics.get(taskId);

    if (!task) return;

    task.tokensInput += input;
    task.tokensOutput += output;
  }

  /**
   * Record action execution
   */
  recordAction(taskId: string, success: boolean): void {
    const task = this.taskMetrics.get(taskId);

    if (!task) return;

    task.actionsExecuted++;

    if (success) {
      task.actionsSucceeded++;
    } else {
      task.errors++;
    }
  }

  /**
   * Record error
   */
  recordError(taskId: string): void {
    const task = this.taskMetrics.get(taskId);

    if (!task) return;

    task.errors++;
  }

  /**
   * Record confidence
   */
  recordConfidence(taskId: string, confidence: number): void {
    const task = this.taskMetrics.get(taskId);

    if (!task) return;

    // Average confidence if multiple recordings
    if (task.confidence > 0) {
      task.confidence = (task.confidence + confidence) / 2;
    } else {
      task.confidence = confidence;
    }
  }

  /**
   * Record latency
   */
  recordLatency(taskId: string, latencyMs: number): void {
    const task = this.taskMetrics.get(taskId);

    if (!task) return;

    // Update latency if higher
    if (latencyMs > task.latencyMs) {
      task.latencyMs = latencyMs;
    }
  }

  /**
   * Get current task metrics
   */
  getCurrentTaskMetrics(): TaskMetrics | null {
    return this.currentTask;
  }

  /**
   * Get task metrics
   */
  getTaskMetrics(taskId: string): TaskMetrics | undefined {
    return this.taskMetrics.get(taskId);
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(): AgentMetrics[] {
    return [...this.metricsHistory];
  }

  /**
   * Get metrics summary for a period
   */
  getSummary(periodStart: Date, periodEnd: Date): MetricsSummary {
    const periodMetrics = this.metricsHistory.filter(
      m => m.timestamp >= periodStart && m.timestamp <= periodEnd
    );

    const totalTasks = periodMetrics.length;
    const completedTasks = periodMetrics.filter(m => m.errors === 0).length;
    const successRate = totalTasks > 0 ? completedTasks / totalTasks : 0;

    const avgLatencyMs = totalTasks > 0
      ? periodMetrics.reduce((sum, m) => sum + m.latencyMs, 0) / totalTasks
      : 0;

    const avgTokensUsed = totalTasks > 0
      ? periodMetrics.reduce((sum, m) => sum + m.tokensUsed, 0) / totalTasks
      : 0;

    const avgCost = totalTasks > 0
      ? periodMetrics.reduce((sum, m) => sum + m.cost, 0) / totalTasks
      : 0;

    const totalErrors = periodMetrics.reduce((sum, m) => sum + m.errors, 0);
    const errorRate = totalTasks > 0 ? totalErrors / totalTasks : 0;

    return {
      agentId: this.agentId,
      periodStart,
      periodEnd,
      totalTasks,
      successRate,
      avgLatencyMs,
      avgTokensUsed,
      avgCost,
      errorRate,
    };
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): AgentMetrics | null {
    if (!this.currentTask) {
      return null;
    }

    return {
      agentId: this.currentTask.agentId,
      taskId: this.currentTask.taskId,
      timestamp: new Date(),
      tokensUsed: this.currentTask.tokensInput + this.currentTask.tokensOutput,
      tokensInput: this.currentTask.tokensInput,
      tokensOutput: this.currentTask.tokensOutput,
      latencyMs: Date.now() - this.currentTask.startTime.getTime(),
      errors: this.currentTask.errors,
      confidence: this.currentTask.confidence,
      cost: (this.currentTask.tokensInput + this.currentTask.tokensOutput) * this.config.costPerToken,
      actionsExecuted: this.currentTask.actionsExecuted,
      actionsSucceeded: this.currentTask.actionsSucceeded,
    };
  }

  /**
   * Prune old metrics
   */
  private pruneMetrics(): void {
    while (this.metricsHistory.length > this.config.maxMetricsStored) {
      this.metricsHistory.shift();
    }
  }

  /**
   * Get token usage stats
   */
  getTokenStats(): { input: number; output: number; total: number; estimatedCost: number } {
    const input = this.metricsHistory.reduce((sum, m) => sum + m.tokensInput, 0);
    const output = this.metricsHistory.reduce((sum, m) => sum + m.tokensOutput, 0);
    const total = input + output;

    return {
      input,
      output,
      total,
      estimatedCost: total * this.config.costPerToken,
    };
  }

  /**
   * Get error count
   */
  getErrorCount(): number {
    return this.metricsHistory.reduce((sum, m) => sum + m.errors, 0);
  }

  /**
   * Get average confidence
   */
  getAverageConfidence(): number {
    const withConfidence = this.metricsHistory.filter(m => m.confidence > 0);

    if (withConfidence.length === 0) return 0;

    return withConfidence.reduce((sum, m) => sum + m.confidence, 0) / withConfidence.length;
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.metricsHistory = [];
    this.taskMetrics.clear();
    this.currentTask = null;
  }

  /**
   * Shutdown
   */
  async shutdown(): Promise<void> {
    this.reset();
  }
}

/**
 * Factory function to create SelfMonitor instance
 */
export function createSelfMonitor(config?: Partial<SelfMonitorConfig>): SelfMonitor {
  return new SelfMonitor(config);
}
