# TapVolt Repository Review (Core Product Readiness)

## Scope Note
This repository appears to contain the **mobile controller application** only. Desktop server implementation details (Node.js WebSocket server, queue executor, OS adapter internals) are not present in this repo, so desktop-specific findings are based on protocol contracts and mobile-side integration points.

## 1) Architecture Consistency Check

### Confirmed alignment with intended architecture
- **Layering is consistent**: UI screens/components delegate to a centralized Zustand store, which delegates transport and protocol concerns to `ConnectionManager`/`SocketService`.
- **Protocol model exists and is typed** for core messages (`AUTH`, `EXECUTE_ACTION`, `AUTH_SUCCESS`, `AUTH_FAILURE`, `ACTION_RESULT`, `ERROR`) and step types.
- **Operational reliability primitives are implemented** on mobile:
  - explicit state machine (`CONNECTING`, `CONNECTED`, `RECONNECTING`, `DISCONNECTED`, `ERROR`),
  - reconnection backoff,
  - heartbeat timeout detection,
  - per-action timeout and result correlation.
- **Persistence of endpoint/profile state** is present through AsyncStorage-backed service methods and hydration at boot.

### Gaps vs stated architecture
- `PING`/`PONG` is implemented in `ConnectionManager`, but `PING` is not represented in shared protocol types. This creates contract drift between runtime behavior and type system.
- `AuthMessage` in shared types includes optional `timestamp`, but outbound auth messages from `ConnectionManager` omit it; payload is structurally similar but not reusing shared protocol types.
- There is no explicit protocol capability/version negotiation flow beyond static `protocolVersion: "1.0"` in auth payload.

## 2) Technical Debt & Duplication (including executor-adjacent concerns)

### High-impact debt
1. **Protocol type duplication / drift**
   - `ConnectionManager` defines local envelope types (`AuthClientMessage`, `ExecuteActionClientMessage`, `PongClientMessage`) instead of importing the shared protocol contracts.
   - Result: higher risk of subtle client/server mismatch over time.

2. **Action model mismatch (single-step UI vs multi-step protocol)**
   - Protocol supports `steps: Step[]`, but UI/store APIs primarily pass a single `Step` and wrap it into one-step arrays.
   - This blocks richer action composition (macro chains), and can split behavior between config and transport layers.

3. **Duplicated preset action sources**
   - `DEFAULT_ACTIONS` and `PROFILES` define overlapping actions independently.
   - Risk: divergence, editing overhead, inconsistent labels/behaviors.

4. **Error taxonomy compression**
   - Store narrows most failures into `GENERIC_CONNECTION_ERROR` with limited machine-actionable categories.
   - This limits analytics, support tooling, and future UX branching.

5. **Debug logging in production path**
   - Device ID retrieval logs identifier values directly, which is useful temporarily but should be gated or redacted for production/commercial contexts.

### Executor-layer risks visible from mobile side
- No idempotency strategy beyond action ID dedupe window on the client. If reconnect + retry semantics evolve server-side, duplicate execution risk must be tightly managed.
- No advertised execution policy negotiation (queue size limits, command support, max step limits) despite local guardrails.

## 3) Authentication Evaluation & Secure Upgrade Path

### Current state (mobile side)
- Authentication sends static `clientId` + persistent local `deviceId` + fixed protocol version.
- No cryptographic proof of possession, no one-time challenge, no session token issuance/rotation, no expiry semantics.
- Auth errors are handled, but there is no re-auth lifecycle model (refresh, revoke, rotate).

### Recommended secure evolution (phased)
1. **Phase A: Pairing + key material bootstrap (must-have)**
   - Introduce QR pairing flow containing desktop-issued pairing nonce and endpoint metadata.
   - Mobile generates asymmetric keypair locally; sends public key during pairing.
   - Desktop stores device public key + metadata + trust state.

2. **Phase B: Challenge-response auth (must-have)**
   - On connect, server sends challenge nonce + timestamp.
   - Mobile signs challenge with private key.
   - Server verifies signature against paired public key and issues short-lived session token.

3. **Phase C: Token lifecycle and session hygiene (must-have before commercial rollout)**
   - Add `AUTH_REFRESH`, expiry, revocation list, and explicit `AUTH_EXPIRED` server message.
   - Bind tokens to device ID + key fingerprint + protocol version.

4. **Phase D: Transport hardening**
   - Enforce `wss://` in production builds; reject plaintext `ws://` except explicit dev mode.
   - Optionally add certificate pinning on mobile for MITM resistance.

5. **Phase E: Authorization granularity**
   - Add server-side policy scopes (e.g., shortcuts/text allowed, command disabled).
   - Surface denied capability in protocol response for explicit UX messaging.

## 4) Next 3 Highest-Impact Production Features

1. **Secure pairing + signed authentication + session tokens**
   - Directly addresses the largest security/commercial blocker.

2. **Protocol negotiation + capability handshake**
   - Add version negotiation (`HELLO`/`HELLO_ACK`) and capability flags (supports command, max steps, max text length).
   - Prevents brittle behavior when desktop/mobile versions diverge.

3. **Command governance and production safety controls**
   - Server-enforced allowlist/denylist and action policy profiles.
   - Include audit events for auth, execute, deny, and timeout outcomes.

## 5) Cleanup/Refactor Before Feature Expansion

- **Unify protocol contracts**
  - Make `src/types/protocol.ts` the single source of truth, including `PING` and `PONG`.
  - Remove `ConnectionManager`-local duplicates.

- **Normalize action abstractions**
  - Decide whether UI sends `Step` or full action (`steps[]`) and align all layers.
  - If macros are planned, promote profile definitions to multi-step actions now.

- **Consolidate presets**
  - Build profiles from `DEFAULT_ACTIONS` primitives or remove one source.

- **Harden error model**
  - Replace generic error collapse with stable error codes and structured metadata.

- **Prepare observability hooks**
  - Add non-PII event logging interfaces for connection/auth/execution metrics.

- **Security hygiene**
  - Remove or gate device ID logs behind dev flag.

## 6) Scaling & Commercialization Risks

- **Security/compliance risk**: current auth is not defensible for paid/commercial usage.
- **Protocol evolution risk**: no negotiation means forced lockstep releases.
- **Operational support risk**: limited telemetry/error taxonomy hampers debugging at scale.
- **Execution safety risk**: command-type actions without robust policy controls can become high-severity misuse vectors.
- **State consistency risk**: reconnect + pending action semantics need strict guarantees to avoid duplicate or ghost outcomes.

## 7) Prioritized Roadmap for Next Sprint

### Sprint objective
Establish production-grade trust boundary and forward-compatible protocol while reducing integration drift.

### Priority order
1. **P0 — Security foundation**
   - Define pairing protocol (QR payload, key exchange, trust model).
   - Implement signed challenge-response auth.
   - Add short-lived session token issuance and validation.

2. **P0 — Protocol contract hardening**
   - Add handshake/version negotiation and capability advertisement.
   - Update mobile protocol types and parsing to shared canonical schema.

3. **P1 — Refactor for maintainability**
   - Remove duplicated protocol envelopes from `ConnectionManager`.
   - Normalize action model (`steps[]` end-to-end).
   - Consolidate default/profile action definition sources.

4. **P1 — Production safety controls**
   - Add server-enforced action policy (especially for `command`).
   - Add explicit deny/error codes mapped to UX-safe messaging.

5. **P2 — Observability and release readiness**
   - Add structured event logging with privacy-safe fields.
   - Add minimal release checklist: TLS enforcement flag, protocol compatibility checks, auth/session tests.

### Exit criteria for the sprint
- Mobile can only authenticate via signed challenge-response.
- Session tokens have expiry + refresh handling.
- Client/server negotiate protocol version/capabilities on connect.
- No duplicate protocol definitions in mobile service layer.
- Action schema is unified and documented once.
