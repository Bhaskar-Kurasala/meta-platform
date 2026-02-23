# Deep Agent Platform — Architecture Blueprint v3

## Complete Architecture for a Production-Grade Multi-Agent System

> **Status:** Brainstorm Draft 3 — incorporates research team feedback on operational discipline, invariants, and loop-optimized execution.
>
> **Based on:** Agent Workforce Blueprint v2 (33 agents, 8 layers) + latest research (A-Mem, MIRIX, Google ADK context engineering, ACP+A2A merger, OWASP Agentic Top 10, AWS Agentic Security Scoping Matrix).
>
> **Core thesis:** Agent quality scales with memory quality + operational discipline. Deep agents with rich memory, codified skills, and hard invariants outperform swarms of shallow agents.

---

## Table of Contents

1. [Executive Vision](#1-executive-vision)
2. [Design Principles](#2-design-principles)
3. [System Architecture Overview](#3-system-architecture-overview)
4. [Deep Agent Chassis (Internal Architecture)](#4-deep-agent-chassis)
5. [Memory Architecture (6-Layer)](#5-memory-architecture)
6. [Skills System](#6-skills-system)
7. [Invariants Engine](#7-invariants-engine)
8. [Execution Guard](#8-execution-guard)
9. [Reasoning Engine (Loop-Optimized)](#9-reasoning-engine)
10. [Plugin & Extension System](#10-plugin--extension-system)
11. [Communication & Protocol Stack](#11-communication--protocol-stack)
12. [Security Architecture](#12-security-architecture)
13. [Scalability & Reliability](#13-scalability--reliability)
14. [Project Context System](#14-project-context-system)
15. [Agent Roster (33 Agents, 8 Layers)](#15-agent-roster)
16. [Coordination Patterns](#16-coordination-patterns)
17. [Task Execution Flow (End-to-End)](#17-task-execution-flow)
18. [Recommended Tech Stack](#18-recommended-tech-stack)
19. [Implementation Roadmap](#19-implementation-roadmap)
20. [Key Differentiators](#20-key-differentiators)
21. [Open Questions for Future Iterations](#21-open-questions)

---

## 1. Executive Vision

Build a production-grade multi-agent platform where 33+ deep agents operate as autonomous, long-horizon specialists — each with rich memory, tool access, inter-agent communication, and operational discipline — capable of owning every stage of platform creation from discovery to scale.

The key insight from studying Claude Code, the latest A-Mem/MIRIX research, and Google ADK's context engineering: the winning architecture isn't "many dumb agents coordinated by a smart orchestrator" — it's **deep agents with rich internal memory + lightweight coordination protocols + hard operational invariants.** Each agent should be as capable as Claude Code is for coding — but for their specific domain.

What makes Claude Code powerful is not just intelligence — it's **discipline**. It reads before writing, plans before editing, minimizes diffs, and follows strict behavioral rules enforced by both system prompts and runtime guardrails. Our platform generalizes this pattern across 33 domain-specialized agents.

---

## 2. Design Principles

| # | Principle | Description |
|---|-----------|-------------|
| 01 | **Deep over Wide** | 33 deeply capable agents beat 100 shallow ones. Each agent has full context engineering, tool mastery, domain memory, and operational discipline. |
| 02 | **Memory is Architecture** | Memory isn't a feature — it's the foundation. 6-layer memory (working, episodic, semantic, procedural, shared, resource) determines agent quality. |
| 03 | **Discipline over Intelligence** | Skills say "how to do X well." Invariants say "rules you may NEVER break." Both are needed. Disciplined agents outperform merely smart ones. |
| 04 | **Protocols over Plumbing** | MCP for tool access, A2A for inter-agent collaboration, event bus for async coordination. Standards beat custom glue. |
| 05 | **Security as Identity** | Every agent is a first-class identity with scoped credentials, behavioral baselines, and zero-trust enforcement. |
| 06 | **Incremental Autonomy** | Start human-in-the-loop, earn autonomy through demonstrated reliability. Agency vs. autonomy managed per agent. |
| 07 | **Loop-Optimized Execution** | Small changes, fast verification. Plan → act → verify → diff → adjust. Not "think big, execute once, hope it works." |
| 08 | **Constraints Shape Quality** | Runtime guardrails, risk scoring, pre-action checklists, and confidence thresholds enforced by CODE, not by prompting. |

---

## 3. System Architecture Overview

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║                              HUMAN OPERATOR (YOU)                               ║
║              Strategic decisions · Approvals · Learning from customers           ║
╚══════════════════════════╦═══════════════════════════════════════════════════════╝
                           ║
                    ┌──────▼──────┐
                    │ ORCHESTRATOR │ ◄── Task routing, dependency resolution,
                    │  (Agent 00)  │     progress tracking, escalation
                    └──────┬──────┘
                           ║
          ┌────────────────╬────────────────────┐
          ║                ║                    ║
    ══════▼══════    ══════▼══════    ══════════▼═══════════
    ║  A2A BUS  ║    ║ EVENT BUS ║    ║  SHARED MEMORY    ║
    ║ agent↔agent║    ║  pub/sub  ║    ║  (team knowledge) ║
    ══════╤══════    ══════╤══════    ══════════╤═══════════
          ║                ║                    ║
  ════════▼════════════════▼════════════════════▼═══════════════
  ║                    AGENT MESH                               ║
  ║                                                             ║
  ║  ┌──────── DEEP AGENT CHASSIS (× 33 agents) ──────────┐   ║
  ║  │                                                     │   ║
  ║  │  Identity · Skills · Project Context · Context      │   ║
  ║  │  Compiler · Memory · Reasoning · Invariants ·       │   ║
  ║  │  Execution Guard · Tools · Plugins · Action         │   ║
  ║  │  Executor · Self-Monitor · HITL Gate                │   ║
  ║  │                                                     │   ║
  ║  │  13 components per agent (detailed below)           │   ║
  ║  └─────────────────────────────────────────────────────┘   ║
  ║                                                             ║
  ║  ┌──────────────────┐  ┌──────────────────────────────┐    ║
  ║  │  SKILLS LIBRARY  │  │  PLUGIN REGISTRY             │    ║
  ║  │  platform/domain/ │  │  tool/knowledge/workflow/eval│    ║
  ║  │  learned          │  │  sandboxed, vetted, audited  │    ║
  ║  └──────────────────┘  └──────────────────────────────┘    ║
  ║                                                             ║
  ══════════════════════════════════════════════════════════════

  ══════════════════════════════════════════════════════════════
  ║                 INFRASTRUCTURE LAYER                        ║
  ║                                                             ║
  ║  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   ║
  ║  │ Memory   │  │ Protocol │  │ Security │  │ Observe  │   ║
  ║  │ Store    │  │ Layer    │  │ Layer    │  │ Layer    │   ║
  ║  │          │  │          │  │          │  │          │   ║
  ║  │ Postgres │  │ MCP svrs │  │ Vault    │  │ OTel     │   ║
  ║  │ +pgvec   │  │ A2A reg  │  │ OPA/     │  │ Grafana  │   ║
  ║  │ Neo4j    │  │ NATS     │  │ Cedar    │  │ Prom     │   ║
  ║  │ Redis    │  │ gRPC     │  │ mTLS     │  │ Loki     │   ║
  ║  │ Kafka    │  │          │  │          │  │          │   ║
  ║  └──────────┘  └──────────┘  └──────────┘  └──────────┘   ║
  ║                                                             ║
  ║  ┌──────────────────────────────────────────────────────┐   ║
  ║  │              COMPUTE (Kubernetes)                     │   ║
  ║  │  agent containers · auto-scaling · scheduling         │   ║
  ║  │  checkpoint/resume for long-horizon tasks             │   ║
  ║  └──────────────────────────────────────────────────────┘   ║
  ══════════════════════════════════════════════════════════════
```

---

## 4. Deep Agent Chassis

Every one of the 33 agents shares the same internal architecture — the **Deep Agent Chassis.** This is the equivalent of Claude Code's architecture generalized for any domain. 13 components:

```
┌──────────── DEEP AGENT CHASSIS v3 ──────────────┐
│                                                   │
│  ┌─────────────────────────────────────────────┐  │
│  │ 1. IDENTITY & AUTH                          │  │
│  │    workload identity · scoped tokens · mTLS │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
│  ┌──────────────────┐  ┌──────────────────────┐  │
│  │ 2. SKILLS READER │  │ 3. PROJECT CONTEXT   │  │
│  │    platform +    │  │    PLATFORM.md +     │  │
│  │    domain +      │  │    ARCHITECTURE +    │  │
│  │    learned       │  │    CONVENTIONS +     │  │
│  │                  │  │    DECISIONS         │  │
│  └──────────────────┘  └──────────────────────┘  │
│                                                   │
│  ┌─────────────────────────────────────────────┐  │
│  │ 4. CONTEXT COMPILER                         │  │
│  │    skills + context + memories + task        │  │
│  │    → assembled within token budget           │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
│  ┌──────────────────┐  ┌──────────────────────┐  │
│  │ 5. MEMORY MGR    │  │ 6. REASONING ENGINE  │  │
│  │    6-layer +     │  │    plan → act →      │  │
│  │    hierarchy +   │  │    verify → diff →   │  │
│  │    pruning +     │  │    adjust (loops)    │  │
│  │    consolidation │  │    + reflection      │  │
│  └──────────────────┘  └──────────────────────┘  │
│                                                   │
│  ┌─────────────────────────────────────────────┐  │
│  │ 7. INVARIANTS ENGINE                        │  │
│  │    platform + role + situational rules      │  │
│  │    enforced by CODE not prompts             │  │
│  │    hard constraints that never bend         │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
│  ┌─────────────────────────────────────────────┐  │
│  │ 8. EXECUTION GUARD                          │  │
│  │    risk scoring · pre-action checklists     │  │
│  │    confidence thresholds · invariant check   │  │
│  │    sits BETWEEN reasoning and execution     │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
│  ┌──────────────────┐  ┌──────────────────────┐  │
│  │ 9. TOOL BELT     │  │ 10. PLUGIN MANAGER   │  │
│  │    MCP client    │  │     tool + knowledge  │  │
│  │    domain tools  │  │     + workflow + eval │  │
│  └──────────────────┘  └──────────────────────┘  │
│                                                   │
│  ┌─────────────────────────────────────────────┐  │
│  │ 11. ACTION EXECUTOR                         │  │
│  │     sandboxed · validated · rollback-capable │  │
│  │     change-minimal · diff-aware             │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
│  ┌──────────────────┐  ┌──────────────────────┐  │
│  │ 12. SELF-MONITOR │  │ 13. HITL GATE        │  │
│  │     quality +    │  │     configurable per  │  │
│  │     cost +       │  │     agent: auto /     │  │
│  │     errors +     │  │     review / approve  │  │
│  │     confidence   │  │                      │  │
│  └──────────────────┘  └──────────────────────┘  │
│                                                   │
└───────────────────────────────────────────────────┘
```

### Component Details

| # | Component | Purpose | Key Detail |
|---|-----------|---------|------------|
| 1 | **Identity & Auth** | Unique agent identity, scoped permissions | Workload identity (not shared keys), short-lived tokens (<15 min rotation), mutual TLS, delegation chains traceable to originating human |
| 2 | **Skills Reader** | Load best practices before acting | Reads relevant SKILL.md files before every task. Composable (multi-skill per task). Three tiers: platform, domain, learned |
| 3 | **Project Context** | Human-readable grounding files | PLATFORM.md, ARCHITECTURE.md, CONVENTIONS.md, DECISIONS.md — always loaded. Like Claude Code's CLAUDE.md but for every function |
| 4 | **Context Compiler** | Assemble working context for LLM | Takes: role + skills + project context + retrieved memories + task details → compiles within token budget. Follows Google ADK's "separate storage from presentation" pattern |
| 5 | **Memory Manager** | Manage all 6 memory layers | Read (before LLM call), write (after action), consolidate (periodic), sync (to/from shared), prune (garbage collection). Hierarchical retrieval: coarse summaries first, drill into details if needed |
| 6 | **Reasoning Engine** | LLM call(s) + structured reasoning | Loop-optimized: plan → act → verify → diff → adjust. Supports ReAct, chain-of-thought, self-reflection, plan-then-execute. Includes reflection phase after execution |
| 7 | **Invariants Engine** | Non-negotiable rules | Platform invariants (all agents), role invariants (per agent type), situational invariants (context-triggered). Enforced by CODE, not prompting. Violations: soft (warn) → hard (block) → critical (freeze) |
| 8 | **Execution Guard** | Pre-action safety layer | Risk scoring (reversibility, blast radius, data sensitivity, cost, novelty). Pre-action checklists per action type. Confidence thresholds. Sits between reasoning and execution |
| 9 | **Tool Belt (MCP)** | Agent's tool connections | MCP client connecting to domain-relevant MCP servers. Dynamically discoverable. Hot-pluggable. Each agent has curated tool set matching its role |
| 10 | **Plugin Manager** | Runtime extensibility | Tool plugins (new capabilities), knowledge plugins (domain packs), workflow plugins (coordination patterns), eval plugins (quality metrics). Sandboxed, vetted |
| 11 | **Action Executor** | Execute tool calls safely | Sandboxed execution environment. Output validation before committing. Rollback capability for reversible actions. Change-minimal, diff-aware |
| 12 | **Self-Monitor** | Internal quality tracking | Tracks: token usage, error rates, confidence scores, task completion rates, cost. Reports to Agent Governance. Can self-throttle or escalate when quality degrades |
| 13 | **HITL Gate** | Configurable approval checkpoints | High-autonomy agents auto-execute most actions. Low-autonomy agents require human approval. Level adjustable based on demonstrated reliability |

---

## 5. Memory Architecture

The #1 differentiator for long-horizon agents. Based on A-Mem (Zettelkasten-inspired, Feb 2025), MIRIX (6-component, Jul 2025), Google ADK's context compaction (Dec 2025), and the multi-agent memory survey (2025).

### 5.1 The Six Memory Layers

| Layer | Name | What It Stores | Analogy | Tech |
|-------|------|----------------|---------|------|
| L1 | **Working Memory** | Compiled context for current LLM call | Your desk right now | Context window management, sliding-window summarizers, token budgets |
| L2 | **Episodic Memory** | Timestamped records of interactions, decisions, tool calls, outcomes | Your diary | Append-only event log → vector store (embeddings) + structured DB (metadata). DVC-style versioning |
| L3 | **Semantic Memory** | Distilled knowledge, facts, patterns, domain rules | Your expertise | Knowledge graph (entities + relations) + vector embeddings. A-Mem Zettelkasten auto-linking. Periodic consolidation |
| L4 | **Procedural Memory** | Learned workflows, tool-use patterns, multi-step procedures | Your muscle memory | Versioned prompt templates, tool-chain recipes, decision trees. Executable specifications |
| L5 | **Shared Memory** | Cross-agent knowledge. Transactive memory — "who knows what" | Team whiteboard | Shared knowledge graph with agent-scoped read/write. Event-driven sync. Conflict resolution via timestamps + authority |
| L6 | **Resource Memory** | Indexed references to project artifacts: codebase, docs, configs, data | Your file cabinet | MCP servers exposing project resources. Chunked + embedded for retrieval. Freshness tracking |

### 5.2 Memory Read Flow (Before LLM Call)

```
NEW INTERACTION ARRIVES
     │
     ▼
┌─────────────────────────────────┐
│     MEMORY READ                  │
│                                 │
│  query → vector similarity      │──► top-k episodic memories
│  query → graph traversal        │──► relevant semantic nodes
│  task type → procedure lookup   │──► matching procedures
│  agent roster → who knows what  │──► shared memory fragments
│  project refs → artifact index  │──► resource pointers
│                                 │
│  HIERARCHICAL RETRIEVAL:        │
│  start with coarse summaries    │
│  drill into details if needed   │
│  (saves tokens)                 │
│                                 │
│  ALL → Context Compiler         │
│  (assembled within token budget)│
└─────────────────────────────────┘
```

### 5.3 Memory Write Flow (After LLM Call)

```
LLM REASONING COMPLETE
     │
     ▼
┌─────────────────────────────────┐
│     MEMORY WRITE                 │
│                                 │
│  interaction → episodic store   │  (what happened, timestamped)
│                                 │
│  LLM extracts → new facts       │
│  ├── entities, relations        │──► semantic graph UPDATE
│  ├── links to existing nodes    │──► A-Mem style auto-linking
│  └── new concepts if novel      │
│                                 │
│  successful approach?           │
│  └── crystallize → procedural   │──► reusable for next time
│                                 │
│  relevant to other agents?      │
│  └── broadcast → shared memory  │──► event bus notification
│                                 │
└─────────────────────────────────┘
```

### 5.4 Memory Maintenance (Background)

```
PERIODIC MAINTENANCE JOBS
│
├── Consolidation: compress old episodic → semantic summaries
├── Pruning: remove stale/low-value memories (time-decay + relevance-decay)
├── Re-linking: discover new connections between memories (A-Mem pattern)
├── Compaction: context window optimization (Google ADK sliding-window pattern)
└── Sync: ensure shared memory consistency across agent cluster
```

### 5.5 Key Innovation

**Context Engineering as Systems Engineering** (from Google ADK, Dec 2025): Treat context like a compiler pipeline. Raw state → processors → working context. This makes memory observable, debuggable, and optimizable — not prompt gymnastics. The session is ground truth; working context is a computed projection you can refine independently.

---

## 6. Skills System

Inspired by Claude Code's `/mnt/skills/` architecture. Agents read SKILL.md files BEFORE acting — codified best practices that prevent reinventing approaches every time.

### 6.1 Three Tiers of Skills

```
SKILLS LIBRARY
│
├── PLATFORM SKILLS (built-in, maintained by platform team)
│   │
│   ├── /skills/platform/coder/
│   │   ├── SKILL.md — "how to write production code"
│   │   ├── patterns/ — reusable code patterns
│   │   └── checklists/ — pre-commit, review criteria
│   │
│   ├── /skills/platform/code-reviewer/
│   │   ├── SKILL.md — "how to review code effectively"
│   │   ├── review-rubric.md
│   │   └── common-issues.md
│   │
│   ├── /skills/platform/pm/
│   │   ├── SKILL.md — "how to write a BRD"
│   │   ├── templates/BRD_TEMPLATE.md
│   │   └── frameworks/RICE_SCORING.md
│   │
│   ├── /skills/platform/sales/
│   │   ├── SKILL.md — "how to run B2B sales"
│   │   ├── templates/COLD_OUTREACH.md
│   │   └── frameworks/MEDDIC.md
│   │
│   ├── /skills/platform/security/
│   │   ├── SKILL.md — "how to audit for security"
│   │   ├── checklists/OWASP_TOP10.md
│   │   └── checklists/AGENTIC_TOP10.md
│   │
│   └── ... (one skill folder per agent role)
│
├── DOMAIN SKILLS (project-specific, human creates)
│   │
│   ├── /skills/domain/
│   │   ├── SKILL.md — "our domain conventions"
│   │   ├── data-formats.md
│   │   ├── industry-regulations.md
│   │   └── product-specifics.md
│   │
│   └── EVOLVING: agents can PROPOSE new domain skills
│
└── LEARNED SKILLS (auto-generated from agent experience)
    │
    ├── /skills/learned/{agent-name}/
    │   ├── discovered-pattern-1.md ← extracted from successful approaches
    │   ├── discovered-pattern-2.md
    │   └── ...
    │
    └── LIFECYCLE:
        ├── Agent discovers successful approach
        ├── Crystallized into procedural memory
        ├── Proposed as learned skill
        ├── Agent Governance reviews
        └── Approved → available to all agents of that type
```

### 6.2 Skill Composition

Skills are composable — an agent can read multiple skills per task. For example, when the Coder Agent builds an authentication feature, it reads:
- `coder/SKILL.md` — general coding best practices
- `security/SKILL.md` — security audit patterns
- `domain/SKILL.md` — project-specific conventions

### 6.3 Skills vs. Invariants vs. Memory

| Layer | Purpose | Enforcement | Analogy |
|-------|---------|-------------|---------|
| **Skills** | "How to do X well" | Guidance, best practices | A training manual |
| **Invariants** | "Rules you may NEVER break" | Hard constraints, code-enforced | Company policy |
| **Procedural Memory** | "What worked before" | Retrieved from experience | Personal experience |

All three inform the agent, but they serve different roles. Skills are read before acting. Invariants are checked before every action. Memory is retrieved contextually.

---

## 7. Invariants Engine

The biggest missing piece identified by research team review. Claude Code's quality comes from **discipline**, not just intelligence. Invariants are non-negotiable rules enforced by code, not prompts.

### 7.1 Three Levels of Invariants

**Platform Invariants (all agents):**
- Never act on assumed context — fetch it first
- Never perform destructive action without confirmation
- When uncertainty > threshold → ask, don't guess
- Always log reasoning before executing
- Never exceed token budget without escalation
- Never access data above clearance tier
- Always verify tool output before using in next step
- If action is irreversible → require HITL approval

**Role Invariants (per agent type) — examples:**

| Agent | Invariants |
|-------|-----------|
| **Coder** | Read file before editing (never blind-edit). Never modify >N files without plan confirmation. Always search for references before refactoring. Minimize diff — smallest change that works. Never delete code without checking dependents. Run existing tests before committing. |
| **ML Engineer** | Never deploy model without eval suite pass. Always version datasets before training. Never overwrite production model — shadow first. Log all hyperparameters and seeds. |
| **Sales** | Never send customer comms without human approval. Never promise features not on roadmap. Never share pricing without authorization. Always log customer objections to shared memory. |
| **Legal** | ALL outputs require human review — no exceptions. Never give legal advice — only draft documents. Always flag jurisdiction-specific concerns. Never modify existing contracts without redlines. |
| **DevOps** | Never apply infrastructure changes without plan output review. Never modify production without staging verification. Always maintain rollback capability. |

**Situational Invariants (context-triggered):**
- If production environment → extra approval required
- If customer data involved → encryption mandatory
- If cost > $X → Cost Optimizer must approve
- If after-hours → only critical actions allowed
- If agent quality score < threshold → supervisor mode

### 7.2 Enforcement Mechanism

Invariants are enforced by **runtime code checks**, NOT by asking the LLM to follow rules (which is unreliable at scale).

```
ENFORCEMENT FLOW
│
├── PRE-ACTION CHECK
│   action → invariant checker (code) → pass/block
│
├── STATIC ANALYSIS (for code agents)
│   parse proposed diff → check file count, deletion count, scope
│   block if violates invariants
│
└── RUNTIME GUARDS
    token usage monitor
    API call rate limiter
    data access scope enforcer
    cost accumulator with circuit breaker
```

### 7.3 Violation Levels

| Level | Response | Example |
|-------|----------|---------|
| **Soft** | Warn agent, log, allow retry with adjusted approach | Diff slightly over threshold |
| **Hard** | Block action, escalate to human | Attempted production write without approval |
| **Critical** | Freeze agent, alert governance, require human restart | Attempted data tier escalation or security boundary violation |

### 7.4 Invariant Lifecycle

- Defined in version-controlled files
- Changes require human approval
- Agent Governance audits compliance weekly
- Violation patterns → new invariants proposed
- Invariants are NEVER relaxed without explicit review

---

## 8. Execution Guard

Pre-action safety layer that runs BEFORE tool execution. Sits between Reasoning Engine and Action Executor. All checks are programmatic, not LLM-based.

### 8.1 Checks Performed (in order)

**1. Risk Scoring**

Every proposed action gets a risk score based on:

| Factor | Low Risk | Medium Risk | High Risk | Critical Risk |
|--------|----------|-------------|-----------|---------------|
| Reversibility | Fully reversible | Partially reversible | Difficult to reverse | Irreversible |
| Blast radius | Single file/record | Single service | Multiple services | Production-wide |
| Data sensitivity | Public data | Internal data | Confidential | PII / regulated |
| Cost | < $1 | $1-10 | $10-100 | > $100 |
| Novelty | Done many times | Done a few times | First time for agent | First time for platform |

Score → action:
- LOW → auto-execute
- MEDIUM → execute with enhanced logging
- HIGH → require HITL approval
- CRITICAL → block, escalate

**2. Pre-Action Checklists (per action type)**

| Action Type | Checklist |
|-------------|-----------|
| File edit | Was file read first? Diff size within threshold? No unrelated changes? |
| API call | Endpoint in allowed list? Rate limit OK? Payload within size limits? |
| Data access | Agent has clearance? Query scope bounded (no SELECT *)? Result size within limits? |
| Deployment | Tests passed? Staging verified? Rollback plan exists? |

**3. Confidence Check**

| Agent Confidence | Action |
|------------------|--------|
| > 0.8 | Proceed |
| 0.5 - 0.8 | Proceed with reflection step |
| 0.3 - 0.5 | Seek second opinion (multi-agent debate) |
| < 0.3 | Pause and ask human |

**4. Invariant Verification**

Cross-check against Invariants Engine (Section 7).

### 8.2 Guard Output

| Result | What Happens |
|--------|-------------|
| **PASS** | Action goes to executor |
| **CONDITIONAL PASS** | Action modified (e.g., scope narrowed) |
| **DEFER** | Routed to human or another agent |
| **BLOCK** | Action rejected, reason logged |

---

## 9. Reasoning Engine

Upgraded from simple "plan → execute → reflect" to loop-optimized execution, inspired by Claude Code's fast edit cycles.

### 9.1 Execution Model

```
PLANNING PHASE
│
├── Decompose task into steps
├── Estimate scope per step
├── Identify what to READ before acting
└── OUTPUT: explicit plan (logged, reviewable)
│
▼
EXECUTION LOOP (tight, fast cycles)
│
│  ┌───────────────────────────────────┐
│  │                                   │
│  ▼                                   │
│  ACT (smallest meaningful change)    │
│  │                                   │
│  ▼                                   │
│  VERIFY (check result immediately)   │
│  │                                   │
│  ▼                                   │
│  DIFF (what actually changed?)       │
│  │                                   │
│  ├── matches intent? ──── YES ───────┘ (next step)
│  │
│  └── NO → ADJUST (fix, retry, or re-plan)
│
▼
REFLECTION PHASE (after execution loop)
│
├── Did overall result match the plan?
├── What unexpected things happened?
├── Should any learnings go to procedural memory?
└── Self-critique: quality check own output
```

### 9.2 Change Minimality Heuristic

Applies to ALL agents, not just Coder:

- Prefer targeted edits over rewrites
- Prefer additive changes over destructive
- Prefer reversible actions over irreversible
- If change scope grows beyond plan → STOP, re-plan

### 9.3 Domain-Specific Loop Examples

| Agent | Loop Pattern |
|-------|-------------|
| **Coder** | Plan → edit file → run tests → check diff → adjust → next file |
| **PM** | Draft section → review against criteria → adjust → next section (not entire BRD at once) |
| **ML Engineer** | Train small → evaluate → tune hyperparams → iterate (not train 12 hours then check) |
| **Sales** | Draft email → self-review → refine tone → submit for human approval |
| **UX Designer** | Sketch flow → evaluate against heuristics → iterate → next screen |

---

## 10. Plugin & Extension System

Runtime extensibility so the platform grows without rebuilding agents.

### 10.1 Plugin Types

| Type | What It Extends | Examples |
|------|----------------|---------|
| **Tool Plugins** | What agents CAN DO | Figma MCP server, Jira MCP server, Stripe MCP server. Hot-pluggable, auto-discoverable |
| **Knowledge Plugins** | What agents KNOW | "HIPAA compliance pack", "fintech regulations pack". Loads into resource memory layer. Versioned |
| **Workflow Plugins** | HOW agents WORK | "Sprint planning workflow", "incident response workflow". Defines agent sequence + gates. Registered with Orchestrator |
| **Eval Plugins** | HOW agents are JUDGED | "Code quality scorer", "UX heuristic scorer". Loaded by Agent Governance. Custom quality metrics |

### 10.2 Plugin Infrastructure

```
PLUGIN REGISTRY
│
├── Central catalog of available plugins
├── Version management
├── Dependency tracking (plugin A requires plugin B)
├── Security review gate (plugins are code — must be vetted)
└── Usage analytics (which plugins are agents using?)

PLUGIN SECURITY
│
├── Sandboxed execution (plugins can't escape scope)
├── Permission model (plugin declares needed access)
├── Audit trail (all plugin actions logged)
└── Kill switch (disable any plugin instantly)
```

---

## 11. Communication & Protocol Stack

Three-layer protocol stack based on latest standards. As of September 2025, ACP and A2A merged under Linux Foundation — the landscape has consolidated.

```
┌──────────────────────────────────────────────────────────────┐
│                   LAYER 3: EVENT BUS                          │
│           Async pub/sub for system-wide events                │
│                                                               │
│  Topics: deploy.completed, model.drift, alert.fired,          │
│          cost.exceeded, build.failed, feedback.new             │
│                                                               │
│  Agents subscribe to relevant topics                          │
│  Loose coupling, natural parallelism                          │
├──────────────────────────────────────────────────────────────┤
│                   LAYER 2: A2A PROTOCOL                       │
│           Agent ↔ Agent task delegation                       │
│                                                               │
│  Agent Cards: capability advertisement                        │
│  Task delegation: structured requests                         │
│  Streaming results: for long-running tasks                    │
│  Capability discovery: find the right agent                   │
│                                                               │
│  Orchestrator uses for routing                                │
│  Agents use for peer-to-peer collaboration                    │
├──────────────────────────────────────────────────────────────┤
│                   LAYER 1: MCP (Model Context Protocol)       │
│           Agent ↔ Tools/Resources                             │
│                                                               │
│  JSON-RPC 2.0 client-server                                   │
│  Tool invocation: git, DB, APIs, files, terminals             │
│  Resource access: docs, configs, data                         │
│  Prompt templates: reusable patterns                          │
│                                                               │
│  Each agent is an MCP client                                  │
│  Tools exposed as MCP servers                                 │
└──────────────────────────────────────────────────────────────┘
```

### 11.1 Orchestrator Role

The Orchestrator (Agent 00) doesn't micromanage — it's a **router + dependency resolver.** It uses Agent Cards (A2A) to match tasks to capabilities, tracks progress via the event bus, and escalates to the human for approval gates. Think Kubernetes scheduler, not project manager.

---

## 12. Security Architecture

Based on AWS Agentic AI Security Scoping Matrix (Nov 2025), OWASP Top 10 for Agentic Apps (Dec 2025), and real-world breach patterns from 2025 (including the first documented agentic AI cyberattack, Sep 2025).

### 12.1 Security Flow

```
AGENT wants to perform ACTION
     │
     ▼
┌─ IDENTITY CHECK ──────────────────────────────────┐
│  Workload identity verification                    │
│  Token valid? (short-lived, <15 min)               │
│  Delegation chain: who initiated this?             │
└────────────────────┬──────────────────────────────┘
                     │ ✓
                     ▼
┌─ AUTHORIZATION CHECK ─────────────────────────────┐
│  Role-based: does agent's role permit?             │
│  Scope-based: right environment?                   │
│  Time-based: within allowed window?                │
│  Data-tier: can access this data classification?   │
└────────────────────┬──────────────────────────────┘
                     │ ✓
                     ▼
┌─ BEHAVIORAL CHECK ────────────────────────────────┐
│  Compare to behavioral baseline                    │
│  Anomaly score within threshold?                   │
│  Rate limits respected?                            │
└────────────────────┬──────────────────────────────┘
                     │ ✓
                     ▼
              ACTION EXECUTED
                     │
                     ▼
┌─ AUDIT LOG ───────────────────────────────────────┐
│  who (agent identity)                              │
│  what (action + parameters)                        │
│  when (timestamp)                                  │
│  why (reasoning trace)                             │
│  outcome (success/failure + result)                │
│  cost (tokens consumed)                            │
└───────────────────────────────────────────────────┘
```

### 12.2 Five Security Pillars

**Pillar 1: Agent Identity & Zero Trust**
- Every agent = unique workload identity (not shared API keys)
- Short-lived tokens (15-min rotation), proof-of-possession
- Mutual TLS for all agent-to-agent communication
- No implicit trust — every request authenticated + authorized
- Delegation chains: trace any action back to originating human

**Pillar 2: Least Privilege & Scoped Access**
- Each agent gets minimum permissions for its role
- Environment-specific credentials (dev ≠ staging ≠ prod)
- Time-bound access grants for elevated operations
- Data classification tags — agents only access their tier
- Production write access requires human approval gate

**Pillar 3: Behavioral Monitoring & Anomaly Detection**
- Baseline behavioral profiles per agent established in first 30 days
- Real-time monitoring: token usage, API call patterns, data access
- Anomaly detection: deviations from baseline trigger alerts
- Agent Governance runs weekly quality + security audits
- Automated circuit breakers: isolate agent if anomaly confirmed

**Pillar 4: Prompt Injection & Input Safety**
- Input sanitization layer before every LLM call
- Separate instruction context from data context
- Output validation: check LLM responses before tool execution
- Red-team testing: periodic adversarial prompts against all agents
- Content filtering on both input and output paths

**Pillar 5: Audit & Compliance**
- Complete audit trail: every agent action logged immutably
- Decision provenance: trace any output to its reasoning chain
- SOC2 / ISO 42001 / NIST AI RMF alignment
- Data residency controls for customer data handling
- Quarterly security reviews + penetration testing

---

## 13. Scalability & Reliability

The platform must handle 33 concurrent agents, each potentially running long-horizon tasks (hours/days), with graceful scaling and failure recovery.

### 13.1 Patterns

| Pattern | Description |
|---------|-------------|
| **Horizontal Agent Scaling** | Each agent runs as a stateless service (state lives in memory stores). Multiple instances of hot agents (Coder, Code Reviewer). Auto-scale based on task queue depth. Agent Chassis is containerized — Kubernetes-native. |
| **Long-Horizon Checkpoint** | Tasks spanning hours/days: checkpoint-and-resume pattern. Agent saves progress to episodic memory at each subtask completion. On failure/restart, resumes from last checkpoint. No lost work. |
| **Circuit Breaker & Fallback** | Agent fails repeatedly → circuit breaker opens → tasks rerouted or queued. Model fallback chain: Opus → Sonnet → Haiku. Primary LLM provider down → fallback to secondary. Graceful degradation. |
| **Cost-Aware Scheduling** | Not all tasks need Opus. Cost Optimizer + Agent Governance set token budgets per agent. Dynamic model selection: routine tasks use Haiku, complex reasoning uses Opus. Per-subtask model switching within a single job. |
| **Event-Driven Architecture** | Agents don't poll — they react to events. New PR → Code Reviewer. Deploy complete → QA. Alert fires → Incident Responder. Reduces idle compute. Natural parallelism. |
| **Resilience Patterns** | Idempotent actions (safe to retry). Saga pattern for multi-agent workflows (compensating transactions on failure). Dead letter queues for failed messages. Quarterly chaos engineering drills by SRE Agent. |

---

## 14. Project Context System

Human-readable grounding files that complement the deep memory layers. Like Claude Code's CLAUDE.md but for every business function.

### 14.1 Project Context Files

| File | Owner | Purpose | Who Reads It |
|------|-------|---------|-------------|
| `PLATFORM.md` | Human | "What is this platform, who are we" | Every agent — loaded FIRST |
| `ARCHITECTURE.md` | Architect Agent | System design decisions, tech stack | Coder, DevOps, SRE, ML Engineer |
| `CONVENTIONS.md` | Human + Coder | Coding standards, naming, patterns | Coder, Code Reviewer, Test Engineer |
| `AGENTS.md` | Orchestrator | Roster of active agents + capabilities | Orchestrator, Agent Governance |
| `PROGRESS.md` | Orchestrator | Current sprint/milestone status | All agents (auto-updated) |
| `DECISIONS.md` | All (append-only) | ADR log — architecture decision records | All agents before making decisions |
| `CUSTOMER.md` | Customer Discovery | ICP, personas, validated jobs-to-be-done | Sales, PM, UX, Content |

### 14.2 Why Both Memory Layers AND Project Files?

| Aspect | Memory Layers | Project Files |
|--------|--------------|---------------|
| **Type** | Deep (embeddings, graphs, procedures) | Shallow but readable |
| **Good for** | Similarity search, pattern matching, auto-linking | Grounding, alignment, human-editable, versionable |
| **Analogy** | Your BRAIN | The WHITEBOARD on the wall |

You need both. Memory layers enable intelligent retrieval. Project files ensure alignment and human editability. Agent Governance ensures project files stay current with key decisions from memory.

---

## 15. Agent Roster

33 agents across 8 layers + 1 Orchestrator, from Blueprint v2. Each uses the Deep Agent Chassis (Section 4).

### Layer 0: Orchestration
| # | Agent | End-to-End Owner? |
|---|-------|----|
| 00 | Master Orchestrator | Yes — workflow coordination |

### Layer 1: Discovery & Product
| # | Agent | End-to-End Owner? |
|---|-------|----|
| 01 | Customer Discovery | Yes — customer evidence |
| 02 | Market Research | |
| 03 | Competitor Intelligence | |
| 04 | Product Manager | Yes — what we build & why |
| 05 | Business Analyst | |

### Layer 2: Design & Engineering
| # | Agent | End-to-End Owner? |
|---|-------|----|
| 06 | UX Designer | Yes — user experience |
| 07 | Architect | |
| 08 | Coder | |
| 09 | Code Reviewer | |
| 10 | Test Engineer | |

### Layer 3: Quality & Trust
| # | Agent | End-to-End Owner? |
|---|-------|----|
| 11 | Trust & Security | |
| 12 | QA & Performance | |

### Layer 4: Operations
| # | Agent | End-to-End Owner? |
|---|-------|----|
| 13 | DevOps | |
| 14 | SRE & Resilience | Yes — system reliability |
| 15 | Incident Responder | |
| 16 | Cost Optimizer | |

### Layer 5: Data & ML
| # | Agent | End-to-End Owner? |
|---|-------|----|
| 17 | Data Engineer | |
| 18 | ML Engineer | |
| 19 | MLOps Pipeline | Yes — model delivery |
| 20 | Labeling & Ground Truth | Yes — training data quality |
| 21 | Model Monitor | |
| 22 | Data Quality | |

### Layer 6: Revenue & Growth
| # | Agent | End-to-End Owner? |
|---|-------|----|
| 23 | Sales & Pre-Sales | Yes — pipeline → revenue |
| 24 | Content & SEO | |
| 25 | Customer Success | |
| 26 | Support Desk | |
| 27 | Feedback Analyzer | |
| 28 | Billing & Revenue | Yes — monetization |

### Layer 7: Analytics & Measurement
| # | Agent | End-to-End Owner? |
|---|-------|----|
| 29 | Product Analytics | Yes — behavioral measurement |

### Layer 8: Legal, Docs & Governance
| # | Agent | End-to-End Owner? |
|---|-------|----|
| 30 | Legal & Privacy | |
| 31 | Documentation & Release | |
| 32 | Agent Governance | Yes — agent workforce health |

**10 End-to-End Owners** connect work to outcomes: Customer Evidence, Product Direction, User Experience, System Reliability, Model Delivery, Training Data Quality, Revenue Pipeline, Monetization, Behavioral Measurement, Agent Workforce Health.

---

## 16. Coordination Patterns

### Pattern 1: Discovery → Design → Build

```
Customer Discovery [validates problem]
    → Product Manager [prioritizes, writes requirements]
        → UX Designer [creates flows, wireframes, prototype]
            → Customer Discovery [tests prototype with users]
                → UX Designer [iterates]
                    → Business Analyst [specifies contracts, events]
                        → Coder Agent [implements]
```

### Pattern 2: Measure → Learn → Iterate

```
Product Analytics [measures feature impact]
    → Product Manager [interprets: is this working?]
        → Customer Discovery [qualitative follow-up if unclear]
            → Product Manager [decides: iterate, pivot, or ship]
```

### Pattern 3: Pipeline → Revenue

```
Customer Discovery [defines ICP]
    → Sales Agent [prospect list, outreach]
        → Sales Agent [qualifies, demos]
            → Legal & Privacy [contract prep]
                → Billing & Revenue [pricing, invoicing]
                    → Customer Success [onboarding]
                        → Support Desk [reactive support]
                            → Feedback Analyzer [patterns → PM]
```

### Pattern 4: ML Model Lifecycle

```
Labeling Agent [prepares labeled dataset, versions it]
    → Data Quality [validates dataset]
        → ML Engineer [trains + evaluates model]
            → MLOps Pipeline [deploys to shadow/canary]
                → Model Monitor [watches production metrics]
                    → HUMAN [approve promotion if metrics pass]
                        → MLOps Pipeline [promote to production]
                            → Model Monitor [continuous monitoring]
                                → Labeling Agent [new labels from errors]
```

### Pattern 5: Agent Health Loop

```
Agent Governance [weekly eval of all agent outputs]
    → Agent Governance [scores quality, tracks cost, detects drift]
        → HUMAN [review scorecard, approve prompt changes]
            → Agent Governance [update prompts, re-run evals]
                → Orchestrator [route tasks based on quality scores]
```

### Pattern 6: Multi-Agent Debate (for critical decisions)

```
Critical decision needed
    → Orchestrator routes to 2+ agents independently
        → Agent A produces recommendation
        → Agent B produces recommendation
            → Orchestrator compares outputs
                → If aligned → proceed
                → If divergent → escalate to human with both analyses
```

---

## 17. Task Execution Flow

Complete end-to-end flow showing all 13 chassis components in action:

```
TASK ARRIVES
     │
     ▼
[1]  Identity & Auth ─── am I authorized for this task?
     │
     ▼
[2]  Skills Reader ───── load relevant SKILL.md files
[3]  Project Context ─── load grounding files (PLATFORM.md, etc.)
     │
     ▼
[5]  Memory Manager ──── retrieve relevant memories (hierarchical)
     │                   episodic + semantic + procedural + shared + resource
     ▼
[4]  Context Compiler ── assemble everything within token budget
     │                   skills + context + memories + task → working context
     ▼
[6]  Reasoning Engine ── PLAN phase
     │                   decompose task, estimate scope, identify prereads
     ▼
[7]  Invariants Engine ─ does plan violate any rules?
     │
     ├── YES → revise plan
     ├── NO  ↓
     │
     ▼
     ┌──── EXECUTION LOOP (tight, fast) ─────────────┐
     │                                                 │
     │  [6] Reasoning: decide next small action        │
     │       │                                         │
     │       ▼                                         │
     │  [8] Execution Guard: risk score + checklists   │
     │       │                                         │
     │       ├── BLOCK → re-plan                       │
     │       ├── DEFER → HITL                          │
     │       ├── PASS ↓                                │
     │       │                                         │
     │       ▼                                         │
     │  [9] Tool Belt: select tool via MCP             │
     │  [11] Action Executor: sandboxed execution      │
     │       │                                         │
     │       ▼                                         │
     │  VERIFY: did it work as intended?               │
     │       │                                         │
     │       ├── YES → next step ──────────────────────┘
     │       └── NO  → adjust, retry
     │
     └────────────────────────────────────────────────┘
     │
     ▼
[6]  Reasoning: REFLECT on overall result
     │           self-critique, quality check
     ▼
[12] Self-Monitor: log quality metrics, cost, errors
     │
     ▼
[5]  Memory Manager: WRITE new memories
     │   episodic (what happened)
     │   semantic (new knowledge extracted)
     │   procedural (if better approach found)
     │   shared (broadcast if relevant to other agents)
     ▼
[13] HITL Gate: does output need approval?
     │
     ├── YES → hold for human review
     └── NO  → deliver result → Orchestrator
```

---

## 18. Recommended Tech Stack

### 18.1 LLM Layer

| Component | Technology | Use Case |
|-----------|-----------|----------|
| Heavy reasoning | Claude Opus 4.x | Architecture decisions, complex code generation, critical analysis |
| Standard tasks | Claude Sonnet 4.x | Reviews, standard coding, analysis, agent tasks |
| Automated checks | Claude Haiku 4.x | Classification, routing, validation, simple checks |
| Model router | Custom | Dynamic model selection based on task complexity per-subtask |

### 18.2 Memory Infrastructure

| Component | Technology | Use Case |
|-----------|-----------|----------|
| Primary store | PostgreSQL + pgvector | Structured data + vector embeddings (episodic + semantic) |
| Knowledge graph | Neo4j or Memgraph | Semantic memory entities + relations + A-Mem auto-linking |
| Cache | Redis | Working memory cache, session state, real-time counters |
| Event log | Apache Kafka or NATS JetStream | Episodic memory source, async messaging, event bus |
| Artifact versioning | DVC or LakeFS | Dataset and model artifact versioning |

### 18.3 Protocol & Communication

| Component | Technology | Use Case |
|-----------|-----------|----------|
| Tool integration | MCP SDK | Build MCP servers for each tool domain |
| Agent-to-agent | A2A Protocol (Linux Foundation) | Task delegation, capability discovery |
| Event bus | NATS JetStream | Pub/sub async coordination |
| Internal RPC | gRPC | High-performance agent-to-infrastructure calls |

### 18.4 Infrastructure

| Component | Technology | Use Case |
|-----------|-----------|----------|
| Orchestration | Kubernetes | Agent container orchestration, scaling, scheduling |
| Containerization | Docker | Agent chassis containerization |
| IaC | Terraform or Pulumi | Infrastructure as code |
| Secrets | HashiCorp Vault | Secret management, token rotation, agent credentials |

### 18.5 Observability & Security

| Component | Technology | Use Case |
|-----------|-----------|----------|
| Tracing | OpenTelemetry | Distributed tracing across agent interactions |
| Dashboards | Grafana + Loki | Dashboards, log aggregation, alerting |
| Metrics | Prometheus | Token usage, latency, error rates per agent |
| Policy engine | OPA or Cedar | Policy-as-code for agent authorization |

### 18.6 Agent Development

| Component | Technology | Use Case |
|-----------|-----------|----------|
| Agent graphs | LangGraph or custom | Agent reasoning graph (ReAct, plan-execute loops) |
| ML registry | MLflow | Model registry, experiment tracking |
| Agent evals | Braintrust or custom | Agent quality scoring, regression testing |
| Versioning | Git + CI/CD | Agent prompt versioning, skill versioning, automated testing |

---

## 19. Implementation Roadmap

Aligned with Blueprint v2 timeline, extended to include platform infrastructure.

### Phase 0: Platform Foundation (Weeks 1-4)

| Task | Detail |
|------|--------|
| Build Deep Agent Chassis | Reusable template with all 13 components |
| Memory infrastructure | Deploy Postgres+pgvector, Neo4j, Redis, Kafka/NATS |
| MCP server framework | Initial tool integrations (git, file system, terminal) |
| A2A agent registry | Capability discovery and task delegation |
| Event bus | NATS JetStream for async coordination |
| Agent Identity system | Workload identities, Vault integration, token management |
| Monitoring stack | OpenTelemetry + Grafana + Prometheus |
| Skills library scaffold | Platform skills for first 8 agent roles |
| Invariants framework | Platform invariants + role invariants for first 8 agents |

**Agents deployed:** 0 domain agents — infrastructure only

### Phase 1: Core Build Agents (Months 1-3)

| Agent | Key Tools (MCP) |
|-------|----------------|
| Orchestrator | Task routing, A2A registry, event bus |
| Customer Discovery | Interview synthesis, survey tools |
| Product Manager | BRD templates, backlog management |
| UX Designer | HTML/React prototyping, design system |
| Coder | Git, editor, terminal, linter, formatter |
| Code Reviewer | Git diff, review rubric, different model than Coder |
| Test Engineer | Test frameworks, CI/CD integration |
| DevOps | Terraform, Docker, CI/CD pipelines |

**Agents deployed:** 8 + Orchestrator = 9

### Phase 2: Quality + ML (Months 3-6)

| Agent | Key Tools (MCP) |
|-------|----------------|
| Trust & Security | Semgrep, Snyk, OWASP ZAP |
| QA & Performance | Playwright, k6, Lighthouse |
| Data Engineer | Pipeline tools, data validators |
| ML Engineer | Python ML stack, MLflow, eval frameworks |
| Data Quality | Schema validators, profilers |
| Business Analyst | Schema tools, contract generators |
| Product Analytics | Analytics platform, feature flags |

Enable shared memory sync between related agent clusters.

**Agents deployed:** 16 total

### Phase 3: Operations + Revenue (Months 6-9)

| Agents Added |
|-------------|
| SRE & Resilience, Incident Responder, Cost Optimizer |
| MLOps Pipeline, Labeling & Ground Truth, Model Monitor |
| Sales & Pre-Sales, Content & SEO, Customer Success |
| Support Desk, Legal & Privacy, Billing & Revenue |
| Feedback Analyzer |

Enable full inter-agent collaboration patterns. Implement behavioral baselines per agent.

**Agents deployed:** 30 total

### Phase 4: Governance + Scale (Months 9-12)

| Agents Added |
|-------------|
| Agent Governance (eval framework, quality scoring) |
| Architect, Competitor Intel, Market Research |
| Documentation & Release |

Full platform operational. Performance tuning, cost optimization, security hardening (quarterly pen tests, red-team exercises).

**Agents deployed:** All 33 + Orchestrator

---

## 20. Key Differentiators

### vs. CrewAI / AutoGen / MetaGPT (Agent Frameworks)

- Those are frameworks for wiring agents. This is a **complete platform** with deep domain agents, rich memory, skills, invariants, and production security.
- They use shallow agent definitions (system prompt + tools). We use the **Deep Agent Chassis with 13 components.**
- They focus on single-session tasks. We handle **long-horizon tasks spanning days** with checkpoint-resume.
- They lack production security controls. We have **zero-trust, behavioral monitoring, OWASP compliance, and invariants.**

### vs. Claude Code (Single Deep Agent)

- Claude Code is ONE deep agent for coding. We build **33 deep agents** for every business function.
- Claude Code's architecture (MCP + project context + skills + discipline) is our **inspiration** — we generalize it across domains.
- Claude Code proves the model works. We extend it to PM, Sales, ML, Legal, Support, and all other functions.

### vs. Enterprise Platforms (ServiceNow, Salesforce AI Agents)

- Those add AI to existing workflows. We build **AI-native from scratch.**
- They're multi-tenant SaaS. We're a **self-hosted platform you fully control.**
- They use one-size-fits-all agents. We use **domain-specialized deep agents** with tuned memory and role-specific invariants.

### The Big Bet

Agent quality scales with **memory quality + operational discipline.** Every other platform treats memory as an afterthought (RAG bolt-on) and discipline as optional (prompt instructions). We make memory the core architectural primitive — following the A-Mem/Zettelkasten insight that interconnected, self-organizing knowledge structures outperform flat document retrieval — and we make discipline a runtime-enforced guarantee, not a suggestion.

---

## 21. Open Questions

Questions to resolve in future iterations:

| # | Question | Options | Current Lean |
|---|----------|---------|-------------|
| 1 | **Orchestrator: Smart router or full planner?** | (a) Simple router using Agent Cards (b) Decomposes complex goals into multi-agent plans | (a) Router — agents know when to call peers |
| 2 | **Memory sharing granularity?** | (a) Full transparency (b) Agent-cluster sharing (c) Topic-based | (c) Topic-based, upgrade to cluster-based later |
| 3 | **How many memory stores?** | (a) Postgres + Neo4j + Redis + Kafka (4 stores) (b) Collapse to Postgres + Redis (2 stores) | (a) for production, (b) for MVP/solo founder |
| 4 | **Agent Governance: agent or infrastructure?** | (a) Agent 32 monitors others (b) Platform-level concern | (a) Agent for now, extract to infra if scope grows |
| 5 | **Checkpoint granularity?** | (a) Every action (b) Every subtask (c) Time-based | (b) Every subtask completion |
| 6 | **Dynamic model routing?** | (a) Fixed model per agent (b) Per-subtask within a job | (b) Per-subtask — Coder uses Opus for architecture, Haiku for boilerplate |
| 7 | **Where does intelligence live?** | (a) Smart orchestrator + simple agents (b) Dumb orchestrator + smart agents | (b) Smart agents, lightweight orchestrator |
| 8 | **RL-driven memory management?** | (a) Include in v1 (b) Bookmark for v2 | (b) Needs usage data first |
| 9 | **Multi-agent debate scope?** | (a) All decisions (b) Critical decisions only (c) Configurable | (c) Configurable per decision type |

---

## Appendix: Research References

| Source | Year | Contribution to This Design |
|--------|------|-----------------------------|
| A-Mem: Agentic Memory for LLM Agents | Feb 2025 | Zettelkasten-inspired memory architecture, auto-linking, atomic notes |
| MIRIX: Multi-component memory system | Jul 2025 | 6-component memory model (Core, Episodic, Semantic, Procedural, Resource, Knowledge Vault) |
| Google ADK Context Engineering | Dec 2025 | "Context as compiler pipeline" — separate storage from presentation, context compaction |
| Multi-Agent Memory Survey (TechRxiv) | 2025 | Transactive memory in MAS, shared vs. local memory, collective intelligence patterns |
| ACP + A2A Merger (Linux Foundation) | Sep 2025 | Protocol consolidation — MCP for tools, A2A for agent collaboration |
| MCP Protocol Survey (arXiv) | May 2025 | Phased adoption roadmap: MCP → ACP → A2A → ANP |
| OWASP Top 10 for Agentic Applications | Dec 2025 | First industry-standard framework for autonomous agent security risks |
| AWS Agentic AI Security Scoping Matrix | Nov 2025 | Agency vs. autonomy framework, security controls per agentic architecture level |
| Memory-R1: RL for Memory Management | 2025 | RL framework for active memory CRUD operations (bookmarked for v2) |
| Hierarchical Memory for Long-Term Reasoning | Jul 2025 | Coarse-to-fine retrieval for token-efficient memory access |
| Claude Code Architecture | 2024-2025 | Skills system, project context (CLAUDE.md), MCP tools, operational discipline, edit-loop optimization |

---

> **Document version:** Draft 3
> **Last updated:** February 2026
> **Status:** Brainstorm baseline — ready for iteration on specific sections
