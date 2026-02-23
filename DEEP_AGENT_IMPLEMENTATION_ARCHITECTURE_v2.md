# Deep Agent Platform — Complete Implementation Architecture v2.0

**Version:** 2.0 — Implementation-Grade  
**Date:** February 23, 2026  
**Status:** FINAL — all architecture decisions resolved, all P0 gaps closed  
**Purpose:** The ONE document you need to code the platform AND draw the Excalidraw diagram

---

# TABLE OF CONTENTS

```
PART 1 — DECISIONS (10 ADRs that resolve all contradictions)
PART 2 — PLATFORM COMPONENT MAP (every box in the diagram)
PART 3 — CONTEXT COMPILER (the #1 missing spec — full algorithm)
PART 4 — MEMORY SERVICE API (the backbone — full interface)
PART 5 — DATABASE SCHEMAS (every table, every index)
PART 6 — AGENT SDK (how to build an agent — lifecycle + config)
PART 7 — TASKGRAPH (orchestrator brain — DAG structure + algorithm)
PART 8 — COMPLETE WIRE MAP (every arrow in the diagram)
PART 9 — USER FLOW WALKTHROUGHS (5 scenarios, every step traced)
PART 10 — EXCALIDRAW FRAME SPECIFICATIONS (what to draw)
```

---

# PART 1 — ARCHITECTURE DECISIONS (FINAL)

No more "Kafka or NATS". Every decision is made.

| ADR | Decision | Choice | Why |
|-----|----------|--------|-----|
| 001 | Event Bus | **NATS JetStream** | Simpler ops, built-in persistence + request-reply, sufficient for 33 agents |
| 002 | Graph Database | **Neo4j** | Cypher maturity, APOC library, managed Aura option |
| 003 | Orchestrator | **Planner** (builds TaskGraph DAGs) | TaskGraph decomposition IS planning — own it |
| 004 | L5 Shared Memory | **Persistent graph in Neo4j** (separate namespace) + event invalidation | Single source of truth; events notify, consumers read from graph |
| 005 | Agent Framework | **Custom chassis** | We designed 13 components; LangGraph would fight it |
| 006 | Agent Config | **YAML manifest** + prompt dir + invariants file | Declarative; runtime interprets manifest |
| 007 | HITL Channel | **Webhook + CLI** (P1), Slack/Dashboard (P2) | Don't over-build UI before agent loop works |
| 008 | Local Dev | **Docker Compose** (Postgres, Neo4j, Redis, NATS, MinIO) | `docker compose up` = full platform locally |
| 009 | Schema Registry | **Git-based** (JSON Schemas in `/libs/contracts/`) | Schemas versioned with code; CI validates |
| 010 | Embeddings | **voyage-3** (1024d) behind an abstract interface | Good quality; interface allows swap later |
| 011 | A2A Protocol | **Custom gRPC** (not LF A2A directly) | LF A2A still maturing; custom gives control now |
| 012 | Object Store | **MinIO** (dev), **S3** (prod) | S3-compatible everywhere |

---

# PART 2 — PLATFORM COMPONENT MAP

This is a complete inventory of every deployable component. Each component becomes a box in the Excalidraw diagram.

## 2.1 The Five Fabrics (top-level grouping)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DEEP AGENT PLATFORM                               │
│                                                                     │
│  ┌──────────┐  ┌──────────────┐  ┌────────────┐  ┌────────────┐   │
│  │  FABRIC   │  │   FABRIC     │  │  FABRIC    │  │  FABRIC    │   │
│  │    1      │  │     2        │  │    3       │  │    4       │   │
│  │   API     │  │ COORDINATION │  │  AGENT     │  │  MEMORY    │   │
│  │          │  │              │  │  RUNTIME   │  │            │   │
│  └──────────┘  └──────────────┘  └────────────┘  └────────────┘   │
│                                                                     │
│                    ┌────────────────────┐                           │
│                    │      FABRIC 5      │                           │
│                    │  GOVERNANCE &      │                           │
│                    │  OBSERVABILITY     │                           │
│                    └────────────────────┘                           │
└─────────────────────────────────────────────────────────────────────┘
```

## 2.2 Every Component Inside Each Fabric

### FABRIC 1 — API (3 components)

| Component | What It Is | Deploys As | Talks To |
|-----------|------------|------------|----------|
| **API Gateway** | REST + GraphQL endpoint, schema validation, rate limiting, correlation_id generation | Kubernetes Service | → Orchestrator (gRPC) |
| **Auth Service** | OIDC/JWT for humans, workload identity for agents, token issuance + rotation | Kubernetes Service | ← API Gateway, ← Agent Runtime |
| **HITL Inbox** | Stores pending human approvals, serves webhook/CLI/future-UI | Kubernetes Service + Postgres table | ← Agent Runtime (pause), → Agent Runtime (resume) |

### FABRIC 2 — COORDINATION (4 components)

| Component | What It Is | Deploys As | Talks To |
|-----------|------------|------------|----------|
| **Orchestrator (Agent 00)** | TaskGraph planner: decomposes requests → DAG of agent tasks, tracks progress, manages checkpoints | Kubernetes StatefulSet | → A2A Router, → Event Bus, → Memory Service, → HITL Inbox |
| **A2A Router** | gRPC service: routes TaskEnvelopes to agent containers, load-balances, tracks delegation chains | Kubernetes Service | → Agent Runtime Pool |
| **Event Bus (NATS JetStream)** | Pub/sub: durable streams per topic, consumer groups, replay, dead-letter | Kubernetes StatefulSet | ← All services (publish), → All services (subscribe) |
| **Workflow State Store** | Persists TaskGraph state, checkpoint data, idempotency ledgers | Postgres table + MinIO (large checkpoints) | ← Orchestrator |

### FABRIC 3 — AGENT RUNTIME (2 components, but 33 instances)

| Component | What It Is | Deploys As | Talks To |
|-----------|------------|------------|----------|
| **Agent Runtime Pool** | 33 containerized agent instances, same chassis binary, different config | Kubernetes Deployments (1 per agent type, HPA-scaled) | → Memory Service, → Tool Gateway, → Event Bus, → A2A Router |
| **Deep Agent Chassis** (library, not service) | The 13-component runtime embedded in every agent container | Compiled into agent container image | Internal to agent process |

### FABRIC 4 — MEMORY (2 services, 5 stores)

| Component | What It Is | Deploys As | Talks To |
|-----------|------------|------------|----------|
| **Memory Service** | gRPC API: read/write/query across all 6 layers, context compilation | Kubernetes Service | ← Agent Runtime, ← Orchestrator |
| **Context Compiler** (module inside Memory Service) | Algorithm that assembles L1 working context from L2-L6 retrievals | Library within Memory Service | Internal |

**Backing Stores (5):**

| Store | Technology | What It Holds | Deploy |
|-------|------------|---------------|--------|
| **Redis** | Redis 7 | L1 working context cache, agent session state, locks | Kubernetes StatefulSet |
| **Postgres + pgvector** | PostgreSQL 16 + pgvector | L2 episodic records, L6 artifact index, embeddings, audit log, workflow state, HITL queue | Kubernetes StatefulSet |
| **Neo4j** | Neo4j 5 | L3 semantic graph (per-agent namespace), L5 shared graph (shared namespace) | Kubernetes StatefulSet |
| **Object Store** | MinIO (dev) / S3 (prod) | Checkpoints, large artifacts, datasets, model files | MinIO StatefulSet / S3 |
| **Git** | Git repo (local or GitHub) | L4 procedural: prompts, skills, procedures (versioned) | External or in-cluster Gitea |

### FABRIC 5 — GOVERNANCE & OBSERVABILITY (4 components)

| Component | What It Is | Deploys As | Talks To |
|-----------|------------|------------|----------|
| **Policy Engine** | OPA: evaluates risk scores, tool permissions, data classification, write authority | Kubernetes Service (OPA server) | ← Tool Gateway, ← Execution Guard (in agent) |
| **Tool Gateway** | gRPC service: MCP client multiplexer, preflight policy check, sandbox management, audit logging | Kubernetes Service | → MCP Servers, → Policy Engine, ← Agent Runtime |
| **Prompt + Skill Registry** | Version index: maps `prompt@semver` → git SHA, serves pinned content | Kubernetes Service + Git | ← Orchestrator (pin resolution), ← Agent Runtime (load) |
| **Observability Stack** | OpenTelemetry Collector → Prometheus (metrics), Loki (logs), Tempo (traces), Grafana (dashboards) | Kubernetes DaemonSet + Services | ← All services (OTel SDK) |

### EXTERNAL — MCP SERVERS (tools)

| MCP Server | What It Does | Used By (agents) |
|------------|-------------|-------------------|
| mcp-filesystem | Read/write project files | 00-32 (scoped by TOOL_PERMISSIONS) |
| mcp-git | Git operations (commit, PR, diff) | 08 Coder, 09 Reviewer, 13 DevOps |
| mcp-terminal | Shell command execution | 08 Coder, 10 Test, 13 DevOps, 17 Data, 18 ML |
| mcp-database | SQL queries against project DB | 05 BA, 08 Coder, 14 SRE, 17 Data |
| mcp-websearch | Web search | 02 Market, 03 Competitor, 24 Content |
| mcp-email | Email drafting/sending | 23 Sales, 25 CS, 26 Support, 28 Billing |
| mcp-analytics | Product analytics platform | 29 Analytics, 04 PM, 06 UX |
| mcp-mlflow | ML experiment + model registry | 18 ML, 19 MLOps, 21 Monitor |
| mcp-stripe | Payment operations | 28 Billing |
| mcp-semgrep | SAST security scanning | 11 Security |
| mcp-prometheus | Metrics queries | 14 SRE, 16 Cost |
| mcp-helpdesk | Support ticket management | 26 Support |

---

## 2.3 Complete Component Wiring (every arrow)

This is the definitive "what talks to what" table. Every row = one arrow in the Excalidraw diagram.

```
PROTOCOL KEY:
  ───HTTPS──►   = HTTPS REST/GraphQL
  ───gRPC───►   = gRPC (protobuf)
  ───NATS───►   = NATS JetStream pub/sub
  ───MCP────►   = Model Context Protocol (JSON-RPC 2.0)
  ───OTel───►   = OpenTelemetry (traces/metrics/logs)
  ───SQL────►   = Database wire protocol
  ───BOLT───►   = Neo4j Bolt protocol
  ───Redis──►   = Redis protocol
  ───S3─────►   = S3-compatible API
```

| # | From | Arrow | To | What Flows | When |
|---|------|-------|-----|-----------|------|
| W1 | Client (Human/UI) | ───HTTPS──► | API Gateway | User request + JWT | Every interaction |
| W2 | API Gateway | ───gRPC───► | Auth Service | Validate JWT, get identity | Every request |
| W3 | API Gateway | ───gRPC───► | Orchestrator | TaskEnvelope (new workflow) | Every request |
| W4 | Orchestrator | ───gRPC───► | A2A Router | TaskEnvelope + pins (assign to agent) | Per task node |
| W5 | A2A Router | ───gRPC───► | Agent Runtime | TaskEnvelope (delivered to specific agent container) | Per task |
| W6 | Agent Runtime | ───gRPC───► | Memory Service | `memory.read()` / `memory.compile_context()` | Before every LLM call |
| W7 | Agent Runtime | ───gRPC───► | Memory Service | `memory.write()` | After every LLM call + tool call |
| W8 | Agent Runtime | ───gRPC───► | Tool Gateway | ToolCall | When agent needs to act |
| W9 | Tool Gateway | ───gRPC───► | Policy Engine (OPA) | Policy evaluation request | Before every tool execution |
| W10 | Tool Gateway | ───MCP────► | MCP Servers | Tool invocation (sandboxed) | Per tool call |
| W11 | Agent Runtime | ───NATS───► | Event Bus | EventEnvelope (domain events) | After meaningful state changes |
| W12 | Event Bus | ───NATS───► | Orchestrator | Events (progress, failures, completions) | Continuous |
| W13 | Event Bus | ───NATS───► | Other Agent Runtimes | Events (subscribed topics) | Continuous |
| W14 | Agent Runtime | ───gRPC───► | Auth Service | Get/refresh workload identity token | On startup + every 15 min |
| W15 | Agent Runtime | ───gRPC───► | HITL Inbox | Submit approval request | When HITL gate triggers |
| W16 | HITL Inbox | ───gRPC───► | Agent Runtime (via Orchestrator) | Approval/rejection result | When human responds |
| W17 | Orchestrator | ───gRPC───► | Prompt + Skill Registry | Resolve pin → content | During TaskEnvelope creation |
| W18 | Memory Service | ───SQL────► | Postgres | L2 episodic, L6 index, embeddings | Every memory operation |
| W19 | Memory Service | ───BOLT───► | Neo4j | L3 semantic graph, L5 shared graph | Every memory operation |
| W20 | Memory Service | ───Redis──► | Redis | L1 cache, session state, locks | Every context compile |
| W21 | Memory Service | ───S3─────► | Object Store | Checkpoints, large artifacts | On checkpoint/artifact ops |
| W22 | Orchestrator | ───SQL────► | Workflow State Store (Postgres) | TaskGraph persistence | On every state change |
| W23 | All Services | ───OTel───► | Observability Stack | Traces, metrics, logs | Continuous |
| W24 | Prompt Registry | ───Git────► | Git Repo | Read pinned prompts/skills | On pin resolution |

---

# PART 3 — CONTEXT COMPILER SPECIFICATION

This is the #1 gap that was identified. Here is the complete algorithm.

## 3.1 What It Does (One Sentence)

The Context Compiler transforms raw memory retrievals from 5 layers into a single, token-bounded, structured prompt (L1 Working Context) that the LLM receives.

## 3.2 The L1 Working Context Structure

Every LLM call in the platform receives this exact structure. Sections are NEVER reordered.

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
│  "From ARCHITECTURE.md: ... From CONVENTIONS: ..."  │
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
│  RESERVE: ~5% for response overhead                 │
└─────────────────────────────────────────────────────┘
```

## 3.3 Token Budget Allocation

Given a total token budget (from TaskEnvelope.constraints.token_budget):

```
Total Budget: e.g., 120,000 tokens
  ├── LLM Response Reserve: 30% = 36,000 tokens (for the model's output)
  └── L1 Context Budget: 70% = 84,000 tokens (what we assemble)
       ├── Section 1 Identity:    fixed    200 tokens
       ├── Section 2 Invariants:  fixed    400 tokens
       ├── Section 7 Output fmt:  fixed    100 tokens
       └── Remaining: 83,300 tokens distributed as:
            ├── Section 3 Skills:          20% = 16,660 tokens
            ├── Section 4 Project Context: 10% =  8,330 tokens
            ├── Section 5 Memory:          40% = 33,320 tokens
            │    ├── 5a L2 Episodic:  30% of memory = 9,996
            │    ├── 5b L3 Semantic:  25% of memory = 8,330
            │    ├── 5c L5 Shared:    20% of memory = 6,664
            │    └── 5d L6 Resources: 25% of memory = 8,330
            └── Section 6 Task:            25% = 20,825 tokens
            (5% leftover = buffer for formatting/separators)
```

## 3.4 Retrieval Algorithm (per layer)

**L2 Episodic (what happened before):**
```
1. Exact match: all episodes with this correlation_id (max 10, newest first)
2. Vector search: embed(task.goal) → top-20 similar episodes for this agent
3. Merge, dedupe by memory_id
4. Rank by: recency(0.4) × relevance(0.4) × importance(0.2)
   - recency: exponential decay, half-life = 7 days
   - relevance: cosine similarity to task.goal embedding
   - importance: tool_call > decision > interaction
5. Truncate to L2 budget, most recent kept even if low-ranked
```

**L3 Semantic (what we know):**
```
1. Extract entity names from task.goal + task.inputs
2. Graph query: MATCH (e)-[r*1..2]-(related) WHERE e.name IN $entities
3. Also: vector search embed(task.goal) → top-15 semantic nodes
4. Merge graph results + vector results, dedupe
5. Format as: "Entity: X, Relationship: Y, Related: Z"
6. Truncate to L3 budget
```

**L5 Shared (what the team knows):**
```
1. Query shared graph: nodes tagged with task's domain/feature
2. Filter by: agent's read permissions on shared memory
3. Sort by: timestamp (newest first)
4. Truncate to L5 budget
```

**L6 Resources (relevant artifacts):**
```
1. Vector search embed(task.goal) → top-10 artifact index entries
2. Filter: freshness_score > 0.3 (stale artifacts ranked lower)
   freshness_score = 1.0 if modified < 7 days, decays to 0.0 at 90 days
3. Return: artifact_path + summary + last_modified + owner
4. Truncate to L6 budget
```

## 3.5 Conflict Resolution Rules

When different memory layers disagree:

| Conflict Type | Rule | Example |
|--------------|------|---------|
| L2 episode contradicts L3 fact | **L2 wins** (ground truth log overrides distilled knowledge) | L3 says "API uses REST", L2 latest episode says "migrated to gRPC" → use gRPC |
| L5 shared contradicts L3 private | **L5 wins if newer** (shared state is cross-agent coordination) | L3 says "schema v1", L5 says "schema v2 published by BA" → use v2 |
| Two L2 episodes disagree | **Most recent wins** | Episode from today overrides episode from last week |
| L6 artifact content vs L3 summary | **L6 wins** (actual artifact is source of truth) | L3 summary of doc is outdated; L6 points to current doc |

---

# PART 4 — DATABASE SCHEMAS

## 4.1 Postgres Tables

### episodic_records (L2 — append-only ground truth)

```sql
CREATE TABLE episodic_records (
    memory_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id        VARCHAR(8) NOT NULL,          -- "agent-08"
    correlation_id  UUID NOT NULL,
    task_id         UUID,
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    kind            VARCHAR(32) NOT NULL,          -- interaction|tool_call|decision|error
    summary         TEXT NOT NULL,                 -- human-readable summary
    content         JSONB NOT NULL,                -- full structured content
    
    classification  VARCHAR(16) NOT NULL DEFAULT 'internal',  -- T1-T5
    embedding       vector(1024),                  -- voyage-3 embedding
    
    provenance_prompt_pin  VARCHAR(256),
    provenance_skill_pin   VARCHAR(256),
    provenance_model       VARCHAR(64),
    
    links           JSONB DEFAULT '[]',            -- [{type, target_id}]
    ttl_expires_at  TIMESTAMPTZ                    -- NULL = never expires
);

-- Indexes
CREATE INDEX idx_episodic_correlation ON episodic_records(correlation_id);
CREATE INDEX idx_episodic_agent_time ON episodic_records(agent_id, timestamp DESC);
CREATE INDEX idx_episodic_kind ON episodic_records(kind);
CREATE INDEX idx_episodic_embedding ON episodic_records 
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Partitioning by month for performance
-- (implement via pg_partman in production)
```

### artifact_index (L6 — resource memory)

```sql
CREATE TABLE artifact_index (
    artifact_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artifact_path   VARCHAR(512) NOT NULL UNIQUE,  -- "specs/schemas/user.json"
    artifact_type   VARCHAR(32) NOT NULL,           -- code|doc|schema|config|data|model
    
    owner_agent     VARCHAR(8) NOT NULL,            -- "agent-05"
    classification  VARCHAR(16) NOT NULL DEFAULT 'internal',
    
    summary         TEXT,                           -- AI-generated summary
    embedding       vector(1024),                   -- embedding of summary
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    modified_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    freshness_score FLOAT GENERATED ALWAYS AS (
        GREATEST(0, 1.0 - EXTRACT(EPOCH FROM (now() - modified_at)) / (90*86400))
    ) STORED,
    
    tags            TEXT[] DEFAULT '{}',
    metadata        JSONB DEFAULT '{}'              -- size, lines, language, etc.
);

CREATE INDEX idx_artifact_path ON artifact_index(artifact_path);
CREATE INDEX idx_artifact_owner ON artifact_index(owner_agent);
CREATE INDEX idx_artifact_embedding ON artifact_index 
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
```

### audit_log (every action by every agent)

```sql
CREATE TABLE audit_log (
    audit_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    agent_id        VARCHAR(8) NOT NULL,
    correlation_id  UUID NOT NULL,
    
    action_type     VARCHAR(32) NOT NULL,           -- tool_call|memory_write|event_publish|hitl_request
    action_detail   JSONB NOT NULL,
    
    risk_score      FLOAT,
    risk_level      VARCHAR(12),                    -- low|medium|high|critical
    
    outcome         VARCHAR(16) NOT NULL,           -- success|failed|blocked|deferred
    error_detail    TEXT,
    
    tokens_used     INTEGER,
    cost_usd        FLOAT,
    latency_ms      INTEGER
);

CREATE INDEX idx_audit_correlation ON audit_log(correlation_id);
CREATE INDEX idx_audit_agent_time ON audit_log(agent_id, timestamp DESC);
```

### workflow_state (Orchestrator's TaskGraph persistence)

```sql
CREATE TABLE workflow_state (
    workflow_id     UUID PRIMARY KEY,
    correlation_id  UUID NOT NULL,
    
    status          VARCHAR(16) NOT NULL,           -- running|paused|completed|failed
    taskgraph       JSONB NOT NULL,                 -- serialized TaskGraph DAG
    current_cursor  JSONB NOT NULL,                 -- which nodes are active/done
    
    pins            JSONB NOT NULL,                 -- pinned versions
    idempotency_ledger JSONB DEFAULT '{}',          -- tool_call_id → result_hash
    
    checkpoint_ref  VARCHAR(512),                   -- S3 path if large checkpoint
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    initiator_type  VARCHAR(8) NOT NULL,            -- human|system
    initiator_id    VARCHAR(256) NOT NULL
);
```

### hitl_queue (pending human approvals)

```sql
CREATE TABLE hitl_queue (
    request_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id     UUID NOT NULL REFERENCES workflow_state(workflow_id),
    task_id         UUID NOT NULL,
    agent_id        VARCHAR(8) NOT NULL,
    correlation_id  UUID NOT NULL,
    
    request_type    VARCHAR(32) NOT NULL,           -- approve_action|review_output|confirm_plan
    description     TEXT NOT NULL,
    context         JSONB NOT NULL,                 -- what the human needs to see
    risk_level      VARCHAR(12) NOT NULL,
    
    status          VARCHAR(16) NOT NULL DEFAULT 'pending',  -- pending|approved|rejected|expired
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ,                    -- auto-escalate if not answered
    resolved_at     TIMESTAMPTZ,
    resolved_by     VARCHAR(256),
    resolution_note TEXT
);
```

## 4.2 Neo4j Graph Schema

### L3 Semantic Memory (per-agent namespace)

```cypher
// Node types
(:Entity {
    id: string,           // UUID
    name: string,         // "UserService"
    type: string,         // "service"|"concept"|"person"|"feature"|"rule"
    agent_id: string,     // owner agent
    properties: map,      // flexible attributes
    embedding: list,      // 1024-dim vector
    created_at: datetime,
    updated_at: datetime,
    confidence: float     // 0.0-1.0
})

// Relationship types
[:DEPENDS_ON]
[:IMPLEMENTS]
[:RELATES_TO { strength: float }]
[:CONTRADICTS]
[:SUPERSEDES]
[:OWNS]
[:PART_OF]
[:USES]

// Example:
// (:Entity {name:"BRD-001", type:"spec"})-[:IMPLEMENTS]->(:Entity {name:"Anomaly Detection", type:"feature"})
// (:Entity {name:"Agent-08", type:"agent"})-[:OWNS]->(:Entity {name:"src/api/routes.ts", type:"code"})
```

### L5 Shared Memory (shared namespace)

```cypher
// Same node structure as L3 but in namespace "shared://"
(:SharedFact {
    id: string,
    key: string,          // "current_schema_version"
    value: string,
    published_by: string, // agent_id
    published_at: datetime,
    write_authority: string, // which agent has write permission
    version: integer
})

// Shared relationships between shared facts
[:DERIVED_FROM]
[:UPDATED_BY { agent_id: string, timestamp: datetime }]
```

## 4.3 Redis Key Schema

```
# L1 Working Context Cache (TTL: 1 hour)
l1:{agent_id}:{task_id}              → JSON (compiled context)

# Agent Session State (TTL: 24 hours)
session:{agent_id}:{correlation_id}  → JSON (current state)

# Distributed Locks (TTL: 5 minutes)
lock:artifact:{artifact_path}        → agent_id (who holds the lock)
lock:shared:{key}                    → agent_id

# Rate Limiting Counters (TTL: 1 hour)
rate:{agent_id}:llm_calls            → integer (sliding window counter)
rate:{agent_id}:tool_calls           → integer

# Eviction policy: allkeys-lru
# Max memory: 2GB (dev), 8GB (prod)
```

## 4.4 Object Store Layout (MinIO / S3)

```
bucket: deep-agent-platform
├── checkpoints/
│   └── {workflow_id}/{checkpoint_number}.json
├── artifacts/
│   └── {correlation_id}/{artifact_path}  (large files > 1MB)
├── datasets/
│   └── {dataset_name}/{version}/
├── models/
│   └── {model_name}/{version}/
└── audit-exports/
    └── {year}/{month}/{day}.jsonl.gz
```

---

# PART 5 — AGENT SDK SPECIFICATION

## 5.1 Agent Manifest (YAML) — How You Define an Agent

Every agent is defined by ONE YAML file + a prompt directory + an invariants file.

```yaml
# /agents/agent-08-coder/manifest.yaml

agent_id: "agent-08"
name: "Coder Agent"
layer: "L2-DESIGN-ENGINEERING"
version: "1.0.0"

# Model configuration
model:
  default: "claude-sonnet-4"          # standard tasks
  complex: "claude-opus-4"            # architectural tasks
  routing_rules:
    - condition: "task.touches_auth OR task.touches_payments"
      model: "claude-opus-4"
    - condition: "task.lines_of_code < 50"
      model: "claude-haiku-4"

# Autonomy and HITL
autonomy: "high"
hitl_gates:
  - action: "db_migration_prod"
    approval: "human"
  - action: "auth_code_change"
    approval: "human"
  - action: "payment_code_change"
    approval: "human"

# Memory access scopes
memory:
  l2_episodic: { read: true, write: true, scope: "own" }
  l3_semantic: { read: true, write: true, scope: "own" }
  l4_procedural: { read: true, write: false }   # read skills, can't modify
  l5_shared: { read: true, write: true, scope: "engineering" }
  l6_resource: { read: true, write: true }

# Data classification clearance
data_clearance: "T3"    # internal + confidential, NOT PII

# Tool permissions (detailed in TOOL_PERMISSIONS.yml)
tools:
  - mcp-filesystem
  - mcp-git
  - mcp-terminal
  - mcp-database
  - mcp-codesearch
  - mcp-linter

# Skills to load
skills:
  - /skills/platform/coder/SKILL.md
  - /skills/platform/security/SKILL.md    # always load security awareness

# Project context files to load
project_context:
  - CONVENTIONS.md
  - ARCHITECTURE.md

# Prompt directory
prompts_dir: /prompts/agent-08-coder/

# Invariants file
invariants_file: /agents/agent-08-coder/invariants.yaml

# Event subscriptions
events:
  subscribes:
    - ba.schema.published
    - ba.event-taxonomy.changed
    - pm.spec.published
    - reviewer.pr.approved
    - reviewer.pr.rejected
    - security.scan.completed
    - security.vulnerability.critical
  publishes:
    - coder.pr.created
    - coder.pr.merged

# Quality metrics for Agent Governance
quality_metrics:
  build_success_rate: { target: 0.95, escalation: 0.85 }
  pr_first_approval_rate: { target: 0.60, escalation: 0.40 }
  test_coverage_new_code: { target: 0.80, escalation: 0.60 }
  convention_compliance: { target: 1.00, escalation: 0.95 }

# Resource limits
resources:
  token_budget_per_task: 120000
  max_concurrent_tasks: 3
  rate_limit_llm_per_hour: 200
  rate_limit_tools_per_hour: 500
```

## 5.2 Agent Lifecycle (Runtime Behavior)

This is the exact sequence that happens inside every agent container:

```
AGENT CONTAINER STARTS
       │
       ▼
[1] INIT
    ├── Load manifest.yaml
    ├── Load invariants.yaml
    ├── Register with A2A Router (send Agent Card)
    ├── Obtain workload identity token from Auth Service
    ├── Subscribe to event topics (NATS)
    └── Report "ready" to Orchestrator
       │
       ▼
[2] WAIT FOR WORK (event loop)
    ├── Listen on gRPC port for TaskEnvelope
    ├── Listen on NATS for subscribed events
    └── Background: token rotation every 15 min
       │
       ▼ (TaskEnvelope received)
[3] TASK RECEIVED
    ├── Validate TaskEnvelope schema
    ├── Extract pins (prompt version, skill version, model version)
    ├── Start OTel trace span
    └── Begin task processing
       │
       ▼
[4] CONTEXT COMPILATION (calls Memory Service)
    ├── Load pinned skills (from L4 via Prompt Registry)
    ├── Load project context files
    ├── Call memory.compile_context(task, agent_id, budget)
    │   └── Memory Service runs retrieval algorithm (Part 3)
    ├── Receive L1 Working Context
    └── Cache in Redis: l1:{agent_id}:{task_id}
       │
       ▼
[5] REASONING (LLM call)
    ├── Send L1 Working Context to LLM (via model router)
    ├── Receive: PLAN, ACTIONS, CONFIDENCE, RISKS
    └── Parse structured response
       │
       ▼
[6] EXECUTION GUARD (pre-action check)
    ├── For each proposed ACTION:
    │   ├── Compute risk score (5 dimensions)
    │   ├── Check against confidence threshold matrix
    │   ├── Run invariant checks (code, not prompt)
    │   ├── Query Policy Engine (OPA) for permissions
    │   └── Decision: PASS | CONDITIONAL | DEFER | BLOCK
    │
    ├── PASS → proceed to Tool Execution
    ├── CONDITIONAL → narrow action scope, proceed
    ├── DEFER → submit to HITL Inbox, PAUSE task
    └── BLOCK → log violation, skip action, re-plan
       │
       ▼
[7] TOOL EXECUTION (via Tool Gateway)
    ├── Send ToolCall to Tool Gateway (gRPC)
    ├── Tool Gateway runs preflight (policy check)
    ├── Tool Gateway executes via MCP server (sandboxed)
    ├── Receive ToolResult
    └── Verify result matches expectations
       │
       ▼
[8] VERIFY & LOOP
    ├── Did action produce expected outcome?
    │   ├── YES → next action in plan
    │   └── NO → adjust plan, retry (max 3 retries per action)
    └── All actions done? → proceed to Memory Write
       │
       ▼
[9] MEMORY WRITE (calls Memory Service)
    ├── Append to L2: what happened, tool calls, outcomes, decisions
    ├── Update L3: new entities/relationships discovered
    ├── Update L5: if cross-agent relevant (publish event first)
    └── Update L6: if new artifacts created (register in index)
       │
       ▼
[10] EVENT PUBLISH
     ├── Emit domain events to NATS (e.g., coder.pr.created)
     └── Events validated against JSON Schema before publish
       │
       ▼
[11] RETURN RESULT
     ├── Build AgentResult (status, artifacts, decisions, telemetry)
     ├── Send to Orchestrator via A2A Router
     ├── Close OTel trace span
     └── Return to [2] WAIT FOR WORK
```

## 5.3 HITL Pause/Resume Mechanism

```
Agent reaches HITL gate (step [6] DEFER)
       │
       ▼
[PAUSE]
    ├── Serialize current state:
    │   ├── task_id, correlation_id
    │   ├── current plan step number
    │   ├── accumulated results so far
    │   └── the specific action awaiting approval
    ├── Write to hitl_queue (Postgres)
    ├── Write checkpoint to workflow_state
    ├── Emit event: hitl.approval.requested
    └── Agent releases task (returns to WAIT)
       │
       ▼
[HUMAN RESPONDS] (via CLI/webhook/Slack)
    ├── Update hitl_queue: status = approved|rejected
    ├── Emit event: hitl.approval.resolved
       │
       ▼
[RESUME]
    ├── Orchestrator receives event
    ├── Orchestrator re-dispatches TaskEnvelope to agent
    │   with: checkpoint_ref pointing to saved state
    ├── Agent loads checkpoint
    ├── Skips already-completed steps (idempotency ledger)
    └── Continues from the deferred action
```

---

# PART 6 — TASKGRAPH SPECIFICATION

## 6.1 What a TaskGraph Is

A TaskGraph is a **directed acyclic graph (DAG)** where:
- Each **node** is a task assigned to one agent
- Each **edge** is a dependency ("B cannot start until A completes")
- The Orchestrator builds it, tracks it, and checkpoints it

## 6.2 TaskGraph Data Structure

```json
{
  "workflow_id": "uuid",
  "correlation_id": "uuid",
  "created_at": "ISO-8601",
  "status": "running",
  
  "nodes": [
    {
      "node_id": "n1",
      "agent_id": "agent-05",
      "goal": "Create JSON schema for user endpoints",
      "inputs": { "spec_ref": "specs/brds/BRD-001.md" },
      "status": "completed",
      "depends_on": [],
      "result_ref": "agent-result-uuid"
    },
    {
      "node_id": "n2",
      "agent_id": "agent-06",
      "goal": "Design user onboarding flow wireframes",
      "inputs": { "spec_ref": "specs/brds/BRD-001.md" },
      "status": "completed",
      "depends_on": [],
      "result_ref": "agent-result-uuid"
    },
    {
      "node_id": "n3",
      "agent_id": "agent-08",
      "goal": "Implement user API endpoints",
      "inputs": { "schema_ref": "n1.output", "design_ref": "n2.output" },
      "status": "running",
      "depends_on": ["n1", "n2"],
      "result_ref": null
    },
    {
      "node_id": "n4",
      "agent_id": "agent-10",
      "goal": "Write tests for user API",
      "inputs": { "schema_ref": "n1.output", "code_ref": "n3.output" },
      "status": "pending",
      "depends_on": ["n1", "n3"],
      "result_ref": null
    }
  ],
  
  "edges": [
    { "from": "n1", "to": "n3" },
    { "from": "n2", "to": "n3" },
    { "from": "n1", "to": "n4" },
    { "from": "n3", "to": "n4" }
  ]
}
```

## 6.3 How the Orchestrator Plans

```
REQUEST ARRIVES ("Build user management feature")
       │
       ▼
[1] PATTERN MATCH
    ├── Check known workflow templates in L4 procedural memory
    │   e.g., "feature_request" → [PM→BA→UX→Coder→Test→Review→Deploy]
    ├── If exact match → use template, fill in specifics
    └── If no match → proceed to LLM planning
       │
       ▼
[2] LLM PLANNING (if needed)
    ├── Context: task goal + available agents (from Agent Registry) + dependencies
    ├── Output: ordered list of subtasks with agent assignments
    └── Orchestrator validates: no cycles, all agents exist, dependencies valid
       │
       ▼
[3] BUILD DAG
    ├── Create TaskGraph with nodes and edges
    ├── Identify parallel tracks (nodes with no mutual dependencies)
    ├── Attach pins to each node
    └── Persist to workflow_state
       │
       ▼
[4] EXECUTE
    ├── Find all "ready" nodes (dependencies satisfied, status=pending)
    ├── Dispatch ready nodes in PARALLEL via A2A Router
    ├── As each completes: mark done, check if new nodes are unblocked
    └── Continue until all nodes complete OR failure
       │
       ▼
[5] FAILURE HANDLING
    ├── Node fails → retry up to 2 times
    ├── Still fails → mark node as "failed"
    ├── If failed node is critical (other nodes depend on it):
    │   ├── Check: can dependent nodes proceed without this input?
    │   │   ├── NO → pause workflow, escalate to human
    │   │   └── YES → continue with degraded context
    └── Human can: retry node, skip node, assign to different agent, abort workflow
```

---

# PART 7 — COMPLETE WIRE MAP (Data Flow Architecture)

This section shows how ALL data flows through the system. Use this as the blueprint for the Excalidraw diagram.

## 7.1 Master Data Flow Diagram (text representation)

```
                    ┌──────────────────┐
                    │   HUMAN / CLIENT │
                    └────────┬─────────┘
                             │ HTTPS (W1)
                             ▼
                    ┌──────────────────┐         ┌──────────────┐
                    │   API GATEWAY    │──gRPC──►│ AUTH SERVICE  │
                    │  • schema valid  │  (W2)   │ • JWT verify │
                    │  • rate limit    │         │ • workload ID│
                    │  • correlation_id│         └──────────────┘
                    └────────┬─────────┘               ▲
                             │ gRPC (W3)               │ gRPC (W14)
                             ▼                         │
┌────────────────────────────────────────────────────────────────────────┐
│                     COORDINATION FABRIC                                │
│                                                                        │
│  ┌────────────────────────┐   gRPC   ┌──────────────────────┐        │
│  │    ORCHESTRATOR        │──(W4)──►│    A2A ROUTER         │        │
│  │    (Agent 00)          │          │  • route to agent     │        │
│  │                        │          │  • load balance       │        │
│  │  • build TaskGraph     │          │  • delegation chains  │        │
│  │  • track progress      │          └──────────┬───────────┘        │
│  │  • checkpoint/resume   │                     │ gRPC (W5)          │
│  │  • resolve pins        │                     ▼                     │
│  └───┬────────┬───────────┘   ┌────────────────────────────────┐     │
│      │        │               │        AGENT RUNTIME POOL       │     │
│      │        │               │  ┌──────┐┌──────┐    ┌──────┐  │     │
│      │    ┌───┘               │  │Ag-01 ││Ag-08 │... │Ag-32 │  │     │
│      │    │                   │  │      ││      │    │      │  │     │
│      │    │   gRPC (W17)      │  │CHASIS││CHASIS│    │CHASIS│  │     │
│      │    ▼                   │  └──┬───┘└──┬───┘    └──┬───┘  │     │
│  ┌─────────────────┐         │     │gRPC   │gRPC       │      │     │
│  │ PROMPT & SKILL  │         │     │(W6,7) │(W6,7)     │      │     │
│  │   REGISTRY      │         └─────┼───────┼───────────┼──────┘     │
│  │ • pin → git sha │               │       │           │            │
│  │ • serve content │               │       │           │            │
│  └─────────────────┘               ▼       ▼           ▼            │
│                                                                       │
│  ┌─────────────────────────────────────────────────────┐             │
│  │                  EVENT BUS (NATS JetStream)         │◄─NATS(W11) │
│  │  • durable streams per topic                        │             │
│  │  • consumer groups                                  │──NATS(W12)─►│
│  │  • dead-letter queue                                │──NATS(W13)─►│
│  │  • schema validation on publish                     │             │
│  └─────────────────────────────────────────────────────┘             │
│                                                                       │
│  ┌─────────────────────┐                                             │
│  │ WORKFLOW STATE STORE│◄──SQL(W22)── Orchestrator                   │
│  │ (Postgres table)    │                                             │
│  └─────────────────────┘                                             │
│                                                                       │
│  ┌─────────────────────┐                                             │
│  │ HITL INBOX          │◄──gRPC(W15)── Agent Runtime                 │
│  │ (Postgres table)    │──gRPC(W16)──► Orchestrator (resume)         │
│  └─────────────────────┘                                             │
└────────────────────────────────────────────────────────────────────────┘
                    │              │              │
            gRPC (W6,W7)    gRPC (W8)     OTel (W23)
                    ▼              ▼              ▼
┌───────────────────────┐ ┌──────────────────┐ ┌───────────────────────┐
│    MEMORY FABRIC      │ │  TOOL FABRIC     │ │  OBSERVABILITY FABRIC │
│                       │ │                  │ │                       │
│ ┌───────────────────┐ │ │ ┌──────────────┐ │ │ ┌─────────┐          │
│ │  MEMORY SERVICE   │ │ │ │ TOOL GATEWAY │ │ │ │ OTel    │          │
│ │  • read()         │ │ │ │ • preflight  │ │ │ │Collector│          │
│ │  • write()        │ │ │ │ • sandbox    │ │ │ └────┬────┘          │
│ │  • compile_ctx()  │ │ │ │ • audit      │ │ │      │               │
│ │                   │ │ │ └──────┬───────┘ │ │      ▼               │
│ │ ┌───────────────┐ │ │ │       │gRPC(W9) │ │ ┌─────────┐          │
│ │ │CONTEXT        │ │ │ │       ▼          │ │ │Prometheus│          │
│ │ │COMPILER       │ │ │ │ ┌────────────┐  │ │ │Loki     │          │
│ │ │(algorithm)    │ │ │ │ │POLICY ENG  │  │ │ │Tempo    │          │
│ │ └───────────────┘ │ │ │ │(OPA)       │  │ │ │Grafana  │          │
│ └─────────┬─────────┘ │ │ └────────────┘  │ │ └─────────┘          │
│           │            │ │       │          │ │                       │
│     ┌─────┼────────┐   │ │       │MCP(W10) │ │ ┌─────────────────┐  │
│     │     │        │   │ │       ▼          │ │ │ POLICY ENGINE   │  │
│     ▼     ▼        ▼   │ │ ┌────────────┐  │ │ │ (OPA)           │  │
│ ┌─────┐┌──────┐┌────┐ │ │ │ MCP SERVERS│  │ │ │ • risk scoring  │  │
│ │Redis││Postgr││Neo4j│ │ │ │ • git      │  │ │ │ • permissions   │  │
│ │     ││+pgvec││     │ │ │ │ • file     │  │ │ │ • classification│  │
│ │ L1  ││L2,L6 ││L3,L5│ │ │ │ • terminal │  │ │ └─────────────────┘  │
│ └─────┘└──────┘└────┘ │ │ │ • database │  │ │                       │
│           │            │ │ │ • email    │  │ │ ┌─────────────────┐  │
│           ▼            │ │ │ • stripe   │  │ │ │ PROMPT REGISTRY │  │
│     ┌──────────┐       │ │ │ • mlflow   │  │ │ │ • pin resolve   │  │
│     │OBJ STORE │       │ │ │ • search   │  │ │ │ • serve content │  │
│     │(MinIO/S3)│       │ │ └────────────┘  │ │ └─────────────────┘  │
│     │checkpts, │       │ │                  │ │                       │
│     │artifacts │       │ └──────────────────┘ └───────────────────────┘
│     └──────────┘       │
│     ┌──────────┐       │
│     │  GIT     │       │
│     │  (L4)    │       │
│     │ prompts/ │       │
│     │ skills/  │       │
│     └──────────┘       │
└───────────────────────┘
```

---

# PART 8 — USER FLOW WALKTHROUGHS

Five end-to-end scenarios showing every component touched, every arrow traversed, every data store accessed.

## FLOW A: "Build a new feature" (most common, multi-agent)

**Trigger:** Human says "Build user authentication with email/password and OAuth"

```
STEP  WHO                DOES WHAT                           WIRES    STORES
───── ──────────────── ──────────────────────────────────── ──────── ─────────
A1    Human            Sends request via UI                  W1       —
A2    API Gateway      Validates, assigns correlation_id,    W2,W3    audit_log
                       forwards to Orchestrator
A3    Orchestrator     Matches pattern "feature_request"     —        —
                       Builds TaskGraph:
                         n1: Agent-04 (PM) → write spec
                         n2: Agent-05 (BA) → create schemas     (depends n1)
                         n3: Agent-06 (UX) → design flows       (depends n1)
                         n4: Agent-08 (Coder) → implement       (depends n2,n3)
                         n5: Agent-10 (Test) → write tests      (depends n2,n4)
                         n6: Agent-09 (Review) → review PR      (depends n4)
                         n7: Agent-11 (Security) → scan         (depends n4)
A4    Orchestrator     Persists TaskGraph                    W22      workflow_state
                       Resolves pins (prompt/skill versions) W17      git
                       Dispatches n1 (no dependencies)       W4→W5    —
A5    A2A Router       Routes TaskEnvelope to Agent-04       W5       —
A6    Agent-04 (PM)    Receives task                         —        —
                       Calls memory.compile_context()        W6       Redis, Postgres, Neo4j
                       Gets L1 context with:
                         Skills: BRD writing, RICE scoring
                         Memory: similar past specs, customer evidence
                         Task: "write auth feature spec"
A7    Agent-04 (PM)    LLM call: plans BRD sections          —        —
A8    Agent-04 (PM)    Execution Guard: all LOW risk (writing files) W9   —
A9    Agent-04 (PM)    Writes spec via Tool Gateway          W8→W10   filesystem
                       (mcp-filesystem.write to specs/brds/BRD-AUTH.md)
A10   Agent-04 (PM)    Memory write: L2 (what happened),     W7       Postgres, Neo4j
                       L3 (auth feature entity), L6 (artifact index)
A11   Agent-04 (PM)    Publishes event: pm.spec.published    W11      NATS
A12   Agent-04 (PM)    Returns AgentResult to Orchestrator   W5→W4    —
A13   Orchestrator     Marks n1 complete, n2 and n3 now      W22      workflow_state
                       unblocked (parallel). Dispatches both.
A14   Agent-05 (BA)    [Same pattern as A6-A12 but for schemas]
                       Publishes: ba.schema.published
A15   Agent-06 (UX)    [Same pattern but for wireframes]
                       Writes: design/auth-flow.html
A16   Orchestrator     n2,n3 complete → n4 unblocked         W22      workflow_state
                       Dispatches to Agent-08 (Coder)
A17   Agent-08 (Coder) Receives task with schema_ref and design_ref
                       Compiles context: includes schema + design + CONVENTIONS.md
                       Plans implementation: 4 files to create/modify
A18   Agent-08 (Coder) Execution Guard: >5 files → HIGH risk → W9     —
                       submits plan to HITL for approval     W15      hitl_queue
A19   Human            Reviews plan, approves via CLI         —        hitl_queue
A20   Orchestrator     Receives approval event, re-dispatches W16→W5  —
A21   Agent-08 (Coder) Resumes from checkpoint
                       LOOP: for each file:
                         Read file (mcp-filesystem)          W8→W10   —
                         Edit (mcp-filesystem)               W8→W10   —
                         Run tests (mcp-terminal)            W8→W10   —
                         Verify: tests pass? schema match?
A22   Agent-08 (Coder) Creates PR (mcp-git.create_pr)       W8→W10   —
                       Publishes: coder.pr.created           W11      NATS
A23   Agent-08 (Coder) Returns result                        W5→W4    —
A24   Orchestrator     n4 complete → n5,n6,n7 unblocked      W22      workflow_state
                       (all three run in parallel)
A25   Agent-09 (Review) Reviews PR, publishes reviewer.pr.approved
A26   Agent-10 (Test)  Writes test suite, runs it
A27   Agent-11 (Secur) Runs SAST scan, publishes security.scan.completed
A28   Orchestrator     All nodes complete → workflow done     W22      workflow_state
                       Returns final result to API Gateway    W3       —
A29   API Gateway      Returns response to Human              W1       —
```

**Total wires touched:** W1-W22 (nearly all)  
**Total stores touched:** Postgres (5 tables), Neo4j, Redis, MinIO, Git, NATS  
**Total agents involved:** 04, 05, 06, 08, 09, 10, 11 + Orchestrator  
**HITL gates:** 1 (Coder plan approval at A18)

---

## FLOW B: "Fix a production incident" (event-driven, urgent)

```
STEP  WHO                DOES WHAT                           WIRES    STORES
───── ──────────────── ──────────────────────────────────── ──────── ─────────
B1    SRE Agent-14     Detects alert via mcp-prometheus      —        —
                       Publishes: sre.alert.fired (critical) W11      NATS
B2    Event Bus        Delivers to: Agent-15, Orchestrator   W12,W13  —
B3    Orchestrator     Receives alert, builds emergency
                       TaskGraph:
                         n1: Agent-15 (Incident) → diagnose
                         n2: Agent-08 (Coder) → fix (depends n1)
                         n3: Agent-13 (DevOps) → deploy fix (depends n2)
B4    Agent-15         Queries logs (mcp-loki)               W8→W10   —
                       Queries metrics (mcp-prometheus)      W8→W10   —
                       Identifies root cause
                       Publishes: incident.opened            W11      NATS
B5    Agent-15         Returns diagnosis to Orchestrator     W5→W4    —
B6    Orchestrator     n1 done → dispatches n2 to Coder     W4→W5    workflow_state
B7    Agent-08 (Coder) Implements fix (small diff, LOW risk)
                       Creates PR, publishes: coder.pr.created W11   NATS
B8    Agent-09 (Review) Subscribes to coder.pr.created,      W13     —
                       auto-triggered, reviews PR quickly
                       Publishes: reviewer.pr.approved       W11      NATS
B9    Orchestrator     n2 done → dispatches n3 to DevOps    W4→W5    workflow_state
B10   Agent-13 (DevOps) Deploy to production                 W8→W10   —
                       HITL gate: prod deploy → human approve W15     hitl_queue
B11   Human            Approves prod deploy                   —       hitl_queue
B12   Agent-13         Deploys, publishes: devops.deploy.completed W11 NATS
B13   Agent-15         Subscribes to deploy event, verifies  W13      —
                       Publishes: incident.resolved          W11      NATS
```

---

## FLOW C: "Event propagation after schema change" (async, multi-consumer)

```
STEP  WHO                DOES WHAT                           WIRES    STORES
───── ──────────────── ──────────────────────────────────── ──────── ─────────
C1    Agent-05 (BA)    Updates user schema (breaking change)
                       Execution Guard: CRITICAL → HITL     W15      hitl_queue
C2    Human            Approves breaking change              —        hitl_queue
C3    Agent-05         Writes schema, publishes:             W11      NATS
                       ba.schema.published
                       (payload: change_type="update_breaking")
C4    Event Bus        Delivers to 4 consumers:              W13      —
                       Agent-08 (Coder)
                       Agent-10 (Test)
                       Agent-17 (Data Engineer)
                       Agent-29 (Analytics)
C5    Agent-08         Reads event → checks affected code   W6       Postgres
                       Plans migration for code changes
C6    Agent-10         Reads event → updates contract tests W6       Postgres
C7    Agent-17         Reads event → updates pipeline schema W6      Postgres
C8    Agent-29         Reads event → updates event taxonomy W6       Postgres
```

Each consumer **independently** reads the event, queries Memory Service for artifact details (L6 points to the schema file), and acts. No agent calls another directly — the Event Bus decouples them.

---

## FLOW D: "Agent reads memory before acting" (Context Compiler in detail)

```
STEP  COMPONENT           DOES WHAT                          STORE
───── ─────────────────── ──────────────────────────────────  ─────
D1    Agent Runtime       Receives TaskEnvelope               —
D2    Agent Runtime       Calls memory.compile_context()      →Memory Service
D3    Memory Service      Loads L4: pinned prompt + skills    →Git
                          (via Prompt Registry, pin resolution)
D4    Memory Service      Queries L2: episodic_records        →Postgres
                          WHERE correlation_id = X (exact)
                          + vector search on task.goal (top-20)
D5    Memory Service      Queries L3: semantic graph          →Neo4j
                          MATCH (e)-[*1..2]-(r)
                          WHERE e.name IN extracted_entities
                          + vector search (top-15)
D6    Memory Service      Queries L5: shared graph            →Neo4j
                          MATCH (s:SharedFact)
                          WHERE s.domain IN task.domains
D7    Memory Service      Queries L6: artifact_index          →Postgres
                          Vector search on task.goal (top-10)
                          Filter: freshness_score > 0.3
D8    Context Compiler    Receives all raw retrievals
                          Allocates token budgets per section
                          Ranks within each section
                          Resolves conflicts (L2 > L3 if contradicting)
                          Assembles L1 Working Context
D9    Context Compiler    Caches L1 in Redis                  →Redis
                          key: l1:{agent_id}:{task_id}
D10   Memory Service      Returns L1 to Agent Runtime         —
D11   Agent Runtime       Sends L1 to LLM                     →LLM API
```

---

## FLOW E: "Checkpoint and resume after crash" (long-running task)

```
STEP  COMPONENT           DOES WHAT                          STORE
───── ─────────────────── ──────────────────────────────────  ─────
E1    Agent-18 (ML)       Working on long training task       —
                          Completes subtask n3 of 7
E2    Orchestrator        After n3: writes checkpoint         →workflow_state
                          Contains: TaskGraph state,           →MinIO
                          idempotency ledger, memory refs
E3    [CRASH]             Agent container dies                 —
E4    Kubernetes          Detects pod failure, restarts       —
E5    Agent-18            Starts up, reports ready            —
E6    Orchestrator        Detects agent-18 was mid-task       workflow_state
                          Loads latest checkpoint
E7    Orchestrator        Re-dispatches TaskEnvelope with     →A2A Router
                          checkpoint_ref pointing to saved state
E8    Agent-18            Loads checkpoint
                          Checks idempotency ledger:
                          "tool calls t1-t15 already completed"
                          Skips to step after n3
E9    Agent-18            Continues with n4 (no duplicate work)
```

---

# PART 9 — MEMORY SERVICE API

## 9.1 gRPC Interface Definition

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
  string inputs_json = 5;      // task inputs as JSON string
  int32 token_budget = 6;
  repeated string skill_pins = 7;
  repeated string context_files = 8;  // project context files to include
}

message CompileContextResponse {
  string l1_context = 1;        // the assembled prompt text
  int32 tokens_used = 2;
  repeated ProvenanceEntry provenance = 3;  // what was included, from where
}

message ProvenanceEntry {
  string section = 1;           // "L2_episodic", "L3_semantic", etc.
  string source_id = 2;        // memory_id or artifact_id
  float relevance_score = 3;
}
```

## 9.2 Write Semantics

| Operation | Behavior | Conflict Resolution |
|-----------|----------|-------------------|
| WriteEpisodic | **Always append** (never update) | No conflicts possible — L2 is append-only |
| WriteSemantic | **Upsert by entity name** within agent's L3 namespace | If entity exists: update properties, bump updated_at. CAS (compare-and-swap) on concurrent writes. |
| WriteShared | **Write only if agent has write_authority** | Check WRITE_AUTHORITY registry. Reject if another agent owns the key. Timestamp-based last-writer-wins if same authority. |
| WriteArtifactIndex | **Upsert by artifact_path** | Owner check enforced. Re-embed summary on update. |

---

# PART 10 — EXCALIDRAW DIAGRAM SPECIFICATION

This section specifies exactly what to draw in each Excalidraw frame.

## Frame 1: Platform Containers & Coordination Fabric

**Layout:** Horizontal, left-to-right flow

```
LEFT EDGE:                    CENTER:                        RIGHT EDGE:
┌──────────┐                 ┌─────────────────────┐        ┌──────────────────┐
│ Clients  │ ──HTTPS──►     │ COORDINATION FABRIC  │        │ MCP SERVERS      │
│ • Web UI │                │                      │        │ (red boxes)      │
│ • CLI    │                │ Orchestrator (yellow) │        │ • git            │
│ • API    │                │ A2A Router   (yellow) │        │ • filesystem     │
└──────────┘                │ Event Bus    (blue)   │        │ • terminal       │
      │                     │ Workflow Store(blue)  │        │ • database       │
      ▼                     └─────────┬────────────┘        │ • email          │
┌──────────┐                          │                     │ • stripe         │
│API       │                          ▼                     │ • mlflow         │
│Gateway   │                ┌─────────────────────┐        └──────────────────┘
│(green)   │                │ AGENT RUNTIME POOL   │              ▲
│          │                │ (orange boxes)        │              │ MCP
│Auth/     │                │                       │        ┌──────────────┐
│Identity  │                │ L1-Discovery  01-05  │        │ TOOL GATEWAY │
│(green)   │                │ L2-Engineer   06-10  │ ──────►│ (green)      │
└──────────┘                │ L3-Quality    11-12  │        │ + Policy Eng │
                            │ L4-Operations 13-16  │        └──────────────┘
                            │ L5-Data&ML    17-22  │
                            │ L6-Revenue    23-28  │
                            │ L7-Analytics  29     │
                            │ L8-Governance 30-32  │
                            └─────────┬────────────┘
                                      │ gRPC
                                      ▼
                            ┌─────────────────────┐
                            │  MEMORY FABRIC       │
                            │  (pink/purple)       │
                            │                      │
                            │  Memory Service      │
                            │  + Context Compiler  │
                            │                      │
                            │  ┌────┐ ┌──────┐    │
                            │  │Redis│ │Postgr│    │       ┌─────────────────┐
                            │  │ L1  │ │L2,L6 │    │       │ OBSERVABILITY   │
                            │  └────┘ └──────┘    │       │ (gray)          │
                            │  ┌────┐ ┌──────┐    │       │ OTel→Prometheus │
                            │  │Neo4j│ │MinIO │    │       │       →Loki    │
                            │  │L3,L5│ │ckpts │    │       │       →Tempo   │
                            │  └────┘ └──────┘    │       │       →Grafana │
                            │  ┌────┐              │       └─────────────────┘
                            │  │Git  │             │
                            │  │ L4  │             │
                            │  └────┘              │
                            └─────────────────────┘
```

**Color coding:**
- 🟢 Green = API Fabric (gateway, auth, tool gateway)
- 🟡 Yellow = Coordination Fabric (orchestrator, A2A router)
- 🔵 Blue = Event Bus, Workflow State
- 🟠 Orange = Agent Runtime Pool (all 33 agents)
- 🟣 Purple/Pink = Memory Fabric (service + all stores)
- 🔴 Red = External MCP Servers
- ⬜ Gray = Observability

## Frame 2: Synchronous Request Flow (Flow A walkthrough)

Draw as a numbered sequence diagram, top to bottom, showing steps A1-A29 from the Flow A walkthrough above. Show each component as a vertical lifeline.

## Frame 3: Event Bus + Shared Memory Propagation (Flow C walkthrough)

Draw the event fan-out pattern: one producer → Event Bus → multiple consumers. Show how each consumer reads from Memory Service (not from the event payload).

## Frame 4: Context Compiler Detail (Flow D walkthrough)

Draw the internal pipeline of the Context Compiler:
- 5 inputs (L2-L6) coming in from different stores
- Algorithm box in the center (rank, budget, conflict resolve)
- 1 output: L1 Working Context going to the LLM

## Frame 5: Checkpoint/Resume (Flow E walkthrough)

Draw the checkpoint write → crash → reload → resume sequence.

---

# APPENDIX A — BOOTSTRAP BUILD ORDER

What you code first, in exact sequence:

```
WEEK 1: Infrastructure
  docker-compose.yml with: Postgres+pgvector, Neo4j, Redis, NATS, MinIO
  Run database migrations (create all tables from Part 4)
  Verify: all stores accessible

WEEK 2: Memory Service
  Implement gRPC interface (Part 9)
  Implement Context Compiler algorithm (Part 3)
  Implement read/write for all 6 layers
  Test: can write episodic record + retrieve it + compile context

WEEK 3: Policy Engine + Tool Gateway
  Deploy OPA with base policies (from CROSS_CUTTING doc)
  Implement Tool Gateway with preflight checks
  Implement 2 MCP servers: mcp-filesystem, mcp-git
  Test: agent can call tool → policy check → sandboxed execution → audit log

WEEK 4: Agent SDK + First Agent
  Implement chassis runtime (Part 5 lifecycle)
  Implement agent manifest loader
  Build Agent-08 (Coder) as first agent
  Test: end-to-end — task in → context compile → LLM → tool call → result out

WEEK 5: Orchestrator + A2A Router
  Implement TaskGraph planner (Part 6)
  Implement A2A Router (gRPC routing)
  Implement checkpoint/resume
  Test: multi-agent workflow (PM → BA → Coder)

WEEK 6: API Gateway + Event Bus + HITL
  Implement API Gateway (REST)
  Wire NATS subscriptions
  Implement HITL Inbox
  Test: full Flow A end-to-end

WEEK 7: Observability + Governance
  Wire OTel across all services
  Deploy Prometheus + Grafana + Loki
  Implement Agent-32 (Governance) eval framework
  Test: can view traces, metrics, dashboards

WEEK 8: Remaining Agents
  Implement remaining 31 agent manifests + prompts
  Wire event subscriptions per agent
  Run integration tests for all coordination patterns
```

---

# APPENDIX B — ERROR HANDLING

| Error Type | Retry? | Backoff | Circuit Breaker | Fallback |
|-----------|--------|---------|-----------------|----------|
| LLM timeout | Yes, 2x | Exponential (5s, 15s) | Opens after 5 consecutive failures | Try cheaper model (Opus→Sonnet→Haiku) |
| LLM rate limit | Yes, 3x | Wait for rate limit reset header | Opens after 10 rate limits in 5 min | Queue task, process later |
| Tool execution failure | Yes, 2x | Fixed 3s | Opens after 3 consecutive failures for same tool | Log error, skip tool, re-plan |
| Memory Service timeout | Yes, 2x | Exponential (2s, 6s) | Opens after 5 failures | Operate with degraded context (skip failed layer) |
| Neo4j down | No retry for reads | — | Immediate | Skip L3/L5 in context compilation, use L2+L6 only |
| NATS publish failure | Yes, 3x | Fixed 1s | Opens after 10 failures | Write to dead-letter file, replay later |
| Policy Engine timeout | No | — | — | DENY (fail-closed: if policy can't be checked, block action) |
| Agent crash mid-task | — | — | — | Kubernetes restarts pod, Orchestrator resumes from checkpoint |

---

# APPENDIX C — KEY CONTRACTS REFERENCE (from existing docs)

These are unchanged from your LLD v1.1. Included here for completeness.

**TaskEnvelope** → See LLD v1.1 Section 2.1  
**AgentResult** → See LLD v1.1 Section 2.2  
**EventEnvelope** → See LLD v1.1 Section 2.3  
**ToolCall/ToolResult** → See LLD v1.1 Section 2.4  
**MemoryRecord** → See LLD v1.1 Section 2.5  
**Pin Resolution** → See LLD v1.1 Section 2.6  
**Event Catalog** → See CROSS_CUTTING Section 3 (full YAML schemas for all 30+ events)  
**Tool Permissions** → See CROSS_CUTTING Section 3 (TOOL_PERMISSIONS.yml)  
**Data Classification** → See CROSS_CUTTING Section 2 (T1-T5 tiers)  
**Write Authority** → See CROSS_CUTTING Section 4 (artifact ownership registry)  
**Quality Rubrics** → See CROSS_CUTTING Section 5 (per-agent metrics)  
**Execution Guard Policies** → See CROSS_CUTTING Section 1 (per-agent risk matrices)

---

> **End of document.**  
> This + your existing LLD v1.1 + CROSS_CUTTING_INFRASTRUCTURE_CONTRACTS.md = everything needed to code the platform and draw the complete Excalidraw diagram.
