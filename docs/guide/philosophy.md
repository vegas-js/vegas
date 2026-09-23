---
outline: deep
---

# Project Philosophy

## Focus on Developer Experience (DX): Shortening the Feedback Loop

GAS development is often hindered by the latency between writing code and seeing results. Vegas brings the near-instant feedback of modern web development to the GAS ecosystem.

- **Eliminating Latency:**
  Vegas provides a local runtime that executes code immediately upon saving, removing the "push-and-wait" cycle.
- **Rapid Iteration:**
  By fostering a fast feedback loop, developers can maintain focus on logic rather than infrastructure overhead.

## Local Runtime: Faster Development Feedback

Relying exclusively on remote execution makes iteration slower. Vegas therefore provides a local runtime that lets supported Apps Script behavior participate in the development and preview feedback loop.

- **Contract-First Behavior:**
  Runtime behavior is implemented from public contracts such as Google Apps Script documentation, public standards, and documented upstream specifications.
- **Explicit Behavior Categories:**
  Audited methods distinguish documented implementations, local emulation, intentional no-ops, and fail-closed behavior instead of presenting all structurally available methods as equivalent.
- **No Behavioral Oracle:**
  Vegas does not probe the production Google Apps Script runtime to discover undocumented behavior for the Local Runtime.

See [Local Runtime](./local-runtime) for the complete runtime and verification model.

## Architectural Scalability: Multi-Frontend Strategy

Managing multiple user interfaces within a single GAS project traditionally introduces significant complexity. Vegas resolves this through a dedicated multi-entry detection system.

- **Decoupled Logic:**
  Separate entry points (e.g., User vs. Admin) prevent authentication and routing logic from becoming intertwined and unmanageable.
- **Optimized for GAS Plugins:**
  Standard Vite multi-page configurations can split code in ways that conflict with GAS-specific requirements. Vegas ensures each frontend is built as a clean, independent unit.
- **Payload Optimization:**
  Building distinct SPAs for different roles prevents bundle size bloat, ensuring users download only the code necessary for their specific environment.

## Integrated Apps Script Workflow

Vegas is designed to cover the full development path from local development through production push while keeping each responsibility explicit.

- **Local Development and Build:**
  Vegas provides the development server, local Apps Script-oriented runtime for supported APIs, and production build pipeline.
- **Native Apps Script Push:**
  Production build output can be pushed directly to an Apps Script project with `vegas push`.
- **Migration Compatibility:**
  Existing projects can continue using a script ID from `.clasp.json` while migrating to the Vegas-native `appsScript.scriptId` configuration.
