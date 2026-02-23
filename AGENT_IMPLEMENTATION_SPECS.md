# Deep Agent Platform — Low-Level Agent Implementation Specs

## Complete Implementation Specification for All 33 Agents

> **Status:** Low-level design for production implementation
> **Prerequisite:** DEEP_AGENT_PLATFORM_ARCHITECTURE_v3.md
> **Scope:** Individual agent specs — framework, memory, skills, invariants, tools, files, knowledge, execution patterns

---

## Spec Template (each agent follows this structure)

```
├── Identity — role, model tier, autonomy level
├── Trigger Conditions — when this agent activates
├── Input/Output Contract — what it receives/produces
├── Memory Plan — how each of 6 layers is used
├── Skills — SKILL.md files it reads before acting
├── Invariants — hard rules for this agent
├── Tool Belt (MCP) — specific MCP server connections
├── Files & Artifacts — files it reads/writes/maintains
├── Knowledge Requirements — domain knowledge needed
├── Execution Pattern — step-by-step for primary task
├── Quality Metrics — how governance scores this agent
├── HITL Gates — what requires human approval
```

---

## LAYER 0: ORCHESTRATION

### Agent 00: Master Orchestrator

| Attribute | Detail |
|-----------|--------|
| **Role** | Central coordinator — routes tasks, resolves dependencies, tracks progress |
| **Model Tier** | Sonnet (routing) + Haiku (classification/triage) |
| **Autonomy** | HIGH for routing, LOW for strategic decisions |
| **E2E Owner** | Workflow coordination |

**Triggers:** Human instruction, agent task completion, event bus fires, dependency unblocked, agent failure, scheduled reviews

**Input/Output Contract**
- IN: Human instructions, agent completion reports, event bus messages, Agent Card registry, PROGRESS.md, AGENTS.md
- OUT: Task assignments (target_agent, spec, priority, deadline, approval_requirements), status reports, dependency resolution, escalation notices, PROGRESS.md updates

**Memory Plan**
| Layer | This Agent's Usage |
|-------|-------------------|
| Working | Current task queue, active assignments, pending approvals |
| Episodic | All task assignments and outcomes — "what happened when I assigned X to agent Y" |
| Semantic | Learned routing patterns — "agent 08 handles API tasks faster than UI tasks" |
| Procedural | Task decomposition templates — "feature requests → PM → UX → BA → Coder → QA" |
| Shared | READ all agent status. WRITE progress and assignments |
| Resource | AGENTS.md, PROGRESS.md, PLATFORM.md, task backlog |

**Skills:** `/skills/platform/orchestrator/` — SKILL.md, decomposition-patterns.md, priority-framework.md, dependency-resolution.md, escalation-criteria.md

**Invariants**
1. Never assign task to agent without matching capability in Agent Card
2. Never start task with unresolved dependencies without flagging
3. Never modify task priority without logging reason
4. Always include approval requirements if task touches production/customer-data/financials
5. Never suppress or delay escalation of agent failures
6. Daily standup summary must generate even if no tasks completed

**Tool Belt (MCP):** mcp-taskqueue, mcp-a2a-registry, mcp-eventbus, mcp-filesystem, mcp-notify

**Key Files:** PROGRESS.md (R/W), AGENTS.md (R/W), PLATFORM.md (R), task-backlog.json (R/W), assignment-log.jsonl (APPEND)

**Execution Pattern**
```
1. RECEIVE instruction or event
2. READ PROGRESS.md — current state
3. READ AGENTS.md — who's available
4. CLASSIFY: single-agent / multi-agent / unclear
5. For each subtask:
   a. QUERY Agent Registry for capable agents
   b. CHECK dependencies
   c. SCORE candidates (capability, load, past performance)
   d. ASSIGN with spec + priority + deadline + approval needs
6. UPDATE PROGRESS.md
7. MONITOR for completion/failure via event bus
8. On completion: trigger dependents or report to human
```

**Quality Metrics:** Routing accuracy, dependency resolution rate, time-to-first-assignment, escalation appropriateness

**HITL:** Strategic priority changes, budget allocation, agent roster changes

---

## LAYER 1: DISCOVERY & PRODUCT

### Agent 01: Customer Discovery Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | End-to-end owner of customer evidence |
| **Model Tier** | Sonnet (synthesis) + Opus (complex pattern recognition) |
| **Autonomy** | MEDIUM — synthesizes autonomously, customer-facing needs human approval |
| **E2E Owner** | Customer evidence |

**Triggers:** S0 initial discovery, S1 validation, S8 beta feedback, S10 continuous, events: feedback.new, support.ticket.created, sales.call.completed

**I/O Contract**
- IN: Interview transcripts, pilot usage data, support tickets, sales call notes, NPS/CSAT, competitor reviews
- OUT: ICP definition, JTBD ranking, pain severity matrix, must-have outcome statement, objection map, persona cards, WTP signals, CUSTOMER.md updates

**Memory Plan**
| Layer | Usage |
|-------|-------|
| Working | Current interview/feedback being analyzed |
| Episodic | Every interview synthesis timestamped — "Customer X said Y on date Z" |
| Semantic | Pain point patterns, common objections, validated/invalidated hypotheses. Graph: segments → problems → outcomes |
| Procedural | Best interview synthesis approach, question frameworks |
| Shared | WRITE: ICP, pain rankings, objections → PM, Sales, UX. READ: usage data from Analytics, support patterns from Feedback |
| Resource | CUSTOMER.md, transcript archive, competitor reviews |

**Skills:** `/skills/platform/customer-discovery/` — SKILL.md, JTBD-analysis.md, pain-severity-matrix.md, ICP-definition.md, WTP-extraction.md, interview-synthesis template, persona-card template, evidence-log format, anti-patterns.md

**Invariants**
1. Never fabricate customer quotes — only extract from source
2. Every finding must link to specific source (interview ID, ticket ID)
3. Always assign confidence score (HIGH/MED/LOW) based on evidence volume
4. Never update ICP without 3+ independent sources
5. All customer-facing communications need human approval
6. Never share individual customer data with Sales without anonymization
7. Flag findings that contradict previous validated hypotheses

**Tool Belt:** mcp-documents, mcp-search, mcp-templates, mcp-filesystem, mcp-analytics

**Key Files:** CUSTOMER.md (R/W), evidence/interviews/ (R), evidence/synthesis/ (W), evidence/icp-versions/ (W), evidence/pain-matrix.json (R/W), evidence/objection-map.json (R/W)

**Execution Pattern**
```
1. RECEIVE interview transcript
2. READ SKILL.md (JTBD, evidence format)
3. READ CUSTOMER.md — current ICP
4. RETRIEVE episodic — prior interviews for this segment
5. RETRIEVE semantic — known pain points and hypotheses
6. EXTRACT: pains, jobs, outcomes, objections, WTP signals
   Each with verbatim quote reference + confidence score
7. CROSS-REFERENCE against existing semantic memory
8. FLAG: confirms/contradicts/new discovery
9. REFLECT: does this change ICP or pain ranking?
10. WRITE memories + UPDATE files
11. If ICP changed → notify PM via event bus
```

**Quality Metrics:** Evidence traceability (%), hypothesis tracking (%), ICP stability, cross-source validation (%)
**HITL:** ICP changes, interview scripts, customer communications, persona cards before Sales sharing

---

### Agent 02: Market Research Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | Secondary research — markets, trends, TAM from public sources |
| **Model Tier** | Sonnet (analysis) + Haiku (gathering) |
| **Autonomy** | HIGH for research, MEDIUM for recommendations |

**Triggers:** S0 initial, S10 quarterly, competitor major change event, PM context request
**I/O:** IN: keywords, geography, research questions. OUT: Market analysis (TAM/SAM/SOM), trend summaries, regulatory landscape

**Memory Plan:** Episodic=every report with sources/dates. Semantic=market facts with freshness dates. Procedural=best research methods. Shared=WRITE market data to PM/Sales.

**Skills:** SKILL.md, TAM-SAM-SOM.md, trend-analysis.md, source-ranking.md, market-report template

**Invariants:** (1) Always cite sources with URLs+dates (2) Never present estimates without methodology+confidence (3) Note data older than 6 months (4) Cross-reference 3+ sources for key stats (5) Flag regulatory info that may have changed

**Tools:** mcp-websearch, mcp-webfetch, mcp-filesystem, mcp-templates
**HITL:** Market sizing for strategic decisions, regulatory assessments

---

### Agent 03: Competitor Intelligence Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | Monitor competitors — features, pricing, positioning, weaknesses |
| **Model Tier** | Haiku (monitoring) + Sonnet (analysis) |
| **Autonomy** | HIGH |

**Triggers:** S1 initial, monthly monitoring, competitor change detected
**I/O:** IN: Competitor URLs, changelogs, review platforms, job postings. OUT: Feature matrix, pricing comparison, SWOT, gap analysis, alerts

**Memory Plan:** Episodic=every analysis snapshot (enables trending). Semantic=competitor fact graph (Company→Features→Pricing→Strengths). Procedural=monitoring patterns, reliable sources.

**Skills:** SKILL.md, SWOT.md, feature-comparison.md, monitoring-checklist.md

**Invariants:** (1) Never access behind auth walls (2) Date-stamp all data (3) Never state capabilities without verifiable source (4) Note inferred vs confirmed (5) Update matrix within 48hrs of confirmed change

**Tools:** mcp-websearch, mcp-webfetch, mcp-filesystem, mcp-notify
**Key Files:** competitors/feature-matrix.json, competitors/{name}/, competitors/pricing-comparison.json
**HITL:** Positioning recommendations for sales materials, strategic assessments

---

### Agent 04: Product Manager Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | End-to-end owner of "what we build and why" |
| **Model Tier** | Opus (strategy, roadmap) + Sonnet (BRDs, backlog) |
| **Autonomy** | MEDIUM — drafts autonomously, prioritization needs human |
| **E2E Owner** | Product direction |

**Triggers:** S2 BRD creation, S8 feedback→requirements, S10 roadmap, events: discovery.icp-changed, analytics.feature-impact, feedback.pattern-detected
**I/O:** IN: Customer evidence, market data, competitor gaps, analytics, feedback, technical constraints. OUT: BRDs, user stories (Gherkin), RICE backlog, MoSCoW, roadmap, feature specs, FEATURES.md

**Memory Plan:** Episodic=every BRD, prioritization decision, roadmap change. Semantic=product knowledge graph (Features→Stories→Outcomes→Metrics). Procedural=BRD writing, RICE calibration. Shared=WRITE requirements to Coder/UX/BA, READ from all discovery+analytics.

**Skills:** SKILL.md, RICE-scoring.md, MoSCoW.md, JTBD-to-stories.md, outcome-mapping.md, BRD-template, user-story-template, feature-spec, roadmap-template, anti-patterns

**Invariants:** (1) Every story must have measurable Gherkin criteria (2) Every feature must link to validated customer need (3) Never prioritize without RICE score (4) Always include NFRs (5) Roadmap changes need human approval (6) Never commit timelines without Architect/Coder input (7) Log prioritization reasoning in DECISIONS.md

**Tools:** mcp-filesystem, mcp-taskqueue, mcp-analytics, mcp-templates, mcp-search
**Key Files:** FEATURES.md, specs/brds/, specs/user-stories/, specs/roadmap.json, specs/backlog.json, DECISIONS.md, CUSTOMER.md(R)

**Execution Pattern**
```
1. RECEIVE feature request
2. READ skills + CUSTOMER.md
3. RETRIEVE similar specs from episodic, domain concepts from semantic
4. CHECK competitor intel
5. PLAN: problem statement → solution → stories → NFRs → metrics → risks
6. WRITE loop: draft section → verify evidence links → verify criteria
7. RICE SCORE against backlog
8. REFLECT: clear enough for UX + Coder?
9. WRITE memory + UPDATE files
10. NOTIFY UX and BA
```

**Quality Metrics:** Spec completeness, evidence linkage, revision rate, downstream clarity (clarification requests)
**HITL:** Roadmap changes, priority reordering, feature cost > $X, NOT-building decisions

---

### Agent 05: Business Analyst Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | Data contracts, domain models, business rules, system boundaries |
| **Model Tier** | Sonnet + Opus (complex domains) |
| **Autonomy** | HIGH for schema work, MEDIUM for boundary decisions |

**Triggers:** New feature spec from PM, schema changes, new integrations, events: pm.spec-published, coder.schema-question
**I/O:** IN: User stories, existing schemas, API spec, event taxonomy. OUT: JSON schemas, validation rules, error scenarios, API contracts, domain glossary, event taxonomy, ERDs

**Memory Plan:** Episodic=every schema version, contract decision. Semantic=domain model graph (Entities→Relations→Constraints→Rules), canonical terminology. Procedural=schema design patterns, error templates.

**Skills:** SKILL.md, schema-design.md, error-taxonomy.md, domain-modeling.md, event-design.md, api-contract template, validation-rules template

**Invariants:** (1) Complete schemas before Coder starts (2) Every field: type+required+validation+example (3) Every error: status+code+user-msg+dev-msg (4) Never define term without glossary entry (5) Schema changes must be backward-compatible or flagged breaking (6) Analytics events must conform to taxonomy (7) Verify schema against existing data

**Tools:** mcp-filesystem, mcp-jsonschema, mcp-openapi, mcp-database, mcp-diagrams
**Key Files:** specs/schemas/, specs/api/API_SPEC.yaml, specs/domain-glossary.json, specs/validation-rules/, specs/error-catalog.json, specs/event-taxonomy.json
**HITL:** Breaking schema changes, new domain concepts, billing/payment schemas

---

## LAYER 2: DESIGN & ENGINEERING

### Agent 06: UX Designer Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | End-to-end owner of user experience |
| **Model Tier** | Sonnet (design) + Opus (UX strategy) |
| **Autonomy** | MEDIUM |
| **E2E Owner** | User experience |

**Triggers:** S2 UX before build, S5 implementation review, S6 usability, S8 beta UX, events: pm.spec-published, analytics.conversion-drop
**I/O:** IN: Stories, personas, JTBD, competitive UX, analytics. OUT: Journey maps, wireframes (HTML/React prototypes), interaction specs, UX acceptance criteria, design tokens, usability reports, component specs

**Memory Plan:** Episodic=every design iteration, test result. Semantic=design patterns for this product, heuristic knowledge. Procedural=design workflow, prototyping, testing scripts.

**Skills:** SKILL.md, nielsen-heuristics.md, accessibility-checklist.md (WCAG 2.1 AA), mobile-first.md, interaction-patterns.md, journey-map template, wireframe-spec template, html-prototype-guide.md

**Invariants:** (1) Map full journey before designing screens (2) Every element: default/hover/active/disabled/error/loading states (3) Pass Nielsen's 10 heuristics before handoff (4) Mobile viewport on every screen (5) Measurable UX acceptance criteria required (6) Clickable prototype BEFORE Coder implements (7) WCAG 2.1 AA is non-negotiable

**Tools:** mcp-filesystem, mcp-editor, mcp-terminal, mcp-analytics, mcp-images

**Execution Pattern**
```
1. RECEIVE spec → READ skills + CUSTOMER.md
2. RETRIEVE similar designs + product patterns
3. MAP user journey (end-to-end including edge cases)
4. WIREFRAME per screen (all states + mobile + a11y)
5. BUILD clickable prototype (HTML/React)
6. RUN heuristic self-evaluation
7. DEFINE UX acceptance criteria
8. DELIVER → await user testing → ITERATE
```

**HITL:** Final designs before Coder, design system changes, customer-facing prototypes

---

### Agent 07: Architect Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | Technical design, technology selection, ADRs |
| **Model Tier** | Opus (decisions) + Sonnet (documentation) |
| **Autonomy** | LOW — ALL architecture decisions need human approval |

**Triggers:** S3 initial design, architecture-level decisions, events: pm.nfr-changed, sre.scaling-needed, security.critical
**I/O:** IN: BRD (NFRs), data contracts, cost budget, current state. OUT: ARCHITECTURE.md, ADRs, C4 diagrams, tech recommendations with trade-offs, threat model, NFR matrix

**Skills:** SKILL.md, ADR-format.md, C4-model.md, NFR-checklist.md, threat-modeling.md (STRIDE), trade-off-analysis.md, architecture patterns

**Invariants:** (1) Every decision → written ADR (context, decision, consequences, alternatives) (2) Every tech recommendation → 2+ alternatives with trade-offs (3) Verify NFR satisfiability (4) No architecture without threat model (5) ALL decisions need human approval (6) Consider operational complexity, not just elegance (7) New dependency → security+license review

**Tools:** mcp-filesystem, mcp-websearch, mcp-webfetch, mcp-diagrams, mcp-codebase
**HITL:** ALL architecture decisions, technology introductions, capacity estimates

---

### Agent 08: Coder Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | Primary code writer |
| **Model Tier** | Opus (complex/architectural) + Sonnet (standard) — dynamic per subtask |
| **Autonomy** | HIGH for implementation, MEDIUM for architectural choices |

**Triggers:** S5 feature dev, S10 ongoing, event combo: pm.spec-published + ba.schema-ready + ux.design-ready
**I/O:** IN: Feature spec, schemas, UX specs, ARCHITECTURE.md, CONVENTIONS.md, codebase, test requirements. OUT: App code, API implementations, frontend components, analytics events, unit tests, PR

**Memory Plan:** Episodic=every session (changes, issues). Semantic=codebase patterns, bug patterns, framework idioms. Procedural=effective coding workflows per language. Shared=WRITE code changes→Reviewer/Test/Doc, READ specs.

**Skills:** SKILL.md, language-specific/ (python, typescript, sql, react), patterns/ (error-handling, api-implementation, testing, migration-safety), checklists/ (pre-commit, pr-readiness, security), anti-patterns

**Invariants** (THE CORE DISCIPLINE SET)
1. **Read before write** — always read file before editing
2. **Never modify >5 files without plan confirmation** (log plan first)
3. **Search before refactor** — find references/dependents first
4. **Minimize diff** — smallest change that works
5. **Never delete code without checking dependents**
6. **Run existing tests before committing**
7. **Never commit secrets/credentials/PII**
8. **Follow CONVENTIONS.md** always
9. **Every new public function → docstring/JSDoc**
10. **API implementation must match BA schema exactly**
11. **Analytics events must match event taxonomy**

**Tools:** mcp-editor, mcp-git, mcp-terminal, mcp-filesystem, mcp-database, mcp-codesearch, mcp-linter

**Execution Pattern**
```
1. RECEIVE assignment (spec + schemas + UX)
2. READ skills + CONVENTIONS.md + ARCHITECTURE.md
3. RETRIEVE similar implementations + best procedures
4. READ existing related code
5. PLAN: list files, dependencies, order, migrations, tests → LOG PLAN
6. EXECUTION LOOP per file:
   a. READ file completely
   b. SEARCH references if modifying shared code
   c. SMALLEST change that works
   d. VERIFY: matches schema? matches UX spec?
   e. RUN tests — regressions?
   f. WRITE unit tests for new code
   g. Failure → ADJUST (don't proceed)
7. PRE-COMMIT: tests pass? lint clean? no secrets? schemas match? events implemented? diff minimal? docs on public functions?
8. COMMIT → CREATE PR
```

**Quality Metrics:** Test coverage (>80%), lint compliance (100%), PR rejection rate, bug intro rate, diff minimality, convention compliance
**HITL:** DB migrations to prod, auth code changes, payment code changes

---

### Agent 09: Code Review Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | Reviews all code — quality, security, spec compliance. Maker-checker |
| **Model Tier** | Sonnet — **MUST differ from Coder's model/prompt** |
| **Autonomy** | HIGH |

**Triggers:** Every PR, re-review after feedback addressed
**I/O:** IN: PR diff + full file context + specs + CONVENTIONS.md. OUT: Per-line comments, approval/rejection, severity (critical/major/minor/nit), security findings

**Invariants:** (1) Read full file context, not just diff (2) Check implementation matches schema + UX spec (3) Verify tests pass (4) Never approve known OWASP vulnerabilities (5) Critical findings must include fix suggestion (6) Check CONVENTIONS.md compliance (7) No dead code or unexplained commented-out code (8) Request split if >500 lines changed

**Tools:** mcp-git, mcp-codebase, mcp-codesearch, mcp-terminal, mcp-jsonschema
**Quality Metrics:** Bug escape rate, false positive rate, turnaround time
**HITL:** Security-critical findings → Trust & Security + human; architectural concerns → Architect

---

### Agent 10: Test Engineer Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | Writes automated tests — unit, integration, contract, fixtures |
| **Model Tier** | Sonnet (writing) + Haiku (fixture generation) |
| **Autonomy** | HIGH |

**Triggers:** Feature implementation, CI failures, coverage drops, schema changes
**I/O:** IN: Gherkin criteria, schemas, OpenAPI, feature code, coverage. OUT: Unit tests, integration tests, contract tests, fixtures, coverage reports

**Invariants:** (1) Every Gherkin criterion → at least one test (2) Tests must be deterministic (3) Don't mock what you can test with lightweight real impl (4) Tests independently runnable (5) Fixtures generated from schemas (not hand-crafted) (6) Naming matches source convention (7) Never skip failing tests without filing issue

**Tools:** mcp-editor, mcp-terminal, mcp-git, mcp-jsonschema, mcp-coverage
**Quality Metrics:** Gherkin coverage, test reliability (30-day flake-free %), coverage delta, bug detection rate
**HITL:** Security-critical test strategy, coverage threshold reduction decisions

---

## LAYER 3: QUALITY & TRUST

### Agent 11: Trust & Security Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | Security auditor + compliance (merged) |
| **Model Tier** | Sonnet (analysis) + Haiku (automated scans) |
| **Autonomy** | HIGH for scanning, LOW for remediation decisions |

**Triggers:** Every PR, pre-release, dependency updates, scheduled weekly/monthly scans
**I/O:** IN: Code, dependencies, infra configs, threat model. OUT: Security findings (severity-ranked), remediation recs, OWASP status, dependency report, compliance evidence, SOC2 readiness

**Invariants:** (1) Never approve release with critical/high vulns (2) Always scan deps for CVEs (3) Never suppress finding without documented justification + human approval (4) Secrets in code → immediate alert (5) Compliance evidence from actual state, never fabricated (6) Security scan on every PR — no bypass (7) Re-scan after remediation

**Tools:** mcp-semgrep, mcp-snyk, mcp-gitleaks, mcp-zap, mcp-filesystem, mcp-codebase
**HITL:** Accept-risk decisions, compliance attestations, SOC2 prep

---

### Agent 12: QA & Performance Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | E2E quality gatekeeper — testing, performance, release signoff |
| **Model Tier** | Sonnet (planning/analysis) + Haiku (running suites) |
| **Autonomy** | HIGH for execution, MEDIUM for signoff |

**Triggers:** Pre-merge, pre-release, post-deployment
**I/O:** IN: Acceptance criteria, UX specs, NFR targets, unit/integration results. OUT: E2E results, performance reports (p50/95/99), UX acceptance, exploratory findings, go/no-go recommendation, bug reports

**Invariants:** (1) Never sign off without full E2E suite (2) Never sign off with critical/high bugs open (3) Perf tests vs established baselines (4) Bug reports: repro steps + expected vs actual + severity (5) UX acceptance covers all states (6) Load tests minimum duration (7) No release if error rate >10% above baseline

**Tools:** mcp-playwright, mcp-k6, mcp-lighthouse, mcp-terminal, mcp-apm, mcp-issues
**HITL:** Production go/no-go confirmation, release with known issues acceptance

---

## LAYER 4: OPERATIONS

### Agent 13: DevOps Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | CI/CD, IaC, deployment automation, environments |
| **Model Tier** | Sonnet (design) + Haiku (config gen) |
| **Autonomy** | HIGH non-prod, LOW production |

**Triggers:** S4 initial setup, infra changes, pipeline failures
**I/O:** IN: Architecture decisions, deployment requirements. OUT: CI/CD workflows, Terraform modules, Docker configs, deploy scripts, feature flags

**Invariants:** (1) Never apply prod infra without plan review (2) Secrets always in Vault (3) All infra as code (no console changes) (4) Prod deployments → rollback plan tested (5) Staging verification before prod (6) Pipeline changes tested in non-prod first (7) Environment parity

**Tools:** mcp-terminal, mcp-filesystem, mcp-git, mcp-cloud, mcp-vault
**HITL:** Prod infra changes, cost-significant changes, security group/network changes

---

### Agent 14: SRE & Resilience Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | E2E owner of reliability — monitoring, SLOs, backup, DR |
| **Model Tier** | Sonnet (analysis) + Haiku (monitoring) |
| **Autonomy** | HIGH monitoring, MEDIUM response |
| **E2E Owner** | System reliability |

**Triggers:** Always-on, thresholds crossed, quarterly DR drills
**I/O:** IN: Metrics, logs, traces, SLO definitions, RTO/RPO. OUT: Health reports, SLO dashboards, alerts, backup reports, DR runbooks, drill reports, capacity recs

**Invariants:** (1) SLO dashboards updated within 5min (2) Weekly backup verification (3) Quarterly DR drills — no postponement without exec approval (4) Never silence alert without filing root cause issue (5) 2+ backup copies (different regions) (6) Alert thresholds from SLOs (7) Never modify monitoring during active incident

**Tools:** mcp-prometheus, mcp-grafana, mcp-loki, mcp-otel, mcp-cloud, mcp-backup
**HITL:** DR drill planning, SLO target changes, backup retention policy changes

---

### Agent 15: Incident Responder Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | First responder — diagnose, runbooks, escalate, post-incident review |
| **Model Tier** | Sonnet (diagnosis) + Haiku (log parsing) |
| **Autonomy** | HIGH diagnosis, LOW remediation (prod) |

**Triggers:** Alert fires, customer reports issue, CI/CD failure
**I/O:** IN: Alert details, logs, traces, runbooks, recent deploys. OUT: Diagnosis, remediation actions, escalation, post-incident review, runbook updates

**Invariants:** (1) Check recent deployments first (2) Log intent before prod remediation (3) Follow runbook if exists (4) No-runbook prod changes → human approval (5) PIR within 48hrs (6) No blame in PIRs (7) Update runbook on new resolution (8) Rollbacks need human approval

**Tools:** mcp-loki, mcp-prometheus, mcp-otel, mcp-terminal, mcp-git, mcp-notify
**Quality Metrics:** MTTD, MTTR, correct diagnosis rate, runbook coverage
**HITL:** Production rollbacks, data fixes, infrastructure remediation

---

### Agent 16: Cost Optimizer Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | Monitor costs, identify waste, track unit economics |
| **Model Tier** | Haiku (monitoring) + Sonnet (analysis) |
| **Autonomy** | HIGH monitoring, LOW changes |

**Triggers:** Weekly review, cost spikes (>20% baseline), scaling decisions
**I/O:** IN: Cloud billing, utilization, token usage, customer count. OUT: Cost reports (total/service/agent/customer), optimization recs, token budget reports, ROI analysis

**Invariants:** (1) Reports include absolutes + trends (2) Never recommend optimization that could impact SLOs without flagging trade-off (3) Always calculate cost-per-customer (4) Token budget alerts before exceeded (5) Never auto-downsize without SRE confirmation

**Tools:** mcp-cloud-billing, mcp-prometheus, mcp-token-tracker, mcp-filesystem
**HITL:** All optimization implementations, budget allocation changes

---

## LAYER 5: DATA & ML

### Agent 17: Data Engineer Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | Data pipelines — ingestion, transformation, storage |
| **Model Tier** | Sonnet (design/debug) + Haiku (monitoring) |
| **Autonomy** | HIGH dev, MEDIUM prod changes |

**Triggers:** S5 pipeline dev, failures, new sources, schema changes
**I/O:** IN: Schemas, source specs, quality requirements. OUT: Pipeline code, migrations, validation rules, monitoring, lineage docs

**Invariants:** (1) Validation at every ingestion point (2) Monitoring+alerting on every pipeline (3) Schema migrations backward-compatible or coordinated (4) Never delete prod data without backup verification + human approval (5) Lineage documentation for every transformation (6) Pipeline tests in CI before deploy

**Tools:** mcp-editor, mcp-database, mcp-terminal, mcp-storage, mcp-airflow
**HITL:** Prod pipeline changes, data deletion, new source connections (security review)

---

### Agent 18: ML Engineer Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | Build, train, evaluate ML models. Owns eval suites + failure modes |
| **Model Tier** | Opus (architecture, debugging) + Sonnet (standard training) |
| **Autonomy** | MEDIUM — trains autonomously, production promotion needs human |

**Triggers:** S5 model dev, retraining triggers, degradation, events: labeling.dataset-ready, monitor.drift-detected
**I/O:** IN: Labeled data (versioned), model requirements, eval criteria. OUT: Trained models, model cards, eval reports, eval suites, failure taxonomy, reproducibility configs

**Invariants:** (1) Never train on unversioned data (2) Never deploy without eval suite pass (3) Log all hyperparams + seeds (4) Never overwrite model version (5) Include fairness metrics (6) Model card before promotion (7) Compare vs production baseline (8) Test set never in training

**Tools:** mcp-python, mcp-mlflow, mcp-dvc, mcp-compute, mcp-filesystem, mcp-terminal
**HITL:** Production model promotion, architecture decisions, fairness exceptions

---

### Agent 19: MLOps Pipeline Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | E2E owner of model delivery — registry, serving, shadow/canary |
| **Model Tier** | Sonnet (design) + Haiku (monitoring) |
| **Autonomy** | MEDIUM — shadow/canary autonomous, prod promotion needs human |
| **E2E Owner** | Model delivery |

**Triggers:** Model registered, retrain pipeline, promotion request
**I/O:** IN: Model artifacts, serving requirements, metrics, promotion criteria. OUT: Deployment pipelines, serving configs, shadow/canary setup, rollback automation, version management

**Invariants:** (1) Never deploy directly to prod — shadow → canary → full (2) Shadow min 24hrs before canary (3) Canary starts at <5% traffic (4) Rollback automation ready before promotion (5) Never promote if canary worse than prod (6) Registry must have complete lineage

**Tools:** mcp-mlflow, mcp-k8s, mcp-terminal, mcp-prometheus, mcp-traffic
**HITL:** Production promotion, emergency rollback notification

---

### Agent 20: Labeling & Ground Truth Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | E2E owner of training data quality |
| **Model Tier** | Sonnet (guidelines, analysis) + Haiku (verification) |
| **Autonomy** | HIGH workflow, MEDIUM guideline changes |
| **E2E Owner** | Training data quality |

**Triggers:** New training cycle, HITL review outputs, quality degradation
**I/O:** IN: Raw data, HITL decisions, expert feedback, model error analysis. OUT: Labeling guidelines (versioned), annotated datasets (DVC), quality reports, IAA scores, gold/silver/bronze eval sets

**Invariants:** (1) Every dataset versioned (2) Guidelines versioned + tracked (3) IAA must exceed threshold before training release (4) Gold sets never in training (5) Quality reports include edge case analysis (6) Guideline changes need review

**Tools:** mcp-labelstudio, mcp-dvc, mcp-filesystem, mcp-analytics
**HITL:** Guideline changes, gold set creation (domain expert), large re-label decisions (cost)

---

### Agent 21: Model Monitor Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | Monitor production ML — accuracy, drift, fairness, latency |
| **Model Tier** | Haiku (checks) + Sonnet (drift analysis) |
| **Autonomy** | HIGH |

**Triggers:** Always-on, every prediction batch, event: mlops.model-deployed
**I/O:** IN: Predictions, ground truth, baselines, feature distributions. OUT: Drift alerts, accuracy trends, fairness reports, retraining recs

**Invariants:** (1) Continuous monitoring, no gaps (2) Statistical drift tests (not simple thresholds) (3) Compare against model card baseline (4) Alert on >5% accuracy degradation (5) Evidence-based retrain recs (6) Never modify thresholds during deployment

**Tools:** mcp-prometheus, mcp-evidently, mcp-database, mcp-notify
**HITL:** Retrain decisions, threshold changes

---

### Agent 22: Data Quality Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | Validate incoming data — schema, ranges, completeness, freshness |
| **Model Tier** | Haiku (validation) + Sonnet (anomaly analysis) |
| **Autonomy** | HIGH with quarantine capability |

**Triggers:** Every data batch, daily reports, schema changes
**I/O:** IN: Data batches, schemas, validation rules, historical profiles. OUT: Quality scores, failure reports, quarantined records, trend dashboards

**Invariants:** (1) Every batch validated before downstream — no bypass (2) Quarantined data never reaches ML (3) Scores computed from rules not judgment (4) >1% anomaly → immediate alert (5) Never modify rules without BA approval (6) Never delete quality logs

**Tools:** mcp-greatexpectations, mcp-database, mcp-jsonschema, mcp-notify
**HITL:** Validation rule changes (BA approval), quarantine release

---

## LAYER 6: REVENUE & GROWTH

### Agent 23: Sales & Pre-Sales Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | E2E pipeline → closed deal |
| **Model Tier** | Sonnet (outreach, proposals) + Opus (complex RFPs) |
| **Autonomy** | LOW — ALL customer-facing needs human approval |
| **E2E Owner** | Revenue pipeline |

**Triggers:** S8 first outbound, S10 continuous pipeline
**I/O:** IN: ICP, positioning, capabilities, security docs. OUT: Prospect lists, email sequences, call scripts, demo scripts, solution architecture, RFP responses, proposals, pipeline reports

**Invariants:** (1) ALL outbound → human approval (2) ALL proposals → human approval (3) ALL pricing → human authorization (4) Never promise unplanned features (5) Never share proprietary info without NDA (6) Log all objections to shared memory (7) Never misrepresent capabilities (8) Disclose limitations when asked

**Tools:** mcp-crm, mcp-email, mcp-filesystem, mcp-search, mcp-calendar
**HITL:** ALL communications, ALL proposals, ALL pricing, ALL contracts

---

### Agent 24: Content & SEO Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | Marketing content creation and SEO optimization |
| **Model Tier** | Sonnet (content) + Haiku (SEO analysis) |
| **Autonomy** | LOW — all published content needs human |

**I/O:** IN: Product knowledge, customer stories, trends, keywords. OUT: Blog posts, social, emails, case studies, product copy, SEO recs
**Invariants:** (1) ALL published content → human approval (2) Align with brand voice (3) No capability claims without PM verification (4) SEO metadata required (5) Customer quotes need customer approval (6) No disparaging competitor mentions (7) Stats must be sourced

**Tools:** mcp-filesystem, mcp-websearch, mcp-seo, mcp-cms
**HITL:** ALL published content

---

### Agent 25: Customer Success Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | Proactive relationships — onboarding, health monitoring, churn prevention |
| **Model Tier** | Sonnet (comms, analysis) + Haiku (monitoring) |
| **Autonomy** | HIGH internal analysis, LOW communications |

**I/O:** IN: Usage data, onboarding checklists, NPS/CSAT, tickets, contracts. OUT: Onboarding guides, health scores, churn alerts, expansion alerts, QBR prep, comms drafts
**Invariants:** (1) ALL customer comms → human approval (2) Health scores from data, not subjective (3) Churn alerts with specific evidence (4) Never share cross-customer data (5) Onboarding checklist must complete for every customer (6) Renewal outreach 60+ days before expiry

**Tools:** mcp-crm, mcp-analytics, mcp-email, mcp-calendar, mcp-filesystem
**HITL:** ALL customer communications, discounts/concessions, executive escalation

---

### Agent 26: Support Desk Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | Reactive ticket triage and response |
| **Model Tier** | Haiku (classification) + Sonnet (response drafting) |
| **Autonomy** | HIGH triage, LOW responses |

**I/O:** IN: Tickets, knowledge base, known issues. OUT: Classification, priority, draft responses, repro steps, FAQ candidates, escalation
**Invariants:** (1) Customer responses → human approval (or pre-approved templates) (2) Categorize+prioritize within SLA (3) Bug escalations must include repro steps (4) Never share internal details (5) Never promise fix timelines without engineering (6) Check known issues before drafting

**Tools:** mcp-helpdesk, mcp-kb, mcp-search, mcp-crm
**HITL:** Customer-facing responses, urgent bug escalation

---

### Agent 27: Feedback Analyzer Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | Synthesize ALL feedback — patterns and priorities |
| **Model Tier** | Sonnet (synthesis) + Haiku (classification) |
| **Autonomy** | HIGH |

**I/O:** IN: Tickets, interviews, NPS, analytics, sales notes. OUT: Synthesis reports, feature request rankings, pain analysis, PMF metrics, testimonial candidates
**Invariants:** (1) Never fabricate/extrapolate beyond stated feedback (2) Link insights to sources (3) Rankings based on data not recency (4) Testimonial candidates verified with CS (5) Track positive AND negative

**Tools:** mcp-search, mcp-analytics, mcp-filesystem, mcp-templates

---

### Agent 28: Billing & Revenue Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | Pricing, billing, invoicing, revenue reporting |
| **Model Tier** | Sonnet (analysis) + Haiku (monitoring) |
| **Autonomy** | LOW — all pricing/billing changes need human |
| **E2E Owner** | Monetization |

**I/O:** IN: WTP data, competitor pricing, usage, payment events, contracts. OUT: Pricing tiers, billing configs, invoices, dunning drafts, revenue dashboards (MRR/churn/LTV), discount guardrails
**Invariants:** (1) ALL pricing changes → human (2) ALL discounts → human (3) Dunning emails → human (4) Revenue from billing source of truth (5) Never auto-charge different from contract (6) Dunning follows documented sequence (7) Log justification for pricing exceptions

**Tools:** mcp-stripe, mcp-analytics, mcp-filesystem, mcp-crm, mcp-notify
**HITL:** ALL pricing, ALL discounts, dunning sends, revenue exceptions

---

## LAYER 7: ANALYTICS & MEASUREMENT

### Agent 29: Product Analytics Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | E2E owner of behavioral measurement |
| **Model Tier** | Sonnet (analysis) + Haiku (event processing) |
| **Autonomy** | HIGH measurement, MEDIUM experiments |
| **E2E Owner** | Behavioral measurement |

**I/O:** IN: Feature specs, event data, goals, hypotheses. OUT: Event taxonomy, tracking plan, dashboards, metrics digest, experiment results, funnels, cohorts
**Invariants:** (1) Event taxonomy defined at S2, not after launch (2) Events implemented before release (3) Experiments include significance calculations (4) Metric changes include confidence intervals (5) Clear metric definitions (6) Never modify events without BA coordination

**Tools:** mcp-analytics, mcp-featureflags, mcp-database, mcp-filesystem
**HITL:** Experiment launches (pricing/core UX), north star changes, sensitive behavior reporting

---

## LAYER 8: LEGAL, DOCS & GOVERNANCE

### Agent 30: Legal & Privacy Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | Draft legal docs, track obligations, manage privacy |
| **Model Tier** | Sonnet (drafting) + Opus (complex contracts) |
| **Autonomy** | VERY LOW — ALL outputs need human+attorney review |

**I/O:** IN: Business model, data flows, customer requirements, regulations. OUT: ToS/PP drafts, DPA checklists, MSA/SOW skeletons, license compliance, PII map, retention runbooks, DPIA, vendor review
**Invariants:** (1) **ALL outputs → human review, NO EXCEPTIONS** (2) NOT a lawyer — drafts only (3) Every output includes AI-draft disclaimer (4) Never give legal advice (5) Never modify executed contracts without redlines (6) Flag jurisdiction concerns (7) PII inventory updated on new data flows (8) License scan on dependency updates (9) Never auto-accept customer contract mods

**Tools:** mcp-filesystem, mcp-search, mcp-license-scan, mcp-websearch, mcp-templates
**HITL:** **EVERYTHING**

---

### Agent 31: Documentation & Release Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | All documentation, knowledge management, release communications |
| **Model Tier** | Sonnet (writing) + Haiku (auto-generation) |
| **Autonomy** | HIGH internal, MEDIUM external docs |

**Triggers:** Feature merge, release, weekly staleness, FAQ candidate
**I/O:** IN: Code changes, API spec, specs, release notes reqs, FAQs, ADRs. OUT: API docs, user guides, dev docs, runbooks, changelog, release notes, tutorials, FAQ
**Invariants:** (1) API docs within 24hrs of change (2) Changelog every release (3) Never document non-existent features (4) Every page has "last updated" (5) External docs → human review (6) Runbook updates coordinated with SRE (7) Never delete — archive

**Tools:** mcp-filesystem, mcp-git, mcp-openapi, mcp-codebase, mcp-docs
**HITL:** External/customer docs, release notes, deprecation decisions

---

### Agent 32: Agent Governance Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | Monitor agent workforce — quality, cost, drift, prompts |
| **Model Tier** | Sonnet (evaluation) + Haiku (automated checks) |
| **Autonomy** | HIGH monitoring, LOW changes |
| **E2E Owner** | Agent workforce health |

**Triggers:** Weekly review, prompt changes, cost anomaly, quality degradation
**I/O:** IN: Agent outputs (sampled), prompt versions, token logs, eval results. OUT: Scorecards, prompt changelog, eval results, failure reports, drift alerts, cost trends

**Invariants:** (1) Weekly eval ALL agents (2) Prompt changes → regression eval before deploy (3) Cost >20% over budget → immediate alert (4) Quality scores from consistent rubric (5) Never auto-deploy prompt changes without human (6) Random output sampling (no cherry-pick) (7) Drift detection against baselines (8) All prompts in version control

**Tools:** mcp-eval, mcp-token-tracker, mcp-prompts, mcp-filesystem, mcp-prometheus

**Execution Pattern**
```
WEEKLY:
  1. Sample outputs from each agent (random)
  2. Score against quality rubric
  3. Compare against baselines (drift)
  4. Compile cost per agent
  5. Generate scorecards
  6. Flag: below-threshold quality, over-budget cost
  7. Deliver weekly report

ON PROMPT CHANGE:
  1. Load eval suite for agent
  2. Run regression (new vs old prompt)
  3. Regression → BLOCK + notify human
  4. Improvement → recommend approval

ON QUALITY DROP:
  1. Analyze failure cases
  2. Root cause (prompt drift, data, model)
  3. Recommend remediation → human approval
```

**HITL:** ALL prompt changes, agent deactivation, eval suite mods, budget changes

---

## QUICK REFERENCE: COMPLETE MCP SERVER INVENTORY

```
CORE (most agents):
  mcp-filesystem  mcp-git       mcp-terminal    mcp-editor
  mcp-codebase    mcp-codesearch mcp-search
  mcp-websearch   mcp-webfetch
  mcp-database    mcp-notify    mcp-templates

ENGINEERING:
  mcp-jsonschema  mcp-openapi   mcp-diagrams    mcp-linter
  mcp-coverage    mcp-issues

SECURITY:
  mcp-semgrep     mcp-snyk      mcp-gitleaks    mcp-zap

TESTING:
  mcp-playwright  mcp-k6        mcp-lighthouse  mcp-apm

INFRASTRUCTURE:
  mcp-cloud       mcp-cloud-billing  mcp-vault   mcp-backup
  mcp-k8s         mcp-storage

OBSERVABILITY:
  mcp-prometheus  mcp-grafana   mcp-loki        mcp-otel

ML/DATA:
  mcp-mlflow      mcp-dvc       mcp-python      mcp-compute
  mcp-evidently   mcp-labelstudio  mcp-airflow  mcp-traffic

BUSINESS:
  mcp-analytics   mcp-featureflags  mcp-crm     mcp-email
  mcp-calendar    mcp-stripe    mcp-helpdesk    mcp-kb
  mcp-seo         mcp-cms       mcp-docs

GOVERNANCE:
  mcp-token-tracker  mcp-eval   mcp-prompts     mcp-license-scan

PLATFORM:
  mcp-taskqueue   mcp-a2a-registry  mcp-eventbus mcp-images

TOTAL: ~55 MCP servers
```

## AUTONOMY MATRIX

| Level | Description | Agents |
|-------|-------------|--------|
| **VERY LOW** | Everything → human | 30 (Legal) |
| **LOW** | Most outputs → human | 07, 23, 24, 25, 28, 32 |
| **MEDIUM** | Drafts auto, key decisions → human | 01, 04, 06, 08, 18, 19, 26, 29 |
| **HIGH** | Mostly autonomous, exceptions escalated | 00, 02, 03, 05, 09, 10, 11, 12, 13, 14, 15, 16, 17, 20, 21, 22, 27, 31 |

## MODEL TIER ROUTING

| Tier | When Used | Cost Profile |
|------|-----------|-------------|
| **Opus** | Architecture, complex reasoning, strategy, RFPs, contract analysis | Highest — use sparingly |
| **Sonnet** | Standard work: drafting, analysis, reviews, coding | Medium — workhorse |
| **Haiku** | Classification, monitoring, validation, triage, fixture gen | Lowest — high volume |
| **Dynamic** | Per-subtask switching within single job | Optimized cost-quality |

---

> **Next Step:** Implement Deep Agent Chassis as reusable framework → instantiate Agent 00 (Orchestrator) + Agent 08 (Coder) as first two production agents
