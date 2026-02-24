/**
 * Agent Runtime Common Chassis - Shared Types and Interfaces
 *
 * This file contains all TypeScript interfaces and types used across
 * the 13 chassis components.
 */

// ============================================================================
// Core Agent Types
// ============================================================================

export interface AgentManifest {
  id: string;
  name: string;
  role: string;
  version: string;
  capabilities: string[];
  permissions: AgentPermission[];
  invariants: string[];
  maxRetries: number;
  timeout: number;
}

export interface AgentPermission {
  resource: string;
  actions: ('read' | 'write' | 'delete' | 'execute')[];
  constraints?: Record<string, unknown>;
}

export interface AgentIdentity {
  agentId: string;
  agentName: string;
  role: string;
  scopedPermissions: AgentPermission[];
  workloadToken: string;
  tokenExpiresAt: Date;
}

export interface TaskEnvelope {
  taskId: string;
  correlationId: string;
  agentId: string;
  goal: string;
  inputs: Record<string, unknown>;
  constraints: TaskConstraints;
  pins?: TaskPins;
  traceId?: string;
}

export interface TaskConstraints {
  maxTokens: number;
  maxLatency: number;
  budget?: number;
  allowedTools?: string[];
}

export interface TaskPins {
  promptVersion?: string;
  skillVersion?: string;
  modelVersion?: string;
}

export interface AgentResult {
  taskId: string;
  status: 'success' | 'failure' | 'paused' | 'blocked';
  artifacts: Artifact[];
  decisions: Decision[];
  telemetry: TelemetryData;
  error?: AgentError;
}

export interface Artifact {
  id: string;
  type: string;
  path?: string;
  content?: string;
  summary: string;
  createdAt: Date;
}

export interface Decision {
  type: 'plan' | 'action' | 'approval' | 'rejection';
  reason: string;
  confidence: number;
  timestamp: Date;
}

export interface TelemetryData {
  tokensUsed: number;
  latencyMs: number;
  cost: number;
  errors: number;
  actionsExecuted: number;
}

export interface AgentError {
  code: string;
  message: string;
  stack?: string;
  recoverable: boolean;
}

// ============================================================================
// Memory Types (6 Layers)
// ============================================================================

export interface L1WorkingContext {
  identity: string;           // ~200 tokens
  invariants: string;        // ~400 tokens
  skills: string;            // ~20% budget
  projectContext: string;    // ~10% budget
  memory: L1MemorySections;  // ~40% budget
  task: string;              // ~25% budget
  outputFormat: string;     // ~100 tokens
  buffer: string;           // ~5% buffer
}

export interface L1MemorySections {
  episodic: string;   // L2 - what happened before
  semantic: string;  // L3 - what we know
  shared: string;    // L5 - what team knows
  resources: string; // L6 - artifact pointers
}

export interface MemoryEpisode {
  memoryId: string;
  correlationId: string;
  agentId: string;
  timestamp: Date;
  content: string;
  type: 'interaction' | 'decision' | 'tool_call';
  importance: number;
  embedding?: number[];
}

export interface SemanticEntity {
  entityId: string;
  name: string;
  type: string;
  properties: Record<string, unknown>;
  relationships: EntityRelationship[];
  embedding?: number[];
}

export interface EntityRelationship {
  targetId: string;
  relationship: string;
  properties?: Record<string, unknown>;
}

export interface SharedKnowledge {
  knowledgeId: string;
  domain: string;
  content: string;
  contributors: string[];
  timestamp: Date;
}

export interface ResourcePointer {
  resourceId: string;
  path: string;
  summary: string;
  owner: string;
  lastModified: Date;
  freshnessScore: number;
}

// ============================================================================
// Reasoning Types
// ============================================================================

export interface ReasoningPlan {
  steps: PlanStep[];
  confidence: number;
  risks: Risk[];
}

export interface PlanStep {
  stepId: string;
  action: Action;
  expectedOutcome: string;
  verifyCriteria: string[];
}

export interface Action {
  tool?: string;
  parameters?: Record<string, unknown>;
  description: string;
}

// ============================================================================
// Risk and Execution Types
// ============================================================================

export interface Risk {
  dimension: RiskDimension;
  score: number;
  description: string;
}

export type RiskDimension = 'reversibility' | 'blast_radius' | 'data_sensitivity' | 'cost_impact' | 'novelty';

export interface RiskScore {
  total: number;
  dimensions: Record<RiskDimension, number>;
  decision: RiskDecision;
}

export type RiskDecision = 'auto' | 'reflect' | 'defer' | 'block';

export interface ExecutionChecklist {
  actionId: string;
  checks: ChecklistItem[];
  passed: boolean;
}

export interface ChecklistItem {
  id: string;
  description: string;
  passed: boolean;
  reason?: string;
}

// ============================================================================
// Tool and MCP Types
// ============================================================================

export interface ToolCall {
  toolId: string;
  toolName: string;
  parameters: Record<string, unknown>;
  timeout?: number;
  retryPolicy?: RetryPolicy;
}

export interface ToolResult {
  toolId: string;
  status: 'success' | 'failure' | 'timeout';
  output?: unknown;
  error?: string;
  latencyMs: number;
  rollbackAvailable: boolean;
  rollbackAction?: Action;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMs: number;
  exponentialBackoff: boolean;
}

export interface MCPServer {
  serverId: string;
  name: string;
  url: string;
  capabilities: string[];
  tools: MCPTool[];
  status: 'active' | 'inactive' | 'error';
}

export interface MCPTool {
  toolId: string;
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

// ============================================================================
// Invariant Types
// ============================================================================

export interface Invariant {
  id: string;
  name: string;
  description: string;
  check: InvariantCheck;
  severity: 'error' | 'warning';
}

export type InvariantCheck = (context: InvariantContext) => Promise<InvariantResult>;

export interface InvariantContext {
  action?: Action;
  plan?: ReasoningPlan;
  task?: TaskEnvelope;
  agent?: AgentIdentity;
}

export interface InvariantResult {
  passed: boolean;
  message?: string;
  remediation?: string;
}

export interface InvariantsConfig {
  invariants: Invariant[];
  failOnWarning: boolean;
}

// ============================================================================
// Plugin Types
// ============================================================================

export interface Plugin {
  id: string;
  name: string;
  version: string;
  type: 'tool' | 'knowledge' | 'workflow';
  initialize: () => Promise<void>;
  execute: (context: PluginContext) => Promise<PluginResult>;
  shutdown?: () => Promise<void>;
}

export interface PluginContext {
  agentId: string;
  taskId: string;
  inputs: Record<string, unknown>;
}

export interface PluginResult {
  success: boolean;
  output?: unknown;
  error?: string;
}

// ============================================================================
// HITL (Human-in-the-Loop) Types
// ============================================================================

export interface HITLRequest {
  requestId: string;
  taskId: string;
  agentId: string;
  action: Action;
  riskScore: RiskScore;
  checkpoint: HITLCheckpoint;
  requestedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  response?: HITLResponse;
}

export interface HITLCheckpoint {
  completedSteps: string[];
  accumulatedResults: unknown[];
  pendingAction: Action;
}

export interface HITLResponse {
  decision: 'approved' | 'rejected';
  comment?: string;
  modifiedAction?: Action;
  responderId: string;
  respondedAt: Date;
}

export interface HITLConfig {
  enabled: boolean;
  triggers: HITLTrigger[];
  autoApproveBelowRisk: number;
}

export interface HITLTrigger {
  type: 'risk_threshold' | 'confidence_threshold' | 'tool_specific' | 'custom';
  threshold?: number;
  toolNames?: string[];
  customCondition?: string;
}

// ============================================================================
// Self-Monitoring Types
// ============================================================================

export interface AgentMetrics {
  agentId: string;
  taskId: string;
  timestamp: Date;
  tokensUsed: number;
  tokensInput: number;
  tokensOutput: number;
  latencyMs: number;
  errors: number;
  confidence: number;
  cost: number;
  actionsExecuted: number;
  actionsSucceeded: number;
}

export interface MetricsSummary {
  agentId: string;
  periodStart: Date;
  periodEnd: Date;
  totalTasks: number;
  successRate: number;
  avgLatencyMs: number;
  avgTokensUsed: number;
  avgCost: number;
  errorRate: number;
}

// ============================================================================
// Project Context Types
// ============================================================================

export interface ProjectContext {
  platform: PlatformContext;
  architecture: ArchitectureContext;
  conventions: ConventionsContext;
}

export interface PlatformContext {
  name: string;
  version: string;
  description: string;
  components: string[];
}

export interface ArchitectureContext {
  layers: ArchitectureLayer[];
  patterns: string[];
  integrations: string[];
}

export interface ArchitectureLayer {
  name: string;
  purpose: string;
  components: string[];
}

export interface ConventionsContext {
  codeStyles: Record<string, string>;
  namingConventions: Record<string, string>;
  bestPractices: string[];
}

// ============================================================================
// Skill Types
// ============================================================================

export interface Skill {
  skillId: string;
  name: string;
  version: string;
  type: 'platform' | 'domain' | 'learned';
  content: string;
  loadedAt?: Date;
}

export interface SkillsManifest {
  skills: Skill[];
  loadedAt: Date;
  totalTokens: number;
}

// ============================================================================
// Token Management Types
// ============================================================================

export interface TokenRotationConfig {
  rotationIntervalMs: number;
  refreshBufferMs: number;
  maxRetries: number;
}

export interface TokenInfo {
  token: string;
  issuedAt: Date;
  expiresAt: Date;
  isValid: boolean;
}

// ============================================================================
// Error Types
// ============================================================================

export class ChassisError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly component: string,
    public readonly recoverable: boolean = true
  ) {
    super(message);
    this.name = 'ChassisError';
  }
}

export class AuthenticationError extends ChassisError {
  constructor(message: string) {
    super(message, 'AUTH_ERROR', 'IdentityAuth', false);
    this.name = 'AuthenticationError';
  }
}

export class InvariantViolationError extends ChassisError {
  constructor(message: string, public readonly invariantId: string) {
    super(message, 'INVARIANT_VIOLATION', 'InvariantsEngine', false);
    this.name = 'InvariantViolationError';
  }
}

export class RiskThresholdExceededError extends ChassisError {
  constructor(message: string, public readonly riskScore: RiskScore) {
    super(message, 'RISK_THRESHOLD', 'ExecutionGuard', false);
    this.name = 'RiskThresholdExceededError';
  }
}

export class ToolExecutionError extends ChassisError {
  constructor(
    message: string,
    public readonly toolName: string,
    public readonly toolResult?: ToolResult
  ) {
    super(message, 'TOOL_EXECUTION', 'ActionExecutor', true);
    this.name = 'ToolExecutionError';
  }
}

export class HITLRequiredError extends ChassisError {
  constructor(message: string, public readonly hitlRequest: HITLRequest) {
    super(message, 'HITL_REQUIRED', 'HITLGate', false);
    this.name = 'HITLRequiredError';
  }
}
