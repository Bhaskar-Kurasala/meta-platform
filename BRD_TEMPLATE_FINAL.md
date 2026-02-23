# 📘 BUSINESS REQUIREMENTS DOCUMENT — Template for the Agent Era

> **What this is:** A reusable BRD template optimized for both human product teams and autonomous coding agents. Copy this for each new project. Fill in the sections. Commit to the repository as `docs/BRD.md`.
>
> **How it connects to other documents:**
> - **This BRD** = WHAT to build (requirements, data contracts, acceptance criteria, constraints)
> - **PROJECT_INSTRUCTIONS.md** = HOW to build it (quality standards, security practices, agent behavior rules)
> - **docs/API_SPEC.yaml** = Full OpenAPI specification (generated during Phase 1 from Section 10 of this BRD)
> - **docs/ARCHITECTURE.md** = Technical design decisions (generated during Phase 2)
>
> **For the agent:** Read this document completely before planning or writing code. Every data contract, acceptance criterion, and constraint defined here is authoritative. If something is ambiguous, ask the human — do not assume.

---

**Project:** [Name]
**Version:** [x.y]
**Owner:** [Product owner name]
**Date:** [YYYY-MM-DD]
**Status:** [Draft / In Review / Approved / Superseded]

**Change Log:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | YYYY-MM-DD | [Name] | Initial version |

---

## TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Objectives & Success Metrics](#2-objectives--success-metrics)
3. [Scope](#3-scope)
4. [User Personas & Access Model](#4-user-personas--access-model)
5. [Domain Glossary](#5-domain-glossary)
6. [System Context & Boundaries](#6-system-context--boundaries)
7. [Data Contracts](#7-data-contracts)
8. [Functional Requirements](#8-functional-requirements)
9. [Non-Functional Requirements](#9-non-functional-requirements)
10. [API Contract Summary](#10-api-contract-summary)
11. [Milestones & Delivery Phases](#11-milestones--delivery-phases)
12. [Risks & Mitigations](#12-risks--mitigations)
13. [Assumptions & Dependencies](#13-assumptions--dependencies)
14. [Decision Log](#14-decision-log)
15. [Appendix](#15-appendix)

---

## 1. EXECUTIVE SUMMARY

### 1.1 Problem Statement

[2-3 sentences. What business problem does this solve? Why does it matter now? Quantify the pain if possible.]

### 1.2 Solution Vision

[2-3 sentences. What are we building at the highest level? What does success look like?]

### 1.3 Business Impact

[Quantified. Example: "Reduces unplanned downtime by 20%, saving $X per facility per year." Agents use this to prioritize features that drive the most business value.]

### 1.4 Key Constraints

[Budget, timeline, team size, regulatory, technical constraints that shape all decisions. Be explicit — agents treat these as hard boundaries.]

---

## 2. OBJECTIVES & SUCCESS METRICS

> Use OKR framework. Every metric must be measurable and testable. Agents will use these to generate validation tests.

### Objective 1: [Name]

| Key Result | Target | Measurement Method | Phase |
|-----------|--------|-------------------|-------|
| [KR1] | [specific number] | [how measured — tool, query, or test] | [MVP / v2 / v3] |
| [KR2] | [specific number] | [how measured] | [MVP / v2 / v3] |

### Objective 2: [Name]

| Key Result | Target | Measurement Method | Phase |
|-----------|--------|-------------------|-------|
| ... | ... | ... | ... |

*Repeat for each objective.*

---

## 3. SCOPE

### 3.1 In Scope (This Version)

- [Feature/capability 1]
- [Feature/capability 2]
- ...

### 3.2 Explicitly Out of Scope

> ⚠️ **Agent directive:** Do not implement anything listed here. If requirements seem to require out-of-scope work, flag to the human before proceeding.

- [Item 1 — and brief reason why it's excluded]
- [Item 2]
- ...

### 3.3 Future Scope (Planned, Not Now)

> These will be added in later phases. Do not design or build for these now, but do not make architectural decisions that would prevent them.

- [Phase 2 item — brief description]
- [Phase 3 item]
- ...

---

## 4. USER PERSONAS & ACCESS MODEL

> Defines who uses the system and what they can do. This drives RBAC implementation directly.

### Persona: [Role Name]

| Attribute | Detail |
|-----------|--------|
| **Who** | [Brief description of this user type] |
| **Goals** | [What they want to achieve with the system] |
| **Permissions** | [What they can access / create / modify / delete] |
| **Restrictions** | [What they explicitly CANNOT do] |

*Repeat for each persona.*

### Access Control Matrix

> **Agent directive:** Implement this matrix as RBAC middleware. Every endpoint must enforce these permissions. No endpoint should be accessible without an explicit permission grant.

| Resource / Action | [Role 1] | [Role 2] | [Role 3] | [Role 4] | [Role 5] |
|-------------------|----------|----------|----------|----------|----------|
| View dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create records | ❌ | ✅ | ✅ | ❌ | ❌ |
| Approve actions | ❌ | ❌ | ✅ | ❌ | ❌ |
| View audit logs | ❌ | ❌ | ❌ | ✅ | ✅ |
| Export reports | ❌ | ✅ | ✅ | ✅ | ✅ |
| Admin settings | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 5. DOMAIN GLOSSARY

> ⚠️ **Authoritative.** All code, APIs, database columns, variable names, and agent prompts MUST use these exact terms consistently. When in doubt, this glossary wins.

| Term | Definition | Code Mapping | Notes |
|------|-----------|-------------|-------|
| [Term 1] | [Precise definition] | [entity name, field type] | [Any disambiguation] |
| [Term 2] | [Precise definition] | [entity name, field type] | |
| ... | ... | ... | |

---

## 6. SYSTEM CONTEXT & BOUNDARIES

> Defines what's inside the system and what's external. Critical for agents to understand implementation scope.

### 6.1 System Context Diagram

```
[Draw your system boundary here — text-based is fine. Show:]
[- Major subsystems INSIDE the platform]
[- External systems that connect to it]
[- Direction of data flow (arrows)]
[- Communication protocols on each connection]
```

### 6.2 Subsystem Responsibilities

| Subsystem | Responsibility | Input Boundary | Output Boundary |
|-----------|---------------|----------------|-----------------|
| [Subsystem 1] | [What it owns] | [What comes in, from where] | [What goes out, to where] |
| [Subsystem 2] | ... | ... | ... |

> **Agent directive:** Each subsystem may become a separate service or module depending on architecture decisions. Do not assume monolith or microservices — this is decided in Phase 2 (Architecture).

### 6.3 External Integrations

| System | Protocol | Direction | Data Format | Authentication | Failure Mode |
|--------|----------|-----------|-------------|----------------|-------------|
| [External 1] | [MQTT/gRPC/REST/etc.] | [Inbound/Outbound] | [JSON/Protobuf/etc.] | [mTLS/API key/OAuth] | [What happens if this integration is down] |
| [External 2] | ... | ... | ... | ... | ... |

---

## 7. DATA CONTRACTS

> ⚠️ **Critical for agent implementation.** Define the shape of every major data entity. Agents use these schemas to generate database models, API validators, and test fixtures. If an entity is referenced anywhere in this BRD but not defined here, the agent must flag it and ask before inventing a schema.

### 7.0 Schema Versioning Policy

All data payloads MUST include a `schema_version` field. This enables non-breaking evolution of data contracts.

**Rules:**
- `schema_version` is a required field on every payload (input and output)
- Format: semantic versioning `"major.minor"` (e.g., `"1.0"`, `"1.1"`, `"2.0"`)
- **Minor version bump:** additive changes (new optional fields) — backward compatible
- **Major version bump:** breaking changes (field removal, type change, renamed fields) — requires migration
- Consumers must tolerate unknown fields (forward compatibility)
- Producers must always include all required fields for their declared version

### 7.1 Entity: [Entity Name]

**Purpose:** [One sentence — what this entity represents]

```json
{
  "schema_version": "1.0",
  "id": "uuid-v4",
  "field_1": "string",
  "field_2": 42.5,
  "field_3": "enum_value_a | enum_value_b | enum_value_c",
  "timestamp": "ISO-8601",
  "nested_object": {
    "sub_field": "value"
  },
  "metadata": {
    "source": "string",
    "correlation_id": "uuid"
  }
}
```

**Validation Rules:**

| Field | Type | Required | Constraints |
|-------|------|----------|------------|
| `id` | UUID v4 | Yes | Unique |
| `field_1` | string | Yes | Max 255 chars |
| `field_2` | float | Yes | Range: [min, max] |
| `field_3` | enum | Yes | One of: `enum_value_a`, `enum_value_b`, `enum_value_c` |
| `timestamp` | ISO-8601 | Yes | Must be within [tolerance] of server receive time |

**Example Invalid Payloads:**

| Invalid Input | Expected Error Code | Error Message |
|--------------|-------------------|---------------|
| Missing `id` field | 400 `VALIDATION_ERROR` | "id is required" |
| `field_2` out of range | 422 `DOMAIN_ERROR` | "field_2 must be between [min] and [max]" |
| Duplicate `id` | 409 `CONFLICT` | "Entity with this id already exists" |
| Malformed JSON | 400 `PARSE_ERROR` | "Invalid JSON payload" |

*Repeat Section 7.x for every entity in the system. At minimum, define schemas for all entities that cross a subsystem boundary or appear in an API endpoint.*

### 7.N Idempotency & Ordering

> For systems processing streaming or event-driven data, define these explicitly.

**Idempotency Strategy:**

| Endpoint / Flow | Idempotency Key | Behavior on Duplicate |
|----------------|----------------|----------------------|
| [e.g., POST /readings] | [e.g., `reading_id`] | [e.g., Return 409 Conflict, log duplicate, do not reprocess] |
| [e.g., POST /alerts/acknowledge] | [e.g., `alert_id + user_id`] | [e.g., Return 200 with existing acknowledgment, no side effects] |

**Ordering Guarantees:**

| Data Flow | Ordering Requirement | How Enforced |
|-----------|---------------------|-------------|
| [e.g., Sensor readings per mission] | [e.g., Process in timestamp order within each mission] | [e.g., Partition by mission_id in message queue] |
| [e.g., Anomaly alerts] | [e.g., No strict ordering required, but deduplication within 5-minute window] | [e.g., Dedup by anomaly_id at consumer] |

**Out-of-Order Handling:**

| Scenario | Behavior |
|----------|---------|
| Reading arrives with timestamp older than latest processed | [Accept and insert in correct position / Reject / Flag for review] |
| Reading arrives with future timestamp (> 5 min ahead) | [Reject with 422 / Accept with "clock_drift" flag] |

---

## 8. FUNCTIONAL REQUIREMENTS

> Structure for each feature: User Story → Functional Requirements Table → Acceptance Criteria (Gherkin) → Error Scenarios → Technical Acceptance Checklist → Data References

### 8.1 [Feature Name]

**User Story:** As a [persona], I want [action] so that [value].

**Functional Requirements:**

| ID | Requirement | Priority | Phase |
|----|------------|----------|-------|
| [PREFIX-01] | [Specific, implementable requirement] | Must / Should / Could | MVP / v2 / v3 |
| [PREFIX-02] | ... | ... | ... |

**Acceptance Criteria:**

```gherkin
Scenario: [Happy path scenario name]
  Given [precondition]
  And [additional context]
  When [action/trigger]
  Then [expected outcome]
  And [additional verification]

Scenario: [Edge case / error scenario name]
  Given [precondition]
  When [error condition]
  Then [expected error handling behavior]
```

**Error Scenarios & Edge Cases:**

| Scenario | Expected Behavior |
|----------|------------------|
| [What goes wrong] | [What the system does — specific HTTP code, retry behavior, fallback] |
| [Another failure mode] | [Specific behavior] |

**Technical Acceptance Checklist:**

> Agent: Use this checklist to verify your implementation is complete for this feature. Every item must pass before the feature is considered done.

- [ ] [Specific implementation detail — e.g., "WebSocket subscription sends payload matching Section 7.x schema"]
- [ ] [Another detail — e.g., "Retry policy: 3 attempts, exponential backoff 1s/5s/15s, dead-letter after final failure"]
- [ ] [Test requirement — e.g., "Integration test covers: happy path, duplicate rejection, malformed input, auth failure"]
- [ ] [Performance — e.g., "End-to-end latency verified < 5 seconds under load of N concurrent inputs"]
- [ ] [Observability — e.g., "Structured log emitted for every anomaly detection with correlation_id and processing_time_ms"]

**Data References:** Input: Section 7.x. Output: Section 7.y.

---

*Repeat Section 8.x for every feature.*

---

### 8.N Human-in-the-Loop (HITL) Flows

> For AI-first systems: define when and how humans are brought into automated decision flows. This is a first-class feature, not an afterthought.

**HITL Trigger Conditions:**

| Trigger | Condition | Routing |
|---------|----------|---------|
| Low-confidence prediction | Confidence score < [threshold, e.g., 0.7] | Route to [role] review queue |
| High-impact action | [e.g., Risk score > 90, recommended action = shutdown] | Route to [role] for approval |
| Model disagreement | Two models disagree on severity classification | Route to [role] with both assessments |
| New/unseen pattern | Anomaly type not in known categories | Route to [role] for labeling |
| [Custom trigger] | [Condition] | [Routing] |

**Review Queue Specification:**

| Attribute | Detail |
|-----------|--------|
| **UI Location** | [Where in the dashboard — e.g., dedicated "Review Queue" tab] |
| **Who can review** | [Roles with review permission] |
| **SLA to respond** | [e.g., Critical: 1 hour, High: 4 hours, Medium: 24 hours] |
| **Information shown** | [What context the reviewer sees — prediction, confidence, explanation, raw data, historical comparison] |
| **Actions available** | [Approve / Reject / Escalate / Relabel / Override with notes] |
| **Feedback loop** | [How reviewer decisions feed back — e.g., approved items added to training data, rejections logged for model audit] |

**Acceptance Criteria:**

```gherkin
Scenario: Low-confidence prediction routed for review
  Given the ML model returns a prediction with confidence < [threshold]
  When the prediction pipeline completes
  Then the prediction is NOT published as a confirmed anomaly
  And the prediction appears in the review queue for [role]
  And the reviewer sees: prediction details, confidence score, explanation, raw sensor data
  And the reviewer can: approve, reject, or relabel the prediction
  And the reviewer's decision is logged in the audit trail

Scenario: Reviewer approves a flagged prediction
  Given a prediction is in the review queue
  When a reviewer with [role] approves it
  Then the prediction is published as a confirmed anomaly
  And an alert is generated per normal alert rules
  And the approved prediction is queued for model retraining data
```

---

### 8.M Model Governance (for AI/ML features)

> Define the lifecycle rules for ML models used in the system. This is a business requirement because model behavior directly impacts business outcomes.

**Model Promotion Flow:**

```
Training (offline)
  → Validation (automated metrics gate)
    → Staging (shadow mode — predictions logged but not acted on)
      → Canary (small % of live traffic, monitored)
        → Production (full traffic)
          → Monitoring (continuous)
            → Retraining trigger → back to Training
```

**Promotion Gates:**

| Gate | Criteria | Approver |
|------|---------|---------|
| Training → Staging | [e.g., Accuracy ≥ 85% on holdout set, no bias regression] | Automated |
| Staging → Canary | [e.g., Shadow predictions match production within 5% error rate] | [Role — e.g., ML Lead] |
| Canary → Production | [e.g., 24h canary with no alert-rate regression, latency within budget] | [Role — e.g., ML Lead + Product Owner] |

**Retraining Triggers:**

| Trigger | Condition | Action |
|---------|----------|--------|
| Accuracy degradation | Production accuracy drops > [X]% below baseline over [time window] | Automated retraining pipeline initiated |
| Data drift | Input feature distribution shifts > [threshold] (measured by [method]) | Alert ML team + initiate retraining |
| Scheduled | Every [N weeks/months] regardless of performance | Automated retraining |
| Manual | ML team or product owner requests | Manual trigger |

**Model Rollback Policy:**

| Scenario | Action |
|----------|--------|
| Canary shows alert-rate regression > [X]% | Automatic rollback to previous production version |
| Production model error rate spikes | Alert ML team, automatic rollback if > [threshold] for > [duration] |
| Bias detected in production predictions | Immediate rollback + investigation |

**Model Versioning Requirements:**
- Every prediction output MUST include `model_version` (see Section 7)
- Model artifacts stored with immutable version tags
- Full lineage: training data version → model version → prediction ID
- Previous N model versions retained for rollback

---

## 9. NON-FUNCTIONAL REQUIREMENTS

> System-wide constraints. Every feature must satisfy all applicable NFRs.

### 9.1 Performance

| Metric | Target | Measurement Method | Phase |
|--------|--------|-------------------|-------|
| [e.g., Alert latency end-to-end] | [e.g., < 5 seconds] | [e.g., Distributed trace timing] | [MVP] |
| [e.g., Dashboard load time] | [e.g., < 3 seconds] | [e.g., Lighthouse / synthetic monitoring] | [MVP] |
| [e.g., API p95 response time] | [e.g., < 200ms for reads, < 500ms for writes] | [e.g., APM metrics] | [MVP] |

### 9.2 Reliability

| Metric | Target |
|--------|--------|
| System uptime | [e.g., 99.9% — 43.8 min downtime/month max] |
| Data durability | [e.g., No data loss on ingestion — at-least-once delivery] |
| Recovery Time Objective (RTO) | [e.g., < 1 hour for full service restoration] |
| Recovery Point Objective (RPO) | [e.g., < 5 minutes of data loss maximum] |
| Graceful degradation | [e.g., ML down → threshold-only mode; Alert service down → queue for retry] |

### 9.3 Security

| Requirement | Detail |
|------------|--------|
| Encryption in transit | [e.g., TLS 1.2+ everywhere] |
| Encryption at rest | [e.g., AES-256 for all stored data] |
| Authentication | [e.g., OAuth 2.1 / JWT with refresh rotation] |
| Authorization | RBAC per Section 4 access matrix |
| Audit logging | [e.g., Immutable, SOC2-aligned, all data access logged] |
| API rate limiting | [e.g., Per-role limits defined in Section 10] |
| Secrets management | [e.g., Vault/KMS, never hardcoded — enforced by CI] |

### 9.4 Scalability

| Dimension | MVP Target | Growth Target | Phase |
|-----------|-----------|---------------|-------|
| [e.g., Concurrent data feeds] | [e.g., 100] | [e.g., 10,000] | [v3] |
| [e.g., Data retention] | [e.g., 1 year] | [e.g., Configurable per client] | [v2] |
| [e.g., Horizontal scaling] | [e.g., Manual] | [e.g., Auto-scale on load] | [v2] |

### 9.5 Compliance

| Requirement | Detail |
|------------|--------|
| Audit trail | [e.g., Immutable, exportable, retention configurable] |
| Regulatory reporting | [e.g., Auto-generated, exportable PDF/CSV] |
| Data retention | [e.g., Configurable per client, auto-purge on expiry] |
| Data residency | [Specify regions if applicable, or "Not applicable for MVP"] |

### 9.6 AI/ML Specific

| Requirement | Detail |
|------------|--------|
| Explainability | [e.g., All predictions include feature importance + natural language summary] |
| Model versioning | [e.g., Every prediction tagged with model_version — see Section 7] |
| Bias monitoring | [e.g., Track prediction distribution across asset types, alert on skew] |
| Confidence thresholds | [e.g., Below threshold → HITL review queue per Section 8.N] |
| Model governance | [Per Section 8.M promotion flow] |
| Fallback | [e.g., Model unavailable → rule-based detection, flagged as "ml_unavailable"] |

---

## 10. API CONTRACT SUMMARY

> Overview of the system's API surface. The full OpenAPI specification is generated during Phase 1 implementation and maintained at `docs/API_SPEC.yaml`.

### Key Endpoints

| Method | Endpoint | Purpose | Auth | Rate Limit | Phase |
|--------|---------|---------|------|-----------|-------|
| [POST] | [/api/v1/resource] | [What it does] | [API key / JWT (Role+)] | [N/min] | [MVP] |
| [GET] | [/api/v1/resource] | [What it does] | [JWT (Role+)] | [N/min] | [MVP] |
| [WS] | [/ws/v1/live] | [Real-time feed] | [JWT] | [N/A] | [MVP] |

### Pagination Strategy

Cursor-based: `?cursor=<opaque_token>&limit=50`

- Default limit: 50
- Max limit: 200
- Response includes: `next_cursor` (null if no more results), `has_more` boolean

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description of what went wrong",
    "details": [
      { "field": "field_name", "issue": "Specific problem with this field" }
    ],
    "request_id": "req_abc123"
  }
}
```

**Standard Error Codes:**

| Code | HTTP Status | Meaning |
|------|-----------|---------|
| `VALIDATION_ERROR` | 400 | Request payload failed validation |
| `PARSE_ERROR` | 400 | Malformed JSON or unreadable body |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Authenticated but insufficient permissions |
| `NOT_FOUND` | 404 | Requested resource does not exist |
| `CONFLICT` | 409 | Duplicate or conflicting state |
| `DOMAIN_ERROR` | 422 | Valid syntax but violates business rules |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error (never expose internals) |

### Authentication Schemes

| Consumer Type | Auth Method | Token Lifetime | Refresh |
|--------------|------------|---------------|---------|
| [e.g., Drone / Device] | [e.g., API key via X-API-Key header] | [e.g., Long-lived, rotatable] | [N/A] |
| [e.g., Human User] | [e.g., OAuth 2.1 / JWT via Bearer token] | [e.g., 15 min access, 7 day refresh] | [Refresh token rotation] |

---

## 11. MILESTONES & DELIVERY PHASES

### Phase 1: [Name — e.g., Lean MVP] ([Timeline — e.g., 8-12 weeks])

| Feature | Priority | Dependencies |
|---------|----------|-------------|
| [Feature 1] | Must | [What must be built first] |
| [Feature 2] | Must | [Dependencies] |
| ... | ... | ... |

**Phase Exit Criteria:**
- [ ] All "Must" features functional and passing acceptance tests
- [ ] Performance NFRs met for MVP targets
- [ ] Security audit passed (no critical/high findings)
- [ ] Deployed to staging with monitoring operational
- [ ] Documentation: API spec, runbook, architecture doc

### Phase 2: [Name] ([Timeline])

- [Feature list with brief descriptions]

### Phase 3: [Name] ([Timeline])

- [Feature list with brief descriptions]

---

## 12. RISKS & MITIGATIONS

| Risk | Likelihood | Impact | Mitigation Strategy | Owner | Monitoring |
|------|-----------|--------|-------------------|-------|-----------|
| [Risk 1] | [Low/Med/High] | [Low/Med/High] | [Specific mitigation] | [Who owns it] | [How we detect it] |
| [Risk 2] | ... | ... | ... | ... | ... |

---

## 13. ASSUMPTIONS & DEPENDENCIES

### Assumptions

> If any assumption proves false, flag immediately — it likely changes the architecture.

- [Assumption 1 — e.g., "External system X provides data in format Y"]
- [Assumption 2 — e.g., "Minimum 1 year of historical data available for model training"]
- ...

### Dependencies

| Dependency | Owner | Risk if Delayed | Mitigation |
|-----------|-------|----------------|-----------|
| [External API spec] | [Team] | [Blocks X] | [Mock interface for development] |
| [Training data] | [Client] | [Blocks ML model] | [Use synthetic data for MVP] |
| ... | ... | ... | ... |

---

## 14. DECISION LOG

> Track major decisions that shape the system. Agent should reference these when making implementation choices.

| ID | Decision | Rationale | Alternatives Considered | Date | Decided By |
|----|---------|-----------|------------------------|------|-----------|
| D-001 | [What was decided] | [Why this choice] | [What else was considered] | YYYY-MM-DD | [Name] |
| D-002 | ... | ... | ... | ... | ... |

---

## 15. APPENDIX

### A. Industry References
- [Relevant standards, papers, regulations]

### B. Regulatory Standards
- [Applicable compliance frameworks — SOC2, HIPAA, ISO, etc.]

### C. Related Documents

| Document | Location | Purpose |
|---------|----------|---------|
| Project Instructions | `PROJECT_INSTRUCTIONS.md` | Agent development & quality standards |
| OpenAPI Specification | `docs/API_SPEC.yaml` | Full API contract (generated Phase 1) |
| Architecture Design | `docs/ARCHITECTURE.md` | Technical design decisions (generated Phase 2) |
| Security Requirements | `docs/SECURITY.md` | Security detail (generated Phase 1) |
| Agent Architecture | `docs/AGENT_DESIGN.md` | Multi-agent design (if applicable) |
| Operations | `docs/OPERATIONS.md` | SLOs, incident response, monitoring (generated Phase 6) |

### D. Template Usage Notes

**How to fill this template:**

1. Start with Sections 1-3 (Summary, Objectives, Scope) — these set direction
2. Define Section 4-5 (Personas, Glossary) — these establish shared language
3. Draw Section 6 (System Context) — this establishes boundaries
4. Define Section 7 (Data Contracts) — this is the most critical section for agents
5. Write Section 8 (Functional Requirements) — one block per feature
6. Set Section 9 (NFRs) — system-wide constraints
7. Outline Section 10 (API) — enough for the agent to generate the full OpenAPI spec
8. Plan Section 11 (Milestones) — what ships when
9. Fill in Sections 12-14 as they emerge

**What NOT to put in this BRD:**
- Agent behavior rules → belongs in `PROJECT_INSTRUCTIONS.md`
- Implementation details (which framework, which library) → belongs in `docs/ARCHITECTURE.md`
- Dev environment setup → belongs in Phase 0 of `PROJECT_INSTRUCTIONS.md`
- Operational procedures (backup, monitoring queries) → belongs in `docs/OPERATIONS.md`
- Testing strategy → belongs in `docs/TESTING.md`

**Living document principle:** Update this BRD as decisions are made and requirements evolve. Outdated specs produce broken implementations. Treat this like code — version it, review changes, keep it current.

---

> **End of BRD Template**
>
> This template + PROJECT_INSTRUCTIONS.md together form the complete specification system:
> - BRD tells the agent WHAT to build
> - PROJECT_INSTRUCTIONS tells the agent HOW to build it well
> - Together they enable autonomous, production-grade software development
