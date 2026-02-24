# Deep Agent Meta Platform - Production Folder Structure

> This document describes the complete production-ready folder structure.
> Reference: ARCHITECTURE_v3_FINAL.md

---

## Root Level

```
DAPlatform/
├── src/                    # Source code (7-layer implementation)
├── libs/                   # Shared libraries (contracts, gRPC, utils)
├── prompts/                 # Agent prompts (by agent ID)
├── skills/                 # Reusable skills (platform, domain)
├── tests/                  # Test suites (unit, integration, e2e)
├── evals/                  # Evaluation tasks (golden, regression)
├── docs/                   # Documentation
├── infra/                  # Infrastructure as Code
├── scripts/                # Utility scripts
├── config/                 # Configuration files
├── .github/                # GitHub workflows, templates
└── ARCHITECTURE_v3_FINAL.md  # ⭐ Single source of truth
```

---

## src/ - Source Code

```
src/
├── gateway/                    # Layer 2: API Gateway
│   ├── src/
│   │   ├── index.ts          # Entry point
│   │   ├── routes/          # REST/GraphQL routes
│   │   ├── middleware/      # Auth, rate-limit, validation
│   │   └── services/        # Gateway services
│   ├── Dockerfile
│   └── package.json
│
├── orchestrator/               # Layer 3: Master Orchestrator (Agent 00)
│   ├── src/
│   │   ├── TaskGraph/       # DAG planning & execution
│   │   ├── Scheduler/        # Workflow scheduling
│   │   ├── Checkpoint/       # State persistence
│   │   └── HitlQueue/       # Human-in-the-loop queue
│   └── package.json
│
├── memory-service/             # Layer 5: Memory Service
│   ├── src/
│   │   ├── grpc/            # gRPC server
│   │   ├── layers/           # L1-L6 implementations
│   │   │   ├── L1_Working/  # Redis
│   │   │   ├── L2_Episodic/  # Postgres + pgvector
│   │   │   ├── L3_Semantic/   # Neo4j
│   │   │   ├── L4_Procedural/ # Git
│   │   │   ├── L5_Shared/    # Shared Graph
│   │   │   └── L6_Resource/  # Object Store
│   │   └── ContextCompiler/  # L1 assembly algorithm
│   ├── proto/                # Protocol Buffers
│   └── package.json
│
├── tool-gateway/              # Layer 6: Tool Gateway
│   ├── src/
│   │   ├── PolicyPreflight/ # Risk evaluation
│   │   ├── Sandbox/         # Isolated execution
│   │   └── McpServers/     # MCP tool adapters
│   └── package.json
│
├── event-bus/                 # Layer 3: NATS Event Bus
│   ├── src/
│   │   ├── publishers/       # Event publishers
│   │   ├── subscribers/      # Event consumers
│   │   └── handlers/        # Event handlers
│   └── package.json
│
├── policy-engine/             # Layer 7: OPA/Cedar Policy
│   ├── src/
│   │   ├── evaluator/        # Policy evaluation
│   │   └── policies/         # Rego/Cedar policies
│   └── policies/             # Policy files
│
└── agent-runtime/             # Layer 4: Agent Runtime (Shared Chassis)
    ├── common/               # Shared components
    │   ├── memory/          # Memory Manager
    │   ├── skills/          # Skills Reader
    │   ├── context/         # Context Compiler
    │   ├── invariants/      # Invariants Engine
    │   ├── execution-guard/ # Execution Guard
    │   └── reasoning/        # Reasoning Engine
    │
    └── agents/              # 33 Specialized Agents
        ├── agent-00-orchestrator/
        ├── agent-01-customer-discovery/
        ├── agent-02-market-research/
        ├── agent-03-competitor-intel/
        ├── agent-04-pm/
        ├── agent-05-ba/
        ├── agent-06-ux/
        ├── agent-07-architect/
        ├── agent-08-coder/
        ├── agent-09-review/
        ├── agent-10-test/
        ├── agent-11-security/
        ├── agent-12-qa/
        ├── agent-13-devops/
        ├── agent-14-sre/
        ├── agent-15-incident/
        ├── agent-16-cost-optimizer/
        ├── agent-17-data-engineer/
        ├── agent-18-ml-engineer/
        ├── agent-19-mlops/
        ├── agent-20-labeling/
        ├── agent-21-model-monitor/
        ├── agent-22-data-quality/
        ├── agent-23-sales/
        ├── agent-24-content/
        ├── agent-25-customer-success/
        ├── agent-26-support/
        ├── agent-27-feedback/
        ├── agent-28-billing/
        ├── agent-29-analytics/
        ├── agent-30-legal/
        ├── agent-31-docs/
        └── agent-32-governance/

        # Each agent folder contains:
        #   ├── manifest.yaml      # Agent configuration
        #   ├── invariants.yaml   # Agent-specific rules
        #   ├── Dockerfile
        #   └── package.json
```

---

## libs/ - Shared Libraries

```
libs/
├── contracts/               # Schemas & validation
│   ├── events/            # Event schemas (from spec)
│   ├── api/               # API contracts
│   └── schemas/           # JSON schemas
│
├── grpc/                   # gRPC definitions
│   ├── memory/            # Memory Service proto
│   ├── orchestrator/      # Orchestrator proto
│   ├── tool-gateway/      # Tool Gateway proto
│   └── agent-runtime/      # Agent Runtime proto
│
├── utils/                   # Shared utilities
│   ├── logger/             # Structured logging
│   ├── metrics/           # Prometheus metrics
│   └── tracing/           # OpenTelemetry tracing
│
└── config/                 # Shared config types
```

---

## prompts/ - Agent Prompts

```
prompts/
├── platform/               # Platform-level prompts (all agents)
│   ├── identity.md        # "You are an agent..."
│   ├── reasoning.md       # Reasoning guidelines
│   └── output_format.md   # Response structure
│
├── agent-01/              # Agent-specific prompts
├── agent-02/
├── ...
└── agent-32/
    ├── system.md          # Agent system prompt
    ├── task/              # Task-specific prompts
    │   ├── discovery.md
    │   └── ...
    └── examples/          # Few-shot examples
```

---

## skills/ - Reusable Skills

```
skills/
├── platform/              # Platform-wide skills
│   ├── code-review.md
│   ├── debugging.md
│   ├── security-scan.md
│   └── ...
│
└── domain/               # Domain-specific skills
    ├── analytics/
    ├── ml/
    ├── security/
    └── ...
```

---

## tests/ - Test Suites

```
tests/
├── unit/                  # Unit tests (per component)
│   ├── gateway/
│   ├── orchestrator/
│   ├── memory-service/
│   └── ...
│
├── integration/           # Integration tests
│   ├── flows/
│   │   ├── flow-a-sync-request/
│   │   ├── flow-b-taskgraph/
│   │   └── ...
│   └── api/
│
├── e2e/                  # End-to-end tests
│   ├── user-journeys/
│   └── smoke-tests/
│
└── fixtures/             # Test data
    ├── mocks/
    └── seeds/
```

---

## evals/ - Evaluation Framework

```
evals/
├── golden-tasks/          # Golden task benchmarks
│   ├── coding/
│   │   ├── task-001/
│   │   │   ├── input.json
│   │   │   ├── expected-output.json
│   │   │   └── rubric.yaml
│   │   └── ...
│   ├── design/
│   ├── analysis/
│   └── ...
│
├── regression/            # Regression test suite
│   └── run.sh
│
└── benchmarks/           # Performance benchmarks
    └── latency.yaml
```

---

## docs/ - Documentation

```
docs/
├── templates/             # Templates
│   ├── BRD.md           # Business Requirements
│   ├── ADR.md           # Architecture Decision Record
│   └── RFC.md           # Request for Comments
│
├── api/                  # API documentation
│   └── generated/        # Auto-generated from OpenAPI
│
└── architecture/        # Architecture diagrams
    └── *.md             # Architecture decision docs
```

---

## infra/ - Infrastructure as Code

```
infra/
├── terraform/             # Terraform configs
│   ├── modules/         # Reusable modules
│   │   ├── postgres/
│   │   ├── neo4j/
│   │   ├── redis/
│   │   ├── nats/
│   │   ├── kubernetes/
│   │   └── ...
│   │
│   └── environments/
│       ├── dev/          # Development environment
│       ├── staging/      # Staging environment
│       └── prod/         # Production environment
│
├── kubernetes/           # K8s manifests
│   ├── base/            # Base templates
│   │   ├── gateway/
│   │   ├── orchestrator/
│   │   ├── memory-service/
│   │   └── agents/
│   │
│   └── overlays/        # Environment-specific
│       ├── dev/
│       ├── staging/
│       └── prod/
│
├── docker/               # Dockerfiles
│   ├── gateway/
│   ├── orchestrator/
│   ├── memory-service/
│   └── ...
│
├── migrations/           # Database migrations
│   ├── 001_create_episodic.sql
│   ├── 002_create_artifact_index.sql
│   └── ...
│
└── scripts/             # Infra scripts
    ├── deploy.sh
    ├── rollback.sh
    └── backup.sh
```

---

## scripts/ - Utility Scripts

```
scripts/
├── migration/            # Database migrations
├── seed/                # Seed data
├── benchmark/           # Performance benchmarks
└── deploy/              # Deployment scripts
```

---

## config/ - Configuration

```
config/
├── defaults/            # Default configs
│   ├── gateway.yaml
│   ├── orchestrator.yaml
│   ├── memory-service.yaml
│   └── agents.yaml
│
└── environments/        # Environment overrides
    ├── dev.yaml
    ├── staging.yaml
    └── prod.yaml
```

---

## .github/ - GitHub Automation

```
.github/
├── workflows/            # CI/CD pipelines
│   ├── ci.yml          # Pull request checks
│   ├── cd.yml          # Deploy on merge
│   ├── eval.yml        # Run evaluation
│   └── ...
│
├── issue-templates/     # Issue templates
│   ├── bug.md
│   ├── feature.md
│   └── ...
│
└── pr-templates/       # PR templates
    └── default.md
```

---

## File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Source files | kebab-case | `memory-service.ts` |
| Tests | kebab-case.test | `context-compiler.test.ts` |
| Config | kebab-case.config | `gateway.config.yaml` |
| Scripts | kebab-case.sh | `deploy-to-prod.sh` |
| Agents | agent-XX-name/ | `agent-08-coder/` |
| Prompts | lowercase.md | `system.md` |
| Skills | lowercase.md | `code-review.md` |

---

## Quick Reference

| What | Where |
|------|-------|
| Architecture | `../ARCHITECTURE_v3_FINAL.md` |
| Development guide | `../PROJECT_INSTRUCTIONS.md` |
| API spec | `specs and data contracts/API_SPEC.yaml` |
| Event schemas | `libs/contracts/events/` |
| Agent config | `src/agent-runtime/agents/agent-XX/manifest.yaml` |
| Database schema | `infra/migrations/` |
| Docker compose | `infra/docker-compose.yml` |

---

> Last updated: February 2026
