/**
 * Agent 00 - Master Orchestrator
 *
 * The central coordinator for all agent workflows in the platform.
 * Manages TaskGraph planning, execution, checkpoint/resume, and HITL coordination.
 *
 * @module Agent00Orchestrator
 */

import {
  AgentManifest,
  TaskEnvelope,
  AgentResult,
  AgentError,
  HITLRequest,
  TaskPins,
  TelemetryData,
  Artifact,
  Decision,
} from '@dap/agent-runtime-common';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

// ============================================================================
// Types - TaskGraph DAG
// ============================================================================

export interface TaskGraphNode {
  node_id: string;
  agent_id: string;
  goal: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  depends_on: string[];
  result_ref?: string;
  result?: unknown;
  retry_count: number;
  error?: string;
  checkpoint_id?: string;
}

export interface TaskGraphEdge {
  from: string;
  to: string;
}

export interface TaskGraph {
  workflow_id: string;
  correlation_id: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'aborted';
  nodes: TaskGraphNode[];
  edges: TaskGraphEdge[];
  created_at: string;
  updated_at: string;
  completed_at?: string;
  checkpoint_history: Checkpoint[];
}

export interface Checkpoint {
  checkpoint_id: string;
  workflow_id: string;
  taskgraph_state: TaskGraph;
  timestamp: string;
  reason: string;
}

export interface WorkflowRequest {
  goal: string;
  template?: string;
  inputs?: Record<string, unknown>;
  constraints?: {
    max_tokens?: number;
    max_latency?: number;
    budget?: number;
  };
  pins?: TaskPins;
}

export interface HITLQueueItem {
  request: HITLRequest;
  workflow_id: string;
  node_id: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
}

// ============================================================================
// Configuration
// ============================================================================

export interface OrchestratorConfig {
  workflowStateStore: WorkflowStateStore;
  eventBus: EventBusClient;
  hitlQueue: HITLQueueClient;
  a2aRouter: A2ARouterClient;
  promptRegistry: PromptRegistryClient;
  maxConcurrentTasks: number;
  maxRetries: number;
  retryDelayMs: number;
  checkpointIntervalMs: number;
}

export interface WorkflowStateStore {
  saveWorkflow(workflow: TaskGraph): Promise<void>;
  getWorkflow(workflowId: string): Promise<TaskGraph | null>;
  saveCheckpoint(checkpoint: Checkpoint): Promise<void>;
  getCheckpoints(workflowId: string): Promise<Checkpoint[]>;
}

export interface EventBusClient {
  publish(topic: string, event: WorkflowEvent): Promise<void>;
  subscribe(topic: string, handler: (event: WorkflowEvent) => void): Promise<void>;
}

export interface HITLQueueClient {
  submitRequest(request: HITLRequest): Promise<string>;
  getRequestStatus(requestId: string): Promise<HITLQueueItem | null>;
  waitForResponse(requestId: string, timeoutMs: number): Promise<HITLQueueItem>;
}

export interface A2ARouterClient {
  dispatchTask(envelope: TaskEnvelope): Promise<string>;
  getTaskStatus(taskId: string): Promise<{ status: string; result?: unknown }>;
}

export interface PromptRegistryClient {
  resolvePin(pin: TaskPins): Promise<string>;
}

export interface WorkflowEvent {
  type: string;
  workflow_id: string;
  node_id?: string;
  timestamp: string;
  data?: unknown;
}

// ============================================================================
// Main Orchestrator Class
// ============================================================================

export class MasterOrchestrator {
  private config: OrchestratorConfig;
  private manifest: AgentManifest | null = null;
  private runningWorkflows: Map<string, TaskGraph> = new Map();
  private activeTasks: Map<string, { workflowId: string; nodeId: string }> = new Map();
  private hitlPending: Map<string, { workflowId: string; nodeId: string }> = new Map();

  constructor(config: OrchestratorConfig) {
    this.config = config;
  }

  /**
   * Initialize the orchestrator with manifest
   */
  async initialize(manifestPath: string): Promise<void> {
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    this.manifest = yaml.parse(manifestContent) as AgentManifest;

    // Subscribe to events for tracking
    await this.config.eventBus.subscribe('agent.*.completed', this.handleAgentCompleted.bind(this));
    await this.config.eventBus.subscribe('agent.*.failed', this.handleAgentFailed.bind(this));
    await this.config.eventBus.subscribe('hitl.*', this.handleHITLEvent.bind(this));

    console.log(`[Orchestrator] Initialized with manifest: ${this.manifest.id}`);
  }

  /**
   * Main entry point - create and execute a workflow from a request
   */
  async executeWorkflow(request: WorkflowRequest): Promise<AgentResult> {
    const startTime = Date.now();
    const workflowId = this.generateId();
    const correlationId = this.generateId();

    try {
      // Step 1: Create TaskGraph (planning phase)
      const taskgraph = await this.createTaskGraph(workflowId, correlationId, request);

      // Step 2: Validate TaskGraph (invariant enforcement)
      await this.validateTaskGraph(taskgraph);

      // Step 3: Save initial state
      await this.config.workflowStateStore.saveWorkflow(taskgraph);

      // Step 4: Emit workflow started event
      await this.emitEvent('workflow.started', workflowId, null, {
        goal: request.goal,
        node_count: taskgraph.nodes.length,
      });

      // Step 5: Execute TaskGraph
      const result = await this.executeTaskGraph(taskgraph);

      // Step 6: Mark completion
      taskgraph.status = result.status === 'success' ? 'completed' : 'failed';
      taskgraph.completed_at = new Date().toISOString();
      await this.config.workflowStateStore.saveWorkflow(taskgraph);

      // Step 7: Emit workflow completed event
      await this.emitEvent('workflow.completed', workflowId, null, {
        status: taskgraph.status,
        nodes_completed: taskgraph.nodes.filter(n => n.status === 'completed').length,
        nodes_failed: taskgraph.nodes.filter(n => n.status === 'failed').length,
      });

      return {
        taskId: workflowId,
        status: result.status,
        artifacts: result.artifacts,
        decisions: result.decisions,
        telemetry: {
          tokensUsed: 0,
          latencyMs: Date.now() - startTime,
          cost: 0,
          errors: 0,
          actionsExecuted: taskgraph.nodes.length,
        },
      };
    } catch (error) {
      console.error(`[Orchestrator] Workflow ${workflowId} failed:`, error);

      // Save failed state
      const workflow = this.runningWorkflows.get(workflowId);
      if (workflow) {
        workflow.status = 'failed';
        await this.config.workflowStateStore.saveWorkflow(workflow);
      }

      return {
        taskId: workflowId,
        status: 'failure',
        artifacts: [],
        decisions: [],
        telemetry: {
          tokensUsed: 0,
          latencyMs: Date.now() - startTime,
          cost: 0,
          errors: 1,
          actionsExecuted: 0,
        },
        error: {
          code: 'WORKFLOW_FAILED',
          message: error instanceof Error ? error.message : String(error),
          recoverable: true,
        },
      };
    }
  }

  /**
   * Create TaskGraph from request (planning algorithm)
   */
  private async createTaskGraph(
    workflowId: string,
    correlationId: string,
    request: WorkflowRequest
  ): Promise<TaskGraph> {
    // Step 1: Pattern match against known templates
    const template = this.findMatchingTemplate(request);

    if (template) {
      console.log(`[Orchestrator] Using template: ${template.name}`);
      return this.buildTaskGraphFromTemplate(workflowId, correlationId, request, template);
    }

    // Step 2: LLM-based planning (if no template match)
    console.log(`[Orchestrator] No template match, using LLM planning`);
    return this.planWithLLM(workflowId, correlationId, request);
  }

  /**
   * Find matching workflow template
   */
  private findMatchingTemplate(request: WorkflowRequest): { name: string; dag: unknown[] } | null {
    // This would be loaded from manifest
    const templates: Record<string, { name: string; dag: unknown[] }> = {
      feature_request: {
        name: 'feature_request',
        dag: [
          { agent: 'agent-04-pm', goal: 'Write feature specification (BRD)', depends_on: [] },
          { agent: 'agent-05-ba', goal: 'Create technical requirements', depends_on: ['agent-04-pm'] },
          { agent: 'agent-06-ux', goal: 'Design user experience', depends_on: ['agent-04-pm'] },
          { agent: 'agent-07-architect', goal: 'Create technical architecture', depends_on: ['agent-05-ba'] },
          { agent: 'agent-08-coder', goal: 'Implement feature code', depends_on: ['agent-05-ba', 'agent-06-ux', 'agent-07-architect'] },
          { agent: 'agent-10-test', goal: 'Write unit tests', depends_on: ['agent-08-coder'] },
          { agent: 'agent-09-review', goal: 'Code review', depends_on: ['agent-08-coder'] },
          { agent: 'agent-11-security', goal: 'Security review', depends_on: ['agent-08-coder'] },
          { agent: 'agent-12-qa', goal: 'Quality assurance testing', depends_on: ['agent-10-test', 'agent-09-review', 'agent-11-security'] },
        ],
      },
      bug_fix: {
        name: 'bug_fix',
        dag: [
          { agent: 'agent-15-incident', goal: 'Investigate and diagnose bug', depends_on: [] },
          { agent: 'agent-08-coder', goal: 'Implement bug fix', depends_on: ['agent-15-incident'] },
          { agent: 'agent-09-review', goal: 'Review fix', depends_on: ['agent-08-coder'] },
          { agent: 'agent-13-devops', goal: 'Deploy fix', depends_on: ['agent-09-review'] },
        ],
      },
    };

    // Simple keyword matching
    const goal = request.goal.toLowerCase();
    if (goal.includes('feature') || goal.includes('build') || goal.includes('implement')) {
      return templates.feature_request;
    }
    if (goal.includes('bug') || goal.includes('fix') || goal.includes('issue')) {
      return templates.bug_fix;
    }

    return null;
  }

  /**
   * Build TaskGraph from template
   */
  private buildTaskGraphFromTemplate: string,
   (
    workflowId correlationId: string,
    request: WorkflowRequest,
    template: { name: string; dag: unknown[] }
  ): TaskGraph {
    const nodes: TaskGraphNode[] = [];
    const edges: TaskGraphEdge[] = [];

    for (let i = 0; i < template.dag.length; i++) {
      const dagNode = template.dag[i] as { agent: string; goal: string; depends_on: string[] };
      const nodeId = `n${i + 1}`;

      nodes.push({
        node_id: nodeId,
        agent_id: dagNode.agent,
        goal: dagNode.goal,
        status: 'pending',
        depends_on: dagNode.depends_on.map(this.mapAgentToNodeId),
        retry_count: 0,
      });

      // Create edges
      for (const dep of dagNode.depends_on) {
        edges.push({
          from: this.mapAgentToNodeId(dep),
          to: nodeId,
        });
      }
    }

    return {
      workflow_id: workflowId,
      correlation_id: correlationId,
      status: 'pending',
      nodes,
      edges,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      checkpoint_history: [],
    };
  }

  /**
   * Map agent ID to node ID (helper)
   */
  private mapAgentToNodeId(agentId: string): string {
    const agentOrder = [
      'agent-04-pm',
      'agent-05-ba',
      'agent-06-ux',
      'agent-07-architect',
      'agent-08-coder',
      'agent-09-review',
      'agent-10-test',
      'agent-11-security',
      'agent-12-qa',
      'agent-13-devops',
      'agent-15-incident',
    ];
    const index = agentOrder.indexOf(agentId);
    return `n${index + 1}`;
  }

  /**
   * Plan with LLM (for non-template requests)
   * This would call the LLM with context about available agents
   */
  private async planWithLLM(
    workflowId: string,
    correlationId: string,
    request: WorkflowRequest
  ): Promise<TaskGraph> {
    // For now, create a simple single-node graph
    // In production, this would call the LLM with available agents context
    const nodeId = 'n1';

    return {
      workflow_id: workflowId,
      correlation_id: correlationId,
      status: 'pending',
      nodes: [
        {
          node_id: nodeId,
          agent_id: 'agent-04-pm',  // Default to PM for planning
          goal: request.goal,
          status: 'pending',
          depends_on: [],
          retry_count: 0,
        },
      ],
      edges: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      checkpoint_history: [],
    };
  }

  /**
   * Validate TaskGraph - enforce invariants
   */
  private async validateTaskGraph(taskgraph: TaskGraph): Promise<void> {
    // Check 1: No circular dependencies (DAG property)
    if (this.hasCircularDependency(taskgraph)) {
      throw new Error('TaskGraph validation failed: circular dependency detected');
    }

    // Check 2: All referenced agents exist
    const validAgents = this.getValidAgentIds();
    for (const node of taskgraph.nodes) {
      if (!validAgents.includes(node.agent_id)) {
        throw new Error(`TaskGraph validation failed: unknown agent ${node.agent_id}`);
      }
    }

    // Check 3: All dependencies are valid node IDs
    const nodeIds = new Set(taskgraph.nodes.map(n => n.node_id));
    for (const node of taskgraph.nodes) {
      for (const dep of node.depends_on) {
        if (!nodeIds.has(dep)) {
          throw new Error(`TaskGraph validation failed: invalid dependency ${dep} for node ${node.node_id}`);
        }
      }
    }

    // Check 4: No orphan nodes (shouldn't happen with valid deps)
    // Check 5: Within concurrency limits
    if (taskgraph.nodes.length > this.config.maxConcurrentTasks) {
      throw new Error(`TaskGraph validation failed: exceeds max concurrent tasks (${this.config.maxConcurrentTasks})`);
    }

    console.log('[Orchestrator] TaskGraph validated successfully');
  }

  /**
   * Check for circular dependencies using DFS
   */
  private hasCircularDependency(taskgraph: TaskGraph): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const node = taskgraph.nodes.find(n => n.node_id === nodeId);
      if (node) {
        for (const dep of node.depends_on) {
          if (!visited.has(dep)) {
            if (dfs(dep)) return true;
          } else if (recursionStack.has(dep)) {
            return true;
          }
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const node of taskgraph.nodes) {
      if (!visited.has(node.node_id)) {
        if (dfs(node.node_id)) return true;
      }
    }

    return false;
  }

  /**
   * Get list of valid agent IDs
   */
  private getValidAgentIds(): string[] {
    return [
      'agent-01-customer-discovery',
      'agent-02-market-research',
      'agent-03-competitor-intel',
      'agent-04-pm',
      'agent-05-ba',
      'agent-06-ux',
      'agent-07-architect',
      'agent-08-coder',
      'agent-09-review',
      'agent-10-test',
      'agent-11-security',
      'agent-12-qa',
      'agent-13-devops',
      'agent-14-sre',
      'agent-15-incident',
      'agent-16-cost-optimizer',
      'agent-17-data-engineer',
      'agent-18-ml-engineer',
      'agent-19-mlops',
      'agent-20-labeling',
      'agent-21-model-monitor',
      'agent-22-data-quality',
      'agent-23-sales',
      'agent-24-content',
      'agent-25-customer-success',
      'agent-26-support',
      'agent-27-feedback',
      'agent-28-billing',
      'agent-29-analytics',
      'agent-30-legal',
      'agent-31-docs',
      'agent-32-governance',
    ];
  }

  /**
   * Execute TaskGraph - main scheduling loop
   */
  private async executeTaskGraph(taskgraph: TaskGraph): Promise<{ status: 'success' | 'failure'; artifacts: Artifact[]; decisions: Decision[] }> {
    taskgraph.status = 'running';
    this.runningWorkflows.set(taskgraph.workflow_id, taskgraph);

    const artifacts: Artifact[] = [];
    const decisions: Decision[] = [];

    while (true) {
      // Check for completion
      const pendingNodes = taskgraph.nodes.filter(n => n.status === 'pending');
      const runningNodes = taskgraph.nodes.filter(n => n.status === 'running');
      const failedNodes = taskgraph.nodes.filter(n => n.status === 'failed');

      if (pendingNodes.length === 0 && runningNodes.length === 0) {
        // All done
        break;
      }

      if (failedNodes.length > 0) {
        // Handle failure - check if critical
        const hasCriticalFailure = this.checkCriticalFailure(taskgraph, failedNodes);
        if (hasCriticalFailure) {
          return { status: 'failure', artifacts, decisions };
        }
      }

      // Find ready nodes (dependencies satisfied + status=pending)
      const readyNodes = this.findReadyNodes(taskgraph);

      // Check concurrency limit
      const availableSlots = this.config.maxConcurrentTasks - runningNodes.length;
      const nodesToDispatch = readyNodes.slice(0, availableSlots);

      if (nodesToDispatch.length === 0 && runningNodes.length === 0) {
        // Deadlock - no ready nodes and nothing running
        console.log('[Orchestrator] Deadlock detected - no ready nodes');
        break;
      }

      // Dispatch ready nodes
      for (const node of nodesToDispatch) {
        await this.dispatchNode(taskgraph, node);
      }

      // Wait a bit before checking again
      await this.sleep(1000);
    }

    // Check final status
    const allCompleted = taskgraph.nodes.every(n => n.status === 'completed');
    return {
      status: allCompleted ? 'success' : 'failure',
      artifacts,
      decisions,
    };
  }

  /**
   * Find nodes that are ready to execute
   */
  private findReadyNodes(taskgraph: TaskGraph): TaskGraphNode[] {
    const ready: TaskGraphNode[] = [];

    for (const node of taskgraph.nodes) {
      if (node.status !== 'pending') continue;

      // Check if all dependencies are completed
      const dependenciesMet = node.depends_on.every(depId => {
        const dep = taskgraph.nodes.find(n => n.node_id === depId);
        return dep?.status === 'completed';
      });

      if (dependenciesMet) {
        ready.push(node);
      }
    }

    return ready;
  }

  /**
   * Dispatch a node to its assigned agent
   */
  private async dispatchNode(taskgraph: TaskGraph, node: TaskGraphNode): Promise<void> {
    console.log(`[Orchestrator] Dispatching node ${node.node_id} to ${node.agent_id}`);

    // Update status
    node.status = 'running';
    taskgraph.updated_at = new Date().toISOString();

    // Create checkpoint before dispatch
    await this.createCheckpoint(taskgraph, `before_dispatch_${node.node_id}`);

    // Create task envelope
    const envelope: TaskEnvelope = {
      taskId: this.generateId(),
      correlationId: taskgraph.correlation_id,
      agentId: node.agent_id,
      goal: node.goal,
      inputs: {},
      constraints: {
        maxTokens: 50000,
        maxLatency: 180000,
      },
    };

    // Track active task
    this.activeTasks.set(envelope.taskId, {
      workflowId: taskgraph.workflow_id,
      nodeId: node.node_id,
    });

    try {
      // Dispatch to agent via A2A Router
      await this.config.a2aRouter.dispatchTask(envelope);
    } catch (error) {
      console.error(`[Orchestrator] Failed to dispatch node ${node.node_id}:`, error);
      node.status = 'failed';
      node.error = error instanceof Error ? error.message : String(error);
    }
  }

  /**
   * Handle agent completion event
   */
  private async handleAgentCompleted(event: WorkflowEvent): Promise<void> {
    const taskId = event.data && typeof event.data === 'object' && 'taskId' in event.data
      ? (event.data as { taskId: string }).taskId
      : null;

    if (!taskId) return;

    const taskInfo = this.activeTasks.get(taskId);
    if (!taskInfo) return;

    const { workflowId, nodeId } = taskInfo;
    const taskgraph = this.runningWorkflows.get(workflowId);
    if (!taskgraph) return;

    const node = taskgraph.nodes.find(n => n.node_id === nodeId);
    if (!node) return;

    // Update node status
    node.status = 'completed';
    node.result = event.data && typeof event.data === 'object' && 'result' in event.data
      ? (event.data as { result: unknown }).result
      : null;
    taskgraph.updated_at = new Date().toISOString();

    // Create checkpoint after completion
    await this.createCheckpoint(taskgraph, `after_completed_${node.node_id}`);

    // Update workflow state
    await this.config.workflowStateStore.saveWorkflow(taskgraph);

    // Emit node completed event
    await this.emitEvent('node.completed', workflowId, nodeId, {
      agent_id: node.agent_id,
      goal: node.goal,
    });

    // Remove from active tasks
    this.activeTasks.delete(taskId);

    console.log(`[Orchestrator] Node ${node.node_id} completed successfully`);
  }

  /**
   * Handle agent failure event
   */
  private async handleAgentFailed(event: WorkflowEvent): Promise<void> {
    const taskId = event.data && typeof event.data === 'object' && 'taskId' in event.data
      ? (event.data as { taskId: string }).taskId
      : null;

    if (!taskId) return;

    const taskInfo = this.activeTasks.get(taskId);
    if (!taskInfo) return;

    const { workflowId, nodeId } = taskInfo;
    const taskgraph = this.runningWorkflows.get(workflowId);
    if (!taskgraph) return;

    const node = taskgraph.nodes.find(n => n.node_id === nodeId);
    if (!node) return;

    // Check retry count
    if (node.retry_count < this.config.maxRetries) {
      node.retry_count++;
      node.status = 'pending';  // Will be retried
      console.log(`[Orchestrator] Node ${node.node_id} failed, retry ${node.retry_count}/${this.config.maxRetries}`);

      // Wait before retry
      await this.sleep(this.config.retryDelayMs * Math.pow(2, node.retry_count - 1));
    } else {
      node.status = 'failed';
      node.error = event.data && typeof event.data === 'object' && 'error' in event.data
        ? (event.data as { error: string }).error
        : 'Unknown error';
      console.log(`[Orchestrator] Node ${node.node_id} failed after max retries`);
    }

    taskgraph.updated_at = new Date().toISOString();

    // Create checkpoint
    await this.createCheckpoint(taskgraph, `after_failed_${node.node_id}`);

    // Update workflow state
    await this.config.workflowStateStore.saveWorkflow(taskgraph);

    // Emit node failed event
    await this.emitEvent('node.failed', workflowId, nodeId, {
      agent_id: node.agent_id,
      error: node.error,
      retry_count: node.retry_count,
    });

    // Remove from active tasks
    this.activeTasks.delete(taskId);
  }

  /**
   * Handle HITL events
   */
  private async handleHITLEvent(event: WorkflowEvent): Promise<void> {
    if (event.type === 'hitl.approved' || event.type === 'hitl.rejected') {
      const requestId = event.data && typeof event.data === 'object' && 'requestId' in event.data
        ? (event.data as { requestId: string }).requestId
        : null;

      if (requestId) {
        const hitlInfo = this.hitlPending.get(requestId);
        if (hitlInfo) {
          // Resume workflow after HITL response
          const taskgraph = this.runningWorkflows.get(hitlInfo.workflowId);
          if (taskgraph) {
            const node = taskgraph.nodes.find(n => n.node_id === hitlInfo.nodeId);
            if (node) {
              if (event.type === 'hitl.approved') {
                node.status = 'pending';  // Retry after approval
              } else {
                node.status = 'failed';
                node.error = 'Rejected by human';
              }
            }
          }
          this.hitlPending.delete(requestId);
        }
      }
    }
  }

  /**
   * Check if failure is critical (has dependents that cannot proceed)
   */
  private checkCriticalFailure(taskgraph: TaskGraph, failedNodes: TaskGraphNode[]): boolean {
    for (const failedNode of failedNodes) {
      // Find nodes that depend on this failed node
      const dependents = taskgraph.nodes.filter(n => n.depends_on.includes(failedNode.node_id));

      // If all dependents are also failed/completed, it's not critical
      const canProceed = dependents.some(d => d.status !== 'failed');
      if (!canProceed && dependents.length > 0) {
        return true;  // Critical - can't proceed
      }
    }
    return false;
  }

  /**
   * Create checkpoint
   */
  private async createCheckpoint(taskgraph: TaskGraph, reason: string): Promise<void> {
    const checkpoint: Checkpoint = {
      checkpoint_id: this.generateId(),
      workflow_id: taskgraph.workflow_id,
      taskgraph_state: JSON.parse(JSON.stringify(taskgraph)),
      timestamp: new Date().toISOString(),
      reason,
    };

    taskgraph.checkpoint_history.push(checkpoint);
    await this.config.workflowStateStore.saveCheckpoint(checkpoint);

    console.log(`[Orchestrator] Checkpoint created: ${checkpoint.checkpoint_id} (${reason})`);
  }

  /**
   * Resume workflow from checkpoint
   */
  async resumeFromCheckpoint(checkpointId: string): Promise<AgentResult> {
    const checkpoints = await this.config.workflowStateStore.getCheckpoints('');
    const checkpoint = checkpoints.find(c => c.checkpoint_id === checkpointId);

    if (!checkpoint) {
      throw new Error(`Checkpoint not found: ${checkpointId}`);
    }

    const taskgraph = checkpoint.taskgraph_state;
    taskgraph.status = 'running';
    taskgraph.updated_at = new Date().toISOString();

    this.runningWorkflows.set(taskgraph.workflow_id, taskgraph);

    console.log(`[Orchestrator] Resuming workflow ${taskgraph.workflow_id} from checkpoint ${checkpointId}`);

    return this.executeTaskGraph(taskgraph);
  }

  /**
   * Emit workflow event
   */
  private async emitEvent(
    type: string,
    workflowId: string,
    nodeId: string | null,
    data?: unknown
  ): Promise<void> {
    const event: WorkflowEvent = {
      type,
      workflow_id: workflowId,
      node_id: nodeId || undefined,
      timestamp: new Date().toISOString(),
      data,
    };

    await this.config.eventBus.publish(type, event);
  }

  /**
   * Submit to HITL queue
   */
  async submitToHITL(workflowId: string, nodeId: string, request: HITLRequest): Promise<string> {
    const requestId = await this.config.hitlQueue.submitRequest(request);
    this.hitlPending.set(requestId, { workflowId, nodeId });

    // Update node status
    const taskgraph = this.runningWorkflows.get(workflowId);
    if (taskgraph) {
      const node = taskgraph.nodes.find(n => n.node_id === nodeId);
      if (node) {
        node.status = 'paused';
        node.checkpoint_id = this.generateId();
      }
    }

    console.log(`[Orchestrator] Submitted node ${nodeId} to HITL queue: ${requestId}`);
    return requestId;
  }

  /**
   * Wait for HITL response
   */
  async waitForHITLResponse(requestId: string, timeoutMs: number = 300000): Promise<HITLQueueItem> {
    return this.config.hitlQueue.waitForResponse(requestId, timeoutMs);
  }

  /**
   * Get workflow status
   */
  async getWorkflowStatus(workflowId: string): Promise<TaskGraph | null> {
    return this.config.workflowStateStore.getWorkflow(workflowId);
  }

  /**
   * Shutdown orchestrator
   */
  async shutdown(): Promise<void> {
    console.log('[Orchestrator] Shutting down...');
    this.runningWorkflows.clear();
    this.activeTasks.clear();
    this.hitlPending.clear();
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createOrchestrator(config: OrchestratorConfig): MasterOrchestrator {
  return new MasterOrchestrator(config);
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main() {
  // Example usage
  const orchestrator = createOrchestrator({
    workflowStateStore: {
      saveWorkflow: async () => {},
      getWorkflow: async () => null,
      saveCheckpoint: async () => {},
      getCheckpoints: async () => [],
    },
    eventBus: {
      publish: async () => {},
      subscribe: async () => {},
    },
    hitlQueue: {
      submitRequest: async () => '',
      getRequestStatus: async () => null,
      waitForResponse: async () => ({ request: {} as HITLRequest, workflow_id: '', node_id: '', created_at: '', status: 'pending' }),
    },
    a2aRouter: {
      dispatchTask: async () => '',
      getTaskStatus: async () => ({ status: 'pending' }),
    },
    promptRegistry: {
      resolvePin: async () => '',
    },
    maxConcurrentTasks: 10,
    maxRetries: 2,
    retryDelayMs: 5000,
    checkpointIntervalMs: 60000,
  });

  await orchestrator.initialize('./manifest.yaml');

  // Example workflow execution
  const result = await orchestrator.executeWorkflow({
    goal: 'Build a new feature for user authentication',
  });

  console.log('Workflow result:', result);

  await orchestrator.shutdown();
}

// Run if main
if (require.main === module) {
  main().catch(console.error);
}

export default MasterOrchestrator;
