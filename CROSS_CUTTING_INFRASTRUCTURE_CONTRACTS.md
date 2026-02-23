# Deep Agent Platform — Cross-Cutting Infrastructure Contracts

## The Six Missing Load-Bearing Beams

> **Status:** Production specification — closes the gap between agent specs and deployable system
> **References:** DEEP_AGENT_PLATFORM_ARCHITECTURE_v3.md, AGENT_IMPLEMENTATION_SPECS.md
> **Origin:** Enterprise research team review feedback
>
> This document contains six cross-cutting specifications that make the 33-agent platform production-ready:
>
> 1. **Execution Guard Policies** — Per-agent risk matrices, checklists, confidence thresholds, escalation targets
> 2. **Data Classification** — 5-tier taxonomy with enforcement rules and agent clearance matrix
> 3. **Tool Permissions** — Full agent × tool × environment × access level matrix
> 4. **Write Authority** — Artifact ownership, write modes, conflict resolution
> 5. **Event Catalog** — Canonical event schemas with producers, consumers, payloads
> 6. **Quality Rubrics** — Standardized 3-bucket metrics with pass thresholds per agent

---
---

# Deep Agent Platform — Execution Guard Policies

## Per-Agent Risk Matrices, Checklists, Confidence Thresholds & Escalation Targets

> **Status:** Production specification — cross-cutting policy document
> **References:** DEEP_AGENT_PLATFORM_ARCHITECTURE_v3.md (Section 8: Execution Guard), AGENT_IMPLEMENTATION_SPECS.md
> **Enforcement:** Runtime code checks via policy engine (OPA/Cedar), NOT prompt instructions
> **Applies to:** All 33 agents

---

## 1. Universal Risk Scoring Framework

Every action proposed by any agent is scored across 5 dimensions before execution.

### 1.1 Risk Dimensions

| Dimension | Weight | LOW (1) | MEDIUM (2) | HIGH (3) | CRITICAL (4) |
|-----------|--------|---------|------------|----------|---------------|
| **Reversibility** | 25% | Fully reversible (read, draft) | Partially reversible (file edit with git) | Difficult to reverse (DB migration, email sent) | Irreversible (data deletion, contract signed, prod deploy) |
| **Blast Radius** | 25% | Single file/record/draft | Single service/module | Multiple services/customers | Production-wide / all customers |
| **Data Sensitivity** | 20% | Public data | Internal data | Confidential / business-sensitive | PII / Regulated / Financial |
| **Cost Impact** | 15% | < $1 (Haiku call, read op) | $1–$50 (Sonnet task, small compute) | $50–$500 (Opus task, training run, infrastructure) | > $500 (large training, infra scaling, contract) |
| **Novelty** | 15% | Routine (done 100+ times) | Familiar (done 5–100 times) | Uncommon (done 1–5 times) | First-time for this agent |

### 1.2 Composite Risk Score Calculation

```
risk_score = (reversibility × 0.25) + (blast_radius × 0.25) +
             (data_sensitivity × 0.20) + (cost_impact × 0.15) +
             (novelty × 0.15)

Score ranges:
  1.0–1.5  → LOW      → auto-execute
  1.6–2.2  → MEDIUM   → execute with enhanced logging
  2.3–3.0  → HIGH     → require HITL approval or supervisor agent
  3.1–4.0  → CRITICAL → block, escalate to human + governance alert
```

### 1.3 Risk Score → Action Matrix

| Risk Level | Action | Logging | Notification |
|------------|--------|---------|-------------|
| **LOW** | Auto-execute | Standard | None |
| **MEDIUM** | Auto-execute with enhanced logging | Detailed (full reasoning + action payload) | Batch summary to human (daily) |
| **HIGH** | DEFER to human or supervisor agent | Full audit trail | Real-time notification |
| **CRITICAL** | BLOCK. Do not execute. | Full audit + freeze agent context | Immediate alert to human + Agent Governance |

---

## 2. Universal Pre-Action Checklists

Before any action executes, the Execution Guard runs the relevant checklist. These are parameterized by action type and enforced programmatically.

### 2.1 Checklist Registry

| Checklist ID | Action Type | Checks |
|-------------|-------------|--------|
| `CHK-FILE-READ` | Read file | File exists? Agent has read permission? Data tier ≤ agent clearance? |
| `CHK-FILE-WRITE` | Write/edit file | File read first? (Coder invariant) Diff size within threshold? No unrelated changes? Write permission? Artifact ownership check (WRITE_AUTHORITY)? |
| `CHK-FILE-DELETE` | Delete file | Backup exists? Human approval obtained? Dependents checked? |
| `CHK-DB-READ` | Database query | Query bounded (no SELECT * on large tables)? Data tier ≤ clearance? Result size limit set? |
| `CHK-DB-WRITE` | Database mutation | Schema validated? Backward compatible or flagged breaking? Migration tested in staging? Rollback plan exists? |
| `CHK-API-CALL` | External API call | Endpoint in allowed list? Rate limit OK? Payload within size limits? Auth token valid? |
| `CHK-DEPLOY-STAGING` | Deploy to staging | Tests passed? Security scan clear? Feature flag configured? |
| `CHK-DEPLOY-PROD` | Deploy to production | Staging verified? Rollback tested? Human approval obtained? SRE notified? |
| `CHK-EMAIL-SEND` | Send email/communication | Human approval obtained? Template in whitelist OR individually approved? Recipient verified? Compliance logging active? |
| `CHK-MODEL-DEPLOY` | Deploy ML model | Eval suite passed? Model card complete? Shadow period completed? Canary configured? |
| `CHK-DATA-ACCESS` | Access customer/PII data | Purpose documented? Data tier clearance verified? Access logged? Minimum necessary scope? |
| `CHK-COST-ACTION` | Action with cost > $50 | Budget available? Cost Optimizer notified? Human approval if > $500? |
| `CHK-SCHEMA-CHANGE` | Modify API/data schema | Backward compatible? Downstream consumers notified? BA approved? Version bumped? |
| `CHK-GIT-COMMIT` | Commit code | Tests pass? Lint clean? No secrets? Diff reviewed? Convention compliant? |
| `CHK-PUBLISH` | Publish content externally | Human approved? Brand voice checked? Legal reviewed (if claims)? SEO metadata present? |
| `CHK-CONTRACT` | Legal/contract action | Attorney reviewed? Disclaimer included? Jurisdiction flagged? Never auto-execute |

---

## 3. Confidence Threshold Framework

Every agent must report confidence before action. The Execution Guard maps confidence to behavior.

### 3.1 Universal Confidence Thresholds

| Agent Confidence | Guard Behavior | Example |
|-----------------|----------------|---------|
| **≥ 0.85** | Proceed (if risk ≤ MEDIUM) | Coder confident about implementation approach |
| **0.70–0.84** | Proceed with reflection step (agent self-reviews before executing) | PM writing spec for unfamiliar domain |
| **0.50–0.69** | Seek peer review (route to related agent for second opinion) | Architect unsure about technology trade-off |
| **0.30–0.49** | Defer to human with draft + reasoning | ML Engineer uncertain about model architecture |
| **< 0.30** | BLOCK. Ask human for guidance before proceeding | Any agent in genuinely novel territory |

### 3.2 Confidence × Risk Interaction

```
                    Risk LOW    Risk MEDIUM   Risk HIGH    Risk CRITICAL
Confidence ≥ 0.85   AUTO        AUTO+LOG      DEFER        BLOCK
Confidence 0.70–84  AUTO        REFLECT       DEFER        BLOCK
Confidence 0.50–69  AUTO        PEER-REVIEW   DEFER        BLOCK
Confidence 0.30–49  REFLECT     DEFER         BLOCK        BLOCK
Confidence < 0.30   DEFER       BLOCK         BLOCK        BLOCK
```

---

## 4. Per-Agent Execution Guard Policies

### Layer 0

#### Agent 00: Orchestrator

| Action Type | Risk Level | Checklist | Escalation Target |
|------------|-----------|-----------|-------------------|
| Route single task to agent | LOW | CHK-FILE-WRITE (assignment log) | — |
| Decompose into multi-agent workflow | MEDIUM | CHK-FILE-WRITE | Human (if >5 parallel agents) |
| Change task priority | MEDIUM | CHK-FILE-WRITE | Human (if changing established priority) |
| Reassign task from one agent to another | MEDIUM | CHK-FILE-WRITE | Human (if mid-execution) |
| Modify agent roster | HIGH | — | Human (always) |
| Budget reallocation | CRITICAL | CHK-COST-ACTION | Human (always) |

**Fan-out limit:** Never spawn >5 parallel agent tasks without human confirmation.
**Rework trigger:** If task rerouted >2 times → escalate to human with failure analysis.

---

### Layer 1: Discovery & Product

#### Agent 01: Customer Discovery

| Action Type | Risk Level | Checklist | Escalation Target |
|------------|-----------|-----------|-------------------|
| Analyze interview transcript | LOW | CHK-DATA-ACCESS (if PII present) | — |
| Update evidence files | LOW | CHK-FILE-WRITE | — |
| Update CUSTOMER.md (minor) | MEDIUM | CHK-FILE-WRITE + WRITE_AUTHORITY | PM Agent |
| Update ICP definition | HIGH | CHK-FILE-WRITE + WRITE_AUTHORITY | Human + PM |
| Draft interview script | MEDIUM | CHK-FILE-WRITE | Human (before use) |
| Send survey/communication | CRITICAL | CHK-EMAIL-SEND | Human (always) |

**Redaction policy:** All raw interview data must be processed through PII redaction before storage in episodic memory. Source transcripts stored in Tier 4 (PII) storage with access logging.

#### Agent 02: Market Research

| Action Type | Risk Level | Checklist | Escalation Target |
|------------|-----------|-----------|-------------------|
| Web search + fetch | LOW | CHK-API-CALL | — |
| Write research report | LOW | CHK-FILE-WRITE | — |
| Update TAM/SAM estimates | MEDIUM | CHK-FILE-WRITE | Human (if used for strategy) |
| Regulatory assessment | HIGH | CHK-FILE-WRITE | Human + Legal (always) |

**Recency enforcement:** Any pricing data >90 days or market size data >12 months must be flagged with `[STALE: last_verified=YYYY-MM-DD]` tag.

#### Agent 03: Competitor Intelligence

| Action Type | Risk Level | Checklist | Escalation Target |
|------------|-----------|-----------|-------------------|
| Web search + fetch competitor pages | LOW | CHK-API-CALL | — |
| Update feature matrix | LOW | CHK-FILE-WRITE | — |
| Publish competitive alert | MEDIUM | CHK-FILE-WRITE | — |
| Strategic assessment ("competitor pivoting") | HIGH | CHK-FILE-WRITE | Human |
| Competitive positioning for sales materials | HIGH | CHK-PUBLISH | Human |

#### Agent 04: Product Manager

| Action Type | Risk Level | Checklist | Escalation Target |
|------------|-----------|-----------|-------------------|
| Draft BRD section | LOW | CHK-FILE-WRITE | — |
| Write user stories | LOW | CHK-FILE-WRITE | — |
| RICE score feature | MEDIUM | CHK-FILE-WRITE | — |
| Reorder backlog priority | HIGH | CHK-FILE-WRITE | Human |
| Change roadmap | CRITICAL | CHK-FILE-WRITE | Human (always) |
| Decide NOT to build | HIGH | CHK-FILE-WRITE | Human |

**Definition of Done gate:** Spec cannot be marked "ready for development" unless ALL of: problem statement linked to evidence, ≥1 user story with Gherkin, NFRs listed, success metrics defined, RICE scored.

#### Agent 05: Business Analyst

| Action Type | Risk Level | Checklist | Escalation Target |
|------------|-----------|-----------|-------------------|
| Define new schema | MEDIUM | CHK-SCHEMA-CHANGE | — |
| Update existing schema (backward compatible) | MEDIUM | CHK-SCHEMA-CHANGE | — |
| Update existing schema (breaking) | CRITICAL | CHK-SCHEMA-CHANGE | Human + downstream agents |
| Update event taxonomy | HIGH | CHK-SCHEMA-CHANGE | Product Analytics + Coder |
| Update domain glossary | LOW | CHK-FILE-WRITE | — |

**Breaking change protocol:** Any breaking schema change must: (1) bump version, (2) notify all consumers via event bus, (3) provide migration path, (4) get human approval, (5) coordinate rollout window with DevOps.

---

### Layer 2: Design & Engineering

#### Agent 06: UX Designer

| Action Type | Risk Level | Checklist | Escalation Target |
|------------|-----------|-----------|-------------------|
| Create wireframe/prototype | LOW | CHK-FILE-WRITE | — |
| Run heuristic self-evaluation | LOW | — | — |
| Update design system tokens | HIGH | CHK-FILE-WRITE + WRITE_AUTHORITY | Human |
| Share prototype for user testing | HIGH | CHK-PUBLISH | Human |
| Define UX acceptance criteria | MEDIUM | CHK-FILE-WRITE | — |

**Artifact format:** All prototypes must be HTML/React (not Figma — agents can't access Figma API). Component specs must use the standard component-spec JSON schema.

#### Agent 07: Architect

| Action Type | Risk Level | Checklist | Escalation Target |
|------------|-----------|-----------|-------------------|
| Research technologies | LOW | CHK-API-CALL | — |
| Draft ADR | MEDIUM | CHK-FILE-WRITE | — |
| Recommend architecture decision | CRITICAL | — | Human (always) |
| Update ARCHITECTURE.md | CRITICAL | CHK-FILE-WRITE + WRITE_AUTHORITY | Human (always) |
| Update threat model | HIGH | CHK-FILE-WRITE | Human + Security |

**Decision boundary (resolves bottleneck concern):**

| Decision Tier | Examples | Approval |
|--------------|---------|----------|
| **Tier A (always human)** | New datastore, new runtime, new auth model, new external service, new cloud region | Human approval required |
| **Tier B (agent recommends, human confirms)** | Library choice, caching strategy, API design pattern, internal module structure | Agent drafts ADR, human confirms within 48hrs. If no response, ping human. |
| **Tier C (agent autonomous)** | Code organization within established patterns, naming conventions, doc structure | Agent decides, logs in DECISIONS.md |

#### Agent 08: Coder

| Action Type | Risk Level | Checklist | Escalation Target |
|------------|-----------|-----------|-------------------|
| Read source file | LOW | CHK-FILE-READ | — |
| Search codebase | LOW | — | — |
| Edit single file (< 50 LOC diff) | LOW | CHK-FILE-WRITE + CHK-GIT-COMMIT | — |
| Edit multiple files (≤ 5 files AND ≤ 300 LOC) | MEDIUM | CHK-FILE-WRITE + CHK-GIT-COMMIT | — |
| Edit > 5 files OR > 300 LOC OR touches auth/payments | HIGH | CHK-FILE-WRITE + CHK-GIT-COMMIT | Human (plan approval) |
| Database migration | HIGH | CHK-DB-WRITE | Human |
| Edit auth/payment code | HIGH | CHK-FILE-WRITE | Human |
| Run tests | LOW | — | — |
| Direct production write | CRITICAL | — | BLOCKED (never allowed) |

**Refined multi-file threshold:** Trigger HIGH risk when ANY of: >5 files, >300 LOC diff, touches auth/*, touches payment/*, touches migration/*, modifies public API contract.

**Rollback strategy:** Every DB migration must have a corresponding down-migration tested before the up-migration is applied. Code changes are always reversible via git revert. Production-affecting changes require rollback plan documented in PR description.

#### Agent 09: Code Reviewer

| Action Type | Risk Level | Checklist | Escalation Target |
|------------|-----------|-----------|-------------------|
| Read PR diff + full files | LOW | CHK-FILE-READ | — |
| Post review comments | LOW | CHK-FILE-WRITE | — |
| Approve PR | MEDIUM | — | — |
| Approve PR touching auth/payments | HIGH | — | Human + Trust & Security |
| Request PR split (> 500 LOC) | LOW | — | — |

**Severity rubric (standardized platform-wide):**

| Severity | Definition | Action Required |
|----------|-----------|-----------------|
| **CRITICAL** | Security vulnerability, data loss risk, spec violation, production breakage | Must fix before merge. Blocks PR. |
| **MAJOR** | Logic error, missing error handling, performance concern, convention violation | Must fix before merge unless explicitly accepted. |
| **MINOR** | Code style, naming, minor optimization, documentation gap | Should fix, but won't block merge. |
| **NIT** | Preference, suggestion, alternative approach | Optional. Author decides. |

#### Agent 10: Test Engineer

| Action Type | Risk Level | Checklist | Escalation Target |
|------------|-----------|-----------|-------------------|
| Write test files | LOW | CHK-FILE-WRITE | — |
| Run test suite | LOW | — | — |
| Generate fixtures from schemas | LOW | CHK-FILE-WRITE | — |
| Modify CI test configuration | MEDIUM | CHK-FILE-WRITE | DevOps |
| Skip/disable failing test | HIGH | CHK-FILE-WRITE | Human (must file issue) |

**Contract test requirement:** Every API endpoint defined in OpenAPI spec must have a corresponding contract test that validates request/response against the JSON schema. Contract tests auto-generated from BA schemas, manually maintained only for edge cases.

---

### Layer 3: Quality & Trust

#### Agent 11: Trust & Security

| Action Type | Risk Level | Checklist | Escalation Target |
|------------|-----------|-----------|-------------------|
| Run automated scan (SAST/DAST/deps) | LOW | — | — |
| Report findings | LOW | CHK-FILE-WRITE | — |
| Flag critical vulnerability | HIGH | — | Human + Coder (immediate) |
| Approve release (security clear) | MEDIUM | — | — |
| Reject release (security block) | HIGH | — | Human (for override decision) |
| Accept risk on known vulnerability | CRITICAL | — | Human (always, logged permanently) |

**OWASP Agentic Top 10 mapping:**

| OWASP Agentic Risk | Control | Agent Responsibility |
|--------------------|---------|---------------------|
| A01: Excessive Agency | Scoped tool permissions + execution guard | All agents (enforced by platform) |
| A02: Hallucinated/Unintended Actions | Invariants engine + pre-action checklists | All agents |
| A03: Insecure Tool Implementation | MCP server security review | Trust & Security |
| A04: Prompt Injection | Input sanitization layer | Platform (pre-LLM) |
| A05: Improper Output Handling | Output validation before tool execution | Execution Guard |
| A06: Excessive Permissions | TOOL_PERMISSIONS.yml + least privilege | Agent Governance |
| A07: Insufficient Monitoring | Self-Monitor + Governance audits | SRE + Governance |
| A08: Memory Poisoning | Memory write validation + periodic audit | Memory Manager + Governance |
| A09: Insecure Delegation | A2A auth + delegation chains | Orchestrator + Platform |
| A10: Inadequate Error Handling | Error handling patterns + graceful degradation | All agents (via skills) |

**Security exception process:** (1) Agent 11 documents exception with business justification, (2) exception request goes to human security owner, (3) if approved: logged in `security/exceptions-log.jsonl` with expiry date, (4) Agent Governance reviews all active exceptions monthly, (5) expired exceptions auto-revoke.

#### Agent 12: QA & Performance

| Action Type | Risk Level | Checklist | Escalation Target |
|------------|-----------|-----------|-------------------|
| Run E2E test suite | LOW | — | — |
| Run performance tests | LOW | — | — |
| File bug report | LOW | CHK-FILE-WRITE | — |
| Recommend release go | MEDIUM | — | Human (for final confirmation) |
| Recommend release no-go | HIGH | — | Human + Orchestrator + DevOps |
| Approve release with known issues | CRITICAL | — | Human (always) |

**Release gate event:** QA publishes `release.status` event with payload:
```json
{
  "version": "1.2.3",
  "environment": "staging",
  "status": "go|no-go|conditional",
  "e2e_pass_rate": 0.98,
  "perf_p95_ms": 245,
  "perf_baseline_p95_ms": 230,
  "open_bugs": {"critical": 0, "major": 1, "minor": 3},
  "conditions": ["major-123 must be fixed before prod"],
  "signoff_required": true
}
```
Consumed by: Orchestrator, DevOps, SRE, Human.

---

### Layer 4: Operations

#### Agent 13: DevOps

| Action Type | Risk Level | Checklist | Escalation Target |
|------------|-----------|-----------|-------------------|
| Write CI/CD config | MEDIUM | CHK-FILE-WRITE | — |
| Deploy to dev | LOW | CHK-DEPLOY-STAGING | — |
| Deploy to staging | MEDIUM | CHK-DEPLOY-STAGING | — |
| Deploy to production | CRITICAL | CHK-DEPLOY-PROD | Human (always) |
| Modify Terraform (non-prod) | MEDIUM | CHK-FILE-WRITE | — |
| Modify Terraform (prod) | CRITICAL | CHK-FILE-WRITE | Human (always) |
| Change security groups/network | CRITICAL | CHK-FILE-WRITE | Human + Security |
| Manage secrets in Vault | HIGH | — | Human |

#### Agent 14: SRE & Resilience

| Action Type | Risk Level | Checklist | Escalation Target |
|------------|-----------|-----------|-------------------|
| Query metrics/logs | LOW | — | — |
| Update dashboard | LOW | CHK-FILE-WRITE | — |
| Configure alert | MEDIUM | CHK-FILE-WRITE | — |
| Run backup verification | MEDIUM | — | — |
| Run DR drill | HIGH | — | Human (pre-approval) |
| Modify SLO targets | CRITICAL | — | Human (always) |
| Silence alert | HIGH | — | Must file root cause issue |

#### Agent 15: Incident Responder

| Action Type | Risk Level | Checklist | Escalation Target |
|------------|-----------|-----------|-------------------|
| Query logs/metrics/traces | LOW | — | — |
| Execute documented runbook | MEDIUM | — | — |
| Restart service (non-prod) | MEDIUM | — | — |
| Restart service (prod) | HIGH | — | Human (notify immediately) |
| Rollback deployment (prod) | CRITICAL | CHK-DEPLOY-PROD | Human (approval required) |
| Data fix (prod) | CRITICAL | CHK-DB-WRITE + CHK-DATA-ACCESS | Human (always) |

**Incident roles clarity:**
- **Incident Responder:** Diagnosis + remediation execution
- **SRE:** Owns communications + severity classification + post-incident coordination
- **Orchestrator:** Routes follow-up tasks to Coder/DevOps as needed

#### Agent 16: Cost Optimizer

| Action Type | Risk Level | Checklist | Escalation Target |
|------------|-----------|-----------|-------------------|
| Query billing data | LOW | — | — |
| Generate cost report | LOW | CHK-FILE-WRITE | — |
| Recommend optimization | MEDIUM | CHK-FILE-WRITE | Human + DevOps |
| Recommend downscaling | HIGH | CHK-COST-ACTION | Human + SRE (SLO impact check) |
| Modify token budgets | HIGH | — | Human + Governance |

---

### Layer 5: Data & ML

#### Agent 17: Data Engineer

| Action Type | Risk Level | Checklist | Escalation Target |
|------------|-----------|-----------|-------------------|
| Write pipeline code | MEDIUM | CHK-FILE-WRITE | — |
| Deploy pipeline (non-prod) | MEDIUM | CHK-DEPLOY-STAGING | — |
| Deploy pipeline (prod) | HIGH | CHK-DEPLOY-PROD | Human |
| Schema migration | HIGH | CHK-DB-WRITE + CHK-SCHEMA-CHANGE | Human + BA |
| Delete data (any env) | CRITICAL | CHK-FILE-DELETE + CHK-DATA-ACCESS | Human (always) |
| New data source connection | HIGH | — | Human + Security |

#### Agent 18: ML Engineer

| Action Type | Risk Level | Checklist | Escalation Target |
|------------|-----------|-----------|-------------------|
| Run training experiment | MEDIUM | CHK-COST-ACTION (if GPU) | — |
| Evaluate model | LOW | — | — |
| Register model in MLflow | MEDIUM | CHK-FILE-WRITE | — |
| Request model promotion | HIGH | CHK-MODEL-DEPLOY | Human |
| Change model architecture | HIGH | — | Human + Architect |
| Large training run (> $100) | HIGH | CHK-COST-ACTION | Human + Cost Optimizer |

#### Agent 19: MLOps Pipeline

| Action Type | Risk Level | Checklist | Escalation Target |
|------------|-----------|-----------|-------------------|
| Deploy to shadow | MEDIUM | CHK-MODEL-DEPLOY | — |
| Deploy canary (< 5% traffic) | HIGH | CHK-MODEL-DEPLOY | — |
| Ramp canary traffic | HIGH | CHK-MODEL-DEPLOY | — |
| Promote to production (100%) | CRITICAL | CHK-MODEL-DEPLOY | Human (always) |
| Emergency rollback | HIGH | CHK-MODEL-DEPLOY | Human (notify, can auto-execute) |

#### Agent 20: Labeling & Ground Truth

| Action Type | Risk Level | Checklist | Escalation Target |
|------------|-----------|-----------|-------------------|
| Manage annotation queue | LOW | — | — |
| Compute quality metrics | LOW | — | — |
| Version dataset (DVC) | MEDIUM | CHK-FILE-WRITE | — |
| Update labeling guidelines | HIGH | CHK-FILE-WRITE | Human |
| Create gold evaluation set | HIGH | — | Human (domain expert) |
| Re-label large dataset (cost) | HIGH | CHK-COST-ACTION | Human |

#### Agent 21: Model Monitor

| Action Type | Risk Level | Checklist | Escalation Target |
|------------|-----------|-----------|-------------------|
| Collect metrics | LOW | — | — |
| Run drift detection | LOW | — | — |
| Alert on drift | MEDIUM | — | ML Engineer + MLOps |
| Recommend retraining | HIGH | — | Human + ML Engineer |
| Modify monitoring thresholds | HIGH | — | Human |

#### Agent 22: Data Quality

| Action Type | Risk Level | Checklist | Escalation Target |
|------------|-----------|-----------|-------------------|
| Validate data batch | LOW | — | — |
| Quarantine bad records | MEDIUM | CHK-DATA-ACCESS | — |
| Release quarantined data | HIGH | CHK-DATA-ACCESS | Human |
| Modify validation rules | HIGH | CHK-SCHEMA-CHANGE | BA + Human |
| Alert on quality degradation | MEDIUM | — | Data Engineer |

---

### Layer 6: Revenue & Growth

#### Agent 23: Sales & Pre-Sales

| Action Type | Risk Level | Checklist | Escalation Target |
|------------|-----------|-----------|-------------------|
| Research prospect | LOW | CHK-API-CALL | — |
| Draft outbound email | MEDIUM | CHK-EMAIL-SEND | Human (always) |
| Draft proposal | HIGH | CHK-PUBLISH | Human (always) |
| Draft RFP response | HIGH | CHK-PUBLISH | Human (always) |
| Quote pricing | CRITICAL | — | Human (always) |
| Promise feature to customer | CRITICAL | — | BLOCKED (never allowed) |
| Update CRM pipeline data | LOW | CHK-FILE-WRITE | — |

#### Agent 24: Content & SEO

| Action Type | Risk Level | Checklist | Escalation Target |
|------------|-----------|-----------|-------------------|
| Research keywords/topics | LOW | CHK-API-CALL | — |
| Draft content | MEDIUM | CHK-FILE-WRITE | — |
| Publish content | CRITICAL | CHK-PUBLISH | Human (always) |
| Update design system docs | HIGH | CHK-FILE-WRITE | Human |
| Claim about product capabilities | HIGH | CHK-PUBLISH | PM verification required |

#### Agent 25: Customer Success

| Action Type | Risk Level | Checklist | Escalation Target |
|------------|-----------|-----------|-------------------|
| Monitor health scores | LOW | — | — |
| Generate health dashboard | LOW | CHK-FILE-WRITE | — |
| Draft customer communication | HIGH | CHK-EMAIL-SEND | Human (always) |
| Offer discount/concession | CRITICAL | — | Human (always) |
| Escalate to executive | CRITICAL | — | Human (decides) |
| Access customer usage data | MEDIUM | CHK-DATA-ACCESS | — |

#### Agent 26: Support Desk

| Action Type | Risk Level | Checklist | Escalation Target |
|------------|-----------|-----------|-------------------|
| Classify + prioritize ticket | LOW | — | — |
| Search knowledge base | LOW | — | — |
| Draft response (matches whitelisted template) | LOW | CHK-EMAIL-SEND (template match) | — (auto-send allowed) |
| Draft response (custom) | HIGH | CHK-EMAIL-SEND | Human |
| Escalate bug to engineering | MEDIUM | — | Coder |
| Promise fix timeline | CRITICAL | — | BLOCKED |

**Template whitelist:** Support can auto-send responses that exactly match a pre-approved template with only parameter substitution (customer name, ticket ID, known issue status). Custom responses always require human approval. Template whitelist stored in `support/approved-templates.json`, managed by Human + Agent Governance.

#### Agent 27: Feedback Analyzer

| Action Type | Risk Level | Checklist | Escalation Target |
|------------|-----------|-----------|-------------------|
| Classify feedback | LOW | — | — |
| Generate synthesis report | LOW | CHK-FILE-WRITE | — |
| Update rankings | MEDIUM | CHK-FILE-WRITE | — |
| Identify testimonial candidate | MEDIUM | — | Customer Success (verification) |

#### Agent 28: Billing & Revenue

| Action Type | Risk Level | Checklist | Escalation Target |
|------------|-----------|-----------|-------------------|
| Generate revenue report | LOW | CHK-FILE-WRITE | — |
| Monitor payment events | LOW | — | — |
| Execute dunning (pre-approved template) | MEDIUM | CHK-EMAIL-SEND | Human (first occurrence per customer) |
| Modify pricing | CRITICAL | — | Human (always) |
| Authorize discount | CRITICAL | — | Human (always) |
| Process refund | CRITICAL | CHK-COST-ACTION | Human (always) |

---

### Layer 7: Analytics

#### Agent 29: Product Analytics

| Action Type | Risk Level | Checklist | Escalation Target |
|------------|-----------|-----------|-------------------|
| Query analytics data | LOW | CHK-DATA-ACCESS | — |
| Generate dashboard/report | LOW | CHK-FILE-WRITE | — |
| Define event taxonomy | HIGH | CHK-SCHEMA-CHANGE | BA + Coder |
| Launch A/B experiment | HIGH | — | Human (if pricing/core UX) |
| Modify north star metric | CRITICAL | — | Human (always) |

---

### Layer 8: Legal, Docs & Governance

#### Agent 30: Legal & Privacy

| Action Type | Risk Level | Checklist | Escalation Target |
|------------|-----------|-----------|-------------------|
| Draft any document | HIGH | CHK-CONTRACT | Human + Attorney (always) |
| Review contract | HIGH | CHK-CONTRACT | Human + Attorney (always) |
| Update PII inventory | MEDIUM | CHK-FILE-WRITE | — |
| License compliance scan | LOW | — | — |
| Flag regulatory concern | HIGH | — | Human (always) |
| ANY output | HIGH+ | — | Human (always — no exceptions) |

#### Agent 31: Documentation & Release

| Action Type | Risk Level | Checklist | Escalation Target |
|------------|-----------|-----------|-------------------|
| Update internal docs | LOW | CHK-FILE-WRITE | — |
| Update API docs from spec | LOW | CHK-FILE-WRITE | — |
| Write changelog entry | LOW | CHK-FILE-WRITE | — |
| Publish external docs | HIGH | CHK-PUBLISH | Human |
| Write release notes (external) | HIGH | CHK-PUBLISH | Human |
| Archive/deprecate docs | MEDIUM | CHK-FILE-WRITE | Human |

**Doc taxonomy:**
```
/docs/
├── dev/        ← internal developer docs (Agent 31 owns)
├── user/       ← external user guides (Agent 31 writes, Human approves)
├── api/        ← auto-generated from OpenAPI (Agent 31 owns)
├── runbooks/   ← operational runbooks (SRE owns, Agent 31 formats)
├── faq/        ← from Support FAQ candidates (Agent 31 writes)
└── decisions/  ← ADRs (Architect owns, Agent 31 indexes)
```

**Doc build pipeline:** Docs versioned in git alongside releases. Every release tag triggers doc build + publish. Doc versions match release versions.

#### Agent 32: Agent Governance

| Action Type | Risk Level | Checklist | Escalation Target |
|------------|-----------|-----------|-------------------|
| Sample agent outputs | LOW | — | — |
| Run eval suite | LOW | — | — |
| Generate scorecards | LOW | CHK-FILE-WRITE | — |
| Recommend prompt change | HIGH | — | Human (always) |
| Deploy prompt change | CRITICAL | — | Human (always, post-regression-test) |
| Deactivate agent | CRITICAL | — | Human (always) |
| Modify eval suite | HIGH | CHK-FILE-WRITE | Human |
| Flag quality degradation | MEDIUM | — | Human + Orchestrator |

**Governance → Routing feedback loop:** Agent Governance publishes `agent.quality.score` event weekly:
```json
{
  "agent_id": "agent-08",
  "period": "2026-W08",
  "reliability": 0.94,
  "quality": 0.87,
  "efficiency": 0.91,
  "composite": 0.90,
  "threshold": 0.80,
  "status": "healthy|degraded|critical",
  "action": "none|hitl-required|supervisor-required|deactivated"
}
```
Orchestrator consumes this: if `status=degraded`, routes tasks to that agent with mandatory HITL review. If `status=critical`, stops routing to that agent until human intervenes.

---

## 5. Governance Invariant: Production Readiness Gate

No agent can be marked "production-ready" unless ALL of the following are verified:

- [ ] All spec template sections populated (Identity, Triggers, I/O, Memory, Skills, Invariants, Tools, Files, Execution Pattern, Metrics, HITL)
- [ ] Execution Guard Policy defined with action-risk matrix
- [ ] Tool permissions configured in TOOL_PERMISSIONS.yml
- [ ] Invariants implemented as runtime checks (not just documented)
- [ ] Eval suite created and baseline scores established
- [ ] Skills files written and tested
- [ ] HITL gates configured in platform
- [ ] Memory layers initialized with any required seed data
- [ ] Security review completed (Trust & Security Agent)
- [ ] Cost estimate approved (Cost Optimizer + Human)

---

> **Document version:** v1
> **Last updated:** February 2026
> **Next documents:** DATA_CLASSIFICATION.md, TOOL_PERMISSIONS.yml, WRITE_AUTHORITY.md, EVENT_CATALOG.yaml, QUALITY_RUBRICS.md
# Deep Agent Platform — Data Classification & Access Control

## DATA_CLASSIFICATION.md

> **Enforcement:** OPA/Cedar policy engine — checked before every tool execution
> **Applies to:** All 33 agents, all MCP servers, all storage layers

---

## 1. Data Tier Taxonomy

| Tier | Label | Description | Examples | Storage | Access Logging |
|------|-------|-------------|----------|---------|---------------|
| **T1** | **Public** | Publicly available or intended for publication | Published docs, marketing content, public API docs, open source code, competitor public pages | Standard | Minimal |
| **T2** | **Internal** | Internal business data not meant for external sharing | Architecture docs, internal dashboards, agent scorecards, cost reports, backlog, sprint data, internal wikis | Standard | Standard |
| **T3** | **Confidential** | Business-sensitive data that could harm the company if leaked | Revenue data, pricing models, roadmap, competitive strategy, trade secrets, unpublished features, sales pipeline, contracts | Encrypted at rest + transit | Full audit trail |
| **T4** | **PII / Personal** | Personally identifiable information about customers or users | Customer names, emails, addresses, usage data linked to identity, interview transcripts with names, support tickets with personal details | Encrypted + access-controlled + retention policy | Full audit + purpose logging |
| **T5** | **Regulated** | Data subject to specific legal/regulatory requirements | Payment card data (PCI), health data (HIPAA), EU personal data (GDPR special categories), financial records (SOX) | Encrypted + isolated + compliance controls | Full audit + compliance reporting |

---

## 2. Agent Clearance Matrix

Each agent has a maximum data tier clearance. Agents CANNOT access data above their clearance, enforced by the policy engine.

| Agent | ID | Max Tier | Justification |
|-------|----|----------|--------------|
| Orchestrator | 00 | T2 | Routes tasks, doesn't process data content |
| Customer Discovery | 01 | T4 | Processes interview transcripts with PII |
| Market Research | 02 | T1 | Only public sources |
| Competitor Intel | 03 | T1 | Only public sources |
| Product Manager | 04 | T3 | Revenue targets, roadmap, strategy |
| Business Analyst | 05 | T3 | Schema definitions, business rules |
| UX Designer | 06 | T2 | Designs, analytics aggregates (no PII) |
| Architect | 07 | T3 | System design with security context |
| Coder | 08 | T3 | Codebase including auth logic, but no raw PII |
| Code Reviewer | 09 | T3 | Same as Coder |
| Test Engineer | 10 | T2 | Test data only (synthetic, never real PII) |
| Trust & Security | 11 | T4 | Must audit PII handling, access patterns |
| QA & Performance | 12 | T2 | Testing with synthetic data |
| DevOps | 13 | T3 | Infrastructure configs, secrets (via Vault) |
| SRE | 14 | T3 | System logs (may contain traces of PII — masked) |
| Incident Responder | 15 | T4 | Diagnosis may require checking PII-adjacent logs |
| Cost Optimizer | 16 | T3 | Billing data, cost breakdowns |
| Data Engineer | 17 | T4 | Builds pipelines that process PII |
| ML Engineer | 18 | T3 | Training data (should be de-identified) |
| MLOps Pipeline | 19 | T2 | Deployment configs, no data content |
| Labeling | 20 | T4 | Raw data may contain PII before de-identification |
| Model Monitor | 21 | T3 | Prediction data (aggregated, not individual PII) |
| Data Quality | 22 | T4 | Validates raw data including PII fields |
| Sales | 23 | T4 | Customer contact info, deal data |
| Content & SEO | 24 | T2 | Marketing content, public data |
| Customer Success | 25 | T4 | Customer accounts, usage, communications |
| Support Desk | 26 | T4 | Customer tickets with personal details |
| Feedback Analyzer | 27 | T3 | Anonymized/aggregated feedback |
| Billing & Revenue | 28 | T5 | Payment data, financial records |
| Product Analytics | 29 | T3 | Behavioral data (anonymized/pseudonymized) |
| Legal & Privacy | 30 | T5 | Must review all data types for compliance |
| Documentation | 31 | T2 | Published docs, internal guides |
| Agent Governance | 32 | T2 | Agent outputs (sampled), metrics |

### 2.1 Clearance Escalation

If an agent needs data above its tier for a specific task:
1. Agent requests temporary elevation via Orchestrator
2. Orchestrator verifies business justification
3. Human approves elevation with: scope, duration (max 24hrs), purpose
4. Elevation logged in `security/elevation-log.jsonl`
5. Auto-revoked after duration expires

---

## 3. Data Handling Rules Per Tier

### T1 (Public)
- No restrictions on agent access
- Can be shared externally
- No special storage requirements

### T2 (Internal)
- Accessible by all agents up to T2+ clearance
- Must not be shared externally without human approval
- Standard backup and retention

### T3 (Confidential)
- Encrypted at rest and in transit
- Access requires T3+ clearance
- Full audit trail on every access
- Cannot be included in agent episodic memory without summarization/redaction
- Shared memory entries referencing T3 data must use pointers, not copies

### T4 (PII)
- Everything in T3 plus:
- Access requires documented purpose (logged with each access)
- Must be de-identified before use in ML training
- Retention policy enforced (auto-delete after retention window)
- Cannot cross geographic boundaries without compliance check
- Agent episodic memory must redact PII (store as `[CUSTOMER_ID:xxx]` not actual names)
- Periodic PII audit by Legal & Privacy agent

### T5 (Regulated)
- Everything in T4 plus:
- Isolated storage (separate datastore/namespace)
- Compliance-specific controls (PCI-DSS for payments, GDPR Article 9 for special categories)
- Only Agent 28 (Billing) and Agent 30 (Legal) have default access
- All other agents require per-request human approval
- Quarterly compliance audit mandatory

---

## 4. Enforcement Architecture

```
AGENT proposes ACTION requiring DATA
        │
        ▼
┌─ POLICY ENGINE (OPA/Cedar) ──────────────────────────┐
│                                                        │
│  1. IDENTIFY data tier of target resource              │
│     (from resource metadata / schema tags)             │
│                                                        │
│  2. CHECK agent clearance (from AGENT_CLEARANCE table) │
│     agent.max_tier >= resource.data_tier ?             │
│     ├── NO  → DENY + log violation                     │
│     └── YES → continue                                 │
│                                                        │
│  3. CHECK environment permissions                      │
│     (from TOOL_PERMISSIONS.yml)                        │
│     agent can access this env for this tool?           │
│                                                        │
│  4. CHECK action type permissions                      │
│     (R/W/Admin from TOOL_PERMISSIONS.yml)              │
│                                                        │
│  5. For T4/T5: CHECK purpose logging                   │
│     access_purpose provided?                           │
│     ├── NO  → DENY                                     │
│     └── YES → log purpose + ALLOW                      │
│                                                        │
│  6. AUDIT LOG: who, what, when, why, data_tier         │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 5. PII Redaction Rules

When agents store information in memory layers, PII must be handled:

| Memory Layer | PII Rule |
|-------------|----------|
| Working | PII allowed during active processing, cleared after task completion |
| Episodic | PII replaced with pseudonymized IDs: `[CUSTOMER:c_abc123]`, `[EMAIL:redacted]` |
| Semantic | PII never stored — only patterns and aggregated insights |
| Procedural | PII never present (workflows, not data) |
| Shared | PII never in shared memory — use pseudonymized references only |
| Resource | PII in source resources protected by tier access controls |

---

## 6. Data Classification Tagging

Every data resource must be tagged with its tier. Tags are stored in resource metadata.

```yaml
# Example resource metadata
resource: "customers_table"
data_tier: "T4"
pii_fields: ["name", "email", "phone", "address"]
non_pii_fields: ["customer_id", "plan_type", "signup_date", "usage_count"]
retention_days: 730
geographic_restrictions: ["EU_ONLY_for_gdpr_subjects"]
owner: "data-engineer"
last_classified: "2026-02-01"
classification_review_due: "2026-08-01"
```

**Classification review cycle:** Every resource must be re-classified every 6 months by Data Quality Agent + Legal Agent.

# Deep Agent Platform — Tool Permissions Matrix

## TOOL_PERMISSIONS.yml

> **Enforcement:** Policy engine checks before every MCP tool invocation
> **Format:** agent → tool → {access_level, environments, data_tier_max, rate_limits}

---

## 1. Access Levels

| Level | Meaning |
|-------|---------|
| **R** | Read only |
| **RW** | Read + Write |
| **RWD** | Read + Write + Delete |
| **ADMIN** | Full control including configuration changes |
| **—** | No access |

---

## 2. Environment Scopes

| Scope | Meaning |
|-------|---------|
| **dev** | Development environment |
| **stg** | Staging environment |
| **prod** | Production environment (most restricted) |
| **all** | All environments |

---

## 3. Core Tool Permissions (used by many agents)

### mcp-filesystem

| Agent | Access | Scope | Path Restrictions | Notes |
|-------|--------|-------|-------------------|-------|
| 00 Orchestrator | RW | all | PROGRESS.md, AGENTS.md, task-backlog.json, assignment-log.jsonl | Cannot write to src/ |
| 01 Customer Discovery | RW | all | evidence/*, CUSTOMER.md | |
| 02 Market Research | RW | all | research/* | |
| 03 Competitor Intel | RW | all | competitors/* | |
| 04 PM | RW | all | specs/*, FEATURES.md, DECISIONS.md(append) | |
| 05 BA | RW | all | specs/schemas/*, specs/api/*, specs/domain-glossary.json, specs/error-catalog.json, specs/event-taxonomy.json | |
| 06 UX Designer | RW | all | design/* | |
| 07 Architect | RW | all | ARCHITECTURE.md, docs/adrs/*, docs/diagrams/*, DECISIONS.md(append) | |
| 08 Coder | RW | all | src/*, tests/*, migrations/* | Read-only for specs/, design/ |
| 09 Code Reviewer | R | all | src/*, tests/*, specs/*, design/* | Read-only everywhere |
| 10 Test Engineer | RW | all | tests/*, test-fixtures/* | Read-only for src/ |
| 11 Security | RW | all | security/* | Read-only for src/, infra/ |
| 12 QA | RW | all | qa-reports/* | Read for everything |
| 13 DevOps | RW | all | infra/*, .github/*, Dockerfile*, docker-compose* | |
| 14 SRE | RW | all | monitoring/*, runbooks/* | |
| 15 Incident | RW | all | incidents/* | Read for runbooks/, monitoring/ |
| 16 Cost Optimizer | RW | all | cost-reports/* | Read-only for infra/ |
| 17 Data Engineer | RW | all | pipelines/*, data-schemas/* | |
| 18 ML Engineer | RW | all | models/*, experiments/*, eval-suites/* | |
| 19 MLOps | RW | all | mlops/*, serving-configs/* | |
| 20 Labeling | RW | all | labeling/*, guidelines/* | |
| 21 Model Monitor | RW | all | monitoring/ml/* | |
| 22 Data Quality | RW | all | data-quality/* | |
| 23 Sales | RW | all | sales/* | Read for CUSTOMER.md, competitors/ |
| 24 Content | RW | all | content/* | Read for FEATURES.md |
| 25 Customer Success | RW | all | cs/* | Read for CUSTOMER.md |
| 26 Support | RW | all | support/* | Read for knowledge-base/ |
| 27 Feedback | RW | all | feedback-analysis/* | |
| 28 Billing | RW | all | billing/* | |
| 29 Analytics | RW | all | analytics/* | |
| 30 Legal | RW | all | legal/* | Read for everything |
| 31 Docs | RW | all | docs/*, CHANGELOG.md | Read for src/, specs/ |
| 32 Governance | RW | all | governance/* | Read for everything |

### mcp-git

| Agent | Access | Environments | Notes |
|-------|--------|-------------|-------|
| 08 Coder | RW | all | Branch, commit, push, PR creation |
| 09 Code Reviewer | R | all | Read diffs, history, blame. Cannot merge. |
| 10 Test Engineer | RW | all | Commit test files |
| 13 DevOps | RW | all | Infra code |
| 15 Incident | R | all | Check recent deploys |
| 31 Docs | RW | all | Doc updates |
| All others | R | all | Read-only git access |

### mcp-terminal

| Agent | Access | Environments | Rate Limit | Notes |
|-------|--------|-------------|------------|-------|
| 08 Coder | RW | dev, stg | 100 cmds/hr | Run tests, lint, build |
| 10 Test Engineer | RW | dev, stg | 100 cmds/hr | Run tests |
| 12 QA | RW | dev, stg | 50 cmds/hr | Run E2E, perf tests |
| 13 DevOps | RW | dev, stg, prod | 50 cmds/hr | Terraform, docker, kubectl. Prod requires HITL. |
| 14 SRE | R | prod | 30 cmds/hr | Diagnostic commands only |
| 15 Incident | RW | all | 50 cmds/hr | Diagnostic + runbook execution |
| 17 Data Engineer | RW | dev, stg | 50 cmds/hr | Pipeline execution |
| 18 ML Engineer | RW | dev, stg | 50 cmds/hr | Training scripts |
| 19 MLOps | RW | dev, stg, prod | 30 cmds/hr | Deployment scripts. Prod requires HITL. |
| All others | — | — | — | No terminal access |

### mcp-database

| Agent | Access | Environments | Data Tier Max | Notes |
|-------|--------|-------------|---------------|-------|
| 05 BA | R | dev, stg | T3 | Verify schemas against data |
| 08 Coder | RW | dev, stg | T3 | Test queries, verify migrations |
| 10 Test Engineer | RW | dev | T2 | Test data only (synthetic) |
| 14 SRE | R | prod | T3 | Diagnostic queries (PII masked in results) |
| 15 Incident | R | prod | T4 | Diagnosis only, purpose-logged |
| 17 Data Engineer | RW | dev, stg; R prod | T4 | Pipeline development + prod monitoring |
| 21 Model Monitor | R | prod | T3 | Prediction log queries |
| 22 Data Quality | R | all | T4 | Validation queries |
| 29 Analytics | R | prod | T3 | Aggregated analytics queries |
| All others | — | — | — | No direct DB access |

---

## 4. Domain Tool Permissions

### Communication Tools

| Tool | Agent | Access | Constraints |
|------|-------|--------|------------|
| **mcp-email** | 23 Sales | DRAFT | Never auto-send. Human approval required. |
| | 25 CS | DRAFT | Never auto-send. Human approval required. |
| | 26 Support | DRAFT+SEND(template) | Auto-send only for whitelisted templates. Custom → human. |
| | 28 Billing | DRAFT+SEND(dunning) | Dunning templates only. Human approval for first per customer. |
| | All others | — | No email access |
| **mcp-crm** | 23 Sales | RW | Full pipeline management |
| | 25 CS | RW | Customer records, interactions |
| | 26 Support | R | Customer context lookup |
| | 28 Billing | R | Contract data |
| | 01 Discovery | R | Customer metadata (anonymized) |
| | All others | — | No CRM access |
| **mcp-notify** | 00 Orchestrator | RW | System notifications to human |
| | 03 Competitor | RW | Competitive alerts |
| | 11 Security | RW | Security alerts |
| | 14 SRE | RW | System health alerts |
| | 15 Incident | RW | Incident status updates |
| | 16 Cost | RW | Cost anomaly alerts |
| | 28 Billing | RW | Payment failure alerts |
| | 32 Governance | RW | Agent health alerts |

### Security Tools

| Tool | Agent | Access | Environments |
|------|-------|--------|-------------|
| **mcp-semgrep** | 11 Security | RW | all |
| | 09 Code Reviewer | R | all (read scan results) |
| **mcp-snyk** | 11 Security | RW | all |
| **mcp-gitleaks** | 11 Security | RW | all |
| **mcp-zap** | 11 Security | RW | stg only |
| **mcp-vault** | 13 DevOps | RW | all (secret management) |
| | All others | — | — (secrets injected by platform, not accessed directly) |

### Observability Tools

| Tool | Agent | Access | Environments |
|------|-------|--------|-------------|
| **mcp-prometheus** | 14 SRE | RW | all |
| | 15 Incident | R | all |
| | 16 Cost | R | all |
| | 21 Model Monitor | R | prod |
| | 32 Governance | R | all |
| **mcp-grafana** | 14 SRE | ADMIN | all |
| | 15 Incident | R | all |
| **mcp-loki** | 14 SRE | R | all |
| | 15 Incident | R | all |
| **mcp-otel** | 14 SRE | R | all |
| | 15 Incident | R | all |

### ML/Data Tools

| Tool | Agent | Access | Constraints |
|------|-------|--------|------------|
| **mcp-mlflow** | 18 ML Engineer | RW | Full experiment + registry |
| | 19 MLOps | RW | Registry + deployment |
| | 21 Model Monitor | R | Model baselines |
| **mcp-dvc** | 17 Data Engineer | RW | Dataset versioning |
| | 18 ML Engineer | R | Read versioned datasets |
| | 20 Labeling | RW | Version labeled datasets |
| **mcp-compute** (GPU) | 18 ML Engineer | RW | Budget-limited (CHK-COST-ACTION) |
| **mcp-evidently** | 21 Model Monitor | RW | Drift detection |
| **mcp-labelstudio** | 20 Labeling | ADMIN | Labeling tool management |
| **mcp-airflow** | 17 Data Engineer | RW | Pipeline DAG management |

### Business Tools

| Tool | Agent | Access | Constraints |
|------|-------|--------|------------|
| **mcp-stripe** | 28 Billing | RW | Payment operations. All mutations → HITL. |
| | 16 Cost | R | Billing data read-only |
| **mcp-analytics** | 29 Analytics | RW | Full analytics platform |
| | 01 Discovery | R | Usage data queries |
| | 04 PM | R | Feature usage queries |
| | 06 UX | R | Funnel/usage data |
| | 12 QA | R | Performance metrics |
| | 25 CS | R | Per-customer usage |
| **mcp-featureflags** | 29 Analytics | RW | Experiment management |
| | 08 Coder | R | Read flag status |
| **mcp-helpdesk** | 26 Support | RW | Ticket management |
| | 27 Feedback | R | Read tickets for analysis |
| **mcp-seo** | 24 Content | RW | Keyword research, rankings |
| **mcp-cms** | 24 Content | RW | Content management |
| **mcp-docs** | 31 Docs | RW | Documentation site |

### Platform/Governance Tools

| Tool | Agent | Access |
|------|-------|--------|
| **mcp-taskqueue** | 00 Orchestrator | ADMIN |
| | All others | R (read own tasks) |
| **mcp-a2a-registry** | 00 Orchestrator | RW |
| | All others | R (query capabilities) |
| **mcp-eventbus** | 00 Orchestrator | RW (publish assignments, subscribe all) |
| | All agents | RW (publish own events, subscribe relevant topics) |
| **mcp-eval** | 32 Governance | ADMIN |
| **mcp-prompts** | 32 Governance | RW |
| **mcp-token-tracker** | 32 Governance | R |
| | 16 Cost | R |
| **mcp-license-scan** | 30 Legal | RW |
| | 11 Security | R |

---

## 5. Rate Limits

| Agent Tier | LLM Calls/hr | Tool Calls/hr | Max Concurrent Tools |
|-----------|-------------|--------------|---------------------|
| Hot agents (08 Coder, 09 Reviewer, 10 Test) | 200 | 500 | 10 |
| Standard agents (most) | 100 | 200 | 5 |
| Monitoring agents (14 SRE, 21 Monitor, 22 DQ) | 50 | 300 | 3 |
| Low-frequency agents (07 Architect, 30 Legal) | 30 | 50 | 3 |

**Circuit breaker:** If any agent hits 3× its rate limit within 15 minutes, circuit breaker opens → agent paused → Governance + Human alerted.

# Deep Agent Platform — Write Authority & Artifact Ownership

## WRITE_AUTHORITY.md

> **Purpose:** Define who owns the source of truth for every shared artifact, who can write vs propose changes, and how conflicts are resolved.
> **Enforcement:** Execution Guard checks WRITE_AUTHORITY before every file write to shared artifacts.

---

## 1. Write Modes

| Mode | Meaning | Conflict Resolution |
|------|---------|-------------------|
| **OWNER-WRITE** | Only the designated owner can modify directly | Owner always wins |
| **APPEND-ONLY** | Multiple agents can append; nobody can modify/delete existing entries | No conflicts (append is additive) |
| **PR-STYLE** | Writers propose changes; owner + approvers must review before merge | Explicit approval gate |
| **COORDINATED** | Multiple agents write to different sections; coordinator resolves conflicts | Section locking + coordinator merge |

---

## 2. Artifact Ownership Registry

### 2.1 Platform-Wide Files

| Artifact | Owner | Allowed Writers | Write Mode | Approvers | Notes |
|----------|-------|----------------|-----------|-----------|-------|
| `PLATFORM.md` | Human | Human only | OWNER-WRITE | — | Never auto-modified by agents |
| `PROGRESS.md` | 00 Orchestrator | 00 only | OWNER-WRITE | — | Auto-updated on task completion events |
| `AGENTS.md` | 00 Orchestrator | 00, 32 Governance | COORDINATED | Human (for roster changes) | Orchestrator updates status; Governance updates health |
| `DECISIONS.md` | Human (reviews) | All agents | APPEND-ONLY | — | Any agent can append a decision record. No edits to existing entries. |
| `ARCHITECTURE.md` | 07 Architect | 07 only | OWNER-WRITE | Human (always) | Architect drafts; human approves before write |
| `CONVENTIONS.md` | Human + 08 Coder | Human, 08 (propose) | PR-STYLE | Human | Coder can propose convention changes; human approves |
| `FEATURES.md` | 04 PM | 04 only | OWNER-WRITE | Human (for roadmap items) | PM maintains living feature list |
| `CUSTOMER.md` | 01 Discovery | 01, 04 PM (propose) | PR-STYLE | Human + 01 Discovery | PM can propose updates; Discovery + Human approve |
| `CHANGELOG.md` | 31 Docs | 31 only | APPEND-ONLY | Human (for external releases) | Doc agent appends; human reviews before external publish |

### 2.2 Spec Files

| Artifact | Owner | Allowed Writers | Write Mode | Approvers |
|----------|-------|----------------|-----------|-----------|
| `specs/brds/*` | 04 PM | 04 only | OWNER-WRITE | Human |
| `specs/user-stories/*` | 04 PM | 04 only | OWNER-WRITE | — |
| `specs/backlog.json` | 04 PM | 04 only | OWNER-WRITE | Human (priority changes) |
| `specs/roadmap.json` | 04 PM | 04 only | OWNER-WRITE | Human (always) |
| `specs/schemas/*` | 05 BA | 05 only | OWNER-WRITE | Human (breaking changes) |
| `specs/api/API_SPEC.yaml` | 05 BA | 05 only | OWNER-WRITE | Human (breaking), 08 Coder (implementation sync) |
| `specs/domain-glossary.json` | 05 BA | 05, 04 PM (propose) | PR-STYLE | 05 BA |
| `specs/error-catalog.json` | 05 BA | 05 only | OWNER-WRITE | — |
| `specs/event-taxonomy.json` | 05 BA | 05, 29 Analytics (propose) | PR-STYLE | 05 BA + 29 Analytics |
| `specs/validation-rules/*` | 05 BA | 05 only | OWNER-WRITE | — |

### 2.3 Design Files

| Artifact | Owner | Allowed Writers | Write Mode | Approvers |
|----------|-------|----------------|-----------|-----------|
| `design/prototypes/*` | 06 UX | 06 only | OWNER-WRITE | Human (before sharing) |
| `design/specs/*` | 06 UX | 06 only | OWNER-WRITE | — |
| `design/system/*` | 06 UX | 06 only | OWNER-WRITE | Human (token changes) |
| `design/journey-maps/*` | 06 UX | 06 only | OWNER-WRITE | — |

### 2.4 Source Code

| Artifact | Owner | Allowed Writers | Write Mode | Approvers |
|----------|-------|----------------|-----------|-----------|
| `src/*` | 08 Coder | 08 only | OWNER-WRITE (via PR) | 09 Code Reviewer + Human (for sensitive areas) |
| `tests/*` | 08 Coder, 10 Test | 08, 10 | COORDINATED | 09 Code Reviewer |
| `migrations/*` | 08 Coder | 08 only | OWNER-WRITE | Human (always for prod) |

### 2.5 Infrastructure

| Artifact | Owner | Allowed Writers | Write Mode | Approvers |
|----------|-------|----------------|-----------|-----------|
| `infra/*` (Terraform) | 13 DevOps | 13 only | OWNER-WRITE | Human (prod changes) |
| `.github/workflows/*` | 13 DevOps | 13 only | OWNER-WRITE | — |
| `monitoring/*` | 14 SRE | 14 only | OWNER-WRITE | — |
| `runbooks/*` | 14 SRE | 14, 15 Incident (propose) | PR-STYLE | 14 SRE |
| `incidents/*` | 15 Incident | 15 only | OWNER-WRITE | — |

### 2.6 Data & ML

| Artifact | Owner | Allowed Writers | Write Mode | Approvers |
|----------|-------|----------------|-----------|-----------|
| `pipelines/*` | 17 Data Engineer | 17 only | OWNER-WRITE | Human (prod) |
| `models/*` | 18 ML Engineer | 18 only | OWNER-WRITE | Human (prod promotion) |
| `labeling/guidelines/*` | 20 Labeling | 20 only | OWNER-WRITE | Human |
| `data-quality/*` | 22 Data Quality | 22 only | OWNER-WRITE | — |

### 2.7 Business

| Artifact | Owner | Allowed Writers | Write Mode | Approvers |
|----------|-------|----------------|-----------|-----------|
| `sales/*` | 23 Sales | 23 only | OWNER-WRITE | Human (all external) |
| `content/*` | 24 Content | 24 only | OWNER-WRITE | Human (all published) |
| `legal/*` | 30 Legal | 30 only | OWNER-WRITE | Human + Attorney (always) |
| `billing/*` | 28 Billing | 28 only | OWNER-WRITE | Human (pricing/discounts) |

### 2.8 Governance

| Artifact | Owner | Allowed Writers | Write Mode | Approvers |
|----------|-------|----------------|-----------|-----------|
| `governance/scorecards/*` | 32 Governance | 32 only | OWNER-WRITE | — |
| `governance/prompt-versions/*` | 32 Governance | 32 only | OWNER-WRITE | Human (always) |
| `governance/eval-suites/*` | 32 Governance | 32 only | OWNER-WRITE | Human |
| `docs/*` | 31 Docs | 31 only | OWNER-WRITE | Human (external) |

---

## 3. Conflict Resolution Procedures

### 3.1 APPEND-ONLY Conflicts (DECISIONS.md)
- No structural conflicts possible (entries are additive)
- If two agents append simultaneously: both entries preserved, timestamped
- If entries contradict: Agent Governance flags for human review

### 3.2 PR-STYLE Conflicts (CUSTOMER.md, domain-glossary, event-taxonomy, runbooks, CONVENTIONS.md)
```
1. Writer agent creates proposed change (stored in proposals/{artifact}-{agent}-{timestamp}.json)
2. Event published: artifact.change-proposed
3. Owner + Approvers notified
4. Approvers review:
   ├── APPROVE → Owner applies change
   ├── REJECT → Writer notified with reason
   └── MODIFY → Owner applies modified version
5. Change logged in artifact change history
```

### 3.3 COORDINATED Conflicts (AGENTS.md, tests/*)
- Each writer has designated sections/scopes
- Section lock acquired before write (5-minute timeout)
- If lock contention: queue writes, apply in order
- Coordinator (owner) resolves if section boundaries overlap

### 3.4 Cross-Agent Dependency Changes
When a schema change (BA) affects downstream consumers:
```
1. BA proposes schema change
2. Execution Guard checks: is this breaking?
3. If breaking:
   a. Event published: schema.breaking-change-proposed
   b. All consumers notified (Coder, Test, Analytics, Data Engineer)
   c. Each consumer reports impact assessment
   d. Human reviews full impact
   e. BA + Human decide: proceed, modify, or abandon
   f. If proceed: coordinated rollout with version bump
4. If non-breaking: normal PR-STYLE approval
```

# Deep Agent Platform — Event Catalog

## EVENT_CATALOG.yaml

> **Purpose:** Canonical schemas for all event bus topics with producers, consumers, and payloads
> **Enforcement:** Event bus validates payload against schema before delivery
> **Protocol:** NATS JetStream topics, JSON payloads

---

## 1. Event Naming Convention

```
{domain}.{entity}.{action}

Examples:
  pm.spec.published
  coder.pr.created
  devops.deploy.completed
  sre.alert.fired
  billing.payment.failed
```

---

## 2. Universal Event Envelope

Every event follows this envelope:

```yaml
envelope:
  event_id: string (UUID)
  topic: string
  producer_agent: string (agent ID)
  timestamp: string (ISO 8601)
  correlation_id: string (traces back to originating task)
  priority: enum [low, normal, high, critical]
  payload: object (topic-specific)
```

---

## 3. Complete Event Registry

### 3.1 Discovery & Product Events

```yaml
# ── Customer Discovery ──────────────────────────

discovery.icp.updated:
  description: "ICP definition has materially changed"
  producer: [01-customer-discovery]
  consumers: [04-pm, 23-sales, 24-content, 06-ux]
  priority: high
  payload:
    version: string
    change_summary: string
    confidence: enum [high, medium, low]
    changed_fields: array[string]
    evidence_count: integer

discovery.hypothesis.validated:
  description: "A customer hypothesis has been confirmed or denied"
  producer: [01-customer-discovery]
  consumers: [04-pm, 27-feedback-analyzer]
  priority: normal
  payload:
    hypothesis_id: string
    status: enum [confirmed, denied, inconclusive]
    evidence_summary: string
    evidence_count: integer

discovery.pain.ranking-changed:
  description: "Pain severity ranking has shifted"
  producer: [01-customer-discovery]
  consumers: [04-pm, 23-sales]
  priority: normal
  payload:
    previous_top3: array[string]
    current_top3: array[string]
    reason: string

# ── Market / Competitor ──────────────────────────

competitor.change.detected:
  description: "Material change in competitor product/pricing/positioning"
  producer: [03-competitor-intel]
  consumers: [04-pm, 23-sales, 24-content]
  priority: high
  payload:
    competitor_name: string
    change_type: enum [feature, pricing, positioning, personnel, funding]
    description: string
    source_url: string
    verified: boolean

market.regulatory.change:
  description: "Regulatory landscape change detected"
  producer: [02-market-research]
  consumers: [04-pm, 30-legal]
  priority: high
  payload:
    jurisdiction: string
    regulation: string
    change_summary: string
    effective_date: string
    impact_assessment: string

# ── Product Manager ──────────────────────────────

pm.spec.published:
  description: "New feature spec ready for downstream agents"
  producer: [04-pm]
  consumers: [05-ba, 06-ux, 08-coder, 10-test, 29-analytics]
  priority: high
  payload:
    spec_id: string
    feature_name: string
    spec_path: string
    stories_count: integer
    priority: enum [p0, p1, p2, p3]
    requires: array[string]  # which agents need to act

pm.roadmap.changed:
  description: "Product roadmap has been modified"
  producer: [04-pm]
  consumers: [00-orchestrator, 23-sales, 24-content, 07-architect]
  priority: high
  payload:
    change_type: enum [addition, removal, reorder, timeline_change]
    affected_features: array[string]
    reason: string
    human_approved: boolean

pm.feature.released:
  description: "Feature is live in production"
  producer: [04-pm]
  consumers: [24-content, 31-docs, 29-analytics, 23-sales, 25-cs]
  priority: normal
  payload:
    feature_id: string
    feature_name: string
    release_version: string
    changelog_entry: string
```

### 3.2 Design & Engineering Events

```yaml
# ── Business Analyst ─────────────────────────────

ba.schema.published:
  description: "New or updated data schema available"
  producer: [05-ba]
  consumers: [08-coder, 10-test, 17-data-engineer, 29-analytics]
  priority: high
  payload:
    schema_id: string
    schema_path: string
    change_type: enum [new, update_compatible, update_breaking]
    affected_endpoints: array[string]
    migration_required: boolean

ba.event-taxonomy.changed:
  description: "Analytics event taxonomy updated"
  producer: [05-ba]
  consumers: [08-coder, 29-analytics]
  priority: high
  payload:
    changed_events: array[string]
    change_type: enum [new_event, modified_event, deprecated_event]
    version: string

# ── Coder ────────────────────────────────────────

coder.pr.created:
  description: "Pull request ready for review"
  producer: [08-coder]
  consumers: [09-code-reviewer, 10-test, 11-security]
  priority: high
  payload:
    pr_id: string
    branch: string
    files_changed: integer
    lines_added: integer
    lines_removed: integer
    feature_ref: string
    touches_auth: boolean
    touches_payments: boolean
    has_migrations: boolean

coder.pr.merged:
  description: "Pull request merged to main"
  producer: [08-coder]
  consumers: [12-qa, 13-devops, 31-docs]
  priority: normal
  payload:
    pr_id: string
    merge_commit: string
    feature_ref: string

# ── Code Reviewer ────────────────────────────────

reviewer.pr.approved:
  description: "PR approved after review"
  producer: [09-code-reviewer]
  consumers: [08-coder, 00-orchestrator]
  priority: normal
  payload:
    pr_id: string
    findings: object { critical: int, major: int, minor: int, nit: int }

reviewer.pr.rejected:
  description: "PR rejected — changes required"
  producer: [09-code-reviewer]
  consumers: [08-coder, 00-orchestrator]
  priority: high
  payload:
    pr_id: string
    findings: object { critical: int, major: int, minor: int, nit: int }
    blocking_issues: array[string]
```

### 3.3 Quality & Security Events

```yaml
security.scan.completed:
  description: "Security scan results available"
  producer: [11-security]
  consumers: [08-coder, 09-reviewer, 13-devops, 00-orchestrator]
  priority: high
  payload:
    scan_type: enum [sast, dast, dependency, secrets]
    target: string
    findings: object { critical: int, high: int, medium: int, low: int }
    blocking: boolean
    report_path: string

security.vulnerability.critical:
  description: "Critical vulnerability found — immediate action required"
  producer: [11-security]
  consumers: [08-coder, 13-devops, 00-orchestrator, human]
  priority: critical
  payload:
    vulnerability_id: string
    severity: enum [critical]
    description: string
    affected_component: string
    remediation_guidance: string

release.status:
  description: "QA release readiness assessment"
  producer: [12-qa]
  consumers: [00-orchestrator, 13-devops, 14-sre, human]
  priority: high
  payload:
    version: string
    environment: string
    status: enum [go, no-go, conditional]
    e2e_pass_rate: float
    perf_p95_ms: integer
    perf_baseline_p95_ms: integer
    open_bugs: object { critical: int, major: int, minor: int }
    conditions: array[string]
    signoff_required: boolean
```

### 3.4 Operations Events

```yaml
devops.deploy.completed:
  description: "Deployment completed to an environment"
  producer: [13-devops]
  consumers: [12-qa, 14-sre, 15-incident, 29-analytics]
  priority: high
  payload:
    environment: enum [dev, staging, production]
    version: string
    deploy_id: string
    duration_seconds: integer
    status: enum [success, partial, failed]
    rollback_available: boolean

sre.alert.fired:
  description: "Monitoring alert triggered"
  producer: [14-sre]
  consumers: [15-incident, 00-orchestrator, human]
  priority: critical
  payload:
    alert_id: string
    metric: string
    threshold: float
    current_value: float
    severity: enum [warning, error, critical]
    slo_affected: string
    runbook_url: string

sre.slo.breached:
  description: "SLO has been breached"
  producer: [14-sre]
  consumers: [15-incident, 00-orchestrator, human]
  priority: critical
  payload:
    slo_name: string
    target: float
    actual: float
    duration_minutes: integer

incident.opened:
  description: "Incident investigation started"
  producer: [15-incident]
  consumers: [14-sre, 13-devops, 00-orchestrator, human]
  priority: critical
  payload:
    incident_id: string
    severity: enum [sev1, sev2, sev3]
    summary: string
    suspected_cause: string
    affected_services: array[string]

incident.resolved:
  description: "Incident resolved"
  producer: [15-incident]
  consumers: [14-sre, 00-orchestrator, human]
  priority: high
  payload:
    incident_id: string
    root_cause: string
    resolution: string
    duration_minutes: integer
    pir_due_date: string

billing.cost.anomaly:
  description: "Cost spike detected"
  producer: [16-cost-optimizer]
  consumers: [13-devops, 00-orchestrator, human]
  priority: high
  payload:
    resource: string
    expected_cost: float
    actual_cost: float
    deviation_pct: float
    recommendation: string
```

### 3.5 Data & ML Events

```yaml
pipeline.batch.arrived:
  description: "New data batch available for processing"
  producer: [17-data-engineer]
  consumers: [22-data-quality]
  priority: normal
  payload:
    pipeline_id: string
    batch_id: string
    source: string
    record_count: integer
    schema_version: string

pipeline.failed:
  description: "Data pipeline failure"
  producer: [17-data-engineer]
  consumers: [00-orchestrator, 14-sre]
  priority: high
  payload:
    pipeline_id: string
    error: string
    stage: string
    records_affected: integer

ml.model.registered:
  description: "New model version registered in MLflow"
  producer: [18-ml-engineer]
  consumers: [19-mlops, 32-governance]
  priority: high
  payload:
    model_name: string
    model_version: string
    dataset_version: string
    metrics: object
    model_card_path: string
    eval_suite_path: string

ml.retrain.triggered:
  description: "Model retraining initiated"
  producer: [18-ml-engineer]
  consumers: [19-mlops, 20-labeling, 16-cost]
  priority: normal
  payload:
    model_name: string
    trigger_reason: enum [scheduled, drift, degradation, data_update]
    estimated_cost: float
    estimated_duration_hours: float

monitor.drift.detected:
  description: "Model drift detected in production"
  producer: [21-model-monitor]
  consumers: [18-ml-engineer, 19-mlops, 14-sre]
  priority: high
  payload:
    model_name: string
    drift_type: enum [data, concept, prediction, performance]
    severity: enum [low, medium, high]
    drifted_features: array[string]
    baseline_metric: float
    current_metric: float
    recommendation: enum [monitor, investigate, retrain]

labeling.dataset.ready:
  description: "Labeled dataset versioned and ready for training"
  producer: [20-labeling]
  consumers: [18-ml-engineer, 22-data-quality]
  priority: normal
  payload:
    dataset_name: string
    dataset_version: string
    record_count: integer
    iaa_score: float
    quality_report_path: string

data-quality.batch.validated:
  description: "Data batch quality assessment complete"
  producer: [22-data-quality]
  consumers: [17-data-engineer, 18-ml-engineer]
  priority: normal
  payload:
    batch_id: string
    quality_score: float
    records_total: integer
    records_quarantined: integer
    issues: array[object { field: string, issue: string, count: int }]
```

### 3.6 Revenue & Feedback Events

```yaml
feedback.new:
  description: "New customer feedback received from any channel"
  producer: [26-support, 25-cs, 23-sales]
  consumers: [27-feedback-analyzer, 01-discovery]
  priority: normal
  payload:
    source: enum [support_ticket, nps, csat, sales_call, interview, review]
    source_id: string
    customer_segment: string
    sentiment: enum [positive, neutral, negative]
    summary: string

feedback.pattern.detected:
  description: "Recurring feedback pattern identified"
  producer: [27-feedback-analyzer]
  consumers: [04-pm, 01-discovery]
  priority: high
  payload:
    pattern_id: string
    theme: string
    frequency: integer
    severity: enum [low, medium, high]
    source_count: integer
    recommendation: string

support.ticket.created:
  description: "New support ticket received"
  producer: [26-support]
  consumers: [27-feedback, 01-discovery]
  priority: normal
  payload:
    ticket_id: string
    category: enum [bug, how_to, feature_request, billing, other]
    priority: enum [critical, high, medium, low]
    customer_id: string (pseudonymized)

billing.payment.failed:
  description: "Customer payment failed"
  producer: [28-billing (via Stripe webhook)]
  consumers: [25-cs, 28-billing (dunning)]
  priority: high
  payload:
    customer_id: string
    amount: float
    currency: string
    failure_reason: string
    retry_count: integer
    next_retry: string

billing.customer.new:
  description: "New paying customer activated"
  producer: [28-billing]
  consumers: [25-cs (onboarding), 04-pm, 29-analytics]
  priority: high
  payload:
    customer_id: string
    plan: string
    mrr: float

analytics.usage.drop:
  description: "Significant usage drop detected for a customer"
  producer: [29-analytics]
  consumers: [25-cs (churn risk)]
  priority: high
  payload:
    customer_id: string
    metric: string
    previous_value: float
    current_value: float
    drop_pct: float
    period: string
```

### 3.7 Governance Events

```yaml
agent.quality.score:
  description: "Weekly agent quality assessment published"
  producer: [32-governance]
  consumers: [00-orchestrator, human]
  priority: normal
  payload:
    agent_id: string
    period: string
    reliability: float
    quality: float
    efficiency: float
    composite: float
    threshold: float
    status: enum [healthy, degraded, critical]
    action: enum [none, hitl_required, supervisor_required, deactivated]

agent.prompt.changed:
  description: "Agent prompt modification deployed"
  producer: [32-governance]
  consumers: [00-orchestrator, human]
  priority: high
  payload:
    agent_id: string
    prompt_version_old: string
    prompt_version_new: string
    regression_test_result: enum [pass, fail, improved]
    human_approved: boolean

agent.cost.anomaly:
  description: "Agent token cost exceeding budget"
  producer: [32-governance]
  consumers: [16-cost, 00-orchestrator, human]
  priority: high
  payload:
    agent_id: string
    budget: float
    actual: float
    deviation_pct: float
    period: string
```

---

## 4. Event Consumption Rules

| Rule | Description |
|------|-------------|
| **At-least-once delivery** | Consumers must be idempotent — same event processed twice must produce same result |
| **Consumer acknowledgment** | Consumer must ACK within 30 seconds or event is redelivered |
| **Dead letter queue** | Events that fail processing 3× go to DLQ for human review |
| **Event retention** | All events retained for 90 days (audit trail). Critical events retained for 1 year. |
| **Schema validation** | Event bus validates payload against registered schema before delivery. Invalid payloads rejected + logged. |
| **Priority routing** | Critical events bypass queue and deliver immediately. Normal events queued. Low events batched. |

# Deep Agent Platform — Standardized Quality Rubrics

## QUALITY_RUBRICS.md

> **Purpose:** Standardized 3-bucket metrics for every agent, with pass thresholds and escalation triggers
> **Enforced by:** Agent 32 (Agent Governance), measured weekly
> **Data source:** Agent logs, tool call traces, output samples, downstream feedback

---

## 1. Universal Metric Buckets

Every agent is scored across three dimensions:

| Bucket | What It Measures | How Measured |
|--------|-----------------|-------------|
| **Reliability** | Does the agent complete tasks without errors? | Success rate, retry rate, failure modes, uptime |
| **Quality** | Is the output correct and useful? | Rubric scoring on sampled outputs, defect escape rate, downstream clarification rate |
| **Efficiency** | Does the agent use resources well? | Time-to-complete, token cost, tool call count, model tier usage |

### 1.1 Composite Score

```
composite = (reliability × 0.40) + (quality × 0.40) + (efficiency × 0.20)

Scale: 0.0 – 1.0
```

### 1.2 Status Thresholds

| Composite Score | Status | Action |
|----------------|--------|--------|
| **≥ 0.85** | 🟢 Healthy | No action needed |
| **0.70–0.84** | 🟡 Degraded | Orchestrator adds HITL review to tasks for this agent |
| **0.50–0.69** | 🟠 Critical | Agent limited to supervised mode. Governance + Human investigate. |
| **< 0.50** | 🔴 Deactivated | Agent stopped. Tasks rerouted. Human must reactivate. |

---

## 2. Per-Agent Quality Specifications

### Agent 00: Orchestrator

| Bucket | Metric | Measurement | Target | Escalation |
|--------|--------|-------------|--------|-----------|
| Reliability | Task routing success rate | % tasks routed to correct agent on first try | ≥ 90% | < 80% → Human reviews routing logic |
| Reliability | Dependency resolution rate | % blocked chains resolved without human | ≥ 85% | < 70% → Review decomposition patterns |
| Quality | Rework rate | % tasks that had to be re-routed | ≤ 10% | > 20% → Prompt review |
| Quality | Escalation appropriateness | % escalations human agreed were necessary | ≥ 80% | < 60% → Recalibrate escalation criteria |
| Efficiency | Time-to-first-assignment | Median seconds from instruction to assignment | ≤ 30s | > 120s → Performance investigation |
| Efficiency | Token cost per routing decision | Avg tokens per task decomposition | Baseline ± 30% | > 2× baseline → Model tier review |

### Agent 01: Customer Discovery

| Bucket | Metric | Measurement | Target | Escalation |
|--------|--------|-------------|--------|-----------|
| Reliability | Synthesis completion rate | % of transcripts fully synthesized | ≥ 95% | < 85% → Investigate failures |
| Quality | Evidence traceability | % findings linked to specific source ID | ≥ 95% | < 85% → Invariant enforcement review |
| Quality | False insight rate | % insights marked incorrect in human audit (quarterly) | ≤ 5% | > 10% → Prompt + skill review |
| Quality | Cross-source validation | % key findings backed by 3+ sources | ≥ 70% | < 50% → Methodology review |
| Efficiency | Tokens per synthesis | Avg tokens per interview synthesis | Baseline ± 30% | > 2× → Optimization review |

### Agent 02: Market Research

| Bucket | Metric | Measurement | Target | Escalation |
|--------|--------|-------------|--------|-----------|
| Reliability | Report completion rate | % research requests completed | ≥ 95% | < 85% |
| Quality | Source diversity | Avg independent sources per key claim | ≥ 3 | < 2 → Methodology review |
| Quality | Data freshness | % cited data < 12 months old | ≥ 80% | < 60% → Source strategy review |
| Efficiency | Research turnaround | Median hours per report | Baseline ± 50% | > 3× baseline |

### Agent 03: Competitor Intelligence

| Bucket | Metric | Measurement | Target | Escalation |
|--------|--------|-------------|--------|-----------|
| Reliability | Monitoring coverage | % tracked competitors with data < 30 days | ≥ 90% | < 70% |
| Quality | Detection latency | Median days between competitor change and detection | ≤ 7 days | > 14 days |
| Quality | Accuracy | % verified claims (spot-check quarterly) | ≥ 90% | < 75% |
| Efficiency | Cost per monitoring cycle | Token cost per scheduled scan | Baseline ± 30% | |

### Agent 04: Product Manager

| Bucket | Metric | Measurement | Target | Escalation |
|--------|--------|-------------|--------|-----------|
| Reliability | Spec completion rate | % specs completed on time | ≥ 90% | < 75% |
| Quality | Spec completeness | % specs with all required sections (problem, stories, criteria, NFRs, metrics) | 100% | < 90% → Enforce definition-of-done gate |
| Quality | Evidence linkage | % features traceable to customer evidence | ≥ 90% | < 70% → Discovery integration review |
| Quality | Downstream ambiguity rate | % specs generating clarification questions from BA/Coder/UX | ≤ 15% | > 30% → Quality review |
| Efficiency | Tokens per spec | Avg tokens per feature spec | Baseline ± 30% | |

### Agent 05: Business Analyst

| Bucket | Metric | Measurement | Target | Escalation |
|--------|--------|-------------|--------|-----------|
| Reliability | Schema delivery rate | % schemas delivered before Coder starts | 100% | < 90% → Process enforcement |
| Quality | Schema completeness | % fields with type + validation + example | ≥ 95% | < 80% |
| Quality | Error coverage | % endpoints with exhaustive error scenarios | ≥ 90% | < 70% |
| Quality | Breaking change rate | Breaking changes per quarter | ≤ 2 | > 5 → Schema strategy review |
| Efficiency | Downstream question rate | Questions from Coder about schemas per spec | ≤ 2 | > 5 → Completeness review |

### Agent 06: UX Designer

| Bucket | Metric | Measurement | Target | Escalation |
|--------|--------|-------------|--------|-----------|
| Reliability | Design delivery rate | % designs delivered per spec | ≥ 95% | < 85% |
| Quality | Heuristic compliance | Average Nielsen's 10 score per screen | ≥ 8/10 | < 6/10 |
| Quality | Accessibility compliance | WCAG 2.1 AA pass rate | 100% | < 90% → A11y review |
| Quality | UX acceptance criteria coverage | % stories with measurable UX criteria | ≥ 90% | < 70% |
| Efficiency | Prototype-to-approval iterations | Avg revision cycles before human approval | ≤ 3 | > 5 → Skill review |

### Agent 07: Architect

| Bucket | Metric | Measurement | Target | Escalation |
|--------|--------|-------------|--------|-----------|
| Reliability | ADR completion rate | % decisions with written ADR | 100% | < 90% |
| Quality | ADR completeness | % ADRs with alternatives + trade-offs + consequences | 100% | < 80% |
| Quality | Decision reversal rate | Architecture decisions reversed within 6 months | ≤ 1/quarter | > 3 → Analysis quality review |
| Quality | NFR coverage | % NFRs with documented satisfiability | ≥ 95% | < 80% |
| Efficiency | Decision turnaround | Median days from question to ADR draft | ≤ 3 days | > 7 days |

### Agent 08: Coder

| Bucket | Metric | Measurement | Target | Escalation |
|--------|--------|-------------|--------|-----------|
| Reliability | Build success rate | % commits that pass CI | ≥ 95% | < 85% → Review pre-commit checks |
| Quality | PR approval rate (first review) | % PRs approved without changes | ≥ 60% | < 40% → Quality review |
| Quality | Bug introduction rate | Bugs found per 1000 LOC | ≤ 2 | > 5 → Skill + invariant review |
| Quality | Test coverage (new code) | % of new code covered by tests | ≥ 80% | < 60% → Enforcement review |
| Quality | Convention compliance | % adherence to CONVENTIONS.md (linter pass) | 100% | < 95% → Auto-fix enforcement |
| Efficiency | Diff minimality | LOC changed per story point (normalized) | Baseline ± 50% | > 2× → Refactoring scope review |
| Efficiency | Token cost per feature | Tokens consumed per completed feature | Baseline ± 30% | > 2× → Model tier optimization |

### Agent 09: Code Reviewer

| Bucket | Metric | Measurement | Target | Escalation |
|--------|--------|-------------|--------|-----------|
| Reliability | Review turnaround | Median hours from PR → review complete | ≤ 4 hours | > 8 hours |
| Quality | Bug escape rate | Bugs passing review → found in QA/production | ≤ 5% | > 10% → Review depth investigation |
| Quality | False positive rate | Issues flagged that aren't actually issues | ≤ 10% | > 20% → Calibration review |
| Quality | Actionability | % comments rated actionable by Coder | ≥ 85% | < 70% → Comment quality review |
| Efficiency | Tokens per review | Avg tokens per PR review | Baseline ± 30% | |

### Agent 10: Test Engineer

| Bucket | Metric | Measurement | Target | Escalation |
|--------|--------|-------------|--------|-----------|
| Reliability | Test delivery rate | % features with complete test suite before merge | ≥ 95% | < 85% |
| Quality | Gherkin coverage | % acceptance criteria with corresponding tests | 100% | < 90% → Enforcement |
| Quality | Test reliability (30-day) | % tests that never flake over 30 days | ≥ 95% | < 85% → Stability review |
| Quality | Bug detection rate | % bugs caught by automated tests | ≥ 70% | < 50% → Coverage strategy review |
| Quality | Mean time to stabilize flake | Avg hours to fix flaky test | ≤ 24 hours | > 72 hours |
| Efficiency | Fixture generation speed | Time to generate fixtures from schemas | Baseline ± 50% | |

### Agent 11: Trust & Security

| Bucket | Metric | Measurement | Target | Escalation |
|--------|--------|-------------|--------|-----------|
| Reliability | Scan completion rate | % PRs scanned before merge | 100% | < 95% → Pipeline enforcement |
| Quality | Vulnerability detection rate | % vulns caught before production | ≥ 95% | < 85% → Scan tool review |
| Quality | False positive rate | % findings that are false positives | ≤ 15% | > 25% → Rule tuning |
| Quality | Remediation guidance quality | % findings with actionable remediation | ≥ 90% | < 75% |
| Efficiency | Scan duration | Median seconds per PR scan | ≤ 120s | > 300s → Tool optimization |

### Agent 12: QA & Performance

| Bucket | Metric | Measurement | Target | Escalation |
|--------|--------|-------------|--------|-----------|
| Reliability | Release assessment rate | % releases with complete QA signoff | 100% | < 95% |
| Quality | Post-release incident rate | Production incidents within 48hr of release | ≤ 1/release | > 2 → QA effectiveness review |
| Quality | False no-go rate | Releases blocked unnecessarily | ≤ 5% | > 15% → Threshold calibration |
| Quality | Performance regression detection | % regressions caught before production | ≥ 90% | < 75% |
| Efficiency | Full suite execution time | Time for complete E2E + perf suite | Baseline ± 50% | |

### Agents 13–16: Operations (DevOps, SRE, Incident, Cost)

| Agent | Key Reliability | Key Quality | Key Efficiency |
|-------|----------------|-------------|---------------|
| 13 DevOps | Deploy success rate ≥ 98% | Infrastructure drift instances ≤ 1/month | Deploy time (merge→running) baseline ± 30% |
| 14 SRE | SLO compliance ≥ 99.5% | Alert precision (actionable) ≥ 80% | Backup verification success 100% |
| 15 Incident | Correct first diagnosis ≥ 75% | PIR completion within 48hr ≥ 90% | MTTR baseline ± 30% |
| 16 Cost | Anomaly detection within 24hr ≥ 90% | Recommendation implementation rate ≥ 60% | Budget forecast accuracy ± 15% |

### Agents 17–22: Data & ML

| Agent | Key Reliability | Key Quality | Key Efficiency |
|-------|----------------|-------------|---------------|
| 17 Data Engineer | Pipeline uptime ≥ 99% | Validation catch rate ≥ 95% | Data freshness within SLA |
| 18 ML Engineer | Training completion rate ≥ 90% | Model improvement vs baseline ≥ 5% | Reproducibility 100% |
| 19 MLOps | Deploy success rate ≥ 95% | Rollback rate ≤ 10% | Shadow→prod promotion time baseline ± 30% |
| 20 Labeling | Dataset delivery on time ≥ 90% | IAA score ≥ threshold | Cost per labeled record baseline ± 30% |
| 21 Model Monitor | Monitoring uptime 100% | Drift detection accuracy ≥ 85% | False alarm rate ≤ 15% |
| 22 Data Quality | Validation coverage ≥ 95% | Catch rate ≥ 95% | False quarantine ≤ 5% |

### Agents 23–28: Revenue & Growth

| Agent | Key Reliability | Key Quality | Key Efficiency |
|-------|----------------|-------------|---------------|
| 23 Sales | Draft delivery rate ≥ 95% | Outreach response rate baseline ± 20% | Tokens per proposal baseline ± 30% |
| 24 Content | Content calendar adherence ≥ 85% | Post-publish corrections ≤ 5% | SEO ranking improvements tracked |
| 25 CS | Health score computation daily | Churn prediction accuracy ≥ 70% | Onboarding completion ≥ 90% |
| 26 Support | SLA compliance ≥ 95% | Resolution rate (no engineering) ≥ 60% | First response time within SLA |
| 27 Feedback | Synthesis cycle on time ≥ 95% | Insight traceability ≥ 90% | Tokens per synthesis baseline ± 30% |
| 28 Billing | Revenue calculation accuracy 100% | Dunning recovery rate ≥ 50% | Forecast accuracy ± 10% |

### Agent 29: Product Analytics

| Bucket | Metric | Measurement | Target | Escalation |
|--------|--------|-------------|--------|-----------|
| Reliability | Event coverage | % user actions with tracking | ≥ 90% | < 75% |
| Quality | Metric accuracy | Tracked vs verified (audit) | ≥ 98% | < 95% |
| Quality | Insight actionability | % insights leading to product action | ≥ 50% | < 30% |
| Efficiency | Experiment velocity | Experiments completed per quarter | ≥ 4 | < 2 |

### Agents 30–32: Legal, Docs, Governance

| Agent | Key Reliability | Key Quality | Key Efficiency |
|-------|----------------|-------------|---------------|
| 30 Legal | Draft delivery on time ≥ 90% | Flag accuracy (attorney confirmed) ≥ 80% | Compliance coverage ≥ 95% |
| 31 Docs | Doc freshness (updated within 30 days of code change) ≥ 85% | API doc coverage ≥ 95% | Staleness detection rate ≥ 90% |
| 32 Governance | Weekly eval completion 100% | Drift detection accuracy ≥ 85% | Cost forecast accuracy ± 15% |

---

## 3. Governance Evaluation Cycle

```
WEEKLY:
  1. Governance agent collects metrics from logs + tool traces
  2. Samples 5–10 outputs per agent for quality rubric scoring
  3. Computes: reliability, quality, efficiency, composite
  4. Compares against baselines (established in first 30 days)
  5. Publishes agent.quality.score event
  6. Generates scorecard report for human

QUARTERLY:
  1. Deep audit: human reviews rubric calibration
  2. Baseline adjustment (if product/team has changed)
  3. Threshold review: are thresholds appropriate?
  4. Rubric evolution: add/remove metrics based on experience
```

---

## 4. Rubric Scoring Format (JSON)

Stored in `governance/scorecards/{agent_id}/{period}.json`:

```json
{
  "agent_id": "agent-08",
  "agent_name": "Coder",
  "period": "2026-W08",
  "evaluated_at": "2026-02-23T12:00:00Z",
  "sample_size": 10,
  "reliability": {
    "score": 0.94,
    "metrics": {
      "build_success_rate": { "value": 0.96, "target": 0.95, "status": "pass" },
      "task_completion_rate": { "value": 0.92, "target": 0.90, "status": "pass" }
    }
  },
  "quality": {
    "score": 0.87,
    "metrics": {
      "pr_first_approval_rate": { "value": 0.65, "target": 0.60, "status": "pass" },
      "bug_intro_rate_per_kloc": { "value": 1.8, "target": 2.0, "status": "pass" },
      "test_coverage_new": { "value": 0.83, "target": 0.80, "status": "pass" },
      "convention_compliance": { "value": 1.00, "target": 1.00, "status": "pass" }
    }
  },
  "efficiency": {
    "score": 0.91,
    "metrics": {
      "tokens_per_feature": { "value": 45000, "baseline": 42000, "deviation_pct": 7, "status": "pass" },
      "diff_minimality": { "value": 1.1, "baseline": 1.0, "deviation_pct": 10, "status": "pass" }
    }
  },
  "composite": 0.90,
  "status": "healthy",
  "action": "none",
  "notes": ""
}
```

---

## 5. Compliance Logging Requirements

For regulated agents (Sales, Support, CS, Billing, Legal), all customer interactions must be logged:

```json
{
  "interaction_id": "uuid",
  "agent_id": "agent-23",
  "customer_id": "pseudonymized",
  "interaction_type": "email_draft|call_prep|proposal|contract",
  "content_hash": "sha256 of content",
  "human_approved": true,
  "approved_by": "user_id",
  "approved_at": "ISO 8601",
  "sent": true,
  "sent_at": "ISO 8601",
  "compliance_flags": ["gdpr_consent_verified", "nda_in_place"]
}
```

Retention: 7 years for financial interactions, 3 years for general customer communications.

