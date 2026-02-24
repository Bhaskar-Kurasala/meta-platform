/**
 * HITL Gate Component
 *
 * Configurable human approval checkpoints.
 *
 * @module HITLGate
 */

import {
  HITLRequest,
  HITLCheckpoint,
  HITLResponse,
  HITLConfig,
  HITLTrigger,
  Action,
  RiskScore,
  ChassisError,
  HITLRequiredError,
} from '../types';

/**
 * Configuration for HITL gate
 */
export interface HITLGateConfig {
  enabled: boolean;
  autoApproveBelowRisk: number;
  triggers: HITLTrigger[];
  timeoutMs: number;
  queueStorage: HITLQueueStorage | null;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: HITLGateConfig = {
  enabled: true,
  autoApproveBelowRisk: 1.5,
  triggers: [
    { type: 'risk_threshold', threshold: 2.5 },
    { type: 'confidence_threshold', threshold: 0.5 },
    { type: 'tool_specific', toolNames: ['database', 'delete', 'deploy'] },
  ],
  timeoutMs: 300000, // 5 minutes default
  queueStorage: null,
};

/**
 * HITL Queue Storage interface
 */
export interface HITLQueueStorage {
  enqueue(request: HITLRequest): Promise<void>;
  dequeue(requestId: string): Promise<HITLRequest | null>;
  update(request: HITLRequest): Promise<void>;
  getPending(): Promise<HITLRequest[]>;
  getByTaskId(taskId: string): Promise<HITLRequest | null>;
}

/**
 * HITL Gate
 *
 * Responsibilities:
 * - Determine when human approval is required
 * - Manage HITL queue
 * - Handle approval/rejection responses
 * - Integrate with checkpoint/restore for pause/resume
 */
export class HITLGate {
  private config: HITLGateConfig;
  private pendingRequests: Map<string, HITLRequest> = new Map();
  private resolvedRequests: Map<string, HITLRequest> = new Map();

  /**
   * Create a new HITLGate instance
   */
  constructor(config: Partial<HITLGateConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Set queue storage
   */
  setQueueStorage(storage: HITLGateConfig['queueStorage']): void {
    this.config.queueStorage = storage;
  }

  /**
   * Check if HITL is required for an action
   */
  async check(
    action: Action,
    riskScore: RiskScore,
    confidence: number,
    taskId: string,
    agentId: string
  ): Promise<HITLCheckResult> {
    // If HITL is disabled, auto-approve
    if (!this.config.enabled) {
      return { required: false, reason: 'HITL disabled' };
    }

    // Check auto-approve threshold
    if (riskScore.total <= this.config.autoApproveBelowRisk) {
      return { required: false, reason: 'Risk below auto-approve threshold' };
    }

    // Check triggers
    for (const trigger of this.config.triggers) {
      const result = this.evaluateTrigger(trigger, action, riskScore, confidence);

      if (result.requiresHitl) {
        // Create HITL request
        const request = await this.createRequest(
          action,
          riskScore,
          taskId,
          agentId,
          result.reason
        );

        return {
          required: true,
          request,
          reason: result.reason,
        };
      }
    }

    return { required: false, reason: 'No trigger conditions met' };
  }

  /**
   * Evaluate a trigger
   */
  private evaluateTrigger(
    trigger: HITLTrigger,
    action: Action,
    riskScore: RiskScore,
    confidence: number
  ): { requiresHitl: boolean; reason?: string } {
    switch (trigger.type) {
      case 'risk_threshold':
        if (trigger.threshold && riskScore.total >= trigger.threshold) {
          return {
            requiresHitl: true,
            reason: `Risk score ${riskScore.total.toFixed(2)} exceeds threshold ${trigger.threshold}`,
          };
        }
        break;

      case 'confidence_threshold':
        if (trigger.threshold && confidence < trigger.threshold) {
          return {
            requiresHitl: true,
            reason: `Confidence ${confidence.toFixed(2)} below threshold ${trigger.threshold}`,
          };
        }
        break;

      case 'tool_specific':
        if (trigger.toolNames && action.tool) {
          if (trigger.toolNames.includes(action.tool)) {
            return {
              requiresHitl: true,
              reason: `Tool ${action.tool} requires human approval`,
            };
          }
        }
        break;

      case 'custom':
        // Custom conditions would be evaluated here
        break;
    }

    return { requiresHitl: false };
  }

  /**
   * Create a HITL request
   */
  private async createRequest(
    action: Action,
    riskScore: RiskScore,
    taskId: string,
    agentId: string,
    reason: string
  ): Promise<HITLRequest> {
    const request: HITLRequest = {
      requestId: `hitl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      taskId,
      agentId,
      action,
      riskScore,
      checkpoint: {
        completedSteps: [],
        accumulatedResults: [],
        pendingAction: action,
      },
      requestedAt: new Date(),
      status: 'pending',
    };

    // Store locally
    this.pendingRequests.set(request.requestId, request);

    // Store in queue if available
    if (this.config.queueStorage) {
      await this.config.queueStorage.enqueue(request);
    }

    return request;
  }

  /**
   * Submit action for HITL approval
   */
  async submit(request: HITLRequest): Promise<void> {
    this.pendingRequests.set(request.requestId, request);

    if (this.config.queueStorage) {
      await this.config.queueStorage.enqueue(request);
    }
  }

  /**
   * Approve a HITL request
   */
  async approve(
    requestId: string,
    responderId: string,
    modifiedAction?: Action
  ): Promise<HITLRequest | null> {
    const request = this.pendingRequests.get(requestId);

    if (!request) {
      // Try to get from storage
      if (this.config.queueStorage) {
        const stored = await this.config.queueStorage.dequeue(requestId);
        if (stored) {
          return this.approveInternal(stored, responderId, modifiedAction);
        }
      }
      return null;
    }

    return this.approveInternal(request, responderId, modifiedAction);
  }

  /**
   * Internal approve handler
   */
  private async approveInternal(
    request: HITLRequest,
    responderId: string,
    modifiedAction?: Action
  ): Promise<HITLRequest> {
    const response: HITLResponse = {
      decision: 'approved',
      responderId,
      respondedAt: new Date(),
      modifiedAction,
    };

    request.status = 'approved';
    request.response = response;

    // Move to resolved
    this.pendingRequests.delete(request.requestId);
    this.resolvedRequests.set(request.requestId, request);

    // Update storage
    if (this.config.queueStorage) {
      await this.config.queueStorage.update(request);
    }

    return request;
  }

  /**
   * Reject a HITL request
   */
  async reject(
    requestId: string,
    responderId: string,
    comment?: string
  ): Promise<HITLRequest | null> {
    const request = this.pendingRequests.get(requestId);

    if (!request) {
      // Try storage
      if (this.config.queueStorage) {
        const stored = await this.config.queueStorage.dequeue(requestId);
        if (stored) {
          return this.rejectInternal(stored, responderId, comment);
        }
      }
      return null;
    }

    return this.rejectInternal(request, responderId, comment);
  }

  /**
   * Internal reject handler
   */
  private async rejectInternal(
    request: HITLRequest,
    responderId: string,
    comment?: string
  ): Promise<HITLRequest> {
    const response: HITLResponse = {
      decision: 'rejected',
      comment,
      responderId,
      respondedAt: new Date(),
    };

    request.status = 'rejected';
    request.response = response;

    // Move to resolved
    this.pendingRequests.delete(request.requestId);
    this.resolvedRequests.set(request.requestId, request);

    // Update storage
    if (this.config.queueStorage) {
      await this.config.queueStorage.update(request);
    }

    return request;
  }

  /**
   * Get pending requests
   */
  async getPending(): Promise<HITLRequest[]> {
    if (this.config.queueStorage) {
      return this.config.queueStorage.getPending();
    }

    return Array.from(this.pendingRequests.values());
  }

  /**
   * Get request by ID
   */
  async getRequest(requestId: string): Promise<HITLRequest | null> {
    // Check local
    const local = this.pendingRequests.get(requestId) || this.resolvedRequests.get(requestId);
    if (local) return local;

    // Check storage
    if (this.config.queueStorage) {
      return this.config.queueStorage.getByTaskId(requestId);
    }

    return null;
  }

  /**
   * Get request by task ID
   */
  async getByTaskId(taskId: string): Promise<HITLRequest | null> {
    // Check local
    for (const request of this.pendingRequests.values()) {
      if (request.taskId === taskId) return request;
    }

    // Check storage
    if (this.config.queueStorage) {
      return this.config.queueStorage.getByTaskId(taskId);
    }

    return null;
  }

  /**
   * Check if request is approved
   */
  isApproved(requestId: string): boolean {
    const request = this.resolvedRequests.get(requestId);
    return request?.status === 'approved';
  }

  /**
   * Check if request is rejected
   */
  isRejected(requestId: string): boolean {
    const request = this.resolvedRequests.get(requestId);
    return request?.status === 'rejected';
  }

  /**
   * Add a trigger
   */
  addTrigger(trigger: HITLTrigger): void {
    this.config.triggers.push(trigger);
  }

  /**
   * Remove a trigger
   */
  removeTrigger(index: number): boolean {
    if (index >= 0 && index < this.config.triggers.length) {
      this.config.triggers.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get pending count
   */
  getPendingCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * Shutdown
   */
  async shutdown(): Promise<void> {
    this.pendingRequests.clear();
    this.resolvedRequests.clear();
  }
}

/**
 * HITL check result
 */
export interface HITLCheckResult {
  required: boolean;
  request?: HITLRequest;
  reason?: string;
}

/**
 * Factory function to create HITLGate instance
 */
export function createHITLGate(config?: Partial<HITLGateConfig>): HITLGate {
  return new HITLGate(config);
}
