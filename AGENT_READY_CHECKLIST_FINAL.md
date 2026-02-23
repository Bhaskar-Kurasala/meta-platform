# AGENT-READY PROJECT SETUP: Complete Artifact Checklist

> **What this is:** The definitive checklist of everything you need before giving tasks to coding agents. This is the "pave the road" document — follow it once per project, and every subsequent agent session starts with a clear, high-quality foundation.
>
> **How it connects to other documents:**
> - `PROJECT_INSTRUCTIONS.md` = Agent behavior constitution (HOW to build)
> - `docs/BRD.md` = Business requirements (WHAT to build)
> - **This document** = Everything ELSE you need to create and commit before agents start coding

---

## THE CORE INSIGHT

You already have two foundational documents:

1. **PROJECT_INSTRUCTIONS.md** — tells the agent HOW to build (quality, security, process)
2. **BRD** — tells the agent WHAT to build (requirements, data contracts, features)

But agents also need a **working environment** — infrastructure, tooling, schemas, test harnesses, templates, and operational scaffolding. Without these, agents will either invent them (inconsistently) or skip them (dangerously).

Think of it this way:

```
WHAT to build (BRD)
  + HOW to build it (PROJECT_INSTRUCTIONS)
    + WHERE to build it (infrastructure, CI, dev environment)
      + WITH WHAT (schemas, API specs, test fixtures, templates)
        + VALIDATED BY (CI gates, contract tests, security scans)
          = Production-ready agent workflow
```

---

## CRITICAL ANALYSIS OF THE ORIGINAL CHECKLIST

Before presenting the improved version, here's my honest assessment of each item in the original. Some are essential, some are premature, and some need restructuring.

### What's Correct and Essential

**Spec-first workflow rule** — "No feature PR without updated BRD/spec + Gherkin tests." This is the single most important process rule. Without it, agents produce code that drifts from requirements within days. Research from Thoughtworks, GitHub (Spec Kit), and Anthropic all confirm: specs as source of truth is the emerging standard.

**Contract-first API changes** — "All API changes require OpenAPI update + contract test." Correct. The OpenAPI spec is the contract between frontend, backend, and any consuming agents. Contract tests catch breaking changes before they reach production.

**JSON Schema files as separate artifacts** — Excellent. Agents can import these to auto-generate validation code, TypeScript types, database models, and test fixtures. Keeping schemas in `/schemas` rather than embedded in the BRD makes them machine-parseable.

**CI pipeline as a quality gate** — Absolutely essential. Agents should never be able to merge code that doesn't pass automated checks. The CI pipeline is the ultimate enforcer of your PROJECT_INSTRUCTIONS.

**Synthetic data generators** — Critical and often overlooked. Agents can't test against real drone data during development. Synthetic generators let agents run integration tests, train baseline ML models, and validate pipelines without external dependencies.

**PR templates with Definition of Done** — Correct. Repo mechanics enforce standards more reliably than prose instructions. Agents follow templates because the template is literally in their context when creating a PR.

### What's Valid But Needs Restructuring

**The priority ordering (P0/P1/P2/P3) is mostly right but some items are misplaced:**

- **IaC bootstrap at P0** is premature for most projects. You don't need Terraform modules before the first line of application code. Move to P1 — you need a local dev environment first, not a full cloud stack.
- **Docker-compose for local dev at P1** should be P0. Agents need a running local environment from day one to test their code. Without it, they'll write code they can't verify.
- **Observability baseline at P1** is correct for the tooling setup, but the specific SLOs, dashboards, and alert rules are P2 (you need running code first to know what to monitor).
- **MLOps stack at P2** is too late if you're building an ML-first platform. For the drone project, model training infrastructure should be P1 — you can't build the anomaly detection feature without a model.

**The "recommended frameworks" section** mixes opinions with requirements. It should be an ADR (Architecture Decision Record), not a fixed recommendation. Different projects need different stacks. The BRD and PROJECT_INSTRUCTIONS are stack-agnostic by design.

### What's Missing

**1. Agent Progress Tracking Artifacts** — From Anthropic's own research on long-running agents: agents need a `claude-progress.txt` or equivalent file to track what's been done across sessions. Without this, each new agent session starts from scratch, re-reads the whole codebase, and often redoes work.

**2. Feature List with Priority and Status** — A `feature_list.json` or `features.md` that agents read at session start to know what to work on next. Anthropic's harness guide explicitly recommends this.

**3. Init Script** — A script (`scripts/init.sh` or equivalent) that agents run to start the dev environment, verify it's working, and confirm no existing bugs before starting new work. This prevents agents from building on top of broken state.

**4. Externalized Prompts** — For AI-first platforms with agents as product features, agent prompts should be stored as separate files (not hardcoded in source), version-controlled, and dynamically loaded. This allows non-technical stakeholders to update agent behavior without code changes.

**5. Reference Implementations** — Already in PROJECT_INSTRUCTIONS v2 but not in this checklist. A `/reference` folder with known-good code patterns is one of the highest-leverage artifacts for agent compliance.

**6. Spec-to-Task Breakdown Process** — The checklist mentions "spec-driven task templates" but doesn't define the workflow: Spec → Plan (agent drafts, human reviews) → Tasks (agent decomposes, human approves) → Implementation (agent codes, human reviews). This three-phase process needs to be explicit.

### What to Remove or Deprioritize

**"Training & onboarding materials for juniors"** — This is a team management concern, not an agent-ready artifact. Remove from this checklist; handle separately.

**"Cost monitoring & budgeting guardrails"** — Valid for enterprise but not a pre-agent artifact. This is operational and comes after you have a running system.

**"Blue/green and canary deployment examples"** — These are deployment patterns defined in Phase 7 of PROJECT_INSTRUCTIONS. Including them here is redundant.

---

## IMPROVED CHECKLIST: Agent-Ready Project Setup

### Tier 0: Foundation (Must exist before ANY agent coding session)

These are true blockers. Without them, agent output quality drops dramatically.

| # | Artifact | Location | Purpose | Who Creates |
|---|---------|----------|---------|------------|
| 1 | **PROJECT_INSTRUCTIONS.md** | Root | Agent behavior constitution — quality, security, process rules | Human (with agent assistance) |
| 2 | **BRD (agent-optimized)** | `docs/BRD.md` | Requirements, data contracts, acceptance criteria, scope | Human (with agent assistance) |
| 3 | **Domain Glossary** | In BRD Section 5 | Authoritative naming for all code, APIs, and data | Human |
| 4 | **JSON Schema files** | `schemas/` | Machine-parseable data contracts for every entity | Human drafts, agent validates |
| 5 | **OpenAPI spec (skeleton)** | `docs/API_SPEC.yaml` | API contract — endpoints, auth, errors, pagination | Human drafts, agent expands |
| 6 | **CI pipeline** | `.github/workflows/` | Build + lint + test + security scan on every PR | Agent generates, human reviews |
| 7 | **Local dev environment** | `dev/docker-compose.yml` | Runnable stack: DB, cache, message queue, app | Agent generates, human verifies |
| 8 | **PR template + Issue templates** | `.github/` | Definition of Done checklist, feature spec template, bug template | Agent generates from PROJECT_INSTRUCTIONS |
| 9 | **CODEOWNERS** | Root | Require human approval for infra, security, and instruction changes | Human |
| 10 | **Reference implementations** | `reference/` | Known-good code patterns for the chosen stack | Agent generates first, human curates |

### Tier 1: Enablers (Must exist before production features)

Without these, agents can write code but can't validate it or operate it reliably.

| # | Artifact | Location | Purpose | Who Creates |
|---|---------|----------|---------|------------|
| 11 | **Auth & RBAC design** | `docs/SECURITY.md` | OAuth flows, token lifetimes, role-permission matrix | Human designs, agent implements |
| 12 | **Synthetic data generators** | `data/synthetic/` | Test data for every entity type + typical anomaly cases | Agent generates from schemas |
| 13 | **Contract tests** | `tests/contract/` | Validate API responses match OpenAPI spec + schema validation | Agent generates, CI enforces |
| 14 | **Init script** | `scripts/init.sh` | Starts dev environment, runs health checks, verifies state | Agent generates |
| 15 | **Feature list with status** | `docs/FEATURES.md` | Priority-ordered feature list — what's done, what's next, what's blocked | Human maintains, agent reads |
| 16 | **Agent progress tracker** | `claude-progress.txt` | Tracks what was done in last session, what's next, known issues | Agent maintains across sessions |
| 17 | **Architecture Decision Records** | `docs/ADR/` | Document every major technical choice with rationale | Human decides, agent documents |
| 18 | **Security baseline** | `docs/SECURITY.md` | Secrets management pattern, TLS config, OWASP checklist | Human defines, agent implements |
| 19 | **IaC skeleton** | `infra/terraform/` | Dev/staging/prod environment definitions (networks, IAM, storage, DB) | Agent generates, human reviews |

### Tier 2: Operational Excellence (Must exist before production deployment)

These make the system production-ready and maintainable.

| # | Artifact | Location | Purpose | Who Creates |
|---|---------|----------|---------|------------|
| 20 | **Observability setup** | `docs/OBSERVABILITY.md` | SLOs, alert rules, dashboard definitions, log format, trace propagation | Human defines SLOs, agent implements |
| 21 | **Model governance** | `docs/MODEL_GOVERNANCE.md` | Retrain triggers, promotion flow, model card template, rollback policy | Human defines, agent implements |
| 22 | **HITL flow spec** | `docs/HITL_FLOW.md` | Review queue design, labeling process, feedback loop to training | Human designs, agent implements |
| 23 | **Deployment runbook** | `docs/RUNBOOK.md` | Step-by-step deploy, rollback, incident response procedures | Agent drafts, human verifies |
| 24 | **Incident response playbook** | `runbooks/` | Per-scenario runbooks: ingestion failure, model drift, data corruption | Agent drafts, human verifies |
| 25 | **Backup & retention plan** | In `docs/OPERATIONS.md` | RTO/RPO targets, backup cadence, archival tiers | Human defines |
| 26 | **Compliance & privacy spec** | `docs/COMPLIANCE.md` | GDPR/SOC2 mapping, data residency, PII handling, audit requirements | Human defines (with legal) |

### Tier 3: Scale & Enterprise (When you outgrow MVP)

Create these when the trigger condition is met, not before.

| # | Artifact | Trigger | Purpose |
|---|---------|---------|---------|
| 27 | Multi-tenant architecture | First paying client or second client | Data isolation, per-tenant config, rate limiting |
| 28 | Cost monitoring | Cloud bill > $X/month | Cost alerts, resource tagging, budget guardrails |
| 29 | Agent orchestration guide | >3 agents in system | Multi-agent patterns, agent registry, choreography rules |
| 30 | Streaming architecture design | >1000 concurrent data sources | MQ selection, partitioning strategy, backpressure handling |
| 31 | Externalized prompt management | >5 agent prompts in codebase | Separate prompt repo, version control, A/B testing |

---

## REPOSITORY STRUCTURE

```
/project-root
├── PROJECT_INSTRUCTIONS.md          # Agent behavior constitution
├── CLAUDE.md → PROJECT_INSTRUCTIONS.md  # Symlink for Claude Code
├── AGENTS.md → PROJECT_INSTRUCTIONS.md  # Symlink for other tools
├── claude-progress.txt              # Agent session state (auto-maintained)
│
├── docs/
│   ├── BRD.md                       # Business requirements
│   ├── API_SPEC.yaml                # OpenAPI v3 specification
│   ├── ARCHITECTURE.md              # Technical design (Phase 2)
│   ├── FEATURES.md                  # Feature list with priority + status
│   ├── SECURITY.md                  # Auth, RBAC, security requirements
│   ├── MODEL_GOVERNANCE.md          # ML lifecycle (if AI-first)
│   ├── HITL_FLOW.md                 # Human-in-the-loop design (if AI-first)
│   ├── OBSERVABILITY.md             # SLOs, alerts, dashboards
│   ├── OPERATIONS.md                # Incident response, backup, RTO/RPO
│   ├── RUNBOOK.md                   # Deployment procedures
│   ├── COMPLIANCE.md                # Regulatory mapping (if needed)
│   └── ADR/
│       ├── 001-database-selection.md
│       ├── 002-auth-approach.md
│       └── template.md
│
├── schemas/
│   ├── reading.schema.json
│   ├── anomaly.schema.json
│   ├── prediction.schema.json
│   ├── mission.schema.json
│   ├── alert.schema.json
│   ├── user.schema.json
│   └── audit-log.schema.json
│
├── reference/
│   ├── api-endpoint.example.ts
│   ├── auth-flow.example.ts
│   ├── db-migration.example.sql
│   ├── unit-test.example.ts
│   ├── integration-test.example.ts
│   └── config.example.ts
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                   # Build + lint + test + security scan
│   │   ├── contract-tests.yml       # Schema + API contract validation
│   │   └── deploy-staging.yml       # Staging deployment
│   ├── pull_request_template.md     # Definition of Done checklist
│   ├── ISSUE_TEMPLATE/
│   │   ├── feature.md
│   │   └── bug.md
│   └── CODEOWNERS
│
├── infra/
│   └── terraform/
│       ├── dev/
│       ├── staging/
│       └── prod/
│
├── dev/
│   ├── docker-compose.yml           # Local development stack
│   └── seed.sql                     # Initial database seed
│
├── scripts/
│   ├── init.sh                      # Start dev env + health checks
│   ├── generate-synthetic-data.py   # Synthetic test data generator
│   └── run-contract-tests.sh        # Local contract test runner
│
├── data/
│   └── synthetic/
│       ├── sensor-readings.json
│       └── anomaly-events.json
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── contract/
│   └── e2e/
│
├── runbooks/
│   ├── ingestion-failure.md
│   ├── model-drift.md
│   └── data-corruption.md
│
├── services/                        # Application code
│   ├── ingestion/
│   ├── analytics/
│   ├── api/
│   └── ml/
│
├── .env.example
├── CODEOWNERS
└── README.md
```

---

## PROCESS RULES (Governance Guardrails)

These rules apply to all team members and agents. Enforce via CI, PR templates, and CODEOWNERS.

### Spec-First Workflow

```
BRD requirement → Feature spec (Gherkin + technical checklist)
  → Agent creates plan.md → Human reviews plan
    → Agent decomposes into tasks.md → Human approves tasks
      → Agent implements task by task → CI validates each commit
        → Human reviews PR → Merge only if Definition of Done passes
```

⛔ No feature PR without: updated BRD entry + Gherkin acceptance tests + passing CI

### Contract-First API Changes

⛔ All API changes require: OpenAPI spec update + contract test update + passing contract test CI job

### Quality Gates (CI-Enforced)

| Gate | When | What's Checked |
|------|------|----------------|
| Build | Every commit | Code compiles, no syntax errors |
| Lint + Format | Every commit | Zero warnings on new code |
| Unit Tests | Every PR | All pass, coverage ≥ target |
| Contract Tests | Every PR | API responses match OpenAPI spec |
| Security Scan | Every PR | SAST + dependency scan + secrets scan |
| Integration Tests | Pre-merge | All pass |
| E2E Tests | Pre-deploy | Critical user journeys pass |

### Human Approval Gates

| Action | Requires Human Approval |
|--------|------------------------|
| Architecture decisions | Always |
| New dependency addition | Always (license + security review) |
| Database migration to production | Always |
| Model promotion (staging → prod) | Always |
| Infrastructure changes | Always |
| Changes to PROJECT_INSTRUCTIONS | Always (via PR + CODEOWNERS) |
| Feature implementation code | Always (standard PR review) |

### Cost-Aware Defaults

- Agents must choose from an approved services list OR justify cost trade-offs in a Decision Log entry
- Token usage tracked per agent session
- Infrastructure costs tagged by service/environment for attribution

---

## HOW AGENTS USE EACH ARTIFACT

| Artifact | Agent Usage |
|---------|-----------|
| `PROJECT_INSTRUCTIONS.md` | Read at session start — enforces quality constraints during all code generation |
| `docs/BRD.md` | Source of truth for features, acceptance criteria, data contracts |
| `docs/FEATURES.md` | Read at session start — determines what to work on next |
| `claude-progress.txt` | Read at session start — understand what was done last session, what's pending |
| `schemas/*.json` | Import to auto-generate: TypeScript types, validation code, DB models, test fixtures |
| `docs/API_SPEC.yaml` | Generate server stubs, client SDKs, contract tests, API documentation |
| `reference/` | Copy patterns for new code — ensures consistency across codebase |
| `.github/workflows/` | Agent adds CI jobs as needed, ensures all PRs run quality gates |
| `data/synthetic/` | Used for unit tests, integration tests, and ML model bootstrapping |
| `docs/MODEL_GOVERNANCE.md` | Agent sets up retraining pipelines, model registry hooks, promotion gates |
| `runbooks/` | Agent wires monitoring alerts to runbook links |
| `scripts/init.sh` | Agent runs at session start to verify dev environment is healthy |

---

## CREATION ORDER (Step-by-Step)

For a new project, create artifacts in this order. Each step unlocks the next.

### Day 1: Foundation

1. Human writes rough requirements (even bullet points)
2. Human + Agent create `PROJECT_INSTRUCTIONS.md` (using the v2 template)
3. Agent executes Living Intelligence research (Section 2 of PROJECT_INSTRUCTIONS)
4. Agent generates project-specific `CLAUDE.md`
5. Human + Agent create `docs/BRD.md` (using the BRD template)
6. Agent extracts schemas from BRD → `schemas/`
7. Agent generates OpenAPI skeleton from BRD Section 10 → `docs/API_SPEC.yaml`

### Day 2: Environment

8. Agent creates repository structure (following Section 3 of PROJECT_INSTRUCTIONS)
9. Agent creates `dev/docker-compose.yml` (local dev stack)
10. Agent creates `scripts/init.sh`
11. Agent creates CI pipeline (`.github/workflows/ci.yml`)
12. Agent creates PR template + issue templates
13. Agent creates `reference/` with stack-specific examples
14. Agent creates synthetic data generators → `data/synthetic/`

### Day 3: Quality Infrastructure

15. Agent creates contract tests → `tests/contract/`
16. Agent implements auth + RBAC (first cross-cutting concern)
17. Human creates `docs/FEATURES.md` (priority-ordered feature list)
18. Human reviews and approves all Day 1-2 artifacts
19. Agent creates first ADR (database selection rationale)

### Day 4+: Feature Development Begins

20. Agent reads `docs/FEATURES.md`, picks highest-priority feature
21. Agent follows Spec → Plan → Tasks → Implement workflow
22. Human reviews each PR against Definition of Done
23. Agent maintains `claude-progress.txt` across sessions

---

## WHAT THIS CHECKLIST INTENTIONALLY EXCLUDES

| Excluded Item | Why |
|--------------|-----|
| Specific framework/library recommendations | These are project-specific ADR decisions, not universal |
| Team onboarding materials | HR/management concern, not agent-readiness |
| Cost monitoring setup | Operational concern for after launch, not pre-coding |
| Blue/green deployment examples | Covered in PROJECT_INSTRUCTIONS Phase 7 |
| Multi-tenancy patterns | Tier 3 — create when needed, not before |
| Streaming architecture deep-dive | Project-specific ADR, not universal checklist |

---

> **Summary:** Before handing tasks to agents, supply: (1) executable specs (BRD + PROJECT_INSTRUCTIONS), (2) machine-parseable data contracts (JSON schemas + OpenAPI), (3) a running dev environment (docker-compose + init script), (4) quality gates (CI + contract tests + PR templates), (5) reference patterns for code consistency, and (6) session continuity artifacts (progress tracker + feature list). Agents then convert spec → plan → tasks → code with predictable, production-grade quality.
