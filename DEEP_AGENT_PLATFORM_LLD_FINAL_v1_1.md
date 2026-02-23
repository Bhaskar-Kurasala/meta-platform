# Deep Agent Platform — Detailed Low-Level Platform Architecture (LLD)

**Version:** 1.1 (implementation-grade platform wiring)  
**Last updated:** February 23, 2026  
**Primary diagram:** `DEEP_AGENT_PLATFORM_LLD_ARCHITECTURE.excalidraw` (import into Excalidraw)

---

## 0. What this document is

You already have:
- detailed agent specs (what each agent does)
- a strong conceptual platform blueprint (memory + chassis)
- cross-cutting contracts (risk, write authority, events, etc.)

What breaks implementation is usually missing **platform-level wiring**:
- which module owns what
- what messages flow where (sync + async)
- what must be versioned/pinned
- exactly where policy is enforced (by code, not prompts)

This LLD is the **single place** to see:
- every platform component
- the standard flows you must implement
- how all 33 agents coordinate through A2A, Event Bus, Shared Memory, and the Memory Fabric

---

## 0.1 How to use the diagram

Open Excalidraw → **Import** → select `DEEP_AGENT_PLATFORM_LLD_ARCHITECTURE.excalidraw`.

It contains 4 frames:

A) Platform Containers & Coordination Fabric  
B) Synchronous Request Flow  
C) Async Event Bus + Shared Memory Propagation  
D) Prompt/Skill Versioning + Checkpoint/Resume  

---


## 1. Platform decomposition (modules / deployables)

This architecture treats the platform as **five cooperating fabrics**. Each fabric is independently testable and replaceable:

1) **API Fabric** (edge + auth)
- API Gateway (REST/GraphQL)
- Auth/Identity (OIDC/JWT + workload identities for agents)
- Request validation + rate limiting + correlation IDs

2) **Coordination Fabric** (who does what, when)
- Orchestrator Service (**Agent 00**) — TaskGraph planning, routing, dependency resolution, progress tracking, checkpointing, HITL pausing
- A2A Router — direct agent-to-agent delegation requests (request/response)
- Event Bus (NATS JetStream) — pub/sub for state propagation + durable streams + replay
- Shared Memory Bus — a “blackboard pointer layer” for cross-agent knowledge references (L5)

3) **Agent Runtime Fabric** (how any agent runs)
- Agent Runtime Pool (Kubernetes) — one containerized runtime per agent (same chassis, different config/prompts/tools)
- Deep Agent Chassis runtime:
  - Identity & Auth
  - Skills Reader
  - Project Context loader
  - Context Compiler
  - Memory Manager (6-layer)
  - Reasoning Engine
  - Invariants Engine
  - Execution Guard + HITL Gate
  - Tool Belt / Plugin Manager
  - Action Executor
  - Self-Monitor

4) **Memory Fabric** (state is a first-class system)
- Memory Service API + Context Compiler API
- Stores:
  - Redis (L1 working cache + leases)
  - Postgres + pgvector (L2 episodic log + embeddings + metadata)
  - Graph DB (L3 semantic KG + L5 shared KG)
  - Object store (checkpoints, large artifacts, datasets)
  - Artifact Index (L6 resource memory pointers)

5) **Governance & Observability Fabric**
- Policy Engine (OPA/Cedar): risk scoring, tool permissions, data classification, write authority
- Audit ledger (every tool call, memory write, artifact write)
- Eval harness + regression suite (owned by Agent 32 governance)
- Metrics/logs/tracing (OTel + Prometheus/Grafana/Loki)



## 1.1 Memory layers mapped to concrete stores

| Layer | Name | System role | Primary store(s) | Access scope | Notes |
|---|---|---|---|---|---|
| L1 | Working | Compiled context for a single LLM call | Redis (ephemeral) | Per-agent, per-task | Never treated as source of truth |
| L2 | Episodic | Ground-truth log of interactions, tool calls, outcomes | Postgres (append-only) + pgvector; Event log stream | Per-agent + per-task + audit | Everything is traceable via `correlation_id` |
| L3 | Semantic | Distilled entities/relations/rules | Graph DB + embeddings | Per-agent + shared (scoped) | Updates are validated + can be CAS-guarded |
| L4 | Procedural | Reusable workflows + prompt templates + tool recipes | Git (prompts/skills/procedures) + registry metadata | Global, versioned | Changes are PR-gated + regression-tested |
| L5 | Shared | Cross-agent blackboard knowledge + transactive index | Shared graph DB + event-driven sync | Scoped shared | Conflict resolution uses timestamps + write authority |
| L6 | Resource | Indexed pointers to artifacts (docs/code/configs/data) | Artifact index + embeddings + freshness metadata | Global | Events carry pointers into L6, not full payloads |



## 1.2 Network / protocol map (what talks to what)

| From → To | Protocol | Purpose | Must include |
|---|---|---|---|
| Clients → API Gateway | HTTPS | entrypoint | `correlation_id` header |
| API Gateway → Orchestrator | gRPC/HTTP | create workflow / task | TaskEnvelope |
| Orchestrator → Agent Runtime | A2A RPC (gRPC) | delegate work | TaskEnvelope + pins |
| Agent Runtime → Memory Service | gRPC | memory read/write + context compile | correlation_id + agent_id |
| Agent Runtime → Tool Gateway | gRPC/HTTP | tool calls | ToolCall + policy_context |
| Tool Gateway → MCP servers | MCP | execute domain tools | validated args + timeouts |
| Any service → Event Bus | NATS JetStream | publish/subscribe | EventEnvelope (schema validated) |
| Any service → Observability | OTel | traces/logs/metrics | trace_id = correlation_id |



## 1.3 Where cross-cutting contracts are enforced (by code)

| Contract | Enforcement point | What is blocked if violated |
|---|---|---|
| Risk scoring + confidence thresholds | Execution Guard (inside agent runtime) + Policy Engine | unsafe actions, irreversible writes |
| Data classification | Policy Engine + Tool Gateway | data exfiltration, wrong-tool access |
| Tool permission matrix | Tool Gateway (preflight) | unauthorized tool calls |
| Write authority (artifact ownership) | Execution Guard + Tool Gateway + Git workflow | direct edits to owner-write artifacts |
| Event schemas | Event Bus (publish-time) | malformed events, breaking changes |
| Prompt/skill governance | CI + Agent 32 + human approval gate | auto-deploy of unvalidated prompts |


---


## 2. Canonical contracts (the “wiring harness”)

These are the **minimum shared objects** every module uses. Treat them like compiler IR — once stable, everything snaps together.

### 2.1 TaskEnvelope (Orchestrator → Agent)

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

### 2.2 AgentResult (Agent → Orchestrator)

```json
{
  "task_id": "uuid",
  "agent_id": "07",
  "status": "completed|blocked|needs_human|failed",
  "summary": "string",
  "artifacts_written": [{ "path": "string", "diff_ref": "string", "write_mode": "string" }],
  "decisions": [{ "decision_id": "uuid", "title": "string", "rationale": "string", "risk": "low|med|high" }],
  "events_published": [{ "topic": "string", "event_id": "uuid" }],
  "memory_writes": [{ "layer": "L2|L3|L4|L5|L6", "ref": "string" }],
  "telemetry": { "tokens": 12345, "cost_usd": 0.42, "latency_ms": 12000 }
}
```

### 2.3 Universal EventEnvelope (any producer → Event Bus)

(Aligns with your Event Catalog.)

```json
{
  "event_id": "uuid",
  "topic": "pm.spec.published",
  "producer_agent": "04",
  "timestamp": "2026-02-23T12:34:56Z",
  "correlation_id": "uuid",
  "priority": "low|normal|high|critical",
  "payload": { "topic_specific": "schema" }
}
```

### 2.4 ToolCall / ToolResult (Agent → Tool Gateway)

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



### 2.5 MemoryRecord (what actually gets stored)

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



### 2.6 Pin resolution (how reproducibility is guaranteed)

When Orchestrator invokes an agent, it resolves *pins* into immutable references:

- `prompt_pin` = `{path}@{semver}#{git_sha}`
- `skill_pin`  = `{path}@{semver}#{git_sha}`
- `model_router_version` = release id of the router config

**Invariant:** every AgentResult must include the exact pins it used (no “latest” at runtime).


---


## 3. Standard flows (these are the “each and every flow” you should implement)

### Flow F1 — Synchronous user request (end-to-end)
**Goal:** A user hits the API and gets a response, while the platform remains reproducible and auditable.

1) **API Gateway**
- Validates request schema
- Computes `correlation_id`
- Classifies request data
- Creates initial audit entry

2) **Orchestrator (Agent 00)**
- Decomposes request into a **TaskGraph**
- Selects target agents and execution modes
- Attaches pins: model-router version, prompt/skill versions
- Emits `workflow.task.created` (optional internal topic)

3) **Agent Invocation**
- Orchestrator sends `TaskEnvelope` to the chosen agent (A2A or direct call)
- Agent runtime authenticates via workload identity

4) **Agent runtime (Deep Agent Chassis)**
- Loads Skills + Project Context
- Runs **Memory Read** (L2/L3/L4/L5/L6) and compiles L1 working context
- Executes plan → act → verify loop

5) **Execution Guard**
- Computes risk score + checks confidence thresholds
- Enforces: tool permissions, data classification, write authority, HITL gates
- If HITL required → emit approval-needed event and pause

6) **Tool execution**
- Agent calls Tool Gateway (MCP)
- Tool Gateway authorizes via policy engine
- Sandboxed execution + schema validation + audit log

7) **Memory write**
- Append to L2 episodic (tool calls, outcomes)
- Update L3 semantic + L5 shared via controlled write patterns
- Update L4 procedural if “repeatable winning pattern” (after governance eval)

8) **Event publish**
- Emit domain events (e.g., `pm.spec.published`, `security.scan.completed`, etc.)
- Orchestrator subscribes and updates TaskGraph/progress

9) **Response**
- Orchestrator returns response + pointers to artifacts/memory refs
- If tasks remain → keep workflow async and stream updates

---

### Flow F2 — Multi-agent delegation (A2A)
**Use when:** a single task needs multiple specialized agents but should remain coherent.

1) Orchestrator assigns **primary agent** (owner) and **supporting agents** (delegates)
2) Primary agent delegates sub-tasks through A2A Router:
- Sends `TaskEnvelope` with narrowed scope and explicit artifact targets
3) Delegates return `AgentResult` + artifacts in PR/proposal mode
4) Primary agent integrates, then emits consolidated outputs + events

**Invariant:** Only one agent (or the human) should be “artifact owner” for each shared artifact at a time (write authority).

---

### Flow F3 — Event-driven propagation (pub/sub)
**Use when:** other agents need to react to changes without tight coupling.

1) Producer emits event (validated by schema registry)
2) Event Bus delivers to subscribers (durable; replayable)
3) Consumers fetch details from:
- Resource Memory (L6) if `artifact_path` pointer
- Semantic/Shared memory (L3/L5) if `memory_ref` pointer
4) Consumers update their own local memory and possibly publish new derived events

**Rule:** events carry **pointers**, not “full documents.”

---

### Flow F4 — Memory read (pre-LLM) = Context Compiler pipeline
1) Input: (task + query + agent_id + budgets)
2) Retrieve:
- L2 episodic (top-k + recent)
- L3 semantic (graph traversal + embeddings)
- L4 procedures (prompt templates + recipes)
- L5 shared (relevant shared fragments + transactive index)
- L6 resources (artifact pointers + freshness)
3) Compile into L1 working context:
- hierarchical retrieval (summary → drill-down)
- token-budget enforcement
- context provenance annotations (so it’s debuggable)

---

### Flow F5 — Memory write (post-LLM)
1) Always append to L2 episodic (ground truth log)
2) If new facts → update L3 (entity+relation)
3) If reusable workflow → propose L4 update (governed + versioned)
4) If cross-agent relevant → publish event + update L5 (authority checked)
5) If artifact produced → register in L6 index (so it’s retrievable)

---

### Flow F6 — Prompt + skill versioning (procedural memory)
1) Change proposed in Git PR (`/prompts`, `/skills`)
2) Governance agent runs regression suite + drift checks
3) Human approves
4) Merge produces immutable version tag + hash
5) Orchestrator pins versions into TaskEnvelope for reproducibility
6) Telemetry records: `{prompt_version, skill_version}` for every output

---

### Flow F7 — Checkpoint / resume
**Why:** long-horizon tasks must be pausable, crash-safe, and restartable.

Checkpoint triggers:
- after each TaskGraph node
- before irreversible tool calls
- when HITL pause occurs

Checkpoint contains:
- TaskGraph cursor/state
- idempotency ledger (tool calls + artifact writes)
- working-context digest (not the entire context window)
- artifact + memory pointers (L6 refs)
- correlation_id trace

Resume:
- rehydrate TaskGraph
- replay events if needed
- skip already-executed tool calls using ledger



### Flow F8 — Tool execution (low-level)

**Why this flow matters:** almost every “real” platform failure comes from tool execution (permissions, retries, partial writes).

**Preflight (Tool Gateway):**
1) Validate ToolCall schema
2) Resolve agent identity → permissions
3) Evaluate policy:
- data classification clearance
- tool permission matrix
- write authority (if tool mutates artifacts)
4) Assign:
- timeout + retry policy
- sandbox profile (FS/network allowlist)

**Execute (MCP server):**
5) Run tool in sandbox
6) Emit tool telemetry span (trace)
7) Return ToolResult with:
- stdout/stderr (sanitized)
- structured output (schema-validated)
- side-effect refs (files changed, urls called, ids created)

**Postflight:**
8) Append tool call record to L2 episodic (ground truth)
9) If mutation occurred:
- ensure git diff exists (PR-style) or
- ensure DB writes are transaction-bound and reversible
10) Emit event if downstream agents must react

**Rollback rule:**
- Any tool that mutates must provide either a rollback operation or produce an artifact diff that can be reverted.


---


## 4. Suggested repo layout (so the architecture becomes code)

This is a **modular mapping** from architecture to folders/packages:

```
/services
  /api-gateway
  /orchestrator
  /agent-runtime
  /memory-service
  /tool-gateway
  /policy-engine

/libs
  /contracts           # JSONSchema + generated types
  /a2a                 # delegation protocol helpers
  /events              # topic constants + envelope helpers
  /observability       # tracing/logging helpers
  /versioning          # prompt/skill pin resolution

/prompts
  /agent00-orchestrator
  /agent07-architect
  ...

/skills
  /platform
  /domain
  /learned

/evals
  /golden-tasks
  /rubrics
  /regression-suites

/infra
  /k8s
  /terraform-or-pulumi
```

**Hard rule:** no service may depend on another service’s internal code. Only `/libs/contracts` + published APIs.


---


## Appendix A — Agent roster (33 agents)

| ID | Agent | Layer |
|---:|---|---|
| 00 | Master Orchestrator | L0 — ORCHESTRATION |
| 01 | Customer Discovery Agent | L1 — DISCOVERY & PRODUCT |
| 02 | Market Research Agent | L1 — DISCOVERY & PRODUCT |
| 03 | Competitor Intelligence Agent | L1 — DISCOVERY & PRODUCT |
| 04 | Product Manager Agent | L1 — DISCOVERY & PRODUCT |
| 05 | Business Analyst Agent | L1 — DISCOVERY & PRODUCT |
| 06 | UX Designer Agent | L2 — DESIGN & ENGINEERING |
| 07 | Architect Agent | L2 — DESIGN & ENGINEERING |
| 08 | Coder Agent | L2 — DESIGN & ENGINEERING |
| 09 | Code Review Agent | L2 — DESIGN & ENGINEERING |
| 10 | Test Engineer Agent | L2 — DESIGN & ENGINEERING |
| 11 | Trust & Security Agent | L3 — QUALITY & TRUST |
| 12 | QA & Performance Agent | L3 — QUALITY & TRUST |
| 13 | DevOps Agent | L4 — OPERATIONS |
| 14 | SRE & Resilience Agent | L4 — OPERATIONS |
| 15 | Incident Responder Agent | L4 — OPERATIONS |
| 16 | Cost Optimizer Agent | L4 — OPERATIONS |
| 17 | Data Engineer Agent | L5 — DATA & ML |
| 18 | ML Engineer Agent | L5 — DATA & ML |
| 19 | MLOps Pipeline Agent | L5 — DATA & ML |
| 20 | Labeling & Ground Truth Agent | L5 — DATA & ML |
| 21 | Model Monitor Agent | L5 — DATA & ML |
| 22 | Data Quality Agent | L5 — DATA & ML |
| 23 | Sales & Pre-Sales Agent | L6 — REVENUE & GROWTH |
| 24 | Content & SEO Agent | L6 — REVENUE & GROWTH |
| 25 | Customer Success Agent | L6 — REVENUE & GROWTH |
| 26 | Support Desk Agent | L6 — REVENUE & GROWTH |
| 27 | Feedback Analyzer Agent | L6 — REVENUE & GROWTH |
| 28 | Billing & Revenue Agent | L6 — REVENUE & GROWTH |
| 29 | Product Analytics Agent | L7 — ANALYTICS & MEASUREMENT |
| 30 | Legal & Privacy Agent | L8 — LEGAL, DOCS & GOVERNANCE |
| 31 | Documentation & Release Agent | L8 — LEGAL, DOCS & GOVERNANCE |
| 32 | Agent Governance Agent | L8 — LEGAL, DOCS & GOVERNANCE |

---

## Appendix B — Agent-to-agent event wiring (from Event Catalog)

This appendix lists, per agent, the topics it produces/consumes. (The canonical detailed schemas remain in your Event Catalog; this is the topology view.)

### Agent 00: Master Orchestrator

**Layer:** L0 — ORCHESTRATION

**Produces (events):**
_None_

**Consumes (events):**
- `agent.cost.anomaly`
- `agent.prompt.changed`
- `agent.quality.score`
- `billing.cost.anomaly`
- `incident.opened`
- `incident.resolved`
- `pipeline.failed`
- `pm.roadmap.changed`
- `release.status`
- `reviewer.pr.approved`
- `reviewer.pr.rejected`
- `security.scan.completed`
- `security.vulnerability.critical`
- `sre.alert.fired`
- `sre.slo.breached`

### Agent 01: Customer Discovery Agent

**Layer:** L1 — DISCOVERY & PRODUCT

**Produces (events):**
- `discovery.hypothesis.validated`
- `discovery.icp.updated`
- `discovery.pain.ranking-changed`

**Consumes (events):**
- `feedback.new`
- `feedback.pattern.detected`
- `support.ticket.created`

### Agent 02: Market Research Agent

**Layer:** L1 — DISCOVERY & PRODUCT

**Produces (events):**
- `market.regulatory.change`

**Consumes (events):**
_None_

### Agent 03: Competitor Intelligence Agent

**Layer:** L1 — DISCOVERY & PRODUCT

**Produces (events):**
- `competitor.change.detected`

**Consumes (events):**
_None_

### Agent 04: Product Manager Agent

**Layer:** L1 — DISCOVERY & PRODUCT

**Produces (events):**
- `pm.feature.released`
- `pm.roadmap.changed`
- `pm.spec.published`

**Consumes (events):**
- `billing.customer.new`
- `competitor.change.detected`
- `discovery.hypothesis.validated`
- `discovery.icp.updated`
- `discovery.pain.ranking-changed`
- `feedback.pattern.detected`
- `market.regulatory.change`

### Agent 05: Business Analyst Agent

**Layer:** L1 — DISCOVERY & PRODUCT

**Produces (events):**
- `ba.event-taxonomy.changed`
- `ba.schema.published`

**Consumes (events):**
- `pm.spec.published`

### Agent 06: UX Designer Agent

**Layer:** L2 — DESIGN & ENGINEERING

**Produces (events):**
_None_

**Consumes (events):**
- `discovery.icp.updated`
- `pm.spec.published`

### Agent 07: Architect Agent

**Layer:** L2 — DESIGN & ENGINEERING

**Produces (events):**
_None_

**Consumes (events):**
- `pm.roadmap.changed`

### Agent 08: Coder Agent

**Layer:** L2 — DESIGN & ENGINEERING

**Produces (events):**
- `coder.pr.created`
- `coder.pr.merged`

**Consumes (events):**
- `ba.event-taxonomy.changed`
- `ba.schema.published`
- `pm.spec.published`
- `reviewer.pr.approved`
- `reviewer.pr.rejected`
- `security.scan.completed`
- `security.vulnerability.critical`

### Agent 09: Code Review Agent

**Layer:** L2 — DESIGN & ENGINEERING

**Produces (events):**
- `reviewer.pr.approved`
- `reviewer.pr.rejected`

**Consumes (events):**
- `coder.pr.created`
- `security.scan.completed`

### Agent 10: Test Engineer Agent

**Layer:** L2 — DESIGN & ENGINEERING

**Produces (events):**
_None_

**Consumes (events):**
- `ba.schema.published`
- `coder.pr.created`
- `pm.spec.published`

### Agent 11: Trust & Security Agent

**Layer:** L3 — QUALITY & TRUST

**Produces (events):**
- `security.scan.completed`
- `security.vulnerability.critical`

**Consumes (events):**
- `coder.pr.created`

### Agent 12: QA & Performance Agent

**Layer:** L3 — QUALITY & TRUST

**Produces (events):**
- `release.status`

**Consumes (events):**
- `coder.pr.merged`
- `devops.deploy.completed`

### Agent 13: DevOps Agent

**Layer:** L4 — OPERATIONS

**Produces (events):**
- `devops.deploy.completed`

**Consumes (events):**
- `billing.cost.anomaly`
- `coder.pr.merged`
- `incident.opened`
- `release.status`
- `security.scan.completed`
- `security.vulnerability.critical`

### Agent 14: SRE & Resilience Agent

**Layer:** L4 — OPERATIONS

**Produces (events):**
- `sre.alert.fired`
- `sre.slo.breached`

**Consumes (events):**
- `devops.deploy.completed`
- `incident.opened`
- `incident.resolved`
- `monitor.drift.detected`
- `pipeline.failed`
- `release.status`

### Agent 15: Incident Responder Agent

**Layer:** L4 — OPERATIONS

**Produces (events):**
- `incident.opened`
- `incident.resolved`

**Consumes (events):**
- `devops.deploy.completed`
- `sre.alert.fired`
- `sre.slo.breached`

### Agent 16: Cost Optimizer Agent

**Layer:** L4 — OPERATIONS

**Produces (events):**
- `billing.cost.anomaly`

**Consumes (events):**
- `agent.cost.anomaly`
- `ml.retrain.triggered`

### Agent 17: Data Engineer Agent

**Layer:** L5 — DATA & ML

**Produces (events):**
- `pipeline.batch.arrived`
- `pipeline.failed`

**Consumes (events):**
- `ba.schema.published`
- `data-quality.batch.validated`

### Agent 18: ML Engineer Agent

**Layer:** L5 — DATA & ML

**Produces (events):**
- `ml.model.registered`
- `ml.retrain.triggered`

**Consumes (events):**
- `data-quality.batch.validated`
- `labeling.dataset.ready`
- `monitor.drift.detected`

### Agent 19: MLOps Pipeline Agent

**Layer:** L5 — DATA & ML

**Produces (events):**
_None_

**Consumes (events):**
- `ml.model.registered`
- `ml.retrain.triggered`
- `monitor.drift.detected`

### Agent 20: Labeling & Ground Truth Agent

**Layer:** L5 — DATA & ML

**Produces (events):**
- `labeling.dataset.ready`

**Consumes (events):**
- `ml.retrain.triggered`

### Agent 21: Model Monitor Agent

**Layer:** L5 — DATA & ML

**Produces (events):**
- `monitor.drift.detected`

**Consumes (events):**
_None_

### Agent 22: Data Quality Agent

**Layer:** L5 — DATA & ML

**Produces (events):**
- `data-quality.batch.validated`

**Consumes (events):**
- `labeling.dataset.ready`
- `pipeline.batch.arrived`

### Agent 23: Sales & Pre-Sales Agent

**Layer:** L6 — REVENUE & GROWTH

**Produces (events):**
- `feedback.new`

**Consumes (events):**
- `competitor.change.detected`
- `discovery.icp.updated`
- `discovery.pain.ranking-changed`
- `pm.feature.released`
- `pm.roadmap.changed`

### Agent 24: Content & SEO Agent

**Layer:** L6 — REVENUE & GROWTH

**Produces (events):**
_None_

**Consumes (events):**
- `competitor.change.detected`
- `discovery.icp.updated`
- `pm.feature.released`
- `pm.roadmap.changed`

### Agent 25: Customer Success Agent

**Layer:** L6 — REVENUE & GROWTH

**Produces (events):**
- `feedback.new`

**Consumes (events):**
- `analytics.usage.drop`
- `billing.customer.new`
- `billing.payment.failed`
- `pm.feature.released`

### Agent 26: Support Desk Agent

**Layer:** L6 — REVENUE & GROWTH

**Produces (events):**
- `feedback.new`
- `support.ticket.created`

**Consumes (events):**
_None_

### Agent 27: Feedback Analyzer Agent

**Layer:** L6 — REVENUE & GROWTH

**Produces (events):**
- `feedback.pattern.detected`

**Consumes (events):**
- `discovery.hypothesis.validated`
- `feedback.new`
- `support.ticket.created`

### Agent 28: Billing & Revenue Agent

**Layer:** L6 — REVENUE & GROWTH

**Produces (events):**
- `billing.customer.new`
- `billing.payment.failed`

**Consumes (events):**
- `billing.payment.failed`

### Agent 29: Product Analytics Agent

**Layer:** L7 — ANALYTICS & MEASUREMENT

**Produces (events):**
- `analytics.usage.drop`

**Consumes (events):**
- `ba.event-taxonomy.changed`
- `ba.schema.published`
- `billing.customer.new`
- `devops.deploy.completed`
- `pm.feature.released`
- `pm.spec.published`

### Agent 30: Legal & Privacy Agent

**Layer:** L8 — LEGAL, DOCS & GOVERNANCE

**Produces (events):**
_None_

**Consumes (events):**
- `market.regulatory.change`

### Agent 31: Documentation & Release Agent

**Layer:** L8 — LEGAL, DOCS & GOVERNANCE

**Produces (events):**
_None_

**Consumes (events):**
- `coder.pr.merged`
- `pm.feature.released`

### Agent 32: Agent Governance Agent

**Layer:** L8 — LEGAL, DOCS & GOVERNANCE

**Produces (events):**
- `agent.cost.anomaly`
- `agent.prompt.changed`
- `agent.quality.score`

**Consumes (events):**
- `ml.model.registered`


