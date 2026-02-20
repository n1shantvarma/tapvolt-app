# TapVolt Mobile Controller — Production Documentation

## 1) Product Overview

### What problem this product solves
TapVolt Mobile Controller is a lightweight mobile remote for triggering desktop/server automation actions over WebSocket. It solves a common operations friction point: repetitive keyboard workflows (save/build/copy/paste/lock/session commands) are usually performed on the controlled host, even when a user is away from keyboard reach. This app turns a phone into a low-latency action deck that can execute predefined command steps on a remote automation server.

In practical terms, the product reduces context switching and repetitive manual input during:
- development workflows (save/build/open terminal),
- writing/editing workflows (select all/bold/paste),
- general desktop control (lock machine, inject snippets, trigger shortcuts).

### Target users
Primary:
- Software engineers and technical operators who run a local/office automation host and need quick action triggers.

Secondary:
- Power users who use macro workflows across desktop apps.
- Team environments where one machine is used as a shared presentation/build/demo station controlled from a phone.

### Core value proposition
- **Fast remote execution**: one-tap actions mapped to keyboard shortcuts, text, delays, keys, or commands.
- **Operational resilience**: heartbeat monitoring, automatic reconnection with exponential backoff, and action timeouts.
- **Predictable UX**: explicit connection state machine (CONNECTING/CONNECTED/RECONNECTING/ERROR/DISCONNECTED).
- **Low setup complexity**: enter server IP/WebSocket endpoint, authenticate, and start controlling immediately.

---

## 2) Feature Breakdown (Grouped by Module)

## A. Connection & Session Management

### Features
1. **WebSocket endpoint connection from user-entered address**
   - Converts host/IP input to `ws://` URL if scheme omitted.
   - Validates non-empty input and surfaces actionable errors.

2. **Explicit connection state machine**
   - States: `CONNECTING`, `CONNECTED`, `RECONNECTING`, `DISCONNECTED`, `ERROR`.
   - Transition guard prevents illegal state transitions.

3. **Automatic reconnection with exponential backoff**
   - Max attempts: 10.
   - Delay growth: `1s * 2^(attempt-1)`, capped at 10s.

4. **Lifecycle-aware network handling**
   - On app background/inactive: suspends reconnect, clears timers, disconnects socket.
   - On foreground: reconnects if target URL exists.

5. **Heartbeat liveness and stale-connection detection**
   - Responds to server `PING` with `PONG`.
   - Tracks last heartbeat; disconnects/reconnects when stale (>15s).

### Purpose and usage
This module ensures remote control reliability in unstable mobile network conditions and real-world app lifecycle transitions (lock screen, app switch, connectivity fluctuations).

---

## B. Authentication & Protocol Messaging

### Features
1. **Client authentication handshake**
   - Sends `AUTH` with `clientId` (currently fixed to `mobile-client` from store call site).

2. **Protocol envelope types**
   - Client messages: `AUTH`, `EXECUTE_ACTION`, `PONG`.
   - Server messages: `AUTH_SUCCESS`, `ERROR`, `ACTION_RESULT`, plus `PING` handling logic.

3. **Inbound message validation and parsing safety**
   - JSON parse checks with explicit error path.
   - Payload shape checks for action results and server errors.

### Purpose and usage
Guarantees that mobile and server stay in sync over a strict message contract and that malformed payloads degrade safely with user-visible error messages.

---

## C. Action Execution Engine

### Features
1. **Supported action step types**
   - `shortcut`, `text`, `delay`, `key`, `command`.

2. **Client-side payload validation before send**
   - Verifies non-empty action ID.
   - Verifies non-empty steps array.
   - Deep validation per step type with detailed error text.

3. **Action correlation and timeout handling**
   - Generates unique action IDs (`timestamp-nonce`).
   - Registers pending action timers (8s timeout).
   - Marks timed-out actions as failed and emits synthetic timeout result.

4. **Duplicate result suppression**
   - Maintains dedupe set of completed action IDs (rolling window up to 500) to avoid duplicate result handling.

### Purpose and usage
This module provides deterministic request/response behavior suitable for production remote control workflows where command acknowledgment and failure reporting are essential.

---

## D. Profiles and Action Presets

### Features
1. **Multiple preset profiles**
   - `Coding`, `Writing`, `General`.

2. **Profile-specific 3x3 action grid**
   - Each profile defines nine action tiles.

3. **Preset action examples**
   - Save/Copy/Paste shortcuts,
   - Build command text injection,
   - Delay step,
   - Lock machine shortcut,
   - Reusable text snippets (email/hello).

### Purpose and usage
Profiles let users switch context quickly by domain (coding vs writing) without reconfiguring actions each session.

---

## E. UI and Interaction Model

### Features
1. **Two-screen navigation flow**
   - `Connect` screen for endpoint entry and connection monitoring.
   - `Controller` screen for authentication, profile selection, and action triggering.

2. **Controller status telemetry**
   - Connected state, connection state, reconnect attempt count, auth state, heartbeat timestamp.

3. **Action result observability**
   - Shows last result ID, status, execution time, and error text.

4. **Operational affordances**
   - Disables action grid until authenticated.
   - Suppresses noisy errors while reconnecting.
   - Includes clear disconnect action.

### Purpose and usage
The UI is optimized for rapid, high-contrast tapping and immediate operational feedback rather than complex configuration.

---

## F. Persistence and User Continuity

### Features
1. **Persistent storage of last IP/endpoint input**
2. **Persistent storage of selected active profile**
3. **Hydration gate at app boot (`isHydrated`)**
   - App does not render navigational flow until persistence load completes.

### Purpose and usage
Users can relaunch the app without re-entering endpoint/profile, improving repeated daily usage.

---

## 3) Architecture Explanation

### High-level system design
The app follows a **thin UI + centralized state + service layer** model:

- **Presentation Layer**: React Native screens/components render state and dispatch intents.
- **State Layer**: Zustand store owns app/session/UI state and orchestrates side effects.
- **Service Layer**:
  - `ConnectionManager` handles protocol/state machine/timers/reconnect/validation.
  - `SocketService` provides low-level WebSocket lifecycle and I/O.
  - `Persistence` handles AsyncStorage read/write and serialization.
- **Config Layer**: static profile/action definitions.
- **Protocol Type Layer**: TypeScript union types define message and step contracts.

### Folder structure explanation
- `App.tsx`, `index.ts`: bootstrapping and hydration gate.
- `src/app/`: navigation graph and route typing.
- `src/screens/`: top-level screen containers (`Connect`, `Controller`).
- `src/components/`: reusable UI units (`ActionButton`, `ActionGrid`).
- `src/services/`: WebSocket transport, connection orchestration, persistence adapters.
- `src/store/`: Zustand global state and action methods.
- `src/config/`: static action/profile presets.
- `src/types/`: protocol type system.

### Data flow between modules
1. User interacts with screen (e.g., presses Connect/Authenticate/Action).
2. Screen calls store method (`connect`, `authenticate`, `sendAction`).
3. Store delegates network operations to `ConnectionManager`.
4. `ConnectionManager` uses `SocketService` to send/receive messages.
5. Manager callbacks report state/result/error/heartbeat back into store.
6. Store updates trigger React rerenders on subscribed selectors.
7. Persistence side effects store IP/profile asynchronously.

### State management strategy
- Uses **single Zustand store** for connection/session/UI state.
- Read models are selector-based in components for minimal wiring overhead.
- Side effects are colocated in store actions and manager callbacks.
- Hydration pattern ensures persisted values are loaded before rendering the app navigator.

### API and service interaction
- Only network dependency is WebSocket server.
- Outbound messages are JSON envelopes (`AUTH`, `EXECUTE_ACTION`, `PONG`).
- Inbound server messages are parsed and validated defensively.
- Error paths are normalized to user-facing store `error` field.

---

## 4) Technical Decisions

### Tech stack and rationale
- **React Native + Expo**: rapid cross-platform mobile delivery with native runtime support.
- **TypeScript**: strict contracts for protocol safety and maintainability.
- **React Navigation (native stack)**: minimal and performant screen management.
- **Zustand**: low-boilerplate global state with direct action methods.
- **AsyncStorage**: lightweight local persistence for user preferences.

### Architectural patterns in use
- **Service layer pattern**: transport and connection logic isolated from UI.
- **State machine pattern**: explicit connection lifecycle with transition validation.
- **Event/callback-driven orchestration**: manager emits events consumed by store.
- **Configuration-driven behavior**: actions/profiles defined in static config maps.

### Scalability considerations
Current strengths:
- clear boundaries between UI, state, and transport;
- typed protocol contracts;
- reconnect and timeout resilience.

Scale constraints to address:
- single hardcoded auth client ID;
- no server capability negotiation/versioning;
- no telemetry pipeline beyond in-memory state;
- no offline action queueing.

---

## 5) Execution Flow

### How actions are triggered
1. User selects profile action tile.
2. `ActionGrid` passes `Step` to store `sendAction`.
3. Store calls `connectionManager.sendAction(step)`.
4. Manager builds action ID, validates payload, sends `EXECUTE_ACTION`.
5. Manager starts timeout timer and marks action pending in store.
6. Server returns `ACTION_RESULT`; manager clears pending timer and emits result.
7. Store updates `actionStatuses`, `lastResult`, and error if needed.

### Lifecycle of a user interaction (end-to-end)
1. App launch → store hydration of IP/profile.
2. User enters endpoint and taps Connect.
3. Manager opens WebSocket, state transitions to CONNECTING then CONNECTED.
4. User taps Authenticate, sends `AUTH`.
5. On `AUTH_SUCCESS`, store flips `isAuthenticated=true`, enabling action grid.
6. User triggers actions; each receives per-action status and timeout/error handling.
7. Backgrounding app triggers graceful disconnect and state reset.
8. Returning foreground reconnects automatically if target URL exists.

### Background processes / pipelines
- **Heartbeat watchdog** interval every 1 second checking stale heartbeat threshold.
- **Reconnection scheduler** using exponential backoff timeout.
- **Per-action timeout timers** enforcing response SLA (8 seconds).
- **Persistence writes** for endpoint and profile changes.

---

## 6) Developer Onboarding Guide

### Prerequisites
- Node.js LTS
- npm
- Expo CLI runtime via project scripts
- Mobile simulator/device with Expo Go (or native runtime)

### Run locally
1. Install dependencies:
   - `npm install`
2. Start dev server:
   - `npm run start`
3. Launch target:
   - Android: `npm run android`
   - iOS: `npm run ios`
   - Web preview: `npm run web`

### Important environment variables
- This repository currently does **not** define `.env`-based runtime variables.
- Connection endpoint is user-provided at runtime in the Connect screen.
- Suggested production env additions:
  - `DEFAULT_WS_URL`
  - `APP_CLIENT_ID`
  - `MAX_RECONNECT_ATTEMPTS`
  - `ACTION_TIMEOUT_MS`
  - `HEARTBEAT_TIMEOUT_MS`

### Build and deployment steps
Current:
- Standard Expo app lifecycle (dev-first). No CI/CD or EAS workflow files present in repository.

Recommended production baseline:
1. Add EAS build profiles (`development`, `preview`, `production`).
2. Add environment-specific app config.
3. Add automated TypeScript and lint checks in CI.
4. Produce signed Android/iOS artifacts via EAS.
5. Add release notes + semantic versioning discipline.

---

## 7) Missing or Risky Areas

### Incomplete features / product gaps
- No in-app profile/action editor; presets are static in source.
- No authentication token flow or secure identity mechanism beyond client ID string.
- No TLS enforcement/URL safety defaults (`ws://` auto-prefix may remain insecure in production).
- No user role model or command-scope permissions.

### Technical debt
- `DEFAULT_ACTIONS` config exists but appears unused by runtime flow (possible dead config artifact).
- Duplicate protocol definitions between `types/protocol.ts` and manager-local message types create drift risk.
- Store sets callbacks during initialization side-effect; testing/mocking boundaries are limited.

### Potential performance/reliability concerns
- Controller screen renders full profile button map + grid each state change without memoized selectors per sub-tree.
- Error handling is string-based without structured error codes, limiting observability.
- Pending action map clears on background transition; long-running server actions may become orphaned from client perspective.
- No message ordering/version checks for protocol evolution.

---

## 8) Future Roadmap Suggestions

### Logical next features
1. **Custom macro builder**
   - Multi-step action authoring UI (shortcut + delay + text + command).
2. **Secure pairing model**
   - QR pairing, one-time tokens, rotating session keys.
3. **Server discovery**
   - LAN discovery (mDNS/Bonjour) for zero-config setup.
4. **Action history & analytics**
   - Per-action success rates and latency trends.
5. **Multi-server workspaces**
   - Save multiple endpoints and switch contexts quickly.

### Monetization possibilities
1. **Pro tier**: unlimited custom profiles, cloud backup, advanced macros.
2. **Team plan**: shared profile libraries and admin policy controls.
3. **Enterprise**: SSO, audit logs, device management, private distribution.
4. **Marketplace**: paid workflow packs for IDEs, design tools, and productivity suites.

### Improvements for scale
- Introduce protocol version negotiation and schema validation library.
- Add structured logging + telemetry export hooks.
- Split store into domain slices (connection/auth/actions/ui) as feature count grows.
- Add integration test harness with mocked WebSocket server.
- Add robust retry policies with jitter and circuit-breaker semantics.

---

## Appendix: Practical Deployment Readiness Checklist

- [ ] Enforce `wss://` in production.
- [ ] Replace static client ID with secure identity strategy.
- [ ] Add CI checks: typecheck, lint, unit tests.
- [ ] Add crash/error reporting and anonymized telemetry.
- [ ] Add protocol compatibility/version policy.
- [ ] Add profile/action editing and export/import.
- [ ] Define SLA for action timeout and reconnect behavior.
