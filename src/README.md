# Source Code

This directory contains the 7-layer implementation of the Deep Agent Platform.

## Services

| Layer | Service | Description |
|-------|---------|-------------|
| Layer 2 | gateway | API Gateway (REST/GraphQL) |
| Layer 3 | orchestrator | Master Orchestrator (Agent 00) |
| Layer 3 | event-bus | NATS Event Bus |
| Layer 4 | agent-runtime | Agent Runtime (33 Specialized Agents) |
| Layer 5 | memory-service | 6-Layer Memory System |
| Layer 6 | tool-gateway | Tool Gateway with MCP |
| Layer 7 | policy-engine | OPA/Cedar Policy Engine |

## Building

```bash
# Build all services
cd gateway && npm install && npm run build
cd ../orchestrator && npm install && npm run build
# ... etc
```

## Development

Each service can be run in development mode:
```bash
cd gateway && npm run dev
```
