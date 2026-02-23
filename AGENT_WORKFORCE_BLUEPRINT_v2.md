# 🤖 THE AGENT WORKFORCE BLUEPRINT v2

## Complete Agent Roster for Solo-Founder Platform Development

> **What this is:** Every specialized agent you need to build, run, sell, and scale a production-grade drone analytics platform as a solo founder. Organized by lifecycle stage, with clear roles, tools, triggers, and coordination patterns.
>
> **What changed in v2:** The original blueprint was strong on engineering and operations but weak on the business side — the parts that convert code into a company. Based on team review, v2 adds: Customer Discovery, UX Design, Product Analytics, Sales/Pre-Sales, Legal/Privacy, Billing/Revenue, MLOps pipeline, Data Labeling, Disaster Recovery, Support, and AgentOps. It also merges overlapping roles and adds "end-to-end owning agents" that connect work to outcomes.
>
> **Design principles:**
> 1. **Agents as microservices** — single responsibility, clear inputs/outputs, defined boundaries
> 2. **End-to-end owners exist** — some agents own outcomes (user experience, revenue, model quality), not just tasks
> 3. **Coordination cost is the enemy** — fewer agents that own more beats many agents that hand off constantly
> 4. **Build incrementally** — you don't need 35 agents on day one. Start with 6, grow to 15, scale to 35.

---

## WHAT CHANGED FROM v1 (Summary)

### Feedback Accepted (genuine gaps)

| Gap Identified | Action | Why It Matters |
|---------------|--------|---------------|
| Customer Discovery underpowered | Added **Customer Discovery Agent** | Desk research ≠ evidence. This bridges "market info" to "what users actually do" |
| UX Design missing entirely | Added **UX Designer Agent** | Without this, you build correct code for the wrong experience |
| Product Analytics missing | Added **Product Analytics Agent** | You'll otherwise iterate based on loud customers, not measurable data |
| Sales/Pre-Sales missing | Added **Sales & Pre-Sales Agent** (combined) | B2B drone analytics requires demos, RFPs, security questionnaires |
| Legal/Privacy incomplete | Added **Legal & Privacy Agent** (combined) | ToS, DPA, contracts, IP — compliance agent doesn't cover these |
| Billing/Revenue missing | Added **Billing & Revenue Agent** | Cost optimizer tracks spend, not income. You need pricing/invoicing/dunning |
| MLOps pipeline ownership ambiguous | Added **MLOps Pipeline Agent** | Bridges ML Engineer and DevOps — owns model delivery |
| Data Labeling/HITL not owned | Added **Labeling & Ground Truth Agent** | For ML products, labels ARE the product. Someone must own quality |
| DR/Backup not owned | Merged into **SRE Agent** (expanded scope) | Backup/restore drills are SRE responsibility, not a separate agent |
| Support ≠ Customer Success | Added **Support Desk Agent** | Reactive ticket triage vs. proactive relationship management |
| AgentOps missing | Added **Agent Governance Agent** | Who monitors the monitors? This prevents agent drift and cost spirals |

### Feedback Where I Merged (valid concern, but separate agent is overkill for solo founder)

| Suggested | Decision | Rationale |
|-----------|---------|-----------|
| Usability Tester Agent | Merged into **UX Designer Agent** | Same agent can design AND evaluate. Solo founder can't sustain a dedicated usability tester |
| Experimentation Agent | Merged into **Product Analytics Agent** | A/B testing is an analytics function, not a separate role at this scale |
| Partnerships Agent | Merged into **Sales Agent** | Channel partnerships are a sales motion. Split when you have >5 active partners |
| Training/Enablement Agent | Merged into **Doc Writer Agent** (expanded) | Tutorials, guides, onboarding content = documentation. Split when you have >20 customers |
| Model Evaluation/Red Team Agent | Merged into **ML Engineer Agent** (expanded) | Eval suites and adversarial testing are part of model development |
| Resilience/DR Agent | Merged into **SRE Agent** (expanded) | Backup, restore drills, DR planning = SRE responsibility |

### Overlap Merges (simplification)

| v1 Had | v2 Has | Why |
|--------|--------|-----|
| Security Auditor + Compliance Agent (2) | **Trust & Security Agent** (1) | Combined early; split when pursuing SOC2 audit |
| Doc Writer + Knowledge Manager + Changelog Agent (3) | **Documentation & Release Agent** (1) | One agent owns all docs, knowledge, and release comms |
| QA Agent + Performance Tester (2) | **QA & Performance Agent** (1) | Same agent owns all non-unit testing: exploratory, perf, release signoff |

---

## ARCHITECTURE OVERVIEW v2

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        🎯 THE ORCHESTRATOR                               │
│               (You + Master Orchestrator Agent)                          │
│                                                                          │
│    Your job: Strategic decisions, approvals, learning from customers      │
│    Orchestrator: Route tasks, track progress, resolve dependencies        │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  LAYER 1: DISCOVERY & PRODUCT       LAYER 2: DESIGN & ENGINEERING        │
│  ┌──────────┐ ┌──────────┐          ┌──────────┐ ┌──────────┐           │
│  │ Customer │ │ Product  │          │ UX       │ │ Architect│           │
│  │ Discovery│ │ Manager  │          │ Designer │ │ Agent    │           │
│  └──────────┘ └──────────┘          └──────────┘ └──────────┘           │
│  ┌──────────┐ ┌──────────┐          ┌──────────┐ ┌──────────┐           │
│  │ Market   │ │ Business │          │ Coder    │ │ Code     │           │
│  │ Research │ │ Analyst  │          │ Agent    │ │ Reviewer │           │
│  └──────────┘ └──────────┘          └──────────┘ └──────────┘           │
│  ┌──────────┐                       ┌──────────┐                        │
│  │ Competi- │                       │ Test     │                        │
│  │ tor Intel│                       │ Engineer │                        │
│  └──────────┘                       └──────────┘                        │
│                                                                          │
│  LAYER 3: QUALITY & TRUST           LAYER 4: OPERATIONS                  │
│  ┌──────────┐ ┌──────────┐          ┌──────────┐ ┌──────────┐           │
│  │ Trust &  │ │ QA &     │          │ DevOps   │ │ SRE &    │           │
│  │ Security │ │ Perform. │          │ Agent    │ │ Resil.   │           │
│  └──────────┘ └──────────┘          └──────────┘ └──────────┘           │
│                                     ┌──────────┐ ┌──────────┐           │
│                                     │ Incident │ │ Cost     │           │
│                                     │ Responder│ │ Optimizer│           │
│                                     └──────────┘ └──────────┘           │
│                                                                          │
│  LAYER 5: DATA & ML                 LAYER 6: REVENUE & GROWTH            │
│  ┌──────────┐ ┌──────────┐          ┌──────────┐ ┌──────────┐           │
│  │ Data     │ │ ML       │          │ Sales &  │ │ Content  │           │
│  │ Engineer │ │ Engineer │          │ Pre-Sales│ │ & SEO    │           │
│  └──────────┘ └──────────┘          └──────────┘ └──────────┘           │
│  ┌──────────┐ ┌──────────┐          ┌──────────┐ ┌──────────┐           │
│  │ MLOps    │ │ Labeling │          │ Customer │ │ Support  │           │
│  │ Pipeline │ │ & Ground │          │ Success  │ │ Desk     │           │
│  └──────────┘ │ Truth    │          └──────────┘ └──────────┘           │
│  ┌──────────┐ └──────────┘          ┌──────────┐ ┌──────────┐           │
│  │ Data     │ ┌──────────┐          │ Feedback │ │ Billing &│           │
│  │ Quality  │ │ Model    │          │ Analyzer │ │ Revenue  │           │
│  └──────────┘ │ Monitor  │          └──────────┘ └──────────┘           │
│               └──────────┘                                               │
│                                                                          │
│  LAYER 7: ANALYTICS & MEASUREMENT   LAYER 8: LEGAL, DOCS & GOVERNANCE   │
│  ┌──────────┐                       ┌──────────┐ ┌──────────┐           │
│  │ Product  │                       │ Legal &  │ │ Docs &   │           │
│  │ Analytics│                       │ Privacy  │ │ Release  │           │
│  └──────────┘                       └──────────┘ └──────────┘           │
│                                     ┌──────────┐                        │
│                                     │ Agent    │                        │
│                                     │ Govern.  │                        │
│                                     └──────────┘                        │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Total: 35 agents across 8 layers + 1 orchestrator**
**(vs v1: 27 agents across 7 layers — net +8 after merges)**

---

## LAYER 0: THE ORCHESTRATOR

### Agent 00: Master Orchestrator

| Attribute | Detail |
|-----------|--------|
| **Role** | Central coordinator — routes tasks to specialized agents, tracks progress, resolves dependencies, reports status to you |
| **Trigger** | Always active |
| **Inputs** | Your instructions, `docs/FEATURES.md`, `claude-progress.txt`, agent outputs, CI/CD signals, monitoring alerts |
| **Outputs** | Task assignments, status reports, dependency resolution, blocked-task escalation |
| **Coordinates with** | ALL other agents |
| **Human approval** | Architecture decisions, production deployments, model promotions, security-critical changes, budget decisions, all customer-facing communications |

---

## LAYER 1: DISCOVERY & PRODUCT

*The "should we build this?" layer. Active in Stages 0-2, then continuously in Stage 10.*

### Agent 01: Customer Discovery Agent ⭐ NEW

| Attribute | Detail |
|-----------|--------|
| **Role** | **End-to-end owner of customer evidence.** Plans and synthesizes customer interviews, pilot learnings, problem validation. Bridges "market info" to "what users actually do." This is NOT desk research — it's structured evidence collection. |
| **Trigger** | S0 (initial discovery), S1 (validation interviews), S8 (beta feedback), S10 (continuous discovery) |
| **Inputs** | Your interview recordings/notes, pilot usage data, support tickets, sales call notes |
| **Outputs** | ICP definition, jobs-to-be-done ranking, pain severity matrix, "must-have outcome" statement, objection map, persona validation, pilot success criteria, willingness-to-pay signals |
| **Tools** | Interview synthesis frameworks (JTBD), survey tools, qualitative coding |
| **Coordinates with** | Product Manager (requirements), UX Designer (user flows), Sales Agent (objections), Pricing (WTP data) |
| **Why this matters** | Your team's biggest critique was correct: desk research ≠ evidence. The original blueprint had Market Research (secondary data) but nothing that owned primary customer evidence. Solo founders fail most often because they build what they assume, not what they've validated. |

### Agent 02: Market Research Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | Researches markets, industries, trends from public sources. Secondary research to complement Customer Discovery's primary research. |
| **Trigger** | S0 (initial), S10 (quarterly market updates) |
| **Inputs** | Industry keywords, geographic focus, your research questions |
| **Outputs** | Market analysis, trend summaries, TAM/SAM/SOM, industry reports |
| **Coordinates with** | Customer Discovery, Competitor Intel, Product Manager |

### Agent 03: Competitor Intelligence Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | Monitors competitors — features, pricing, positioning, reviews, weaknesses. Maintains living competitor matrix. |
| **Trigger** | S1 (initial), then monthly in S10 |
| **Inputs** | Competitor URLs, product names, industry keywords |
| **Outputs** | Feature matrix, pricing comparison, SWOT per competitor, gap analysis, competitive differentiation brief |
| **Coordinates with** | Market Research, Product Manager, Sales Agent (competitive positioning) |

### Agent 04: Product Manager Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | **End-to-end owner of "what we build and why."** Translates customer evidence + business goals into prioritized requirements. Owns the BRD, feature backlog, and roadmap. |
| **Trigger** | S2 (BRD creation), S8 (feedback → requirements), S10 (roadmap planning) |
| **Inputs** | Customer Discovery outputs, market research, competitor analysis, product analytics, user feedback |
| **Outputs** | BRD, user stories, Gherkin acceptance criteria, RICE-scored backlog, MoSCoW prioritization, roadmap |
| **Coordinates with** | Customer Discovery, UX Designer, Business Analyst, Product Analytics, Architect |

### Agent 05: Business Analyst Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | Defines data contracts, domain models, business rules, system boundaries. Ensures every requirement is precise enough for agents to implement. |
| **Trigger** | S2 (specification), whenever new features are specified |
| **Inputs** | User stories from PM, domain knowledge, existing schemas |
| **Outputs** | JSON schemas, validation rules, error scenarios, API contracts, domain glossary, event taxonomy (for analytics) |
| **Coordinates with** | Product Manager, Architect, Coder, Product Analytics (event schema) |

---

## LAYER 2: DESIGN & ENGINEERING

*The "build it right" layer. Active from Stage 2 onward.*

### Agent 06: UX Designer Agent ⭐ NEW

| Attribute | Detail |
|-----------|--------|
| **Role** | **End-to-end owner of user experience.** Creates user journeys, wireframes, interaction specs, design system. Also performs lightweight usability evaluation (heuristic review, task-completion analysis). |
| **Trigger** | S2 (UX flows before build), S5 (UI implementation review), S6 (usability testing), S8 (beta UX feedback), S10 (UX iteration) |
| **Inputs** | User stories, persona definitions, JTBD from Customer Discovery, competitive UX analysis |
| **Outputs** | User journey maps, wireframes/mockups (HTML or Figma-ready specs), screen-by-screen interaction specs, UX acceptance criteria, design system tokens (colors, spacing, typography), usability issue reports |
| **Tools** | HTML/React prototyping, design system frameworks (Tailwind), UX heuristic checklists (Nielsen) |
| **Coordinates with** | Customer Discovery (user behavior), Product Manager (priorities), Coder (implementation), QA (UX acceptance testing) |
| **Why this matters** | The team was right: without this agent, you jump from spec → code and miss the experience layer. Correct code for the wrong UX = product nobody wants to use. |

**Key behavior:** This agent produces clickable prototypes (HTML/React) BEFORE the Coder Agent builds features. This enables testing with real users before committing to implementation.

### Agent 07: Architect Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | High-level technical design, technology selection, ADRs. Ensures NFRs are satisfiable. |
| **Trigger** | S3 (initial design), then on architecture-level decisions |
| **Inputs** | BRD (NFRs), data contracts, cost budget, threat model |
| **Outputs** | `docs/ARCHITECTURE.md`, ADRs, system diagrams, technology recommendations, threat model |
| **Coordinates with** | Coder, DevOps, Trust & Security, MLOps Pipeline |
| **⚠️ Human approval** | All architecture decisions |

### Agent 08: Coder Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | Primary code writer. Implements features following specs, writes clean code per PROJECT_INSTRUCTIONS. |
| **Trigger** | S5 (feature development), S10 (ongoing) |
| **Inputs** | Feature spec (BRD), plan.md, schemas, API_SPEC.yaml, UX specs from Designer, reference implementations |
| **Outputs** | Application code, migrations, API endpoints, frontend components, analytics event implementations |
| **Tools** | Claude Code / Cursor / Copilot, git, linters, formatters |
| **Coordinates with** | Code Reviewer, Test Engineer, Doc & Release, UX Designer |

### Agent 09: Code Review Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | Reviews all code from Coder Agent. Checks quality, security, spec compliance. Maker-checker pattern — ideally uses different model/prompt than Coder. |
| **Trigger** | Every PR |
| **Inputs** | PR diff, BRD requirements, PROJECT_INSTRUCTIONS, existing patterns |
| **Outputs** | Review comments, approval/rejection, improvement suggestions |
| **Coordinates with** | Coder, Trust & Security, Test Engineer |

### Agent 10: Test Engineer Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | Writes and maintains unit tests, integration tests, contract tests. Generates fixtures from schemas. Measures coverage. |
| **Trigger** | Every feature implementation, CI failures, coverage drops |
| **Inputs** | Gherkin criteria, schemas, OpenAPI spec, feature code |
| **Outputs** | Test files (unit, integration, contract), test fixtures, coverage reports |
| **Coordinates with** | Coder, QA & Performance, Product Analytics (test events fire correctly) |

---

## LAYER 3: QUALITY & TRUST

*Active from Stage 4 onward. Merged overlapping roles per team feedback.*

### Agent 11: Trust & Security Agent (MERGED: Security Auditor + Compliance)

| Attribute | Detail |
|-----------|--------|
| **Role** | Unified security + compliance. Code scanning, dependency auditing, auth flow validation, OWASP compliance, SOC2/GDPR policy tracking, evidence collection. |
| **Trigger** | Every PR (automated scan), weekly full audit, compliance milestones |
| **Inputs** | Code changes, dependency manifest, infra config, compliance requirements |
| **Outputs** | Security findings, remediation tasks, OWASP checklist, compliance evidence, SOC2 readiness reports |
| **Tools** | Semgrep/CodeQL, Snyk/Trivy, gitleaks, OWASP ZAP |
| **Coordinates with** | Code Reviewer, DevOps, Legal & Privacy |
| **Split trigger** | Split into separate Security + Compliance agents when pursuing formal SOC2 audit |

### Agent 12: QA & Performance Agent (MERGED: QA + Performance Tester)

| Attribute | Detail |
|-----------|--------|
| **Role** | End-to-end quality gatekeeper. Runs E2E test suites, exploratory testing, UX acceptance testing, load/stress/soak testing, release signoff. |
| **Trigger** | Pre-merge (automated), pre-release (full suite), after deployments |
| **Inputs** | Acceptance criteria, UX specs, NFR targets, test results from Test Engineer |
| **Outputs** | QA pass/fail reports, performance reports (latency p50/p95/p99), usability issues, bug reports, release signoff |
| **Tools** | Playwright/Cypress, k6/Artillery, Lighthouse, APM tools |
| **Coordinates with** | Test Engineer, UX Designer (UX acceptance), DevOps, SRE |

---

## LAYER 4: OPERATIONS

*Active from Stage 7 onward, always-on in production.*

### Agent 13: DevOps Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | CI/CD pipelines, IaC, deployment automation, environment management, container orchestration. |
| **Trigger** | S4 (initial setup), infrastructure changes, pipeline failures |
| **Inputs** | Architecture decisions, deployment requirements |
| **Outputs** | CI/CD workflows, Terraform modules, Docker configs, deployment scripts, feature flag infrastructure |
| **Coordinates with** | Coder, SRE, Trust & Security, MLOps Pipeline |

### Agent 14: SRE & Resilience Agent (EXPANDED: SRE + DR)

| Attribute | Detail |
|-----------|--------|
| **Role** | **End-to-end owner of system reliability.** Monitoring, alerting, SLO tracking, dashboards, PLUS backup/restore, disaster recovery, game days. |
| **Trigger** | Always-on in production. Responds to metric thresholds. Quarterly DR drills. |
| **Inputs** | Application metrics, logs, traces, SLO definitions, RTO/RPO targets |
| **Outputs** | Health reports, SLO dashboards, alert configurations, backup verification reports, DR runbooks, quarterly drill reports, restore test results |
| **Tools** | Prometheus, Grafana, OpenTelemetry, cloud monitoring, backup tools |
| **Coordinates with** | Incident Responder, DevOps, Model Monitor, Cost Optimizer |
| **Why expanded** | Team was right that DR/backup was unowned. But it's SRE responsibility, not a separate agent. Adding explicit backup verification, restore drills, and DR planning to SRE scope. |

### Agent 15: Incident Responder Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | First responder when something breaks. Diagnoses, executes runbooks, escalates, writes post-incident reports. |
| **Trigger** | Alert fires, customer reports issue, CI/CD failure |
| **Inputs** | Alert details, logs, runbooks, recent deployments |
| **Outputs** | Diagnosis, remediation actions, escalation, post-incident review |
| **Coordinates with** | SRE, DevOps (rollbacks), Coder (hotfixes) |
| **⚠️ Human approval** | Production rollbacks, data fixes |

### Agent 16: Cost Optimizer Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | Monitors infrastructure and API costs. Identifies waste, tracks cost per customer. |
| **Trigger** | Weekly review, cost spikes, scaling decisions |
| **Inputs** | Cloud billing, resource utilization, customer count |
| **Outputs** | Cost reports, optimization recommendations, cost-per-customer metrics |
| **Coordinates with** | DevOps, Architect, Billing & Revenue (unit economics) |

---

## LAYER 5: DATA & ML

*Active from Stage 5 onward. Expanded per team feedback on MLOps + labeling gaps.*

### Agent 17: Data Engineer Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | Builds and maintains data pipelines — ingestion, transformation, storage, retrieval. |
| **Trigger** | S5 (pipeline development), pipeline failures, new data sources |
| **Inputs** | Data schemas, ingestion requirements, source system specs |
| **Outputs** | Pipeline code, migrations, data validation rules, pipeline monitoring |
| **Coordinates with** | ML Engineer, Data Quality, Coder, Product Analytics (event data pipeline) |

### Agent 18: ML Engineer Agent (EXPANDED: + Evaluation)

| Attribute | Detail |
|-----------|--------|
| **Role** | Builds, trains, evaluates, and deploys ML models. Also owns evaluation suites, adversarial test sets, and failure mode taxonomy. |
| **Trigger** | S5 (model development), retraining triggers, model degradation |
| **Inputs** | Training data, model requirements, evaluation criteria, Model Governance doc, labeled ground truth |
| **Outputs** | Trained models, model cards, evaluation reports, eval suites, failure dashboards, feature importance |
| **Tools** | Python ML stack, MLflow, eval frameworks |
| **Coordinates with** | Data Engineer, MLOps Pipeline, Model Monitor, Labeling Agent |
| **⚠️ Human approval** | Model promotion staging → production |

### Agent 19: MLOps Pipeline Agent ⭐ NEW

| Attribute | Detail |
|-----------|--------|
| **Role** | **End-to-end owner of model delivery.** Owns model registry, serving infrastructure, shadow/canary deployment, reproducibility, model versioning, rollback. Bridges ML Engineer and DevOps. |
| **Trigger** | Model ready for deployment, retraining pipeline runs, model promotion requests |
| **Inputs** | Trained model artifacts, serving requirements, model metrics, promotion criteria |
| **Outputs** | Model deployment pipelines, serving configs, shadow mode setup, canary traffic routing, rollback automation, model versioning in registry |
| **Tools** | MLflow, model serving (Seldon/KServe/SageMaker), feature store (if needed), CI/CD for models |
| **Coordinates with** | ML Engineer (models), DevOps (infrastructure), Model Monitor (production health), SRE (serving SLAs) |
| **Why this matters** | Team correctly identified that ownership between ML Engineer, DevOps, and Model Monitor was ambiguous for the deployment pipeline itself. This agent owns the "last mile" of getting models into production safely. |

### Agent 20: Labeling & Ground Truth Agent ⭐ NEW

| Attribute | Detail |
|-----------|--------|
| **Role** | **End-to-end owner of training data quality.** Defines labeling guidelines, manages annotation queue, tracks inter-annotator agreement, maintains gold standard datasets, versions datasets. |
| **Trigger** | New model training cycle, HITL review queue outputs, label quality degradation |
| **Inputs** | Raw sensor data, HITL review decisions, domain expert feedback, model error analysis |
| **Outputs** | Labeling guidelines, annotated datasets (versioned), label quality reports, inter-annotator agreement scores, gold/silver/bronze evaluation sets, error taxonomy |
| **Tools** | Labeling tools (Label Studio or equivalent), dataset versioning (DVC), quality metrics |
| **Coordinates with** | ML Engineer (training data), Data Quality (data validation), HITL review queue, Customer Discovery (domain expertise) |
| **Why this matters** | For ML products, labels ARE the product. Bad labels → bad models → bad predictions → lost customers. The team was right that nobody in v1 owned this end-to-end. |

### Agent 21: Model Monitor Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | Monitors ML model performance in production — accuracy, drift, fairness, latency. Triggers retraining. |
| **Trigger** | Always-on. Checks on every prediction batch or schedule. |
| **Inputs** | Production predictions, ground truth labels, baselines |
| **Outputs** | Drift alerts, accuracy trends, bias reports, retraining recommendations |
| **Coordinates with** | ML Engineer, MLOps Pipeline, SRE, Labeling Agent |

### Agent 22: Data Quality Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | Validates incoming data quality — schema compliance, ranges, completeness, freshness. |
| **Trigger** | Every data batch, daily reports, schema changes |
| **Inputs** | Incoming data, schemas, validation rules, historical profiles |
| **Outputs** | Quality scores, validation failures, quarantined records, trend dashboards |
| **Coordinates with** | Data Engineer, ML Engineer, Incident Responder |

---

## LAYER 6: REVENUE & GROWTH

*The "convert code into a business" layer. Active from Stage 8 onward. Major expansion from v1.*

### Agent 23: Sales & Pre-Sales Agent ⭐ NEW (Combined)

| Attribute | Detail |
|-----------|--------|
| **Role** | **End-to-end owner of pipeline → closed deal.** Builds lead lists, crafts outreach, qualifies leads, tailors demos, answers technical questions, handles RFP/RFI, prepares security questionnaires, tracks pipeline. |
| **Trigger** | S8 (first outbound), S10 (continuous pipeline building) |
| **Inputs** | ICP from Customer Discovery, competitive positioning, product capabilities, security documentation |
| **Outputs** | Prospect lists, email sequences, discovery call scripts, demo scripts, solution architecture per prospect, RFP response drafts, security questionnaire drafts, pipeline reports |
| **Tools** | CRM, email outreach, demo environment, proposal templates |
| **Coordinates with** | Customer Discovery (ICP), Competitor Intel (positioning), Trust & Security (security questionnaires), Legal (contracts) |
| **⚠️ Human approval** | All outbound communications, all proposals, all pricing |
| **Why combined** | Team suggested separate Sales + Pre-Sales + Partnerships. For a solo founder, these are one role until you have >5 active deals simultaneously. Split when revenue justifies it. |

### Agent 24: Content & SEO Agent (MERGED: Content Creator + SEO)

| Attribute | Detail |
|-----------|--------|
| **Role** | Creates and optimizes all marketing content — blog posts, case studies, social, newsletters, product pages. Handles SEO + AEO (AI Engine Optimization). |
| **Trigger** | Content calendar, product launches, feature releases |
| **Inputs** | Product knowledge, customer stories, industry trends, keyword research |
| **Outputs** | Blog posts, social posts, email drafts, case studies, SEO recommendations, ranking reports |
| **Coordinates with** | Sales (content for pipeline), Customer Success (stories), Product Manager (feature messaging) |
| **⚠️ Human approval** | All published content |

### Agent 25: Customer Success Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | Proactive relationship management — onboarding, usage monitoring, churn risk, satisfaction tracking, expansion opportunities. |
| **Trigger** | New customer onboarding, usage drops, NPS surveys, renewal approaching |
| **Inputs** | Usage data, onboarding checklists, NPS/CSAT scores, health scores |
| **Outputs** | Personalized onboarding guides, health scores, churn risk alerts, expansion opportunity alerts, QBR prep |
| **Coordinates with** | Support Desk, Feedback Analyzer, Sales (upsell), Product Manager |
| **⚠️ Human approval** | All customer-facing communications |

### Agent 26: Support Desk Agent ⭐ NEW

| Attribute | Detail |
|-----------|--------|
| **Role** | Reactive ticket triage and support. Categorizes issues, suggests responses, creates repro steps, routes to engineering, identifies FAQ candidates. |
| **Trigger** | Support ticket created, customer reports issue |
| **Inputs** | Tickets, product knowledge base, known issues, runbooks |
| **Outputs** | Ticket categorization (bug/how-to/feature-request), draft responses, reproduction steps, FAQ candidates, escalation to Coder for bugs |
| **Coordinates with** | Customer Success (relationship context), Feedback Analyzer (patterns), Coder (bugs), Doc & Release (FAQ/docs updates) |
| **Why separate from Customer Success** | Team was right: proactive (CS) and reactive (Support) require different triggers, different tools, and different coordination patterns. Mixing them means neither gets done well. |

### Agent 27: Feedback Analyzer Agent

| Attribute | Detail |
|-----------|--------|
| **Role** | Synthesizes ALL feedback — tickets, requests, interviews, reviews, usage patterns, support trends. Identifies patterns and priorities. |
| **Trigger** | New feedback, weekly synthesis, quarterly deep analysis |
| **Inputs** | Support tickets, feature requests, interview notes, NPS comments, product analytics |
| **Outputs** | Feedback synthesis, feature request rankings, pain point analysis, PMF metrics, testimonial candidates |
| **Coordinates with** | Product Manager (priorities), Customer Discovery (validation), Content (testimonials) |

### Agent 28: Billing & Revenue Agent ⭐ NEW

| Attribute | Detail |
|-----------|--------|
| **Role** | Owns the money side — pricing model design, subscription lifecycle, invoicing, payment failures, revenue reporting, dunning. |
| **Trigger** | S1 (pricing hypothesis), S8 (billing implementation), ongoing (revenue ops) |
| **Inputs** | Willingness-to-pay data (from Discovery), competitor pricing, usage data, payment events |
| **Outputs** | Pricing tier structure, billing workflows, invoice templates, dunning email drafts, revenue dashboards, MRR/churn/LTV reports, discount guardrails |
| **Tools** | Stripe/billing platform, revenue analytics, pricing frameworks |
| **Coordinates with** | Customer Discovery (WTP), Competitor Intel (pricing landscape), Customer Success (renewals), Cost Optimizer (unit economics), Legal (contract terms) |
| **Why this matters** | v1 had Cost Optimizer (tracks spend) but nothing that owned income. You can't build a business without pricing, invoicing, and revenue tracking. |

---

## LAYER 7: ANALYTICS & MEASUREMENT

*The "are we winning?" layer. Active from Stage 4 onward. Entirely new in v2.*

### Agent 29: Product Analytics Agent ⭐ NEW

| Attribute | Detail |
|-----------|--------|
| **Role** | **End-to-end owner of behavioral measurement.** Defines metrics taxonomy, implements event tracking, builds dashboards, tracks funnels/cohorts/retention, runs experiments (A/B tests, feature flags). |
| **Trigger** | S4 (instrument from day one), every feature (add events), every release (measure impact), weekly health |
| **Inputs** | Feature specs, user events, business goals, experiment hypotheses |
| **Outputs** | Event taxonomy, tracking plan, analytics dashboards (north star metric, activation, retention, revenue), weekly metrics digest, experiment results, funnel analysis, cohort reports |
| **Tools** | Analytics platform (Amplitude/Mixpanel/PostHog), feature flags (LaunchDarkly/Unleash), SQL, dashboarding |
| **Coordinates with** | Business Analyst (event schema), Coder (event implementation), Product Manager (metric → decision), UX Designer (conversion optimization) |
| **Why this matters** | Team's critique was precise: "you'll iterate based on loud customers instead of measurable wins." Feedback Analyzer handles qualitative (what people say). Product Analytics handles quantitative (what people do). Both are needed. |

**Key behavior:** This agent defines the event schema DURING specification (S2), ensures events are implemented with features (S5), and measures impact after every release (S9-10). It is the bridge between "we shipped it" and "it worked."

---

## LAYER 8: LEGAL, DOCUMENTATION & GOVERNANCE

*Active throughout. Merged overlapping doc roles, added missing legal and AgentOps.*

### Agent 30: Legal & Privacy Agent ⭐ NEW (Combined)

| Attribute | Detail |
|-----------|--------|
| **Role** | Drafts and maintains legal documents, tracks obligations, manages privacy requirements. NOT a lawyer — prepares drafts and flags issues for human/legal review. |
| **Trigger** | S1 (ToS/Privacy drafts), S8 (customer contracts), new data flows, regulatory changes |
| **Inputs** | Business model, data flows, customer requirements, regulatory requirements |
| **Outputs** | ToS/Privacy Policy drafts, DPA checklist, MSA/SOW skeletons, licensing compliance list, data inventory, PII map, retention/deletion runbooks, DPIA assessments, vendor contract review notes |
| **Tools** | Contract templates, privacy frameworks (GDPR/CCPA), license scanners |
| **Coordinates with** | Trust & Security (compliance evidence), Billing (contract terms), Customer Success (DPA requests), Data Engineer (data flows) |
| **⚠️ Human approval** | ALL legal documents require human review. If high-stakes, get actual lawyer review. |
| **Why combined** | Team suggested separate Legal + Privacy agents. For solo founder, one agent covers both. Split when dealing with multiple jurisdictions or formal audits. |

### Agent 31: Documentation & Release Agent (MERGED: Doc Writer + Knowledge Manager + Changelog)

| Attribute | Detail |
|-----------|--------|
| **Role** | All documentation, knowledge management, release communications. API docs, user guides, runbooks, changelogs, decision log, training content, FAQ maintenance. |
| **Trigger** | Every feature merge (update docs), every release (changelog), weekly staleness check, new FAQ from support |
| **Inputs** | Code changes, API spec, feature specs, release notes, support FAQs, ADRs |
| **Outputs** | API docs, user guides, developer docs, runbook updates, changelog, release notes, decision log, tutorial content, onboarding guides |
| **Coordinates with** | Coder (code changes), DevOps (runbooks), Product Manager (feature docs), Support Desk (FAQ updates) |

### Agent 32: Agent Governance Agent ⭐ NEW (AgentOps)

| Attribute | Detail |
|-----------|--------|
| **Role** | **Monitors the agent workforce itself.** Evaluates agent output quality, maintains prompt versions, regression-tests agent workflows, tracks agent cost/latency/quality, detects drift from standards. |
| **Trigger** | Weekly quality review, after prompt changes, cost anomalies, quality degradation |
| **Inputs** | Agent outputs, prompt versions, token usage logs, quality evaluations, PROJECT_INSTRUCTIONS (as baseline) |
| **Outputs** | Agent scorecards (quality, cost, latency), prompt changelog, eval suite results, "top failure cases" report, drift detection alerts, cost-per-agent trends |
| **Tools** | Eval frameworks (custom or LangSmith/Braintrust), token tracking, prompt versioning |
| **Coordinates with** | All agents (evaluates their outputs), Orchestrator (quality-based routing), Cost Optimizer (token budgets) |
| **Why this matters** | Team asked the critical question: "who monitors the monitors?" Without this, agents drift from standards over time, hallucinate in reports silently, and costs spiral. This is the difference between "cool demos" and "stable automation." |

**Key behaviors:**
- Regression-tests agent prompts against known-good outputs after any prompt change
- Tracks quality scores per agent weekly (% of outputs that pass human review)
- Alerts you when any agent's cost exceeds budget threshold
- Detects when agent outputs contradict PROJECT_INSTRUCTIONS
- Maintains a prompt changelog (version control for all agent prompts)

---

## COMPLETE AGENT ROSTER (Summary)

| # | Agent | Layer | New/Changed | End-to-End Owner? |
|---|-------|-------|------------|-------------------|
| 00 | Master Orchestrator | 0 | Unchanged | Yes — workflow coordination |
| 01 | **Customer Discovery** | 1 | ⭐ NEW | Yes — customer evidence |
| 02 | Market Research | 1 | Unchanged | |
| 03 | Competitor Intelligence | 1 | Unchanged | |
| 04 | Product Manager | 1 | Unchanged | Yes — what we build & why |
| 05 | Business Analyst | 1 | Unchanged | |
| 06 | **UX Designer** | 2 | ⭐ NEW | Yes — user experience |
| 07 | Architect | 2 | Unchanged | |
| 08 | Coder | 2 | Unchanged | |
| 09 | Code Reviewer | 2 | Unchanged | |
| 10 | Test Engineer | 2 | Unchanged | |
| 11 | Trust & Security | 3 | MERGED (Security + Compliance) | |
| 12 | QA & Performance | 3 | MERGED (QA + Perf Tester) | |
| 13 | DevOps | 4 | Unchanged | |
| 14 | SRE & Resilience | 4 | EXPANDED (+DR/backup) | Yes — system reliability |
| 15 | Incident Responder | 4 | Unchanged | |
| 16 | Cost Optimizer | 4 | Unchanged | |
| 17 | Data Engineer | 5 | Unchanged | |
| 18 | ML Engineer | 5 | EXPANDED (+eval suites) | |
| 19 | **MLOps Pipeline** | 5 | ⭐ NEW | Yes — model delivery |
| 20 | **Labeling & Ground Truth** | 5 | ⭐ NEW | Yes — training data quality |
| 21 | Model Monitor | 5 | Unchanged | |
| 22 | Data Quality | 5 | Unchanged | |
| 23 | **Sales & Pre-Sales** | 6 | ⭐ NEW | Yes — pipeline → revenue |
| 24 | Content & SEO | 6 | MERGED (Content + SEO) | |
| 25 | Customer Success | 6 | Unchanged | |
| 26 | **Support Desk** | 6 | ⭐ NEW | |
| 27 | Feedback Analyzer | 6 | Unchanged | |
| 28 | **Billing & Revenue** | 6 | ⭐ NEW | Yes — monetization |
| 29 | **Product Analytics** | 7 | ⭐ NEW | Yes — behavioral measurement |
| 30 | **Legal & Privacy** | 8 | ⭐ NEW | |
| 31 | Documentation & Release | 8 | MERGED (3→1) | |
| 32 | **Agent Governance** | 8 | ⭐ NEW | Yes — agent workforce health |

**End-to-end owners (10):** These agents own outcomes, not just tasks. They're the team's key insight — connect work to results.

---

## AGENT ACTIVATION BY STAGE (Updated)

| Stage | Newly Active | Total Active |
|-------|-------------|-------------|
| **S0: Vision** | Orchestrator, Customer Discovery, Market Research, Competitor Intel | 4 |
| **S1: Validation** | + Product Manager, Business Analyst, Billing (pricing hypothesis) | 7 |
| **S2: Specification** | + UX Designer, Product Analytics (event taxonomy) | 9 |
| **S3: Architecture** | + Architect, Trust & Security | 11 |
| **S4: Foundation** | + Coder, Test Engineer, DevOps, Doc & Release | 15 |
| **S5: MVP Build** | + Code Reviewer, Data Engineer, ML Engineer, Data Quality, Labeling, MLOps Pipeline | 21 |
| **S6: Testing** | + QA & Performance | 22 |
| **S7: Deployment** | + SRE & Resilience | 23 |
| **S8: Launch** | + Sales, Content & SEO, Customer Success, Support Desk, Legal & Privacy, Feedback Analyzer, Billing (full) | 30 |
| **S9: Operations** | + Incident Responder, Model Monitor, Cost Optimizer | 33 |
| **S10: Growth** | + Agent Governance = **ALL 33** (Orchestrator + 32) | 33 |

---

## UPDATED COORDINATION PATTERNS

### Pattern 1: Discovery → Design → Build (the missing loop from v1)

```
Customer Discovery [validates problem with real users]
    → Product Manager [prioritizes, writes requirements]
        → UX Designer [creates flows, wireframes, clickable prototype]
            → Customer Discovery [tests prototype with users]
                → UX Designer [iterates based on feedback]
                    → Business Analyst [specifies data contracts, events]
                        → Coder Agent [implements]
```

### Pattern 2: Measure → Learn → Iterate (the quantitative loop)

```
Product Analytics [measures feature impact after release]
    → Product Manager [interprets: is this working?]
        → Customer Discovery [qualitative follow-up if unclear]
            → Product Manager [decides: iterate, pivot, or move on]
                → [back to Pattern 1 for next iteration]
```

### Pattern 3: Pipeline → Revenue (the business loop)

```
Customer Discovery [defines ICP]
    → Sales Agent [builds prospect list, outreach]
        → Sales Agent [qualifies, demos]
            → Legal & Privacy [contract prep]
                → Billing & Revenue [pricing, invoicing]
                    → Customer Success [onboarding]
                        → Support Desk [reactive support]
                            → Feedback Analyzer [patterns → PM]
```

### Pattern 4: ML Model Lifecycle (expanded)

```
Labeling Agent [prepares labeled dataset, versions it]
    → Data Quality [validates dataset]
        → ML Engineer [trains + evaluates model]
            → MLOps Pipeline [deploys to shadow/canary]
                → Model Monitor [watches production metrics]
                    → YOU [approve promotion if metrics pass]
                        → MLOps Pipeline [promote to full production]
                            → Model Monitor [continuous monitoring]
                                → Labeling Agent [new labels from errors]
```

### Pattern 5: Agent Health Loop (new)

```
Agent Governance [weekly eval of all agent outputs]
    → Agent Governance [scores quality, tracks cost, detects drift]
        → YOU [review scorecard, approve prompt changes]
            → Agent Governance [update prompts, re-run evals]
                → Orchestrator [route tasks based on quality scores]
```

---

## PRACTICAL IMPLEMENTATION TIMELINE (Updated)

### Month 1-3: Core Build (8 agents)

| Agent | Implementation |
|-------|---------------|
| Orchestrator | You + task board |
| Customer Discovery | Claude sessions with JTBD prompts |
| Product Manager | Claude sessions with BRD template |
| UX Designer | Claude sessions generating HTML prototypes |
| Coder | Claude Code / Cursor with PROJECT_INSTRUCTIONS |
| Code Reviewer | Different Claude session reviewing PRs |
| Test Engineer | Part of Coder's workflow |
| DevOps | Claude generating CI/CD + Docker configs |

### Month 3-6: Quality + ML (add 7 = 15 total)

| Agent | Implementation |
|-------|---------------|
| Trust & Security | Automated CI scans + Claude review |
| QA & Performance | Automated test suites + Claude |
| Data Engineer | Claude Code for pipeline development |
| ML Engineer | Python ML development with Claude |
| Data Quality | Automated validators in pipeline |
| Business Analyst | Claude sessions for spec refinement |
| Product Analytics | Event instrumentation + dashboard setup |

### Month 6-9: Operations + Revenue (add 10 = 25 total)

| Agent | Implementation |
|-------|---------------|
| SRE & Resilience | Monitoring setup + automated alerts |
| Incident Responder | Runbook automation + Claude diagnosis |
| MLOps Pipeline | Model deployment automation |
| Labeling & Ground Truth | Labeling tool + Claude guidelines |
| Sales & Pre-Sales | Claude for outreach + proposal drafts |
| Content & SEO | Claude for content creation |
| Customer Success | CRM + Claude for comms |
| Support Desk | Help desk + Claude triage |
| Legal & Privacy | Claude for template drafting |
| Billing & Revenue | Stripe + Claude for pricing analysis |

### Month 9-12: Scale + Governance (add 8 = 33 total)

| Agent | Implementation |
|-------|---------------|
| Architect | Claude sessions for design evolution |
| Competitor Intel | Automated monitoring + Claude synthesis |
| Market Research | Claude for quarterly updates |
| Model Monitor | Automated drift detection |
| Cost Optimizer | Cloud billing analysis |
| Feedback Analyzer | Pattern synthesis across all channels |
| Doc & Release | Automated doc generation + Claude |
| Agent Governance | Eval framework + quality scoring |

---

## COST ESTIMATION (Updated)

| Agent Tier | Agents | Model | Est. Monthly Cost |
|-----------|--------|-------|------------------|
| Heavy daily use | Coder, Code Reviewer, Test Engineer | Sonnet/Opus | $300-600 |
| Moderate use | PM, BA, UX Designer, ML Engineer, Sales | Sonnet | $150-300 |
| Automated/scheduled | Security, QA, Data Quality, SRE, Model Monitor | Haiku/Sonnet | $100-200 |
| Light/periodic | Market Research, Competitor, Legal, Content, Analytics | Haiku/Sonnet | $50-100 |
| Governance | Agent Governance | Sonnet | $30-50 |
| **Total estimated** | | | **$630-1,250/month** |

---

## WHAT I DISAGREED WITH (And Why)

For transparency, here's where I chose differently than the team's suggestion:

| Team Suggestion | My Decision | Rationale |
|----------------|------------|-----------|
| Separate Usability Tester Agent | Merged into UX Designer | Solo founder can't sustain a dedicated usability-only role. UX Designer does both design + lightweight usability testing. Split at 20+ customers. |
| Separate Experimentation Agent | Merged into Product Analytics | A/B testing is an analytics workflow, not a standalone role. The instrumentation + experimentation share the same data pipeline. |
| Separate Partnerships Agent | Merged into Sales | Channel partnerships are a sales motion for a solo founder. Split when partnerships generate >20% of pipeline. |
| Separate Training/Enablement Agent | Merged into Doc & Release | Tutorials and onboarding guides are documentation. Split when you have >20 customers needing self-serve training. |
| Separate Resilience/DR Agent | Expanded SRE scope | Backup/restore/DR are SRE responsibilities. Adding a separate agent creates handoff confusion on "who owns uptime?" |
| Separate Privacy Agent from Legal | Combined as Legal & Privacy | Data mapping, DPIAs, and PII governance are intertwined with legal obligations. One agent, two focus areas. Split for multi-jurisdiction compliance. |

---

> **Final count: 33 agents (1 orchestrator + 32 specialists) across 8 layers.**
>
> **10 end-to-end owners** connect work to outcomes: Customer Evidence, Product Direction, User Experience, System Reliability, Model Delivery, Training Data Quality, Revenue Pipeline, Monetization, Behavioral Measurement, Agent Workforce Health.
>
> **Start with 8, grow to 15, scale to 33.** The incremental approach prevents the coordination overhead your team correctly warned about.
