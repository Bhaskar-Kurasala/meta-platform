# 🗺️ THE SOLOPRENEUR PLATFORM BUILDER'S ROADMAP

## From Developer to Solo CEO: Building a Production-Grade Drone Analytics Platform with AI Agents

> **Who this is for:** A developer who normally works on modules, now building an entire commercial platform alone — acting as PM, BA, architect, developer, tester, DevOps engineer, and sales person simultaneously.
>
> **What this gives you:** A complete, stage-by-stage roadmap covering every phase from initial idea to paying customers, with specific frameworks, thinking tools, expected outcomes, correction mechanisms, and exactly how to leverage coding agents at each stage.
>
> **Core philosophy:** You are the architect and decision-maker. Agents are your execution team. Your job is to think clearly, decide well, and review thoroughly. Their job is to research, plan, write code, test, and document — fast.

---

## TABLE OF CONTENTS

- [The Mental Model: Your Role Has Changed](#the-mental-model)
- [The Complete Lifecycle Map](#the-complete-lifecycle-map)
- [Stage 0: Vision & Problem Discovery](#stage-0-vision--problem-discovery)
- [Stage 1: Market Validation & Business Case](#stage-1-market-validation--business-case)
- [Stage 2: Solution Design & Specification](#stage-2-solution-design--specification)
- [Stage 3: Architecture & Technical Design](#stage-3-architecture--technical-design)
- [Stage 4: Foundation & Environment Setup](#stage-4-foundation--environment-setup)
- [Stage 5: MVP Development](#stage-5-mvp-development)
- [Stage 6: Testing & Quality Assurance](#stage-6-testing--quality-assurance)
- [Stage 7: Pre-Production & Deployment](#stage-7-pre-production--deployment)
- [Stage 8: Launch & Early Customers](#stage-8-launch--early-customers)
- [Stage 9: Production Operations & Monitoring](#stage-9-production-operations--monitoring)
- [Stage 10: Iteration, Growth & Scale](#stage-10-iteration-growth--scale)
- [Frameworks & Thinking Tools Reference](#frameworks--thinking-tools-reference)
- [The Ops Landscape: MLOps, LLMOps, AgentOps](#the-ops-landscape)
- [Common Failure Modes & How to Avoid Them](#common-failure-modes)

---

## THE MENTAL MODEL

### What Changed: Developer → Solo CEO

As a module developer, you operated in **Stage 5** only — someone else handled Stages 0-4 and 6-10. Now you own the entire lifecycle. Here's the mindset shift:

```
OLD ROLE (Module Developer):
  Receive spec → Write code → Submit PR → Done

NEW ROLE (Solo Platform Builder):
  Discover problem → Validate market → Design solution → Specify requirements
  → Architect system → Set up infrastructure → Build features → Test everything
  → Deploy to production → Monitor & operate → Iterate based on feedback
  → Sell to customers → Support them → Scale the business
```

**The critical insight:** Coding is maybe 20-25% of the work. The rest is thinking, deciding, validating, and operating. AI agents amplify the coding part enormously, but they cannot replace your judgment on WHAT to build and WHY.

### Your Role at Each Stage

| Stage | Your Hat | Agent's Role | Your Time Split |
|-------|---------|-------------|----------------|
| 0-1 | Entrepreneur / Researcher | Research assistant, data analysis | 90% you, 10% agent |
| 2 | Product Manager / BA | Document drafter, spec writer | 60% you, 40% agent |
| 3 | Architect | Design generator, pattern researcher | 50% you, 50% agent |
| 4-5 | Tech Lead / Reviewer | Primary coder, test writer | 20% you, 80% agent |
| 6 | QA Lead | Test executor, bug fixer | 30% you, 70% agent |
| 7 | DevOps Engineer | Infrastructure builder, CI/CD creator | 25% you, 75% agent |
| 8 | Sales / Customer Success | Demo builder, docs writer | 50% you, 50% agent |
| 9 | SRE / Operations | Monitor, alert responder, bug fixer | 30% you, 70% agent |
| 10 | CEO / Product Strategist | Feature builder, researcher | 40% you, 60% agent |

---

## THE COMPLETE LIFECYCLE MAP

```
┌─────────────────────────────────────────────────────────────────────┐
│                    THE SOLOPRENEUR LIFECYCLE                         │
│                                                                     │
│  DISCOVERY          DEFINITION         DELIVERY         OPERATION   │
│  ─────────          ──────────         ────────         ─────────   │
│                                                                     │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐      │
│  │  S0  │→ │  S1  │→ │  S2  │→ │  S3  │→ │  S4  │→ │  S5  │      │
│  │Vision│  │Valid-│  │Spec &│  │Archi-│  │Found-│  │ MVP  │      │
│  │  &   │  │ation │  │Design│  │tect  │  │ation │  │Build │      │
│  │Probl.│  │  &   │  │  &   │  │  &   │  │  &   │  │      │      │
│  │Disc. │  │Biz   │  │BRD   │  │Tech  │  │Env   │  │      │      │
│  └──────┘  │Case  │  └──────┘  │Design│  │Setup │  └──┬───┘      │
│            └──────┘            └──────┘  └──────┘     │           │
│                 ↑                                       │           │
│                 │         FEEDBACK LOOPS                 ↓           │
│                 │    ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐       │
│                 └────│  S10 │← │  S9  │← │  S8  │← │  S6  │──┐   │
│                      │Iter- │  │Prod  │  │Launch│  │Test &│  │   │
│                      │ation │  │Ops & │  │  &   │  │  QA  │  │   │
│                      │  &   │  │Moni- │  │Early │  │      │  │   │
│                      │Growth│  │tor   │  │Users │  │      │  │   │
│                      └──────┘  └──────┘  └──────┘  └──────┘  │   │
│                                                        ↑       │   │
│                                                     ┌──┴───┐   │   │
│                                                     │  S7  │←──┘   │
│                                                     │Deploy│       │
│                                                     └──────┘       │
└─────────────────────────────────────────────────────────────────────┘
```

**Key principle:** This is NOT waterfall. You iterate within and between stages. But you must reach each stage's exit criteria before moving forward, otherwise you're building on sand.

---

## STAGE 0: VISION & PROBLEM DISCOVERY

**Duration:** 1-2 weeks
**Your hat:** Entrepreneur / Domain Researcher
**Goal:** Find a painful, real problem that people will pay money to solve

### What You Do

**0.1 — Personal Vision Clarification**

Before researching markets, answer these honestly (write your answers down):

- What domain do I know well enough to build something meaningful?
- What problem keeps coming up that I can see a solution for?
- Am I building this because I want to, or because the market needs it?
- Can I commit 6-12 months to this specific problem?
- What does success look like at 6 months? 12 months? 3 years?

**Framework: Personal SWOT Analysis**

| | Helpful | Harmful |
|---|---------|---------|
| **Internal** | **Strengths:** Your skills, domain expertise, technical ability | **Weaknesses:** Skills you lack (sales? design? DevOps?) |
| **External** | **Opportunities:** Market gaps, timing, technology shifts | **Threats:** Competitors, regulation, market changes |

**0.2 — Problem Discovery Research**

Go where your target users complain honestly:

- Industry forums, Reddit, LinkedIn groups for drone operators and inspection companies
- Industry reports (search for "industrial inspection market", "drone inspection challenges")
- Conference talks and podcasts from people in the space
- Competitor product reviews (what do people hate about existing solutions?)
- Regulatory documents (what's mandatory that's hard to comply with?)

**0.3 — Problem Hypothesis Formation**

Write down 3-5 problem hypotheses in this format:

```
[Target user] has the problem of [specific pain point]
because [root cause], which costs them [quantified impact].
Currently they solve this by [existing solution],
which fails because [specific shortcomings].
```

### How Agents Help at This Stage

- Ask Claude to research a specific industry and summarize market reports
- Have Claude analyze competitor products from their websites and reviews
- Use Claude to synthesize patterns from multiple research sources
- Ask Claude to challenge your assumptions (red-team your hypotheses)

### Exit Criteria (Must Have Before Moving to Stage 1)

- [ ] 3-5 specific problem hypotheses written down
- [ ] Each hypothesis identifies: WHO has the problem, WHAT the problem is, HOW MUCH it costs them
- [ ] Initial understanding of who the buyer is (the person who signs the check)
- [ ] List of 5-10 potential early customers you could talk to
- [ ] Honest self-assessment: can you build this? Do you want to?

### Red Flags (Stop and Reconsider)

- You can't identify a specific person who has this problem
- The problem is interesting but nobody would pay to solve it
- You're excited about the technology but can't articulate the business problem
- Existing solutions are "good enough" for most users

---

## STAGE 1: MARKET VALIDATION & BUSINESS CASE

**Duration:** 2-4 weeks
**Your hat:** Product Manager / Business Analyst
**Goal:** Prove that real people have this problem AND will pay for a solution

### What You Do

**1.1 — Customer Discovery Interviews (Critical)**

Talk to 10-15 potential customers. Not friends. Not other developers. Real people who have the problem.

**Interview framework (Jobs to Be Done):**
- What are you trying to accomplish? (the "job")
- What's the hardest part about that?
- How do you solve it today?
- What don't you like about that solution?
- If you could wave a magic wand, what would change?
- How much does this problem cost you? (time, money, risk)

**Rules:**
- Listen 80%, talk 20%
- Never pitch your solution during discovery
- Write down exact quotes — these become your marketing copy later
- Pay attention to emotional intensity — mild annoyance ≠ burning pain

**1.2 — Competitive Landscape Analysis**

**Framework: Porter's Five Forces (simplified for solo founder)**

| Force | Question | Implication |
|-------|---------|------------|
| Existing competitors | Who solves this today? How well? | Can you be 10x better at one thing? |
| New entrants | How hard is it for someone else to build this? | What's your moat? |
| Substitutes | What do people do instead of buying software? | Are you competing with Excel/manual processes? |
| Buyer power | How many potential buyers? How price-sensitive? | Can you charge enough to sustain the business? |
| Supplier power | Do you depend on specific APIs, data sources, or models? | Single-vendor dependency risk |

**1.3 — Business Model Canvas (Lean Version)**

Fill this out on a single page:

- **Customer Segments:** Who exactly? (Job titles, company sizes, industries)
- **Value Proposition:** What unique value do you provide? (Specific, not "AI-powered analytics")
- **Channels:** How will they find you? How will you reach them?
- **Revenue Streams:** How much? Per user? Per site? Per month? One-time?
- **Key Resources:** What do you need? (Tech stack, data, expertise)
- **Cost Structure:** What does it cost to build and run?

**1.4 — Financial Viability Check**

Do the math. Be honest.

```
Target price per customer per month:   $______
Customers needed to cover your costs:  ______
Realistic customers in 12 months:      ______
Monthly burn rate (infra + tools):     $______
Runway before you need revenue:        ______ months
```

### How Agents Help at This Stage

- Have Claude analyze competitor websites and extract feature matrices
- Ask Claude to build a financial model in a spreadsheet
- Use Claude to draft a Business Model Canvas from your interview notes
- Ask Claude to identify risks and weak points in your business case (red team)

### Exit Criteria

- [ ] Talked to ≥10 potential customers
- [ ] ≥6 out of 10 confirmed the problem is real and painful
- [ ] At least 2-3 expressed willingness to pay (or try a beta)
- [ ] Business model makes financial sense (revenue > costs within 12-18 months)
- [ ] Competitive analysis complete — you know your differentiation
- [ ] One-page business case written (problem, solution, market, revenue model)

### Red Flags

- Fewer than 5 out of 10 people confirm the problem
- People say "sounds cool" but won't commit to trying it
- Your differentiation is "we use AI" (everyone says that)
- The math doesn't work unless you get thousands of customers quickly

### Correction Mechanism

If validation fails, don't abandon everything. Pivot:
- Same problem, different customer segment?
- Same customer, different problem?
- Same market, narrower focus?

---

## STAGE 2: SOLUTION DESIGN & SPECIFICATION

**Duration:** 2-3 weeks
**Your hat:** Product Manager + Business Analyst
**Goal:** Define WHAT to build with enough precision that agents can implement it

### What You Do

**2.1 — Solution Hypothesis**

Map each validated problem to a system behavior:

```
Problem: Operators can't detect pipeline corrosion early enough
→ System behavior: Real-time anomaly detection on thermal sensor data
→ Feature: Anomaly Detection Engine with configurable thresholds
→ User story: As an inspection analyst, I want to see corrosion alerts
  within 5 seconds of detection so I can route maintenance teams immediately
```

**2.2 — Feature Prioritization**

**Framework: RICE Scoring**

| Feature | Reach | Impact | Confidence | Effort | RICE Score |
|---------|-------|--------|-----------|--------|-----------|
| Real-time anomaly alerts | [users affected] | [1-3 scale] | [% sure] | [person-weeks] | R×I×C/E |

Sort by RICE score. The top 3-5 features become your MVP.

**Framework: MoSCoW for MVP**
- **Must:** Without these, the product is useless (3-5 features max)
- **Should:** Significantly improve value but not blockers
- **Could:** Nice-to-have, add later
- **Won't (this version):** Explicitly excluded

**2.3 — Create the BRD**

This is where you use the BRD Template we already created. Fill in every section:

1. Executive Summary (problem, solution, impact)
2. Objectives & Success Metrics (OKR framework)
3. Scope (in/out/future — this is CRITICAL for agents)
4. User Personas & RBAC Matrix
5. Domain Glossary (authoritative naming)
6. System Context & Boundaries
7. Data Contracts (JSON schemas for every entity)
8. Functional Requirements (feature → user story → Gherkin → error cases)
9. Non-Functional Requirements (performance, security, reliability targets)
10. API Contract Summary
11. Milestones & Delivery Phases
12. Risks, Assumptions, Decision Log

**2.4 — Acceptance Criteria Writing**

For every feature, write Gherkin scenarios:

```gherkin
Scenario: Thermal anomaly detected above threshold
  Given a drone is transmitting thermal sensor readings for pipeline asset P-001
  And the anomaly detection model is active for thermal sensors
  When a reading arrives with temperature 95°C (threshold is 80°C)
  Then an anomaly event is created with severity "high" and confidence ≥ 0.8
  And an alert is generated and sent to the assigned inspection analyst
  And the alert appears on the real-time dashboard within 5 seconds
```

### How Agents Help at This Stage

- **Primary use:** Have Claude draft the entire BRD from your notes and interview findings
- Claude generates JSON schemas from your entity descriptions
- Claude writes Gherkin acceptance criteria from your user stories
- Claude generates the error scenario tables for each feature
- Claude creates the RBAC access control matrix
- You review, refine, and approve everything

**Agent workflow:**
```
You: "Here are my interview notes, validated problems, and feature priorities.
      Draft a BRD using our template."
Agent: [Drafts complete BRD]
You: [Review every section — challenge, refine, approve]
Agent: [Generates schemas/, API_SPEC.yaml skeleton from approved BRD]
```

### Exit Criteria

- [ ] Complete BRD with all 15 sections filled
- [ ] JSON schemas for every boundary-crossing entity
- [ ] Gherkin acceptance criteria for every Must-have feature
- [ ] OpenAPI skeleton covering all endpoints
- [ ] MVP scope clearly defined (≤5 core features)
- [ ] Human reviewed and approved every section

### Red Flags

- BRD has vague requirements ("the system should be fast")
- No data contracts — you're describing entities in prose
- Acceptance criteria are high-level ("user can view dashboard")
- Scope keeps expanding during this stage

---

## STAGE 3: ARCHITECTURE & TECHNICAL DESIGN

**Duration:** 1-2 weeks
**Your hat:** Solution Architect
**Goal:** Design the technical solution that satisfies both functional and non-functional requirements

### What You Do

**3.1 — Architecture Decision Records (ADRs)**

For every major technical choice, document:

```
## ADR-001: Database Selection

### Status: Accepted
### Context: We need to store time-series sensor data (high write volume)
  and relational data (users, missions, assets)
### Decision: PostgreSQL with TimescaleDB extension
### Rationale: Single database reduces operational complexity for solo operator.
  TimescaleDB handles time-series natively. PostgreSQL handles relational.
  Both are well-supported, open-source, and have managed cloud options.
### Alternatives Considered:
  - InfluxDB + PostgreSQL (two databases = double ops burden)
  - ClickHouse (powerful but less ecosystem for relational queries)
### Consequences: Must design partitioning strategy for sensor data.
  May need to separate if write volume exceeds single-node capacity.
```

**Key ADRs for a solo founder:**

| Decision | Solo-Founder Bias | Why |
|----------|-----------------|-----|
| Monolith vs microservices | **Monolith first** | You're one person. One deploy, one log stream, one thing to debug at 3am. |
| Database count | **Minimize** | Every database is another thing to back up, monitor, and migrate |
| Cloud provider | **One provider** | Multi-cloud is for companies with cloud teams, not solo founders |
| Build vs buy | **Buy/SaaS whenever possible** | Your time is the scarcest resource. Use managed services. |
| Framework selection | **Popular, well-documented** | Agents know popular frameworks best. Niche frameworks = worse agent output. |

**3.2 — System Design**

Create `docs/ARCHITECTURE.md`:

- System context diagram (what's inside vs outside your system)
- Component diagram (how subsystems connect)
- Data flow diagram (how data moves through the system)
- Deployment diagram (where things run)

**3.3 — Technology Stack Selection**

**Framework: Technology Radar (adapted for solo founder)**

| Layer | Choice | Rationale | Agent Familiarity |
|-------|--------|-----------|------------------|
| Language | TypeScript | Full-stack, one language, huge ecosystem | Excellent |
| API Framework | Fastify/Express | Well-documented, agent-friendly | Excellent |
| Database | PostgreSQL + TimescaleDB | One DB, handles relational + time-series | Excellent |
| Message Queue | Redis Streams or managed Kafka | Start simple, scale later | Good |
| ML Framework | Python + scikit-learn/PyTorch | Standard ML stack | Excellent |
| Frontend | React + Next.js | Agents generate React extremely well | Excellent |
| Infrastructure | AWS/GCP managed services | Minimize ops burden | Excellent |
| CI/CD | GitHub Actions | Integrated with repo, agent-friendly | Excellent |

**Solo founder rule:** Pick boring technology. Agents write better code for well-established, well-documented frameworks. Novel/cutting-edge means worse agent output and more debugging time for you.

### How Agents Help at This Stage

- Have Claude research architecture patterns for your specific use case
- Claude drafts ARCHITECTURE.md with diagrams
- Claude generates ADRs for each major decision
- Claude evaluates technology options against your NFRs
- You make the final decisions — agents propose, you decide

### Exit Criteria

- [ ] docs/ARCHITECTURE.md written with all diagrams
- [ ] ADRs for all major technology choices (≥5 ADRs)
- [ ] Technology stack selected and justified
- [ ] Non-functional requirements mapped to architecture decisions
- [ ] Deployment model chosen (cloud provider, managed vs self-hosted)
- [ ] Cost estimate for infrastructure (monthly)

---

## STAGE 4: FOUNDATION & ENVIRONMENT SETUP

**Duration:** 3-5 days
**Your hat:** DevOps Engineer / Tech Lead
**Goal:** Create the working environment so agents can start building immediately

### What You Do

This is where the **Agent-Ready Checklist** comes in. Follow it step by step.

**4.1 — Day 1: Repository & Documents**

```
Agent tasks:
1. Create repository structure (from Agent-Ready Checklist)
2. Commit PROJECT_INSTRUCTIONS.md
3. Commit docs/BRD.md
4. Generate schemas/ from BRD data contracts
5. Generate docs/API_SPEC.yaml skeleton from BRD
6. Create PR template + issue templates
7. Create CODEOWNERS file
```

**4.2 — Day 2: Dev Environment & CI**

```
Agent tasks:
1. Create dev/docker-compose.yml (PostgreSQL, Redis, app)
2. Create scripts/init.sh (start env, health checks)
3. Create .github/workflows/ci.yml (build + lint + test + security scan)
4. Create reference/ implementations for chosen stack
5. Create synthetic data generators
```

**4.3 — Day 3: Quality Infrastructure**

```
Agent tasks:
1. Create contract tests (tests/contract/)
2. Implement auth skeleton (RBAC from BRD)
3. Create docs/FEATURES.md (priority-ordered)
4. Create first ADRs
```

**You review and approve everything before Stage 5 begins.**

### Exit Criteria

- [ ] `scripts/init.sh` runs successfully — local dev environment is healthy
- [ ] CI pipeline passes on empty project
- [ ] All schemas validate
- [ ] Reference implementations exist and compile
- [ ] Synthetic data generator produces valid test data
- [ ] Agent can read PROJECT_INSTRUCTIONS.md and BRD.md and understand what to build

---

## STAGE 5: MVP DEVELOPMENT

**Duration:** 6-10 weeks
**Your hat:** Tech Lead / Code Reviewer
**Goal:** Build the Must-have features from the BRD, following the spec-first workflow

### The Spec-Driven Development Workflow

For EVERY feature, follow this cycle:

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  1. Agent reads FEATURES.md → picks next feature    │
│                    ↓                                │
│  2. Agent reads BRD section for that feature        │
│                    ↓                                │
│  3. Agent creates plan.md (approach, affected files) │
│                    ↓                                │
│  4. YOU review plan → approve or redirect           │
│                    ↓                                │
│  5. Agent implements feature (code + tests)         │
│                    ↓                                │
│  6. CI validates (build, lint, test, security)      │
│                    ↓                                │
│  7. YOU review PR (against Definition of Done)      │
│                    ↓                                │
│  8. Merge → agent updates progress tracker          │
│                    ↓                                │
│  9. Repeat for next feature                         │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**5.1 — Feature Build Order (typical for analytics platform)**

| Week | Feature | Why This Order |
|------|---------|---------------|
| 1-2 | Data ingestion pipeline | Everything depends on getting data in |
| 2-3 | Data storage & retrieval | Need to persist and query data |
| 3-4 | Basic dashboard (read-only) | First visible proof of value |
| 4-6 | Anomaly detection engine | Core differentiator |
| 6-7 | Alert system | Users need to be notified |
| 7-8 | User auth & RBAC | Security before any external access |
| 8-9 | Risk prediction (basic model) | ML-first value proposition |
| 9-10 | Integration & polish | End-to-end flows work |

**5.2 — Daily Rhythm for Agent-Driven Development**

```
Morning (1-2 hours — YOU):
  - Review yesterday's agent PRs
  - Approve or request changes
  - Update FEATURES.md status
  - Set today's agent task priorities

Day (agent works, you do other stages):
  - Agent implements features
  - Agent writes tests
  - Agent updates docs
  - CI runs on every commit

Evening (30 min — YOU):
  - Check CI status
  - Quick review of agent progress
  - Note any concerns for morning review
```

### How Agents Work During This Stage

- Agent reads `PROJECT_INSTRUCTIONS.md` at session start
- Agent reads `claude-progress.txt` to understand where it left off
- Agent reads `docs/FEATURES.md` to determine what to work on
- Agent runs `scripts/init.sh` to verify dev environment is healthy
- Agent follows the spec → plan → implement workflow
- Agent maintains `claude-progress.txt` at end of each session

### Exit Criteria

- [ ] All "Must" features implemented and passing tests
- [ ] All Gherkin acceptance criteria satisfied
- [ ] API matches OpenAPI spec (contract tests pass)
- [ ] End-to-end flow works: data in → anomaly detected → alert sent → user sees it
- [ ] Code coverage meets PROJECT_INSTRUCTIONS targets
- [ ] No critical or high security scan findings

---

## STAGE 6: TESTING & QUALITY ASSURANCE

**Duration:** 2-3 weeks (overlaps with Stage 5)
**Your hat:** QA Lead
**Goal:** Verify the system works correctly, performs adequately, and handles failures gracefully

### Testing Pyramid

```
        ┌─────────┐
        │  E2E    │  5-10 critical user journeys
        │  Tests  │  (Playwright/Cypress)
       ┌┴─────────┴┐
       │Integration │  API + DB + external service tests
       │   Tests    │  (Supertest/pytest)
      ┌┴────────────┴┐
      │  Contract     │  API responses match OpenAPI spec
      │  Tests        │  (Prism/Pact)
     ┌┴───────────────┴┐
     │   Unit Tests     │  Individual functions/modules
     │                  │  (Jest/pytest)
     └──────────────────┘
```

**6.1 — Test Types & When Agent Creates Them**

| Test Type | When Created | Agent Creates | You Review |
|-----------|-------------|--------------|-----------|
| Unit tests | With every feature (Stage 5) | Yes | Yes |
| Contract tests | After API skeleton (Stage 4) | Yes | Yes |
| Integration tests | After feature integrations work | Yes | Yes |
| E2E tests | After end-to-end flow works | Yes, from Gherkin scenarios | Yes |
| Load tests | Before production deployment | Yes (k6/artillery scripts) | Yes |
| Security tests | CI pipeline + manual review | Automated scan | You review findings |
| Chaos/failure tests | Before production | Agent writes, you design scenarios | Yes |

**6.2 — Performance Testing**

Test against your NFRs:

| NFR | Test | Tool | Pass Criteria |
|-----|------|------|-------------|
| Alert latency < 5s | End-to-end timing test | Custom + k6 | p95 < 5 seconds |
| API p95 < 200ms | Load test at expected concurrency | k6 | p95 < 200ms |
| Dashboard load < 3s | Lighthouse + synthetic monitoring | Lighthouse | Score > 80 |
| 100 concurrent feeds | Sustained load test | k6 | No errors, latency stable |

**6.3 — Failure Mode Testing**

| Scenario | What to Test | Expected Behavior |
|----------|-------------|------------------|
| Database goes down | Kill PostgreSQL during operation | Graceful error, no data loss, auto-reconnect |
| Message queue full | Flood with messages beyond capacity | Backpressure, no crash, alerts fired |
| ML model unavailable | Stop model service | Fallback to rule-based detection |
| Invalid sensor data | Send malformed payloads | 400 error, no crash, logged |
| Network partition | Drop connectivity to external services | Circuit breaker opens, retry on recovery |

### Exit Criteria

- [ ] All test types passing in CI
- [ ] Performance NFRs validated with load tests
- [ ] Failure modes tested and handled gracefully
- [ ] Security scan clean (no critical/high)
- [ ] Test coverage meets targets
- [ ] Bug backlog triaged — no P0/P1 bugs remaining

---

## STAGE 7: PRE-PRODUCTION & DEPLOYMENT

**Duration:** 1-2 weeks
**Your hat:** DevOps Engineer / SRE
**Goal:** Get the system running reliably in a production-like environment

### What You Do

**7.1 — Infrastructure Setup**

```
Agent tasks:
1. Create Terraform/IaC for staging environment
2. Set up managed database (RDS/Cloud SQL + TimescaleDB)
3. Set up managed message queue (if needed)
4. Configure secrets management (cloud KMS)
5. Set up container registry + deployment pipeline
6. Configure DNS + TLS certificates
7. Deploy to staging
```

**7.2 — Observability Setup**

```
Agent tasks:
1. Instrument application with OpenTelemetry (traces, metrics, logs)
2. Set up monitoring dashboards (Grafana or cloud-native)
3. Define SLOs and alert thresholds
4. Create incident response runbooks
5. Set up on-call alerting (PagerDuty/Opsgenie or even email/SMS)
```

**7.3 — Production Readiness Checklist**

| Category | Item | Status |
|----------|------|--------|
| **Security** | Secrets in KMS (not in code/env files) | [ ] |
| | TLS everywhere | [ ] |
| | RBAC enforced on all endpoints | [ ] |
| | Rate limiting configured | [ ] |
| | Security headers set (CORS, CSP, HSTS) | [ ] |
| **Reliability** | Health check endpoints working | [ ] |
| | Graceful shutdown implemented | [ ] |
| | Database backups configured + tested restore | [ ] |
| | Circuit breakers on external calls | [ ] |
| **Observability** | Structured logging to aggregation service | [ ] |
| | Request tracing across services | [ ] |
| | Key business metrics dashboarded | [ ] |
| | Alerts configured for SLO breaches | [ ] |
| **Operations** | Deployment runbook written | [ ] |
| | Rollback procedure tested | [ ] |
| | Database migration strategy verified | [ ] |
| | Incident response plan documented | [ ] |

### Exit Criteria

- [ ] Staging environment running and stable for 48+ hours
- [ ] Full deployment pipeline working (push to main → staging auto-deploys)
- [ ] Monitoring dashboards showing real data
- [ ] Alerts firing correctly (test by triggering alert conditions)
- [ ] Backup + restore tested successfully
- [ ] Rollback tested successfully
- [ ] Production readiness checklist complete

---

## STAGE 8: LAUNCH & EARLY CUSTOMERS

**Duration:** 2-4 weeks
**Your hat:** Sales / Customer Success / Product Manager
**Goal:** Get the product in front of real users and collect feedback

### What You Do

**8.1 — Beta Program (2-3 customers)**

Go back to the people from Stage 1 who said they'd try it.

- Offer free or heavily discounted access in exchange for feedback
- Set clear expectations: "This is early, I want your honest input"
- Set up direct communication channel (Slack, WhatsApp, email)
- Schedule weekly 30-min feedback calls

**8.2 — Feedback Collection Framework**

After every interaction, categorize feedback:

| Category | Action | Timeline |
|----------|--------|---------|
| Bug (broken) | Fix immediately | This week |
| Usability issue (confusing) | Redesign and fix | Next sprint |
| Missing feature (expected it) | Add to backlog, prioritize | Evaluate |
| Nice-to-have (wish it could) | Note but don't build yet | Later |
| Positive (this is great) | Document for marketing | Now |

**8.3 — Product-Market Fit Check**

Ask beta users: "How would you feel if you could no longer use this product?"

- **Very disappointed** → Product-market fit signal
- **Somewhat disappointed** → Getting close, keep iterating
- **Not disappointed** → Problem — you haven't solved a real pain point

**Target: ≥40% say "very disappointed" (Sean Ellis test)**

### Exit Criteria

- [ ] ≥2 beta customers actively using the product
- [ ] Weekly feedback sessions happening
- [ ] Critical bugs from beta fixed
- [ ] Product-market fit signal (≥40% "very disappointed" or strong qualitative signal)
- [ ] First paying customer (even if discounted)

---

## STAGE 9: PRODUCTION OPERATIONS & MONITORING

**Duration:** Ongoing
**Your hat:** SRE / Operations
**Goal:** Keep the system running, detect problems before customers do, evolve confidently

### The Three Ops Disciplines You Need

**9.1 — DevOps (Application Operations)**

| What | How | Tools |
|------|-----|-------|
| Deploy new versions | Automated CI/CD pipeline | GitHub Actions |
| Monitor application health | Dashboards + alerts | Grafana / CloudWatch |
| Handle incidents | Runbooks + alert routing | PagerDuty / email |
| Scale resources | Auto-scaling or manual based on metrics | Cloud auto-scaling |

**9.2 — MLOps (Model Operations)**

| What | How | Tools |
|------|-----|-------|
| Track model performance | Metrics dashboard (accuracy, precision, recall) | MLflow / custom |
| Detect model drift | Compare prediction distributions over time | Custom + monitoring |
| Retrain models | Triggered by drift or schedule | Automated pipeline |
| Promote models | Staging → canary → production (human approval) | MLflow + CI/CD |
| Version models | Every prediction tagged with model_version | MLflow registry |

**9.3 — LLMOps / AgentOps (if your product uses LLM agents)**

| What | How | Tools |
|------|-----|-------|
| Track agent performance | Trace every agent interaction | LangSmith / custom |
| Monitor costs | Token usage per agent per request | Custom dashboard |
| Detect hallucinations | Output validation + user feedback | Guardrails + eval |
| Version prompts | Prompts stored externally, version-controlled | Git repo |
| A/B test prompts | Compare prompt versions on quality metrics | Custom eval pipeline |

### Monitoring Dashboard Essentials

```
BUSINESS METRICS (what matters to customers):
  - Anomaly detection latency (target: < 5s)
  - Alert delivery success rate (target: > 99%)
  - False positive rate (target: < 10%)
  - System uptime (target: 99.9%)

APPLICATION METRICS (what matters to you):
  - API error rate
  - API latency (p50, p95, p99)
  - Database connection pool usage
  - Message queue depth and consumer lag
  - Memory and CPU usage

ML METRICS (what matters to model health):
  - Prediction accuracy (rolling window)
  - Data drift score
  - Model inference latency
  - Feature distribution changes
  - Retraining pipeline status
```

### Correction Mechanisms

| Signal | What It Means | Action |
|--------|-------------|--------|
| Alert latency increasing | Pipeline bottleneck | Profile, optimize, or scale |
| False positive rate increasing | Model drift or data quality issue | Investigate data, consider retrain |
| Error rate spike | Bug in recent deploy | Rollback, investigate |
| Customer complaints | Feature gap or UX issue | Prioritize fix in next iteration |
| Model accuracy declining | Concept drift | Trigger retraining pipeline |

---

## STAGE 10: ITERATION, GROWTH & SCALE

**Duration:** Ongoing
**Your hat:** CEO / Product Strategist
**Goal:** Continuously improve the product, grow the customer base, scale the business

### The Iteration Loop

```
Customer feedback → Prioritize → Specify → Build → Test → Deploy → Measure
      ↑                                                              │
      └──────────────────────────────────────────────────────────────┘
```

**10.1 — Prioritization Framework (Continuous)**

Use RICE scoring for every feature request, bug fix, and improvement:

| Item | Reach | Impact | Confidence | Effort | Score | Decision |
|------|-------|--------|-----------|--------|-------|---------|
| [Feature request from customer] | ... | ... | ... | ... | ... | Build / Defer / Decline |

**10.2 — Growth Strategy**

| Channel | Solo Founder Approach |
|---------|---------------------|
| Content marketing | Write articles about problems you solve (agent helps draft) |
| SEO / AEO | Optimize for both search engines and AI assistants |
| Direct sales | You call prospects, do demos, close deals |
| Partnerships | Integrate with tools your customers already use |
| Community | Share knowledge in industry forums, conferences |
| Product-led growth | Free tier or trial that converts to paid |

**10.3 — When to Scale (Signals)**

| Signal | Meaning | Action |
|--------|---------|--------|
| You can't handle support load | Too many customers for one person | Hire support or build self-service |
| Customers need features you can't build | Technical ceiling | Hire a developer or specialist |
| Infrastructure costs growing fast | Scale challenges | Optimize architecture, consider multi-tenant |
| Multiple enterprise inquiries | Market pull | Consider enterprise tier, compliance investment |

---

## FRAMEWORKS & THINKING TOOLS REFERENCE

### For Each Stage of the Journey

| Stage | Framework | What It Does | When to Use |
|-------|----------|-------------|-------------|
| 0 | **SWOT Analysis** | Map strengths, weaknesses, opportunities, threats | Before committing to an idea |
| 0-1 | **Jobs to Be Done (JTBD)** | Understand what customers are trying to accomplish | Customer interviews |
| 1 | **Business Model Canvas** | One-page business model | Validating business viability |
| 1 | **Porter's Five Forces** | Competitive landscape analysis | Understanding market dynamics |
| 1 | **TAM/SAM/SOM** | Market size estimation | Investor conversations / self-check |
| 2 | **RICE Scoring** | Feature prioritization (Reach × Impact × Confidence / Effort) | Deciding what to build |
| 2 | **MoSCoW** | Must/Should/Could/Won't prioritization | Defining MVP scope |
| 2 | **Design Thinking** | Empathize → Define → Ideate → Prototype → Test | Solving UX/product problems |
| 2-3 | **Double Diamond** | Diverge/converge on problem, then diverge/converge on solution | Complex product decisions |
| 3 | **ADR (Architecture Decision Records)** | Document technical choices with rationale | Every major technical decision |
| 3 | **C4 Model** | Context → Container → Component → Code diagrams | Communicating architecture |
| 5 | **Spec-Driven Development (SDD)** | Spec → Plan → Tasks → Code | Agent-driven feature building |
| 5 | **Lean Startup Build-Measure-Learn** | Build smallest thing, measure, learn, iterate | Ongoing product development |
| 8 | **Sean Ellis Test** | "How disappointed would you be?" survey | Measuring product-market fit |
| 8-10 | **Pirate Metrics (AARRR)** | Acquisition → Activation → Retention → Referral → Revenue | Growth tracking |
| 9 | **SLO/SLI/SLA** | Define reliability targets and measure against them | Operations and customer contracts |
| 10 | **North Star Metric** | One metric that captures core product value | Aligning all decisions |

### Decision-Making Frameworks

| Situation | Framework |
|-----------|----------|
| Big irreversible decision | **One-Way Door** — take time, analyze thoroughly |
| Small reversible decision | **Two-Way Door** — decide fast, reverse if wrong |
| Multiple competing priorities | **Eisenhower Matrix** — Urgent/Important quadrant |
| Technical trade-off | **ADR** — document the decision, rationale, alternatives |
| "Should we build this?" | **RICE** → if score is low, don't build it |
| "Is this product working?" | **Sean Ellis + NPS** → if < 40% disappointed, iterate |

---

## THE OPS LANDSCAPE

### Understanding What You Need

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│   MLOps           LLMOps           AgentOps          DevOps      │
│   ─────           ──────           ────────          ─────       │
│   Training        Prompt           Agent             Application │
│   models          engineering      orchestration     deployment  │
│                                                                  │
│   Feature         RAG pipeline     Tool management   CI/CD       │
│   engineering     management       & permissions     pipelines   │
│                                                                  │
│   Model           LLM eval &       Multi-agent       Monitoring  │
│   evaluation      guardrails       coordination      & alerting  │
│                                                                  │
│   Drift           Token cost       Session &         Infrastructure│
│   detection       monitoring       memory mgmt       management  │
│                                                                  │
│   Retraining      Prompt           Feedback           Incident   │
│   pipelines       versioning       loops             response    │
│                                                                  │
│   YOU NEED:       YOU NEED:        YOU NEED:         YOU NEED:   │
│   If training     If product       If product        Always.     │
│   custom models   uses LLMs        has AI agents     No question.│
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**For your drone platform specifically:**

- **DevOps:** Yes, always (deployment, monitoring, infrastructure)
- **MLOps:** Yes (you're training anomaly detection and risk prediction models)
- **LLMOps:** Maybe later (if you add natural language query interface or AI assistant features)
- **AgentOps:** Maybe later (if you add autonomous agents that take actions in the product)

**Key principle:** Don't skip steps. Master DevOps first, add MLOps when you have models, add LLMOps/AgentOps only when your product genuinely needs them.

---

## COMMON FAILURE MODES

### And How to Avoid Each One

| Failure Mode | What It Looks Like | Prevention |
|-------------|-------------------|-----------|
| **Building without validating** | Beautiful product nobody wants | Complete Stages 0-1 BEFORE writing code |
| **Scope creep** | MVP grows from 5 to 25 features | MoSCoW + strict "Out of Scope" in BRD. Agents respect scope boundaries. |
| **Premature optimization** | Designing for 10,000 users when you have 0 | Build for 10 users. Optimize when you have 100. Scale when you have 1,000. |
| **Agent drift** | Agent builds features not in spec | Spec-driven development + plan review before coding |
| **No testing** | "It works on my machine" → production crash | CI gates enforced from Day 1. No merge without tests. |
| **Ignoring operations** | Build a product but can't run it reliably | Stage 7 (pre-production) is mandatory, not optional |
| **Solo burnout** | Working 16 hours daily, dropping quality | Time-box agent work. You review, don't code everything. |
| **Technology distraction** | Chasing new frameworks instead of shipping | ADRs lock in decisions. Resist switching mid-build. |
| **Perfectionism** | Spending months polishing before anyone sees it | Ship to beta at "good enough". Perfect after feedback. |
| **Ignoring feedback** | Building what YOU want, not what CUSTOMERS need | Weekly feedback calls. Sean Ellis test. Data-driven iteration. |
| **Underpricing** | Giving it away because you're afraid to charge | If 40%+ would be "very disappointed" without it, it has value. Charge for that value. |
| **Over-engineering AI** | Using ML where rules would work fine | Start with rule-based detection. Add ML only when rules aren't enough. |

---

## QUICK REFERENCE: WHAT TO DO WHEN YOU'RE STUCK

| Feeling | Likely Cause | Action |
|---------|-------------|--------|
| "I don't know what to build" | Stage 0-1 incomplete | Go talk to 5 more potential customers |
| "The spec is too vague" | Stage 2 incomplete | Add data contracts and Gherkin scenarios |
| "Agent keeps going off-track" | Missing constraints | Update PROJECT_INSTRUCTIONS + tighten BRD scope |
| "Everything is broken" | Moved too fast past Stage 6 | Stop building features, fix tests and CI |
| "Nobody wants to pay" | Product-market fit issue | Go back to Stage 1, re-validate |
| "I can't do this alone" | Scale signal | It's time to hire your first person (Stage 10) |
| "I'm overwhelmed" | Trying to do all stages at once | Focus on ONE stage. Complete it. Move to the next. |

---

> **Final thought:** The solo founder advantage is speed of decision-making. In a large company, the lifecycle in this document takes 6-12 months because of meetings, approvals, and coordination overhead. You can do it in 8-14 weeks because every decision is yours. AI agents compress the execution time in Stages 4-7 by 3-5x. Your job is to make the RIGHT decisions in Stages 0-3 and 8-10. That's where the real value is.
>
> **The three documents that power this roadmap:**
> - `PROJECT_INSTRUCTIONS.md` → HOW agents build (quality constitution)
> - `docs/BRD.md` → WHAT to build (requirements)
> - `AGENT_READY_CHECKLIST.md` → EVERYTHING ELSE (environment, tooling, process)
>
> **You already have all three. Now execute.**
