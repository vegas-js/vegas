---
outline: deep
---

# Why Vegas

## The Challenge of Modern GAS Development

Standard build tools are designed for the open web, not the unique constraints of the Google Apps Script (GAS) platform. When developers try to force-fit modern workflows into GAS, they often encounter broken routing, bloated bundles, and unreliable state management.

Vegas was built to bridge this gap by providing a specialized pipeline that respects GAS architecture while delivering a 2026-standard development experience.

## Capability Comparison

| Capability                           | clasp alone | Vite alone        | Vegas                   |
| :----------------------------------- | :---------- | :---------------- | :---------------------- |
| Local frontend dev server            | No          | Yes               | Yes                     |
| Local Apps Script-oriented runtime   | No          | No                | Yes, for supported APIs |
| Apps Script project push             | Yes         | No                | Yes                     |
| Apps Script-oriented build           | No          | General web build | Yes                     |
| Automatic SPA client entry discovery | No          | No by default     | Yes                     |

## Core Advantages

1. Reliable "Full-Bundle Refresh" (Not just HMR)

While standard HMR (Hot Module Replacement) is great for the web, it can introduce "ghost bugs" in the GAS global scope. Vegas takes a more robust approach.

- **Clean-State Execution:**
  Upon saving, Vegas performs a lightning-fast re-bundle of your entire server-side logic and restarts the local runtime context.
- **No Orphaned State:**
  By avoiding partial module updates, Vegas lets each refresh run against a newly started local runtime context instead of preserving stale server-side module state.
- **Powered by Vite:**
  Vegas uses Vite for fast rebuilds, keeping Full-Bundle Refresh responsive while restarting the local runtime context for each refresh.

2. Native Multi-Frontend Support

Building a professional GAS application usually means managing multiple roles (e.g., an Admin Dashboard and a User Interface).

- **Decoupled Logic:**
  Vegas automatically detects separate entry points (like `admin/main.tsx` and `user/main.tsx`). This prevents complex routing and user validation logic from becoming intertwined.
- **Plugin Compatibility:**
  Standard Vite multi-page configurations often use code-splitting that conflicts with GAS plugin requirements. Vegas ensures each entry is built as a standalone, compatible unit.
- **Optimized Payload:**
  By separating frontends at the build level, Vegas ensures that users only download the code they need, preventing the bundle-size bloat common in single-SPA GAS projects.

3. Local Apps Script Runtime

Vegas doesn't just build your code; it also provides a local runtime for development and preview workflows.

- **Apps Script-Oriented Execution:**
  The runtime provides local behavior for selected Apps Script APIs so server-side code can participate in the development feedback loop.
- **Partial API Coverage:**
  Support varies by service and method. The local runtime is useful for development feedback, but it is not a complete or exact reproduction of the Google Apps Script execution environment.
