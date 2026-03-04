---
outline: deep
---

# Why Vegas

## The Challenge of Modern GAS Development

Standard build tools are designed for the open web, not the unique constraints of the Google Apps Script (GAS) platform. When developers try to force-fit modern workflows into GAS, they often encounter broken routing, bloated bundles, and unreliable state management.

Vegas was built to bridge this gap by providing a specialized pipeline that respects GAS architecture while delivering a 2026-standard development experience.

## Comparison: Why Vegas is the Right Choice

| Feature           | Legacy (clasp only)      | Standard Vite Plugins   | Vegas                            |
| :---------------- | :----------------------- | :---------------------- | -------------------------------- |
| Feedback Loop     | 🐌 Slow (Push & Refresh) | 💨 Fast (Web HMR only)  | ⚡️ Instant (Full-Bundle Refresh) |
| Execution State   | Online Only              | Potentially Unstable    | Always Clean & Reliable          |
| Frontend Strategy | Monolithic SPA           | Complex Config Required | Native Multi-Entry Support       |
| Bundle Size       | Bloated                  | Variable                | Optimized per Entry              |

## Core Advantages

1. Reliable "Full-Bundle Refresh" (Not just HMR)

While standard HMR (Hot Module Replacement) is great for the web, it can introduce "ghost bugs" in the GAS global scope. Vegas takes a more robust approach.

- **Clean-State Execution:**
  Upon saving, Vegas performs a lightning-fast re-bundle of your entire server-side logic and restarts the local runtime context.
- **No Orphaned State:**
  By avoiding partial module updates, you are guaranteed to test code that is a 1:1 representation of what will actually run on Google’s servers.
- **Powered by Rust:**
  Leveraging the speed of Rolldown (Rust-based), this full refresh happens in milliseconds, providing the speed of HMR with the reliability of a fresh start.

2. Native Multi-Frontend Support

Building a professional GAS application usually means managing multiple roles (e.g., an Admin Dashboard and a User Interface).

- **Decoupled Logic:**
  Vegas automatically detects separate entry points (like `admin/main.tsx` and `user/main.tsx`). This prevents complex routing and user validation logic from becoming intertwined.
- **Plugin Compatibility:**
  Standard Vite multi-page configurations often use code-splitting that conflicts with GAS plugin requirements. Vegas ensures each entry is built as a standalone, compatible unit.
- **Optimized Payload:**
  By separating frontends at the build level, Vegas ensures that users only download the code they need, preventing the bundle-size bloat common in single-SPA GAS projects.

3. High-Fidelity Local Runtime

Vegas doesn't just build your code; it emulates the GAS environment.

- **Synchronous Simulation:**
  Vegas respects the synchronous nature of GAS APIs.
- **In-Memory Services:**
  From Spreadsheet and Drive to Properties and Session, Vegas provides high-fidelity local implementations, allowing for comprehensive testing without ever hitting Google's rate limits or touching live production data.
