# Nest

Managed Agentic Studio for the Weaver ecosystem.

## Overview

Nest is the visual control plane for Weaver. It provides a collaborative, studio-grade interface for orchestrating high-density agents across managed infrastructure.

- **Weaver Integration:** Connects directly to Weaver agent workspaces.
- **Hergé Aesthetic:** Ligne Claire design language for technical clarity.
- **Surface Orchestration:** Visual workspace for managing agentic threads.
- **Canvas Mutations:** Real-time UI control bridge allowing Weaver agents to create and modify canvas nodes programmatically.

## Architecture

Nest uses the `WeaverProvider` to communicate with the `weaver.onl` REST API. It supports standard chat, code generation, and direct UI commands (e.g., `create_node`) dispatched by the agent.

## Development

1.  `npm install`
2.  `npm run dev`

## Deployment

Pushes to `nest.operator.onl` (Dev) and `nest.onl` (Prod).
