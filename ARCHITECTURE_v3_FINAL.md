# Deep Agent Meta Platform — Complete Architecture Specification

> **Version:** 3.0 (Implementation-Grade Single Source of Truth)
> **Date:** February 24, 2026
> **Status:** FINAL — All decisions resolved, all P0 gaps closed, all implementation detail included
> **Purpose:** THE one document autonomous coding agents use to build the platform. Contains everything: architecture, algorithms, schemas, APIs, flows, contracts, policies.

---

## Table of Contents

```
PART I — PLATFORM OVERVIEW
  1. Executive Overview & Design Principles
  2. Architecture Decisions (12 ADRs — no ambiguity)
  3. Platform Statistics

PART II — LAYER-BY-LAYER ARCHITECTURE (7 Layers, every component)
  4. Layer 1: Human Interaction
  5. Layer 2: Gateway & API Management
  6. Layer 3: Orchestration & Routing
  7. Layer 4: Agent Runtime (Deep Agent Chassis)
  8. Layer 5: Memory & Knowledge (6-Layer System)
  9. Layer 6: Tools & Extensions (MCP)
  10. Layer 7: Governance & Observability

PART III — THE 33-AGENT ROSTER
  11. Complete Agent Registry (L0-L8)

PART IV — IMPLEMENTATION SPECIFICATIONS (the P0 specs)
  12. Context Compiler Algorithm (L1 template, budgets, retrieval, conflict rules)
  13. Memory Service gRPC API
  14. Database Schemas (full DDL — Postgres, Neo4j, Redis, S3)
  15. Agent SDK & Manifest Format (YAML, lifecycle, HITL)
  16. TaskGraph Engine (DAG structure, planning algorithm, failure handling)
  17. Error Handling & Degradation Matrix

PART V — DATA FLOWS & WIRE MAP
  18. Network Protocol Map (W1-W24 — every arrow)
  19. Standard Flows (F1-F8)
  20. User Flow Walkthroughs (5 end-to-end scenarios)

PART VI — CONTRACTS & EVENTS
  21. Key Contracts (TaskEnvelope, AgentResult, ToolCall, MemoryRecord)
  22. Event Catalog (35+ events with payload schemas)

PART VII — CROSS-CUTTING INFRASTRUCTURE
  23. Execution Guard Policies (risk scoring, checklists, per-agent matrices)
  24. Data Classification (5-tier with agent clearance)
  25. Tool Permissions Matrix
  26. Write Authority & Artifact Ownership
  27. Quality Rubrics (per-agent metrics)

PART VIII — OPERATIONS
  28. Technology Stack
  29. Bootstrap Build Order (8-week plan)
  30. Local Development Setup
  31. File Locations & Conventions
```

---

# PART I — PLATFORM OVERVIEW

---

## 1. Executive Overview

The **Deep Agent Meta Platform** is a production-grade multi-agent system designed to build, operate, and scale AI-first applications. It consists of **7 architectural layers** housing **33 specialized agents** coordinated through event-driven communication, a 6-layer memory system, and code-enforced governance.

### Core Design Principles

| # | Principle | What It Means |
|---|-----------|--------------|
| 1 | **Memory as Foundation** | 6-layer memory (L1-L6) gives agents human-like context awareness — not just RAG |
| 2 | **Coordination via Events** | NATS JetStream pub/sub decouples agents — no direct dependencies |
| 3 | **Safety via Invariants** | Rules enforced by code (Execution Guard + OPA), never by prompts alone |
| 4 | **Quality via Governance** | Agent-32 continuously evaluates all agents — weekly scoring, drift detection |
| 5 | **Reproducibility via Pins** | Every execution pinned to specific prompt/skill/model versions via git SHA |
| 6 | **Deep Agents over Shallow Swarms** | Each agent has deep domain expertise, not generic capability |

### Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 7: GOVERNANCE & OBSERVABILITY                                        │
│ Policy Engine │ Audit Ledger │ Eval Harness │ Cost Tracker │ Alert Manager │
├─────────────────────────────────────────────────────────────────────────────┤
│ LAYER 6: TOOLS & EXTENSIONS (MCP)                                         │
│ Tool Gateway │ Policy Preflight │ MCP Registry │ Tool Versioning          │
├─────────────────────────────────────────────────────────────────────────────┤
│ LAYER 5: MEMORY & KNOWLEDGE                                               │
│ L1 Working │ L2 Episodic │ L3 Semantic │ L4 Procedural │ L5 Shared │ L6  │
├─────────────────────────────────────────────────────────────────────────────┤
│ LAYER 4: AGENT RUNTIME                                                     │
│ Deep Agent Chassis (13 components) │ Context Compiler │ Execution Guard   │
├─────────────────────────────────────────────────────────────────────────────┤
│ LAYER 3: ORCHESTRATION & ROUTING                                           │
│ Orchestrator │ TaskGraph │ A2A Router │ Event Bus │ HITL Queue │ Model Rtr│
├─────────────────────────────────────────────────────────────────────────────┤
│ LAYER 2: GATEWAY & API MANAGEMENT                                          │
│ API Gateway │ Auth │ Rate Limiting │ Circuit Breaker │ Validation          │
├─────────────────────────────────────────────────────────────────────────────┤
│ LAYER 1: HUMAN INTERACTION                                                 │
│ Web UI │ Mobile App │ API/SDK │ Agent CLI │ Chat Interface │ Webhooks     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Architecture Decisions (FINAL — No Ambiguity)

Every technology choice is made. No more "X or Y."

| ADR | Decision | Choice | Rationale |
|-----|----------|--------|-----------|
| 001 | Event Bus | **NATS JetStream** | Simpler ops than Kafka, built-in persistence + request-reply, sufficient for 33 agents |
| 002 | Graph Database | **Neo4j 5** | Cypher maturity, APOC library, managed Aura option available |
| 003 | Orchestrator Intelligence | **Planner** (builds TaskGraph DAGs) | Task decomposition IS planning — own it. LLM-assisted for novel tasks, template-based for known patterns |
| 004 | L5 Shared Memory | **Persistent graph in Neo4j** (shared namespace) + event-driven invalidation | Single source of truth; events notify consumers of changes, consumers read from graph |
| 005 | Agent Framework | **Custom chassis** (not LangGraph) | 13-component chassis designed specifically; LangGraph would fight the memory/invariants model |
| 006 | Agent Config Format | **YAML manifest** + prompt directory + invariants file | Declarative: runtime interprets manifest, no Python class per agent |
| 007 | HITL Channel | **Webhook + CLI** (P1), Slack/Dashboard (P2) | Don't over-build human UI before the agent loop works |
| 008 | Local Development | **Docker Compose** (Postgres, Neo4j, Redis, NATS, MinIO) | `docker compose up` = full platform locally |
| 009 | Event Schema Registry | **Git-based** (JSON Schemas in `/libs/contracts/events/`) | Schemas versioned alongside code; CI validates on push |
| 010 | Embedding Model | **voyage-3** (1024 dimensions) behind abstract interface | Good quality, reasonable cost; interface allows swap to local model later |
| 011 | A2A Protocol | **Custom gRPC** (not LF A2A directly) | LF A2A still maturing; custom gives full control now, can adopt later |
| 012 | Object Store | **MinIO** (dev/local), **S3** (production) | S3-compatible API everywhere |

---

## 3. Platform Statistics

| Metric | Value |
|--------|-------|
| Architectural Layers | 7 |
| Specialized Agents | 33 |
| Memory Layers | 6 (L1-L6) |
| Event Types | 35+ |
| MCP Tool Servers | 20+ |
| Components (v3 total) | 50+ |
| Network Wires (W1-W24) | 24 documented connections |
| Backing Stores | 5 (Redis, Postgres+pgvector, Neo4j, MinIO/S3, Git) |

---

# PART II — LAYER-BY-LAYER ARCHITECTURE

---

## 4. Layer 1: Human Interaction

**Purpose:** Entry points for humans to interact with the platform.

| Component | Purpose | Protocol |
|-----------|---------|----------|
| **Web UI** | Browser-based dashboard for workflow management | HTTPS |
| **Mobile App** | Native mobile applications (iOS/Android) | HTTPS |
| **API/SDK** | REST/GraphQL API for programmatic access | REST/GraphQL |
| **Agent CLI** | Command-line interface for agent tasking | CLI + HTTPS |
| **Chat Interface** | Natural language conversation with agents | WebSocket/HTTPS |
| **Webhook Endpoints** | Event-driven integrations with external systems | HTTPS |

---

## 5. Layer 2: Gateway & API Management

**Purpose:** Authentication, authorization, rate limiting, request validation, resilience.

| Component | Purpose | Protocol | Deploy As |
|-----------|---------|----------|-----------|
| **API Gateway** | Entry point: REST/GraphQL, schema validation, correlation_id generation | HTTPS | K8s Service |
| **Auth & Identity** | OIDC/JWT for humans, workload identities for agents, 15-min token rotation | OAuth 2.1 | K8s Service |
| **Rate Limiter** | Per-user, per-agent throttling (token bucket) | Internal | K8s Service |
| **Circuit Breaker** | Fail-fast resilience when downstream services fail | Internal | Library |
| **API Versioning** | Support /api/v1, /api/v2 evolution | REST | Config |
| **Request Cache** | Redis-based caching for repeated queries | Redis | K8s Service |
| **Validation** | JSON Schema validation for all requests via OpenAPI 3.0 | Internal | Library |

**Network flow:**
```
Clients → API Gateway (W1) → Auth (W2) → Rate Limit → Validation → Orchestrator (W3)
```

---

## 6. Layer 3: Orchestration & Routing

**Purpose:** Coordinates task execution across multiple agents. This is the BRAIN of the platform.

| Component | Purpose | Protocol | Deploy As |
|-----------|---------|----------|-----------|
| **Master Orchestrator (Agent 00)** | TaskGraph planner: decomposes requests → DAG of agent tasks, tracks progress, checkpoints | gRPC | K8s StatefulSet |
| **TaskGraph Engine** | Builds and executes DAGs; manages node dependencies, parallel dispatch, failure handling | Internal (library) | Inside Orchestrator |
| **A2A Router** | Routes TaskEnvelopes to specific agent containers; load balancing; delegation chain tracking | gRPC | K8s Service |
| **Workflow Scheduler** | Task priority queues, scheduling, retry management | Internal | Inside Orchestrator |
| **Event Bus (NATS JetStream)** | Pub/sub for state propagation; durable streams, consumer groups, replay, dead-letter queue | NATS | K8s StatefulSet |
| **HITL Queue** | Human-in-the-loop approval requests; persistent storage for pending approvals | gRPC + Postgres | K8s Service |
| **Checkpoint Manager** | Persists workflow state for pause/resume/crash recovery | Postgres + S3 | Inside Orchestrator |
| **Model Router** | Selects optimal LLM per task based on complexity, cost, and quality requirements | Internal | Library |
| **Agent Registry** | Tracks all 33 agent deployments, health status, capabilities | Postgres | K8s Service |
| **Prompt & Skill Registry** | Maps prompt@semver → git SHA; serves pinned content to agents | gRPC + Git | K8s Service |
| **Workflow State Store** | Persists TaskGraph state, checkpoint data, idempotency ledgers | Postgres + S3 | K8s Service |

**Key flows through this layer:**

```
Synchronous (F1):  Client → Gateway → Orchestrator → A2A Router → Agent(s) → Result
Async (F3):        Producer → Event Bus (schema-validated) → Consumer(s) → Memory reads
Delegation (F2):   Primary Agent → A2A Router → Delegate Agent → AgentResult back
```

---

## 7. Layer 4: Agent Runtime (Deep Agent Chassis)

**Purpose:** The execution environment for every agent. All 33 agents share the same 13-component chassis.

### 7.1 Chassis Components

| # | Component | Purpose |
|---|-----------|---------|
| 1 | **Identity & Auth** | Unique agent identity, scoped permissions, short-lived tokens (15-min rotation) |
| 2 | **Skills Reader** | Loads SKILL.md files before acting (platform, domain, learned skills) |
| 3 | **Project Context** | Loads PLATFORM.md, ARCHITECTURE.md, CONVENTIONS.md |
| 4 | **Context Compiler** | Assembles L1 working context within token budget (see Section 12 for full algorithm) |
| 5 | **Memory Manager** | Manages all 6 memory layers (read/write/sync/prune) |
| 6 | **Reasoning Engine** | Loop-optimized: plan → act → verify → adjust |
| 7 | **Invariants Engine** | Code-enforced non-negotiable rules (not prompts) |
| 8 | **Execution Guard** | Risk scoring (5 dimensions), pre-action checklists, confidence thresholds |
| 9 | **Tool Belt (MCP)** | Connects to domain-specific MCP servers via Tool Gateway |
| 10 | **Plugin Manager** | Runtime extensibility for tools/knowledge/workflows |
| 11 | **Action Executor** | Sandboxed tool execution with rollback capability |
| 12 | **Self-Monitor** | Tracks tokens, errors, confidence, cost, latency |
| 13 | **HITL Gate** | Configurable human approval checkpoints |

### 7.2 Agent Lifecycle (11 Steps)

This is the exact sequence inside every agent container:

```
[1] INIT
    ├── Load manifest.yaml + invariants.yaml
    ├── Register with A2A Router (send Agent Card with capabilities)
    ├── Obtain workload identity token from Auth Service
    ├── Subscribe to event topics (NATS)
    └── Report "ready" to Orchestrator

[2] WAIT FOR WORK (event loop)
    ├── Listen on gRPC port for TaskEnvelope from A2A Router
    ├── Listen on NATS for subscribed events
    └── Background: token rotation every 15 min

[3] TASK RECEIVED
    ├── Validate TaskEnvelope schema
    ├── Extract pins (prompt version, skill version, model version)
    ├── Start OTel trace span (trace_id = correlation_id)
    └── Begin task processing

[4] CONTEXT COMPILATION (calls Memory Service)
    ├── Load pinned skills from L4 via Prompt Registry
    ├── Load project context files
    ├── Call memory.compile_context(task, agent_id, budget)
    ├── Receive L1 Working Context
    └── Cache in Redis: l1:{agent_id}:{task_id}

[5] REASONING (LLM call via Model Router)
    ├── Send L1 Working Context to selected LLM
    ├── Receive structured response: PLAN, ACTIONS, CONFIDENCE, RISKS
    └── Parse response

[6] EXECUTION GUARD (pre-action check)
    For each proposed ACTION:
    ├── Compute risk score (5 dimensions × weights)
    ├── Check confidence × risk matrix
    ├── Run invariant checks (code, not prompt)
    ├── Query Policy Engine (OPA) for permissions
    └── Decision:
        ├── PASS → proceed to Tool Execution
        ├── CONDITIONAL → narrow action scope, proceed
        ├── DEFER → submit to HITL Queue, PAUSE task
        └── BLOCK → log violation, skip action, re-plan

[7] TOOL EXECUTION (via Tool Gateway)
    ├── Send ToolCall to Tool Gateway (gRPC)
    ├── Tool Gateway runs preflight (policy check via OPA)
    ├── Tool Gateway executes via MCP server (sandboxed)
    ├── Receive ToolResult (schema-validated)
    └── Verify result matches expectations

[8] VERIFY & LOOP
    ├── Did action produce expected outcome?
    │   ├── YES → next action in plan
    │   └── NO → adjust plan, retry (max 3 retries per action)
    └── All actions done? → proceed to Memory Write

[9] MEMORY WRITE (calls Memory Service)
    ├── Always: Append to L2 (what happened, tool calls, outcomes, decisions)
    ├── If new facts: Update L3 (entities/relationships)
    ├── If cross-agent relevant: Update L5 (publish event first)
    └── If new artifacts: Register in L6 (artifact index)

[10] EVENT PUBLISH
     ├── Emit domain events to NATS (e.g., coder.pr.created)
     └── Events validated against JSON Schema before publish

[11] RETURN RESULT
     ├── Build AgentResult (status, artifacts, decisions, telemetry)
     ├── Send to Orchestrator via A2A Router
     ├── Close OTel trace span
     └── Return to [2] WAIT FOR WORK
```

### 7.3 HITL Pause/Resume Mechanism

```
Agent reaches HITL gate (step [6] DEFER)
    │
    ▼
[PAUSE]
    ├── Serialize: task_id, plan step, accumulated results, pending action
    ├── Write to hitl_queue (Postgres)
    ├── Write checkpoint to workflow_state
    ├── Emit event: hitl.approval.requested
    └── Agent releases task (returns to WAIT)
    │
    ▼
[HUMAN RESPONDS] (via CLI / webhook / Slack)
    ├── Update hitl_queue: status = approved | rejected
    ├── Emit event: hitl.approval.resolved
    │
    ▼
[RESUME]
    ├── Orchestrator receives event
    ├── Re-dispatches TaskEnvelope with checkpoint_ref
    ├── Agent loads checkpoint
    ├── Skips completed steps (idempotency ledger)
    └── Continues from deferred action
```

---

## 8. Layer 5: Memory & Knowledge (6-Layer System)

### 8.1 Layer Overview

| Layer | Name | What It Stores | Primary Store | Access Scope |
|-------|------|----------------|---------------|-------------|
| **L1** | Working | Compiled context for current LLM call | Redis | Per-agent, per-task |
| **L2** | Episodic | Timestamped interactions, decisions, tool calls | Postgres + pgvector | Per-agent + audit |
| **L3** | Semantic | Facts, entities, relationships, rules | Neo4j Graph | Per-agent + scoped |
| **L4** | Procedural | Versioned prompts, skills, procedures | Git | Global, versioned |
| **L5** | Shared | Cross-agent knowledge ("who knows what") | Neo4j (shared namespace) | Scoped shared |
| **L6** | Resource | Indexed pointers to artifacts (code, docs, configs) | Postgres index + S3/MinIO | Global |

### 8.2 Memory Read Flow (before LLM call — Context Compiler)

```
TaskEnvelope arrives → Context Compiler activates:

  0) Check Redis cache: l1:{agent_id}:{task_id} → if fresh, return cached
  1) Embed(task.goal) via Embedding Service (voyage-3, 1024d)
  2) Query L2 episodic: correlation_id exact match + vector similarity top-20
  3) Query L3 semantic: entity extraction + graph traversal 1-2 hops + vector top-15
  4) Load L4 procedural: pinned prompts/skills from Git via Prompt Registry
  5) Query L5 shared: domain-scoped shared facts + transactive index
  6) Query L6 resources: vector search on artifact index + freshness filter
  7) Rank, budget-allocate, resolve conflicts, assemble L1 Working Context
  8) Cache L1 in Redis, attach provenance annotations
  9) Return to Agent Runtime → send to LLM
```

### 8.3 Memory Write Flow (after LLM call)

```
Always: Append to L2 (ground truth — NEVER update, NEVER delete)
If new facts discovered: Update L3 (upsert entity with CAS)
If reusable pattern: Propose L4 update (governed, PR-gated)
If cross-agent relevant: Publish event + update L5 (write authority checked)
If artifact produced: Register in L6 index (upsert by artifact_path)
```

---

## 9. Layer 6: Tools & Extensions (MCP)

**Purpose:** Extensible tool ecosystem via Model Context Protocol.

### 9.1 Tool Gateway Architecture

| Component | Purpose |
|-----------|---------|
| **Tool Gateway** | Central hub for all tool execution; gRPC service |
| **Policy Preflight** | Validates agent permissions via OPA before every tool call |
| **Schema Validation** | Validates tool input/output against JSON schemas |
| **Sandbox Executor** | Isolated execution environment (FS/network allowlist) |
| **MCP Registry** | Discovers and manages available MCP servers and their tools |
| **Tool Versioning** | Pins tool versions for reproducibility |

### 9.2 MCP Server Catalog

| MCP Server | Purpose | Used By (Agents) |
|------------|---------|-------------------|
| mcp-filesystem | Read/write project files | All (scoped by TOOL_PERMISSIONS) |
| mcp-git | Git operations (commit, PR, diff, branch) | 08, 09, 13 |
| mcp-terminal | Shell command execution | 08, 10, 13, 17, 18, 19 |
| mcp-database | SQL queries against project DB | 05, 08, 14, 15, 17, 22, 29 |
| mcp-websearch | Web search for research | 02, 03, 24 |
| mcp-email | Email drafting/sending | 23, 25, 26, 28 |
| mcp-crm | CRM operations | 23, 25, 26, 28, 01 |
| mcp-notify | System notifications | 00, 03, 11, 14, 15, 16, 28, 32 |
| mcp-analytics | Product analytics platform | 29, 01, 04, 06, 12, 25 |
| mcp-semgrep | SAST security scanning | 11, 09 |
| mcp-snyk | Dependency vulnerability scanning | 11 |
| mcp-gitleaks | Secret detection | 11 |
| mcp-zap | DAST scanning (staging only) | 11 |
| mcp-vault | Secret management | 13 |
| mcp-prometheus | Metrics queries | 14, 15, 16, 21, 32 |
| mcp-grafana | Dashboard management | 14, 15 |
| mcp-loki | Log queries | 14, 15 |
| mcp-mlflow | ML experiment + model registry | 18, 19, 21 |
| mcp-dvc | Dataset versioning | 17, 18, 20 |
| mcp-stripe | Payment operations | 28, 16 |
| mcp-helpdesk | Support ticket management | 26, 27 |
| mcp-featureflags | Feature flag management | 29, 08 |
| mcp-labelstudio | Labeling tool management | 20 |

### 9.3 Tool Execution Flow (F8)

```
1. Agent → ToolCall request (via gRPC to Tool Gateway)
2. Tool Gateway: Policy Preflight
   ├── Check agent identity → tool permission matrix
   ├── Check data classification clearance
   ├── Check write authority (if mutation)
   ├── Assign timeout + retry policy + sandbox profile
3. Schema Validation (input args)
4. Sandbox Execution (MCP server, isolated FS/network)
5. Output Validation (schema check)
6. Audit Log Write (L2 episodic + audit_log table)
7. Event Publish (if downstream agents must react)
8. Return ToolResult to Agent
```

**Rollback rule:** Any tool that mutates must provide either a rollback operation or produce an artifact diff that can be reverted.

---

## 10. Layer 7: Governance & Observability

**Purpose:** Safety, quality assurance, cost management, operational monitoring.

### 10.1 Components

| Component | Purpose | Deploy As |
|-----------|---------|-----------|
| **Policy Engine (OPA)** | Risk scoring, tool permissions, data classification enforcement | K8s Service |
| **Audit Ledger** | Immutable log of all operations (Postgres append-only) | K8s Service |
| **Eval Harness** | Regression testing for agent outputs (golden tasks) | Batch Job |
| **Security Scanner** | SAST/DAST scanning integration | Via MCP servers |
| **Cost Tracker** | Token usage, infrastructure costs, per-agent budgets | K8s Service |
| **Alert Manager** | SLO breaches, cost anomalies, security alerts | K8s Service |
| **Prometheus** | Metrics collection | K8s StatefulSet |
| **Loki** | Log aggregation | K8s StatefulSet |
| **OTel Collector** | Distributed tracing (trace_id = correlation_id) | K8s DaemonSet |
| **Tempo** | Trace storage | K8s StatefulSet |
| **Grafana** | Dashboards and visualization | K8s Service |

### 10.2 Risk Scoring (5 Dimensions)

| Dimension | Weight | LOW (1) | MEDIUM (2) | HIGH (3) | CRITICAL (4) |
|-----------|--------|---------|------------|----------|--------------|
| Reversibility | 25% | Fully reversible | Partially reversible | Difficult to reverse | Irreversible |
| Blast Radius | 25% | Single file/record | Single service/module | Multiple services | Production-wide |
| Data Sensitivity | 20% | Public | Internal | Confidential | PII/Regulated |
| Cost Impact | 15% | < $1 | $1–$50 | $50–$500 | > $500 |
| Novelty | 15% | Routine (100+ times) | Familiar (5-100) | Uncommon (1-5) | First-time |

```
risk_score = (reversibility × 0.25) + (blast_radius × 0.25) +
             (data_sensitivity × 0.20) + (cost_impact × 0.15) +
             (novelty × 0.15)
```

### 10.3 Confidence × Risk Matrix

```
                    Risk LOW    Risk MEDIUM   Risk HIGH    Risk CRITICAL
Confidence ≥ 0.85   AUTO        AUTO+LOG      DEFER        BLOCK
Confidence 0.70–84  AUTO        REFLECT       DEFER        BLOCK
Confidence 0.50–69  AUTO        PEER-REVIEW   DEFER        BLOCK
Confidence 0.30–49  REFLECT     DEFER         BLOCK        BLOCK
Confidence < 0.30   DEFER       BLOCK         BLOCK        BLOCK
```

### 10.4 Quality Rubrics (3-Bucket Metrics)

| Bucket | What It Measures | Pass Threshold |
|--------|-----------------|----------------|
| **Reliability** | Success rate, task completion, retry rate | ≥ 85% |
| **Quality** | Rubric scoring, defect escape rate, first-approval rate | ≥ 85% |
| **Efficiency** | Time-to-complete, token cost vs baseline | ≤ baseline + 20% |

### 10.5 Governance Eval Cycle

```
WEEKLY:
  1. Agent-32 collects metrics from logs + tool traces
  2. Samples 5-10 outputs per agent for quality rubric scoring
  3. Computes composite: reliability, quality, efficiency
  4. Publishes: agent.quality.score event
  5. Orchestrator adjusts routing:
     - status=healthy → normal routing
     - status=degraded → mandatory HITL review
     - status=critical → stop routing until human intervenes

QUARTERLY:
  1. Human reviews rubric calibration
  2. Baseline adjustment
  3. Threshold review
```

---

# PART III — THE 33-AGENT ROSTER

---

## 11. Complete Agent Registry

### Layer 0: Orchestration

| ID | Agent | Role | Autonomy | Key Tools |
|----|-------|------|----------|-----------|
| **00** | Master Orchestrator | Central coordinator: TaskGraph DAGs, routing, checkpointing | System | mcp-taskqueue, mcp-a2a-registry, mcp-eventbus |

### Layer 1: Discovery & Product

| ID | Agent | Role | Autonomy | Key Tools |
|----|-------|------|----------|-----------|
| **01** | Customer Discovery | Customer evidence, ICP, problem validation | Medium | mcp-filesystem, mcp-crm, mcp-analytics |
| **02** | Market Research | Market analysis, TAM/SAM/SOM, trends | High | mcp-websearch, mcp-filesystem |
| **03** | Competitor Intelligence | Competitor monitoring, SWOT | High | mcp-websearch, mcp-filesystem, mcp-notify |
| **04** | Product Manager | BRD, user stories, backlog, roadmap | Medium | mcp-filesystem |
| **05** | Business Analyst | JSON schemas, API contracts, domain models | Medium | mcp-filesystem, mcp-database |

### Layer 2: Design & Engineering

| ID | Agent | Role | Autonomy | Key Tools |
|----|-------|------|----------|-----------|
| **06** | UX Designer | User journeys, wireframes, design system | Medium | mcp-filesystem, mcp-analytics |
| **07** | Architect | High-level design, ADRs, threat models | Low | mcp-filesystem, mcp-websearch |
| **08** | Coder | Feature implementation, clean code | High | mcp-filesystem, mcp-git, mcp-terminal, mcp-database |
| **09** | Code Reviewer | PR reviews, quality/security checks | High | mcp-filesystem, mcp-git, mcp-semgrep |
| **10** | Test Engineer | Unit/integration/contract tests | High | mcp-filesystem, mcp-git, mcp-terminal |

### Layer 3: Quality & Trust

| ID | Agent | Role | Autonomy | Key Tools |
|----|-------|------|----------|-----------|
| **11** | Trust & Security | SAST, dependency audits, OWASP | High | mcp-semgrep, mcp-snyk, mcp-gitleaks, mcp-zap |
| **12** | QA & Performance | E2E testing, load testing, release signoff | Medium | mcp-filesystem, mcp-terminal |

### Layer 4: Operations

| ID | Agent | Role | Autonomy | Key Tools |
|----|-------|------|----------|-----------|
| **13** | DevOps | CI/CD, IaC, deployments | Medium | mcp-filesystem, mcp-git, mcp-terminal |
| **14** | SRE & Resilience | Monitoring, SLOs, disaster recovery | Medium | mcp-prometheus, mcp-grafana, mcp-loki |
| **15** | Incident Responder | Diagnosis, runbooks, escalation | Medium | mcp-prometheus, mcp-loki, mcp-notify |
| **16** | Cost Optimizer | Infrastructure/API cost tracking | Medium | mcp-prometheus, mcp-stripe |

### Layer 5: Data & ML

| ID | Agent | Role | Autonomy | Key Tools |
|----|-------|------|----------|-----------|
| **17** | Data Engineer | Pipelines, ingestion, transformation | Medium | mcp-filesystem, mcp-terminal, mcp-database, mcp-dvc |
| **18** | ML Engineer | Training, evaluation, model development | Medium | mcp-mlflow, mcp-dvc, mcp-terminal |
| **19** | MLOps Pipeline | Registry, serving, reproducibility | Medium | mcp-mlflow, mcp-terminal |
| **20** | Labeling & Ground Truth | Annotation, dataset versioning | Medium | mcp-labelstudio, mcp-dvc |
| **21** | Model Monitor | Drift detection, accuracy tracking | High | mcp-mlflow, mcp-prometheus |
| **22** | Data Quality | Schema compliance, freshness validation | High | mcp-database, mcp-filesystem |

### Layer 6: Revenue & Growth

| ID | Agent | Role | Autonomy | Key Tools |
|----|-------|------|----------|-----------|
| **23** | Sales & Pre-Sales | Leads, demos, RFPs | Low | mcp-crm, mcp-email, mcp-filesystem |
| **24** | Content & SEO | Blog, case studies, SEO optimization | Medium | mcp-filesystem, mcp-websearch |
| **25** | Customer Success | Onboarding, churn prevention | Low | mcp-crm, mcp-email, mcp-analytics |
| **26** | Support Desk | Ticket triage, categorization, routing | Medium | mcp-helpdesk, mcp-email |
| **27** | Feedback Analyzer | Pattern detection, synthesis | High | mcp-helpdesk, mcp-filesystem |
| **28** | Billing & Revenue | Subscriptions, invoicing, dunning | Low | mcp-stripe, mcp-email, mcp-notify |

### Layer 7: Analytics

| ID | Agent | Role | Autonomy | Key Tools |
|----|-------|------|----------|-----------|
| **29** | Product Analytics | Metrics, dashboards, A/B experiments | Medium | mcp-analytics, mcp-featureflags, mcp-database |

### Layer 8: Legal, Docs & Governance

| ID | Agent | Role | Autonomy | Key Tools |
|----|-------|------|----------|-----------|
| **30** | Legal & Privacy | Contracts, compliance, GDPR | Low (always HITL) | mcp-filesystem |
| **31** | Documentation & Release | API docs, runbooks, changelogs | High | mcp-filesystem, mcp-git |
| **32** | Agent Governance | Quality scoring, prompt versioning, eval | Medium | mcp-eval, mcp-prompts, mcp-token-tracker |

---

# PART IV — IMPLEMENTATION SPECIFICATIONS

---

## 12. Context Compiler Algorithm

This is the most important algorithm in the platform. It determines the quality of every agent's output.

### 12.1 L1 Working Context Template

Every LLM call receives this exact structure. Sections are NEVER reordered.

```
┌─────────────────────────────────────────────────────┐
│                L1 WORKING CONTEXT                    │
│                                                     │
│  SECTION 1: IDENTITY .............. ~200 tokens     │
│  "You are Agent 08 (Coder). Role: ..."              │
│                                                     │
│  SECTION 2: INVARIANTS ............ ~400 tokens     │
│  "Rules you must NEVER break: ..."                  │
│                                                     │
│  SECTION 3: SKILLS ................ ~20% budget     │
│  "Best practices for this task: ..."                │
│                                                     │
│  SECTION 4: PROJECT CONTEXT ....... ~10% budget     │
│  "From ARCHITECTURE.md: ... CONVENTIONS: ..."       │
│                                                     │
│  SECTION 5: MEMORY ................ ~40% budget     │
│    5a. History (L2 episodic)                        │
│    5b. Knowledge (L3 semantic graph)                │
│    5c. Team State (L5 shared)                       │
│    5d. Artifacts (L6 resource pointers)             │
│                                                     │
│  SECTION 6: TASK .................. ~25% budget     │
│  "GOAL: ... INPUTS: ... CONSTRAINTS: ..."           │
│                                                     │
│  SECTION 7: OUTPUT FORMAT ......... ~100 tokens     │
│  "Respond with: PLAN, ACTIONS, CONFIDENCE, RISKS"   │
│                                                     │
│  RESERVE: ~5% buffer                               │
└─────────────────────────────────────────────────────┘
```

### 12.2 Token Budget Allocation

```
Total Budget (from TaskEnvelope): e.g., 120,000 tokens
  ├── LLM Response Reserve: 30% = 36,000 tokens
  └── L1 Context Budget: 70% = 84,000 tokens
       ├── Section 1 Identity:    fixed    200 tokens
       ├── Section 2 Invariants:  fixed    400 tokens
       ├── Section 7 Output fmt:  fixed    100 tokens
       └── Remaining: 83,300 tokens allocated as:
            ├── Section 3 Skills:          20% = 16,660
            ├── Section 4 Project Context: 10% =  8,330
            ├── Section 5 Memory:          40% = 33,320
            │    ├── 5a L2 Episodic:  30% of memory = 9,996
            │    ├── 5b L3 Semantic:  25% of memory = 8,330
            │    ├── 5c L5 Shared:    20% of memory = 6,664
            │    └── 5d L6 Resources: 25% of memory = 8,330
            └── Section 6 Task:            25% = 20,825
```

### 12.3 Per-Layer Retrieval Algorithms

**L2 Episodic (what happened before):**
```
1. Exact match: all episodes with this correlation_id (max 10, newest first)
2. Vector search: embed(task.goal) → top-20 similar episodes for this agent
3. Merge, dedupe by memory_id
4. Rank by: recency(0.4) × relevance(0.4) × importance(0.2)
   - recency: exponential decay, half-life = 7 days
   - relevance: cosine similarity to task.goal embedding
   - importance: tool_call > decision > interaction
5. Truncate to L2 budget; most recent kept even if low-ranked
```

**L3 Semantic (what we know):**
```
1. Extract entity names from task.goal + task.inputs
2. Graph: MATCH (e)-[r*1..2]-(related) WHERE e.name IN $entities
3. Vector: embed(task.goal) → top-15 semantic nodes
4. Merge graph + vector results, dedupe
5. Format as: "Entity: X | Relationship: Y | Related: Z"
6. Truncate to L3 budget
```

**L5 Shared (what the team knows):**
```
1. Query shared graph: nodes tagged with task's domain/feature
2. Filter: agent's read permissions on shared memory
3. Sort: timestamp newest first
4. Truncate to L5 budget
```

**L6 Resources (relevant artifacts):**
```
1. Vector search embed(task.goal) → top-10 artifact index entries
2. Filter: freshness_score > 0.3
   (freshness = 1.0 if modified < 7 days, decays to 0.0 at 90 days)
3. Return: artifact_path + summary + last_modified + owner
4. Truncate to L6 budget
```

### 12.4 Conflict Resolution Rules

| Conflict Type | Rule | Example |
|--------------|------|---------|
| L2 episode contradicts L3 fact | **L2 wins** (ground truth > distilled) | L3: "API uses REST" vs L2 latest: "migrated to gRPC" → use gRPC |
| L5 shared contradicts L3 private | **L5 wins if newer** (shared = coordination) | L3: "schema v1" vs L5: "schema v2 published by BA" → use v2 |
| Two L2 episodes disagree | **Most recent wins** | Today's episode overrides last week's |
| L6 artifact content vs L3 summary | **L6 wins** (actual artifact = source of truth) | L3 summary outdated; L6 points to current doc |

---

## 13. Memory Service gRPC API

### 13.1 Service Definition

```protobuf
service MemoryService {
  // Read operations
  rpc CompileContext (CompileContextRequest) returns (CompileContextResponse);
  rpc QueryEpisodic (QueryEpisodicRequest) returns (QueryEpisodicResponse);
  rpc QuerySemantic (QuerySemanticRequest) returns (QuerySemanticResponse);
  rpc QueryShared (QuerySharedRequest) returns (QuerySharedResponse);
  rpc QueryArtifacts (QueryArtifactsRequest) returns (QueryArtifactsResponse);

  // Write operations
  rpc WriteEpisodic (WriteEpisodicRequest) returns (WriteEpisodicResponse);
  rpc WriteSemantic (WriteSemanticRequest) returns (WriteSemanticResponse);
  rpc WriteShared (WriteSharedRequest) returns (WriteSharedResponse);
  rpc WriteArtifactIndex (WriteArtifactRequest) returns (WriteArtifactResponse);

  // Utility
  rpc Embed (EmbedRequest) returns (EmbedResponse);
}

message CompileContextRequest {
  string agent_id = 1;
  string task_id = 2;
  string correlation_id = 3;
  string goal = 4;
  string inputs_json = 5;
  int32 token_budget = 6;
  repeated string skill_pins = 7;
  repeated string context_files = 8;
}

message CompileContextResponse {
  string l1_context = 1;        // assembled prompt text
  int32 tokens_used = 2;
  repeated ProvenanceEntry provenance = 3;
}

message ProvenanceEntry {
  string section = 1;           // "L2_episodic", "L3_semantic", etc.
  string source_id = 2;
  float relevance_score = 3;
}
```

### 13.2 Write Semantics

| Operation | Behavior | Conflict Resolution |
|-----------|----------|-------------------|
| WriteEpisodic | **Always append** (never update) | No conflicts — L2 is append-only |
| WriteSemantic | **Upsert by entity name** within agent's L3 namespace | CAS (compare-and-swap) on concurrent writes |
| WriteShared | **Write only if agent has write_authority** | Reject if wrong owner. Last-writer-wins if same authority. |
| WriteArtifactIndex | **Upsert by artifact_path** | Owner check enforced. Re-embed summary on update. |

---

## 14. Database Schemas

### 14.1 Postgres Tables

**episodic_records (L2 — append-only ground truth)**

```sql
CREATE TABLE episodic_records (
    memory_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id        VARCHAR(8) NOT NULL,
    correlation_id  UUID NOT NULL,
    task_id         UUID,
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT now(),

    kind            VARCHAR(32) NOT NULL,       -- interaction|tool_call|decision|error
    summary         TEXT NOT NULL,
    content         JSONB NOT NULL,

    classification  VARCHAR(16) NOT NULL DEFAULT 'internal',
    embedding       vector(1024),               -- voyage-3

    provenance_prompt_pin  VARCHAR(256),
    provenance_skill_pin   VARCHAR(256),
    provenance_model       VARCHAR(64),

    links           JSONB DEFAULT '[]',
    ttl_expires_at  TIMESTAMPTZ
);

CREATE INDEX idx_episodic_correlation ON episodic_records(correlation_id);
CREATE INDEX idx_episodic_agent_time ON episodic_records(agent_id, timestamp DESC);
CREATE INDEX idx_episodic_kind ON episodic_records(kind);
CREATE INDEX idx_episodic_embedding ON episodic_records
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

**artifact_index (L6 — resource memory)**

```sql
CREATE TABLE artifact_index (
    artifact_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artifact_path   VARCHAR(512) NOT NULL UNIQUE,
    artifact_type   VARCHAR(32) NOT NULL,      -- code|doc|schema|config|data|model

    owner_agent     VARCHAR(8) NOT NULL,
    classification  VARCHAR(16) NOT NULL DEFAULT 'internal',

    summary         TEXT,
    embedding       vector(1024),

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    modified_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    freshness_score FLOAT GENERATED ALWAYS AS (
        GREATEST(0, 1.0 - EXTRACT(EPOCH FROM (now() - modified_at)) / (90*86400))
    ) STORED,

    tags            TEXT[] DEFAULT '{}',
    metadata        JSONB DEFAULT '{}'
);

CREATE INDEX idx_artifact_path ON artifact_index(artifact_path);
CREATE INDEX idx_artifact_owner ON artifact_index(owner_agent);
CREATE INDEX idx_artifact_embedding ON artifact_index
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
```

**audit_log (every action by every agent)**

```sql
CREATE TABLE audit_log (
    audit_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT now(),
    agent_id        VARCHAR(8) NOT NULL,
    correlation_id  UUID NOT NULL,

    action_type     VARCHAR(32) NOT NULL,      -- tool_call|memory_write|event_publish|hitl_request
    action_detail   JSONB NOT NULL,

    risk_score      FLOAT,
    risk_level      VARCHAR(12),
    outcome         VARCHAR(16) NOT NULL,      -- success|failed|blocked|deferred
    error_detail    TEXT,

    tokens_used     INTEGER,
    cost_usd        FLOAT,
    latency_ms      INTEGER
);

CREATE INDEX idx_audit_correlation ON audit_log(correlation_id);
CREATE INDEX idx_audit_agent_time ON audit_log(agent_id, timestamp DESC);
```

**workflow_state (Orchestrator TaskGraph persistence)**

```sql
CREATE TABLE workflow_state (
    workflow_id     UUID PRIMARY KEY,
    correlation_id  UUID NOT NULL,
    status          VARCHAR(16) NOT NULL,      -- running|paused|completed|failed
    taskgraph       JSONB NOT NULL,
    current_cursor  JSONB NOT NULL,
    pins            JSONB NOT NULL,
    idempotency_ledger JSONB DEFAULT '{}',
    checkpoint_ref  VARCHAR(512),              -- S3 path for large checkpoints
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    initiator_type  VARCHAR(8) NOT NULL,
    initiator_id    VARCHAR(256) NOT NULL
);
```

**hitl_queue (pending human approvals)**

```sql
CREATE TABLE hitl_queue (
    request_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id     UUID NOT NULL REFERENCES workflow_state(workflow_id),
    task_id         UUID NOT NULL,
    agent_id        VARCHAR(8) NOT NULL,
    correlation_id  UUID NOT NULL,

    request_type    VARCHAR(32) NOT NULL,      -- approve_action|review_output|confirm_plan
    description     TEXT NOT NULL,
    context         JSONB NOT NULL,
    risk_level      VARCHAR(12) NOT NULL,

    status          VARCHAR(16) NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ,
    resolved_at     TIMESTAMPTZ,
    resolved_by     VARCHAR(256),
    resolution_note TEXT
);
```

### 14.2 Neo4j Graph Schema

**L3 Semantic Memory (per-agent namespace)**

```cypher
(:Entity {
    id: string,              // UUID
    name: string,            // "UserService"
    type: string,            // service|concept|person|feature|rule
    agent_id: string,
    properties: map,
    embedding: list,         // 1024-dim
    created_at: datetime,
    updated_at: datetime,
    confidence: float        // 0.0-1.0
})

// Relationship types:
[:DEPENDS_ON] [:IMPLEMENTS] [:RELATES_TO {strength: float}]
[:CONTRADICTS] [:SUPERSEDES] [:OWNS] [:PART_OF] [:USES]
```

**L5 Shared Memory (shared namespace)**

```cypher
(:SharedFact {
    id: string,
    key: string,             // "current_schema_version"
    value: string,
    published_by: string,    // agent_id
    published_at: datetime,
    write_authority: string,
    version: integer
})

[:DERIVED_FROM] [:UPDATED_BY {agent_id: string, timestamp: datetime}]
```

### 14.3 Redis Key Schema

```
l1:{agent_id}:{task_id}              → JSON (L1 context cache, TTL: 1 hour)
session:{agent_id}:{correlation_id}  → JSON (agent session state, TTL: 24 hours)
lock:artifact:{artifact_path}        → agent_id (distributed lock, TTL: 5 minutes)
lock:shared:{key}                    → agent_id (shared memory lock, TTL: 5 minutes)
rate:{agent_id}:llm_calls            → integer (sliding window, TTL: 1 hour)
rate:{agent_id}:tool_calls           → integer (sliding window, TTL: 1 hour)

Eviction: allkeys-lru | Max memory: 2GB (dev), 8GB (prod)
```

### 14.4 Object Store Layout (MinIO/S3)

```
bucket: deep-agent-platform/
├── checkpoints/{workflow_id}/{checkpoint_number}.json
├── artifacts/{correlation_id}/{artifact_path}
├── datasets/{dataset_name}/{version}/
├── models/{model_name}/{version}/
└── audit-exports/{year}/{month}/{day}.jsonl.gz
```

---

## 15. Agent SDK & Manifest Format

### 15.1 Agent Manifest (YAML)

Every agent is defined by ONE manifest + a prompt directory + an invariants file:

```yaml
# /agents/agent-08-coder/manifest.yaml
agent_id: "agent-08"
name: "Coder Agent"
layer: "L2-DESIGN-ENGINEERING"
version: "1.0.0"

model:
  default: "claude-sonnet-4"
  complex: "claude-opus-4"
  routing_rules:
    - condition: "task.touches_auth OR task.touches_payments"
      model: "claude-opus-4"
    - condition: "task.lines_of_code < 50"
      model: "claude-haiku-4"

autonomy: "high"
hitl_gates:
  - action: "db_migration_prod"
    approval: "human"
  - action: "auth_code_change"
    approval: "human"
  - action: "payment_code_change"
    approval: "human"

memory:
  l2_episodic: { read: true, write: true, scope: "own" }
  l3_semantic: { read: true, write: true, scope: "own" }
  l4_procedural: { read: true, write: false }
  l5_shared: { read: true, write: true, scope: "engineering" }
  l6_resource: { read: true, write: true }

data_clearance: "T3"

tools:
  - mcp-filesystem
  - mcp-git
  - mcp-terminal
  - mcp-database

skills:
  - /skills/platform/coder/SKILL.md
  - /skills/platform/security/SKILL.md

project_context:
  - CONVENTIONS.md
  - ARCHITECTURE.md

prompts_dir: /prompts/agent-08-coder/
invariants_file: /agents/agent-08-coder/invariants.yaml

events:
  subscribes:
    - ba.schema.published
    - pm.spec.published
    - reviewer.pr.approved
    - reviewer.pr.rejected
    - security.vulnerability.critical
  publishes:
    - coder.pr.created
    - coder.pr.merged

quality_metrics:
  build_success_rate: { target: 0.95, escalation: 0.85 }
  pr_first_approval_rate: { target: 0.60, escalation: 0.40 }
  test_coverage_new_code: { target: 0.80, escalation: 0.60 }

resources:
  token_budget_per_task: 120000
  max_concurrent_tasks: 3
  rate_limit_llm_per_hour: 200
  rate_limit_tools_per_hour: 500
```

---

## 16. TaskGraph Engine

### 16.1 TaskGraph Data Structure (DAG)

```json
{
  "workflow_id": "uuid",
  "correlation_id": "uuid",
  "status": "running",
  "nodes": [
    {
      "node_id": "n1",
      "agent_id": "agent-04",
      "goal": "Write feature spec (BRD)",
      "status": "completed",
      "depends_on": [],
      "result_ref": "uuid"
    },
    {
      "node_id": "n2",
      "agent_id": "agent-05",
      "goal": "Create JSON schemas",
      "status": "running",
      "depends_on": ["n1"],
      "result_ref": null
    },
    {
      "node_id": "n3",
      "agent_id": "agent-06",
      "goal": "Design UX wireframes",
      "status": "running",
      "depends_on": ["n1"],
      "result_ref": null
    },
    {
      "node_id": "n4",
      "agent_id": "agent-08",
      "goal": "Implement feature code",
      "status": "pending",
      "depends_on": ["n2", "n3"],
      "result_ref": null
    }
  ],
  "edges": [
    {"from": "n1", "to": "n2"},
    {"from": "n1", "to": "n3"},
    {"from": "n2", "to": "n4"},
    {"from": "n3", "to": "n4"}
  ]
}
```

### 16.2 Orchestrator Planning Algorithm

```
REQUEST ARRIVES
    │
    ▼
[1] PATTERN MATCH against known workflow templates in L4
    ├── "feature_request" → [PM → BA∥UX → Coder → Test∥Review∥Security]
    ├── "bug_fix" → [Incident → Coder → Review → DevOps]
    ├── "data_pipeline" → [BA → DataEng → DataQuality → MLEng]
    ├── Match found → use template, fill specifics
    └── No match → proceed to LLM planning
    │
    ▼
[2] LLM PLANNING (if no template match)
    ├── Context: goal + available agents (Agent Registry) + dependencies
    ├── Output: ordered list of subtasks with agent assignments
    └── Validate: no cycles, all agents exist, dependencies valid
    │
    ▼
[3] BUILD DAG
    ├── Create TaskGraph with nodes and edges
    ├── Identify parallel tracks (no mutual dependencies)
    ├── Attach pins (prompt/skill versions) to each node
    └── Persist to workflow_state (Postgres)
    │
    ▼
[4] EXECUTE (scheduling loop)
    ├── Find "ready" nodes: dependencies satisfied + status=pending
    ├── Dispatch ready nodes IN PARALLEL via A2A Router
    ├── Each completion → mark done → check newly unblocked nodes
    ├── Checkpoint after every node completion
    └── Continue until all nodes complete OR failure
    │
    ▼
[5] FAILURE HANDLING
    ├── Node fails → retry up to 2 times
    ├── Still fails → mark "failed"
    │   ├── Critical dependency? → pause workflow, escalate to human
    │   └── Non-critical? → continue with degraded context
    └── Human can: retry, skip, reassign, or abort
```

---

## 17. Error Handling & Degradation Matrix

| Error Type | Retry? | Backoff | Circuit Breaker | Fallback |
|-----------|--------|---------|-----------------|----------|
| LLM timeout | Yes, 2x | Exponential (5s, 15s) | Opens after 5 consecutive failures | Try cheaper model (Opus→Sonnet→Haiku) |
| LLM rate limit | Yes, 3x | Wait for reset header | Opens after 10 rate limits in 5 min | Queue task, process later |
| Tool execution failure | Yes, 2x | Fixed 3s | Opens after 3 consecutive failures | Log error, skip tool, re-plan |
| Memory Service timeout | Yes, 2x | Exponential (2s, 6s) | Opens after 5 failures | Degraded context (skip failed layer) |
| Neo4j down | No | — | Immediate | Skip L3/L5 in context compilation |
| NATS publish failure | Yes, 3x | Fixed 1s | Opens after 10 failures | Write to dead-letter file, replay later |
| Policy Engine timeout | No | — | — | **DENY** (fail-closed) |
| Agent crash mid-task | — | — | — | K8s restarts pod → Orchestrator resumes from checkpoint |

---

# PART V — DATA FLOWS & WIRE MAP

---

## 18. Network Protocol Map (W1-W24)

Every arrow in the architecture diagram. Every connection between components.

```
PROTOCOL KEY:
  HTTPS    = HTTPS REST/GraphQL
  gRPC     = gRPC (protobuf)
  NATS     = NATS JetStream pub/sub
  MCP      = Model Context Protocol (JSON-RPC 2.0)
  OTel     = OpenTelemetry (traces/metrics/logs)
  SQL      = PostgreSQL wire protocol
  BOLT     = Neo4j Bolt protocol
  Redis    = Redis protocol
  S3       = S3-compatible API
```

| Wire | From | To | Protocol | What Flows | When |
|------|------|----|----------|-----------|------|
| W1 | Client (Human/UI) | API Gateway | HTTPS | User request + JWT | Every interaction |
| W2 | API Gateway | Auth Service | gRPC | Validate JWT, get identity | Every request |
| W3 | API Gateway | Orchestrator | gRPC | TaskEnvelope (new workflow) | Every request |
| W4 | Orchestrator | A2A Router | gRPC | TaskEnvelope + pins | Per task node |
| W5 | A2A Router | Agent Runtime | gRPC | TaskEnvelope delivered to agent | Per task |
| W6 | Agent Runtime | Memory Service | gRPC | memory.read() / compile_context() | Before every LLM call |
| W7 | Agent Runtime | Memory Service | gRPC | memory.write() | After every LLM + tool call |
| W8 | Agent Runtime | Tool Gateway | gRPC | ToolCall | When agent needs to act |
| W9 | Tool Gateway | Policy Engine (OPA) | gRPC | Policy evaluation request | Before every tool execution |
| W10 | Tool Gateway | MCP Servers | MCP | Tool invocation (sandboxed) | Per tool call |
| W11 | Agent Runtime | Event Bus | NATS | EventEnvelope (domain events) | After meaningful state changes |
| W12 | Event Bus | Orchestrator | NATS | Events (progress, completions) | Continuous |
| W13 | Event Bus | Agent Runtimes | NATS | Events (subscribed topics) | Continuous |
| W14 | Agent Runtime | Auth Service | gRPC | Workload identity token refresh | Every 15 min |
| W15 | Agent Runtime | HITL Queue | gRPC | Submit approval request | When HITL gate triggers |
| W16 | HITL Queue | Orchestrator | gRPC | Approval/rejection result | When human responds |
| W17 | Orchestrator | Prompt Registry | gRPC | Resolve pin → content | During TaskEnvelope creation |
| W18 | Memory Service | Postgres | SQL | L2 episodic, L6 index, embeddings | Every memory operation |
| W19 | Memory Service | Neo4j | BOLT | L3 semantic graph, L5 shared graph | Every memory operation |
| W20 | Memory Service | Redis | Redis | L1 cache, session state, locks | Every context compile |
| W21 | Memory Service | Object Store | S3 | Checkpoints, large artifacts | On checkpoint/artifact ops |
| W22 | Orchestrator | Workflow State Store | SQL | TaskGraph persistence | On every state change |
| W23 | All Services | OTel Collector | OTel | Traces, metrics, logs | Continuous |
| W24 | Prompt Registry | Git Repo | Git | Read pinned prompts/skills | On pin resolution |

---

## 19. Standard Flows (F1-F8)

### Flow F1: Synchronous User Request (end-to-end)

```
┌─────────┐    W1    ┌────────────┐    W2    ┌──────────┐    W3    ┌─────────────┐
│ Client  │ ───────► │API Gateway │ ───────► │  Auth    │ ───────► │Orchestrator │
└─────────┘          └────────────┘          └──────────┘          └──────┬──────┘
                                                                          │
                              TaskGraph DAG Execution                      │
    ┌─────────────────────────────────────────────────────────────────────┐│
    │                                                                     ││
    │   n1: Agent-04 (PM) ──┬──► n2: Agent-05 (BA) ──────────────┐     ││
    │        write spec      │                                     │     ││
    │                        ├──► n3: Agent-06 (UX) ──────────────┤     ││
    │                        │        design flows                 │     ││
    │                        │                                     ▼     ││
    │                        │                    n4: Agent-08 (Coder)   ││
    │                        │                         implement         ││
    │                        │                              │            ││
    │                        │                    ┌─────────┼─────────┐  ││
    │                        │                    ▼         ▼         ▼  ││
    │                        │               n5:Test   n6:Review  n7:Sec ││
    │                        │                                          ││
    └────────────────────────────────────────────────────────────────────┘│
                                              │                           │
                                              ▼                           │
                                    ┌────────────────┐                    │
                                    │ Return Result  │◄───────────────────┘
                                    │ + Artifacts    │
                                    └────────────────┘
```

### Flow F2: Multi-Agent Delegation (A2A)

```
Primary Agent (owner)
    ├── A2A (W4→W5) ──► Delegate Agent 1 (TaskFragment A)
    │                        └──► Returns AgentResult + PR-style artifacts
    ├── A2A (W4→W5) ──► Delegate Agent 2 (TaskFragment B)
    │                        └──► Returns AgentResult + PR-style artifacts
    └── Integrates results ──► Emits consolidated output + events (W11)

Invariant: Only ONE agent (or human) is "artifact owner" at a time (write authority).
```

### Flow F3: Event-Driven Propagation

```
┌──────────┐   W11    ┌──────────────┐   W13    ┌─────────────┐
│ Producer │ ────────► │  Event Bus   │ ────────► │  Consumer   │
│  Agent   │          │  (NATS JS)   │          │   Agent     │
└──────────┘          └──────┬───────┘          └──────┬──────┘
                              │                         │
                    Schema    │                         │ W6
                    validate  ▼                         ▼
                        ┌──────────┐          ┌─────────────┐
                        │ DLQ      │          │ Memory Svc  │
                        │ (3x fail)│          │ (fetch L6)  │
                        └──────────┘          └─────────────┘

Rules:
  - Events carry POINTERS, not full documents
  - Schema validated BEFORE publish (Git-based registry)
  - Consumer groups: only 1 instance per agent type receives each event
  - Orchestrator subscribes to ALL events for TaskGraph progress tracking (W12)
```

### Flow F4: Context Compiler Pipeline (Memory Read)

```
TaskEnvelope ──► Context Compiler:
  0) Redis cache check (l1:{agent_id}:{task_id})
  1) Embed(task.goal) via voyage-3 (1024d)
  2) Retrieve L2 episodic (correlation_id exact + vector top-20)
  3) Retrieve L3 semantic (entity graph 1-2 hops + vector top-15)
  4) Load L4 procedural (pinned prompts/skills from Git)
  5) Retrieve L5 shared (domain-scoped shared facts)
  6) Retrieve L6 resources (vector search + freshness > 0.3)
  7) Rank within sections, allocate token budgets
  8) Resolve conflicts (L2 > L3, L5 > L3 if newer)
  9) Assemble L1 Working Context + provenance annotations
  10) Cache in Redis, return to Agent Runtime → LLM
```

### Flow F5: Memory Write (Post-LLM)

```
Always: Append to L2 episodic (ground truth log — never update)
If new facts: Update L3 semantic (entity + relation, upsert with CAS)
If reusable workflow: Propose L4 update (governed + versioned, PR-gated)
If cross-agent relevant: Publish event (W11) + update L5 shared (authority checked)
If artifact produced: Register in L6 index (upsert by artifact_path)
```

### Flow F6: Prompt & Skill Versioning

```
1. Change proposed in Git PR (/prompts/ or /skills/)
2. Agent-32 (Governance) runs regression suite + drift checks
3. Human approves PR
4. Merge produces immutable version tag + SHA
5. Orchestrator pins new version into future TaskEnvelopes
6. Telemetry records: {prompt_version, skill_version} for every output
```

### Flow F7: Checkpoint / Resume

```
CHECKPOINT TRIGGERS:
  - After each TaskGraph node completion
  - Before irreversible tool calls
  - When HITL pause occurs

CHECKPOINT CONTAINS:
  - TaskGraph cursor/state (which nodes done/pending/active)
  - Idempotency ledger (tool_call_id → result_hash)
  - Working-context digest
  - Artifact + memory pointers (L6 refs)
  - Pinned versions

STORAGE:
  - Small checkpoints → workflow_state table (Postgres JSONB)
  - Large checkpoints → Object Store (MinIO/S3) with ref in checkpoint_ref

RESUME (after crash / HITL / manual pause):
  1. Orchestrator loads latest checkpoint from workflow_state
  2. Rehydrates TaskGraph (which nodes done, which pending)
  3. Re-dispatches TaskEnvelope with checkpoint_ref
  4. Agent loads checkpoint, checks idempotency ledger
  5. Skips already-completed tool calls
  6. Continues from next unfinished action
```

### Flow F8: Tool Execution (low-level)

```
PREFLIGHT (Tool Gateway):
  1. Validate ToolCall schema
  2. Resolve agent identity → permissions
  3. Evaluate policy (OPA): data classification, tool matrix, write authority
  4. Assign: timeout + retry policy + sandbox profile

EXECUTE (MCP Server):
  5. Run tool in sandbox (FS/network allowlist)
  6. Emit tool telemetry span (OTel trace)
  7. Return ToolResult: stdout/stderr (sanitized) + structured output + side-effect refs

POSTFLIGHT:
  8. Append tool call to L2 episodic (ground truth)
  9. If mutation: ensure git diff exists OR DB transaction is reversible
  10. Emit event if downstream agents must react

ROLLBACK RULE:
  Any tool that mutates must provide either a rollback operation
  or produce an artifact diff that can be reverted.
```

---

## 20. User Flow Walkthroughs

### Flow A: "Build a New Feature" (multi-agent, most common)

**Trigger:** Human says "Build user authentication with email/password and OAuth"

```
STEP  WHO                DOES WHAT                               WIRES     STORES
───── ──────────────── ──────────────────────────────────────── ───────── ─────────
A1    Human            Sends request via UI                      W1        —
A2    API Gateway      Validates, assigns correlation_id         W2,W3     audit_log
A3    Orchestrator     Pattern match → "feature_request"         —         —
                       Builds TaskGraph:
                         n1: Agent-04 (PM) → write spec
                         n2: Agent-05 (BA) → schemas (depends n1)
                         n3: Agent-06 (UX) → wireframes (depends n1)
                         n4: Agent-08 (Coder) → implement (depends n2,n3)
                         n5: Agent-10 (Test) → tests (depends n2,n4)
                         n6: Agent-09 (Review) → review (depends n4)
                         n7: Agent-11 (Security) → scan (depends n4)
A4    Orchestrator     Persists TaskGraph, resolves pins          W22,W17   workflow_state
                       Dispatches n1 (no dependencies)            W4→W5     —
A5    Agent-04 (PM)    Receives task                              —         —
                       Calls memory.compile_context()             W6        Redis,Postgres,Neo4j
                       LLM call → plans BRD sections              —         —
                       Execution Guard: LOW risk                  W9        —
                       Writes spec via mcp-filesystem              W8→W10    filesystem
                       Memory write: L2+L3+L6                     W7        Postgres,Neo4j
                       Publishes: pm.spec.published               W11       NATS
                       Returns AgentResult                        W5→W4     —
A6    Orchestrator     n1 done → n2,n3 now PARALLEL               W22       workflow_state
                       Dispatches both simultaneously              W4→W5     —
A7    Agent-05 (BA)    [Same pattern: context→reason→guard→tool→memory→event]
                       Publishes: ba.schema.published
A8    Agent-06 (UX)    [Same pattern]
                       Writes: design/auth-flow.html
A9    Orchestrator     n2,n3 done → n4 unblocked                  W22       workflow_state
                       Dispatches to Agent-08 (Coder)
A10   Agent-08 (Coder) Context includes schema + design + CONVENTIONS.md
                       Plans: 6 files to create/modify
                       Execution Guard: >5 files → HIGH risk      W9        —
                       HITL: submits plan for approval             W15       hitl_queue
A11   Human            Reviews plan, approves via CLI              —         hitl_queue
A12   Orchestrator     Receives approval, re-dispatches            W16→W5    —
A13   Agent-08 (Coder) Resumes from checkpoint
                       LOOP: for each file: read→edit→test→verify  W8→W10    —
                       Creates PR via mcp-git                      W8→W10    —
                       Publishes: coder.pr.created                 W11       NATS
A14   Orchestrator     n4 done → n5,n6,n7 PARALLEL                W22       workflow_state
A15   Agent-09         Reviews PR → reviewer.pr.approved           W11       NATS
A16   Agent-10         Writes tests → runs them                    W8→W10    —
A17   Agent-11         SAST scan → security.scan.completed         W11       NATS
A18   Orchestrator     All nodes done → workflow complete           W22       workflow_state
                       Returns result to API Gateway → Client      W3→W1     —
```

### Flow B: "Fix Production Incident" (event-driven, urgent)

```
B1    Agent-14 (SRE)   Alert via mcp-prometheus → sre.alert.fired  W11      NATS
B2    Orchestrator     Emergency TaskGraph: Diagnose→Fix→Deploy     W22      workflow_state
B3    Agent-15         Queries logs+metrics → root cause            W8→W10   —
B4    Agent-08 (Coder) Small fix → PR created                      W8→W10   —
B5    Agent-09         Fast review → approved                       W11      NATS
B6    Agent-13 (DevOps) Deploy → HITL gate (prod) → human approves  W15      hitl_queue
B7    Agent-15         Verifies fix → incident.resolved             W11      NATS
```

### Flow C: "Schema Breaking Change" (event fan-out)

```
C1    Agent-05 (BA)    Breaking schema change → HITL (CRITICAL)     W15      hitl_queue
C2    Human            Approves                                     —        hitl_queue
C3    Agent-05         Writes schema → ba.schema.published          W11      NATS
C4    Event Bus        Fan-out to 4 consumers:                      W13      —
        Agent-08 → plans code migration
        Agent-10 → updates contract tests
        Agent-17 → updates pipeline schema
        Agent-29 → updates event taxonomy
      Each consumer independently queries Memory Service (W6) for artifact details
```

### Flow D: "Context Compiler in Detail" (memory read)

```
D1    Agent Runtime    Receives TaskEnvelope                        —
D2    Memory Service   Check Redis cache → miss                     Redis
D3    Memory Service   Embed(task.goal) via voyage-3                Embedding API
D4    Memory Service   L2: correlation_id match + vector top-20     Postgres
D5    Memory Service   L3: entity extract → graph 1-2 hops         Neo4j
D6    Memory Service   L4: pinned prompts/skills                    Git
D7    Memory Service   L5: domain-scoped shared facts               Neo4j
D8    Memory Service   L6: vector search + freshness filter         Postgres
D9    Context Compiler Budget allocate, rank, conflict resolve       —
D10   Context Compiler Cache L1 in Redis                            Redis
D11   Agent Runtime    Send L1 to LLM                               LLM API
```

### Flow E: "Checkpoint and Resume After Crash"

```
E1    Agent-18 (ML)    Working on long task, completes subtask 3/7  —
E2    Orchestrator     Checkpoint: TaskGraph state + ledger          workflow_state, MinIO
E3    [CRASH]          Agent container dies                          —
E4    Kubernetes       Detects pod failure, restarts                 —
E5    Agent-18         Starts, reports ready                         —
E6    Orchestrator     Detects mid-task, loads checkpoint            workflow_state
E7    Orchestrator     Re-dispatches with checkpoint_ref             W4→W5
E8    Agent-18         Loads checkpoint, checks ledger:              —
                       "t1-t15 done → skip, continue from t16"
E9    Agent-18         Continues normally (no duplicate work)        —
```

---

# PART VI — CONTRACTS & EVENTS

---

## 21. Key Contracts

### TaskEnvelope (Orchestrator → Agent)

```json
{
  "task_id": "uuid",
  "correlation_id": "uuid",
  "initiator": { "type": "human|system", "id": "string" },
  "goal": "string",
  "inputs": { "any": "json" },
  "constraints": {
    "time_budget_s": 900,
    "token_budget": 120000,
    "cost_budget_usd": 2.50,
    "allowed_tools": ["mcp-git", "mcp-filesystem", "mcp-openapi"],
    "write_mode": "dry-run|propose|auto"
  },
  "data_classification": "public|internal|confidential|restricted|regulated",
  "artifact_targets": [
    { "path": "docs/ARCHITECTURE.md", "write_mode": "PR-STYLE", "owner": "07" }
  ],
  "pins": {
    "model_router_version": "2026.02.23",
    "prompt_pins": { "07": "prompts/architect@1.4.0#<git_sha>" },
    "skill_pins": { "platform": "skills/platform@2.1.0#<git_sha>" }
  },
  "checkpoint_policy": {
    "before_irreversible_actions": true,
    "after_each_task_node": true,
    "max_interval_s": 600
  },
  "idempotency_key": "string"
}
```

### AgentResult (Agent → Orchestrator)

```json
{
  "task_id": "uuid",
  "agent_id": "07",
  "status": "completed|blocked|needs_human|failed",
  "summary": "string",
  "artifacts_written": [
    { "path": "string", "diff_ref": "string", "write_mode": "string" }
  ],
  "decisions": [
    { "decision_id": "uuid", "title": "string", "rationale": "string", "risk": "low|med|high" }
  ],
  "events_published": [
    { "topic": "string", "event_id": "uuid" }
  ],
  "memory_writes": [
    { "layer": "L2|L3|L4|L5|L6", "ref": "string" }
  ],
  "telemetry": { "tokens": 12345, "cost_usd": 0.42, "latency_ms": 12000 }
}
```

### ToolCall (Agent → Tool Gateway)

```json
{
  "tool_call_id": "uuid",
  "agent_id": "08",
  "correlation_id": "uuid",
  "tool": "mcp-git.commit",
  "args": { "message": "string", "paths": ["..."] },
  "policy_context": {
    "risk_score": 2.6,
    "data_classification": "internal",
    "write_authority_checked": true
  },
  "idempotency_key": "string"
}
```

### MemoryRecord (what gets stored in L2-L6)

```json
{
  "memory_id": "uuid",
  "layer": "L2|L3|L4|L5|L6",
  "scope": "private|shared",
  "agent_id": "string",
  "timestamp": "ISO-8601",
  "correlation_id": "uuid",
  "classification": "public|internal|confidential|restricted|regulated",
  "kind": "interaction|tool_call|decision|fact|entity|relation|procedure|artifact_ref",
  "content": { "any": "json" },
  "embedding": "vector|null",
  "links": [{ "type": "references|derived_from|supersedes", "target_id": "uuid" }],
  "ttl_days": 365,
  "provenance": {
    "prompt_pin": "string",
    "skill_pin": "string",
    "model": "string",
    "tool_call_ids": ["uuid"]
  }
}
```

### Pin Resolution (reproducibility guarantee)

```
prompt_pin = {path}@{semver}#{git_sha}    e.g., prompts/architect@1.4.0#abc123
skill_pin  = {path}@{semver}#{git_sha}    e.g., skills/platform@2.1.0#def456
model_router_version = release id

INVARIANT: Every AgentResult must include exact pins used (no "latest" at runtime).
```

---

## 22. Event Catalog

### Universal Event Envelope

```json
{
  "event_id": "uuid",
  "topic": "pm.spec.published",
  "producer_agent": "04",
  "timestamp": "ISO-8601",
  "correlation_id": "uuid",
  "priority": "low|normal|high|critical",
  "payload": { "topic_specific": "schema" }
}
```

### All Events by Domain

#### Discovery & Product

| Topic | Producer | Consumers | Payload Keys |
|-------|----------|-----------|-------------|
| `discovery.icp.updated` | 01 | 04, 06, 23, 24 | icp_version, changes[] |
| `discovery.hypothesis.validated` | 01 | 04, 27 | hypothesis_id, result, evidence_refs[] |
| `discovery.pain.ranking-changed` | 01 | 04, 23 | pain_rankings[], change_type |
| `competitor.change.detected` | 03 | 04, 23, 24 | competitor_id, change_type, details |
| `market.regulatory.change` | 02 | 04, 30 | jurisdiction, regulation, impact_assessment |
| `pm.spec.published` | 04 | 05, 06, 07, 08, 10, 00, 29 | spec_path, version, change_type |
| `pm.roadmap.changed` | 04 | 07, 23, 24, 00 | roadmap_version, changes[] |
| `pm.feature.released` | 04 | 23, 24, 25, 29, 31 | feature_id, version |

#### Design & Engineering

| Topic | Producer | Consumers | Payload Keys |
|-------|----------|-----------|-------------|
| `ba.schema.published` | 05 | 08, 10, 17, 29, 00 | schema_path, version, change_type |
| `ba.event-taxonomy.changed` | 05 | 08, 29, 00 | taxonomy_version, changes[] |
| `coder.pr.created` | 08 | 09, 11, 00 | pr_id, files_changed, lines_added |
| `coder.pr.merged` | 08 | 12, 13, 31, 00 | pr_id, commit_sha |
| `reviewer.pr.approved` | 09 | 08, 00 | pr_id, review_notes |
| `reviewer.pr.rejected` | 09 | 08, 00 | pr_id, rejection_reasons[] |

#### Quality & Security

| Topic | Producer | Consumers | Payload Keys |
|-------|----------|-----------|-------------|
| `security.scan.completed` | 11 | 08, 09, 13, 00 | scan_type, findings_count, critical_count |
| `security.vulnerability.critical` | 11 | 08, 13, 00 | cve_id, severity, affected_paths[] |
| `release.status` | 12 | 13, 14, 00 | release_id, status, blocking_issues[] |

#### Operations

| Topic | Producer | Consumers | Payload Keys |
|-------|----------|-----------|-------------|
| `devops.deploy.completed` | 13 | 12, 14, 15, 29, 00 | env, version, status |
| `sre.alert.fired` | 14 | 15, 00 | alert_name, severity, metric_value |
| `sre.slo.breached` | 14 | 15, 00 | slo_name, current_value, target |
| `incident.opened` | 15 | 13, 14, 00 | incident_id, severity, summary |
| `incident.resolved` | 15 | 14, 00 | incident_id, root_cause, duration_min |
| `billing.cost.anomaly` | 16 | 13, 00 | service, current_cost, baseline, delta_pct |

#### Data & ML

| Topic | Producer | Consumers | Payload Keys |
|-------|----------|-----------|-------------|
| `pipeline.batch.arrived` | 17 | 22 | batch_id, source, record_count |
| `pipeline.failed` | 17 | 14, 00 | pipeline_id, error, stage |
| `ml.model.registered` | 18 | 19, 32 | model_name, version, metrics |
| `ml.retrain.triggered` | 18 | 16, 19, 20 | model_name, reason |
| `monitor.drift.detected` | 21 | 14, 18, 19 | model_name, drift_type, magnitude |
| `labeling.dataset.ready` | 20 | 18, 22 | dataset_name, version, sample_count |
| `data-quality.batch.validated` | 22 | 17, 18 | batch_id, quality_score, issues[] |

#### Revenue & Feedback

| Topic | Producer | Consumers | Payload Keys |
|-------|----------|-----------|-------------|
| `feedback.new` | 23,25,26 | 01, 27 | source, category, content_ref |
| `feedback.pattern.detected` | 27 | 01, 04 | pattern_id, frequency, samples[] |
| `support.ticket.created` | 26 | 01, 27 | ticket_id, category, priority |
| `billing.payment.failed` | 28 | 25 | customer_id, amount, retry_count |
| `billing.customer.new` | 28 | 04, 25, 29 | customer_id, plan |
| `analytics.usage.drop` | 29 | 25 | feature, drop_pct, time_range |

#### Governance

| Topic | Producer | Consumers | Payload Keys |
|-------|----------|-----------|-------------|
| `agent.quality.score` | 32 | 00 | agent_id, reliability, quality, efficiency, status |
| `agent.prompt.changed` | 32 | 00 | agent_id, prompt_version, change_summary |
| `agent.cost.anomaly` | 32 | 00, 16 | agent_id, current_cost, budget, delta_pct |
| `hitl.approval.requested` | any | 00 | request_id, agent_id, action_summary, risk_level |
| `hitl.approval.resolved` | HITL Queue | 00 | request_id, decision, resolved_by |

**Note:** Agent-00 (Orchestrator) is a consumer on nearly all events for TaskGraph progress tracking.

---

# PART VII — CROSS-CUTTING INFRASTRUCTURE

---

## 23. Execution Guard Policies

### 23.1 Pre-Action Checklists

| Checklist ID | Action Type | Checks |
|-------------|-------------|--------|
| `CHK-FILE-READ` | Read file | File exists? Read permission? Data tier ≤ clearance? |
| `CHK-FILE-WRITE` | Write/edit | File read first? Diff within threshold? Write permission? Artifact ownership? |
| `CHK-FILE-DELETE` | Delete | Backup exists? Human approval? Dependents checked? |
| `CHK-DB-READ` | DB query | Query bounded? Data tier ≤ clearance? Result limit set? |
| `CHK-DB-WRITE` | DB mutation | Schema validated? Backward compatible? Migration tested? Rollback plan? |
| `CHK-API-CALL` | External API | Endpoint in allowed list? Rate limit OK? Auth token valid? |
| `CHK-DEPLOY-STAGING` | Deploy staging | Tests passed? Scan clear? Feature flag configured? |
| `CHK-DEPLOY-PROD` | Deploy prod | Staging verified? Rollback tested? Human approval? SRE notified? |
| `CHK-EMAIL-SEND` | Send email | Human approval? Template in whitelist? Recipient verified? |
| `CHK-MODEL-DEPLOY` | Deploy model | Eval passed? Model card complete? Shadow period done? |
| `CHK-DATA-ACCESS` | Access PII | Purpose documented? Clearance verified? Access logged? Min scope? |
| `CHK-COST-ACTION` | Cost > $50 | Budget available? Cost Optimizer notified? Human if > $500? |
| `CHK-SCHEMA-CHANGE` | Schema change | Backward compatible? Consumers notified? Version bumped? |
| `CHK-GIT-COMMIT` | Git commit | Tests pass? Lint clean? No secrets? Convention compliant? |
| `CHK-PUBLISH` | Publish content | Human approved? Brand voice? Legal reviewed? |
| `CHK-CONTRACT` | Legal action | Attorney reviewed? Disclaimer? Jurisdiction? NEVER auto-execute |

### 23.2 Per-Agent Policy Highlights (Hot-Path Agents)

**Agent 00 (Orchestrator):**
- Fan-out limit: never >5 parallel tasks without human confirmation
- Rework trigger: task rerouted >2 times → escalate with failure analysis

**Agent 04 (PM):**
- Roadmap change: ALWAYS requires human approval (CRITICAL)
- Spec can't be "ready for dev" unless: problem linked to evidence, ≥1 user story, NFRs, RICE scored

**Agent 05 (BA):**
- Breaking schema change: CRITICAL → requires human + downstream notification + migration path

**Agent 07 (Architect):**
- Tier A decisions (new datastore, auth model, cloud region): ALWAYS human
- Tier B (library choice, caching): agent recommends, human confirms within 48hrs
- Tier C (naming, doc structure): agent autonomous

**Agent 08 (Coder):**
- Edit ≤5 files AND ≤300 LOC: MEDIUM (auto with logging)
- Edit >5 files OR >300 LOC OR touches auth/payments: HIGH → HITL required
- DB migration: HIGH → HITL required
- Direct production write: CRITICAL → BLOCKED (never allowed)
- Every DB migration must have a tested down-migration before up-migration applies

**Agent 13 (DevOps):**
- Production deploy: ALWAYS requires human approval
- Staging deploy: auto if tests + scan pass

**Agent 30 (Legal):**
- ALL actions: ALWAYS HITL (no autonomous legal decisions)

---

## 24. Data Classification (5-Tier)

| Tier | Label | Examples | Min Clearance | Storage | Logging |
|------|-------|----------|---------------|---------|---------|
| T1 | Public | Marketing docs, public API docs | None | Standard | Standard |
| T2 | Internal | Architecture docs, internal wiki | Authenticated agent | Standard | Standard |
| T3 | Confidential | Revenue data, strategy docs | Team lead clearance | Encrypted at rest | Enhanced |
| T4 | PII/Personal | Customer names, email, usage | Privacy officer | Encrypted + access log | Full audit trail |
| T5 | Regulated | Payment data, health info | Compliance + DPO | Isolated store + encryption | Immutable audit + retention |

**Agent Clearance Matrix:**

| Agent Group | Max Clearance | Notes |
|------------|--------------|-------|
| 01 (Discovery) | T4 | Handles customer PII (interview transcripts). Must PII-redact before L2 storage. |
| 02-03 (Market/Competitor) | T2 | Public + internal research only |
| 04-06 (PM/BA/UX) | T3 | Confidential business data |
| 07-10 (Engineering) | T3 | Internal + confidential code |
| 11 (Security) | T4 | Needs to scan for PII exposure |
| 13-16 (Operations) | T3 | Infrastructure + internal ops |
| 17-22 (Data/ML) | T4 | Data pipelines may touch PII |
| 23, 25, 26 (Sales/CS/Support) | T4 | Customer-facing, handles PII |
| 28 (Billing) | T5 | Payment data (PCI-DSS) |
| 30 (Legal) | T5 | Contracts, compliance |

---

## 25. Tool Permissions Matrix

| Agent | mcp-fs | mcp-git | mcp-terminal | mcp-db | mcp-email | mcp-deploy | mcp-search | mcp-stripe | mcp-analytics |
|-------|--------|---------|-------------|--------|-----------|-----------|-----------|-----------|--------------|
| 00 | R | — | — | R | — | — | — | — | R |
| 01 | RW | — | — | R | — | — | R | — | R |
| 04 | RW | — | — | — | — | — | — | — | R |
| 05 | RW | — | — | RW | — | — | — | — | — |
| 08 | RW | RW | RW | RW | — | — | — | — | — |
| 09 | R | R | — | — | — | — | — | — | — |
| 10 | RW | RW | RW | R | — | — | — | — | — |
| 11 | R | R | R | R | — | — | — | — | — |
| 13 | RW | RW | RW | R | — | RW | — | — | — |
| 14 | R | — | R | R | — | — | — | — | R |
| 28 | R | — | — | R | RW | — | — | RW | — |

`R` = Read only, `RW` = Read + Write, `—` = No access

**Environment restrictions:** Production write access requires HITL approval for ALL agents except SRE during active incident.

---

## 26. Write Authority & Artifact Ownership

### 26.1 Write Modes

| Mode | Description | Use When |
|------|-------------|---------|
| **OWNER-WRITE** | Only designated owner can modify | Critical docs (ARCHITECTURE.md, CONVENTIONS.md) |
| **APPEND-ONLY** | Multiple agents can append, none can edit/delete | L2 episodic memory, audit log |
| **PR-STYLE** | Writers propose diff, owners approve | Code, schemas, specs |
| **COORDINATED** | Multiple agents write different sections | Large features (PM writes spec, BA writes schema) |

### 26.2 Key Artifact Ownership

| Artifact | Owner | Write Mode | Proposers |
|----------|-------|-----------|-----------|
| ARCHITECTURE.md | Agent-07 | OWNER-WRITE | Human only |
| CONVENTIONS.md | Agent-07 | OWNER-WRITE | Human only |
| specs/brds/*.md | Agent-04 | OWNER-WRITE | 01, 05 can propose |
| schemas/*.json | Agent-05 | PR-STYLE | 08 can propose |
| src/**/*.ts | Agent-08 | PR-STYLE | Reviewed by 09, 11 |
| tests/**/*.ts | Agent-10 | PR-STYLE | Reviewed by 09 |
| infra/**/*.tf | Agent-13 | PR-STYLE | Reviewed by 14 |
| docs/**/*.md | Agent-31 | COORDINATED | All agents can write their section |

---

## 27. Quality Rubrics (Per-Agent Metrics)

### Agent 04 (PM)

| Metric | Target | Escalation | Measurement |
|--------|--------|-----------|-------------|
| Spec completeness score | ≥ 85% | < 70% | Automated rubric: problem statement, user stories, NFRs, RICE |
| Stakeholder approval rate | ≥ 80% | < 60% | First-submission approval without major rework |
| Spec-to-dev cycle time | ≤ 4 hours | > 8 hours | Time from spec start to "ready for dev" |

### Agent 08 (Coder)

| Metric | Target | Escalation | Measurement |
|--------|--------|-----------|-------------|
| Build success rate | ≥ 95% | < 85% | CI build passes on first commit |
| PR first-approval rate | ≥ 60% | < 40% | Approved by Agent-09 without rework |
| Test coverage (new code) | ≥ 80% | < 60% | Lines covered / lines added |
| Convention compliance | 100% | < 95% | Lint + convention checker pass |

### Agent 09 (Reviewer)

| Metric | Target | Escalation | Measurement |
|--------|--------|-----------|-------------|
| Review turnaround | ≤ 15 min | > 30 min | Time from PR created to review posted |
| Defect escape rate | ≤ 5% | > 15% | Bugs found post-merge that review should have caught |

### Agent 11 (Security)

| Metric | Target | Escalation | Measurement |
|--------|--------|-----------|-------------|
| Scan coverage | 100% of PRs | < 90% | PRs scanned / PRs merged |
| Critical vuln response | ≤ 1 hour | > 4 hours | Time from detection to notification |
| False positive rate | ≤ 20% | > 40% | Findings dismissed / total findings |

### Agent 14 (SRE)

| Metric | Target | Escalation | Measurement |
|--------|--------|-----------|-------------|
| Alert response time | ≤ 5 min | > 15 min | Time from alert to first action |
| SLO compliance | ≥ 99.5% | < 99% | Uptime within SLO target |
| MTTR | ≤ 30 min | > 2 hours | Mean time to restore service |

---

# PART VIII — OPERATIONS

---

## 28. Technology Stack

| Component | Technology | Version | Notes |
|-----------|------------|---------|-------|
| Message Broker | NATS JetStream | Latest | Durable streams, consumer groups, replay |
| Graph Database | Neo4j | 5.x | Cypher + APOC, Aura for managed |
| Vector Store | pgvector | Latest | Extension on PostgreSQL |
| Relational DB | PostgreSQL | 16+ | Primary data store |
| Cache | Redis | 7+ | L1 context, locks, rate limits |
| Object Store | MinIO (dev) / S3 (prod) | Latest | S3-compatible API |
| Policy Engine | OPA | Latest | Risk scoring, permissions |
| Embedding Model | voyage-3 | 1024d | Behind abstract interface |
| Metrics | Prometheus | Latest | Time-series metrics |
| Logs | Loki | Latest | Log aggregation |
| Traces | OTel + Tempo | Latest | Distributed tracing |
| Dashboards | Grafana | Latest | Visualization |
| Container Orch | Kubernetes | 1.28+ | Deployments, StatefulSets, HPA |
| LLM Provider | Anthropic Claude | Opus/Sonnet/Haiku | Via Model Router |
| LLM Routing | Custom Model Router | Internal | Cost/quality optimization |

---

## 29. Bootstrap Build Order

```
WEEK 1: Infrastructure
  ├── docker-compose.yml: Postgres+pgvector, Neo4j, Redis, NATS, MinIO
  ├── Run DB migrations (create all tables from Section 14)
  └── Verify: all stores accessible, schemas created

WEEK 2: Memory Service
  ├── Implement gRPC interface (Section 13)
  ├── Implement Context Compiler algorithm (Section 12)
  ├── Implement read/write for all 6 layers
  └── Test: write episodic record → retrieve → compile context

WEEK 3: Policy Engine + Tool Gateway
  ├── Deploy OPA with base policies (Section 23)
  ├── Implement Tool Gateway with preflight checks
  ├── Implement 2 MCP servers: mcp-filesystem, mcp-git
  └── Test: agent calls tool → policy check → sandboxed execution → audit

WEEK 4: Agent SDK + First Agent
  ├── Implement chassis runtime (Section 7.2 lifecycle)
  ├── Implement manifest loader (Section 15)
  ├── Build Agent-08 (Coder) as first agent
  └── Test: task in → context → LLM → tool call → result out

WEEK 5: Orchestrator + A2A Router
  ├── Implement TaskGraph planner (Section 16)
  ├── Implement A2A Router (gRPC routing + load balance)
  ├── Implement checkpoint/resume (Flow F7)
  └── Test: multi-agent workflow (PM → BA → Coder)

WEEK 6: API Gateway + Event Bus + HITL
  ├── Implement API Gateway (REST/GraphQL)
  ├── Wire NATS subscriptions per agent manifest
  ├── Implement HITL Queue (Section 7.3)
  └── Test: full Flow A end-to-end

WEEK 7: Observability + Governance
  ├── Wire OTel across all services
  ├── Deploy Prometheus + Grafana + Loki
  ├── Implement Agent-32 eval framework
  └── Test: view traces, metrics, dashboards

WEEK 8: Remaining Agents + Integration
  ├── Implement remaining 31 agent manifests + prompts
  ├── Wire all event subscriptions
  ├── Run integration tests for all coordination patterns
  └── Test: Flows A, B, C, D, E end-to-end
```

---

## 30. Local Development Setup

```bash
# Clone repository
git clone <repo> && cd deep-agent-platform

# Start all infrastructure
docker compose up -d

# Services available at:
#   Postgres:   localhost:5432 (user: deep, pass: deep, db: deep_agent)
#   Neo4j:      localhost:7474 (bolt: 7687, user: neo4j, pass: deep)
#   Redis:      localhost:6379
#   NATS:       localhost:4222 (monitoring: 8222)
#   MinIO:      localhost:9000 (console: 9001, user: minioadmin)
#   Grafana:    localhost:3000

# Run migrations
npm run db:migrate

# Start Memory Service
npm run start:memory-service

# Start single agent in dev mode
AGENT_ID=agent-08 npm run start:agent

# Run integration test
npm run test:flow-a
```

---

## 31. File Locations & Conventions

| Artifact | Location |
|----------|----------|
| Platform instructions | `PROJECT_INSTRUCTIONS.md` |
| This document | `ARCHITECTURE.md` |
| Agent manifests | `agents/agent-XX-name/manifest.yaml` |
| Agent prompts | `prompts/agent-XX-name/` |
| Agent invariants | `agents/agent-XX-name/invariants.yaml` |
| Skills | `skills/platform/`, `skills/domain/` |
| Event schemas | `libs/contracts/events/*.json` |
| API contracts | `libs/contracts/api/` |
| Database migrations | `infra/migrations/` |
| Docker compose | `infra/docker-compose.yml` |
| Terraform | `infra/terraform/` |
| Golden task evals | `evals/golden-tasks/` |
| BRD templates | `docs/templates/BRD.md` |
| API spec | `docs/API_SPEC.yaml` |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Feb 2026 | Initial architecture |
| 2.0 | Feb 2026 | Added 15 new components, consolidated overview |
| 3.0 | Feb 2026 | Implementation-grade: added Context Compiler algorithm, DB schemas, Agent SDK, Memory API, TaskGraph spec, error handling, per-agent policies, full wire map, 5 user flow walkthroughs, bootstrap order. Single source of truth. |

---

> **End of Architecture Specification v3.0**
>
> This document is the single source of truth for the Deep Agent Meta Platform.
> All autonomous coding agents should reference this document for implementation.
> Total coverage: 7 layers, 33 agents, 6 memory layers, 35+ events, 24 network wires,
> 8 standard flows, 5 user walkthroughs, full DDL, full API, full policies.
