import { AppState, type AppStateStatus, type NativeEventSubscription } from "react-native";

import type { Step } from "../types/protocol";
import { getOrCreateDeviceId } from "../utils/deviceId";
import { SocketService } from "./socketService";

export enum ConnectionState {
  CONNECTING = "CONNECTING",
  CONNECTED = "CONNECTED",
  RECONNECTING = "RECONNECTING",
  DISCONNECTED = "DISCONNECTED",
  ERROR = "ERROR",
}

type AuthClientMessage = {
  type: "AUTH";
  payload: {
    clientId: string;
    deviceId: string;
    protocolVersion: "1.0";
  };
};

type ExecuteActionClientMessage = {
  type: "EXECUTE_ACTION";
  timestamp: number;
  payload: {
    id: string;
    steps: Step[];
  };
};


type PongClientMessage = {
  type: "PONG";
  timestamp: number;
};

type ClientEnvelopeMessage =
  | AuthClientMessage
  | ExecuteActionClientMessage
  | PongClientMessage;

export type ExecutionResult = {
  id: string;
  status: "success" | "error";
  executionTime: number;
  error?: string;
};

type ConnectionManagerCallbacks = {
  onStateChange?: (state: ConnectionState, reconnectAttempt: number) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onAuthSuccess?: () => void;
  onAuthFailure?: () => void;
  onActionResult?: (result: ExecutionResult) => void;
  onActionTimeout?: (actionId: string) => void;
  onError?: (message: string) => void;
  onHeartbeat?: (timestamp: number) => void;
};

const MAX_RECONNECT_ATTEMPTS = 10;
const MAX_RECONNECT_DELAY_MS = 10_000;
const HEARTBEAT_TIMEOUT_MS = 15_000;
const HEARTBEAT_CHECK_INTERVAL_MS = 1_000;
const ACTION_TIMEOUT_MS = 8_000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const SUPPORTED_STEP_TYPES = new Set<Step["type"]>([
  "shortcut",
  "text",
  "delay",
  "key",
  "command",
]);

const validateStep = (step: unknown, index: number): string | null => {
  if (!isRecord(step)) {
    return `Step ${index} must be an object.`;
  }

  if (typeof step.type !== "string") {
    return `Step ${index} is missing string field "type".`;
  }

  if (!SUPPORTED_STEP_TYPES.has(step.type as Step["type"])) {
    return `Step ${index} has unsupported type "${step.type}".`;
  }

  switch (step.type) {
    case "shortcut": {
      if (!Array.isArray(step.keys) || step.keys.length === 0) {
        return `Step ${index} (shortcut) must include non-empty "keys" array.`;
      }
      const hasNonStringKey = step.keys.some((key) => typeof key !== "string");
      if (hasNonStringKey) {
        return `Step ${index} (shortcut) has non-string key entries.`;
      }
      return null;
    }
    case "text":
      if (typeof step.value !== "string") {
        return `Step ${index} (text) must include string field "value".`;
      }
      return null;
    case "delay":
      if (
        typeof step.duration !== "number" ||
        !Number.isFinite(step.duration) ||
        step.duration < 0
      ) {
        return `Step ${index} (delay) must include non-negative numeric field "duration".`;
      }
      return null;
    case "key":
      if (typeof step.key !== "string") {
        return `Step ${index} (key) must include string field "key".`;
      }
      return null;
    case "command":
      if (typeof step.command !== "string") {
        return `Step ${index} (command) must include string field "command".`;
      }
      return null;
    default:
      return `Step ${index} has unsupported type "${String(step.type)}".`;
  }
};

const validateExecuteActionPayload = (payload: unknown): string | null => {
  if (!isRecord(payload)) {
    return "Payload must be an object.";
  }

  if (typeof payload.id !== "string" || payload.id.trim().length === 0) {
    return 'Payload must include non-empty string field "id".';
  }

  if (!Array.isArray(payload.steps) || payload.steps.length === 0) {
    return 'Payload must include non-empty "steps" array.';
  }

  for (let index = 0; index < payload.steps.length; index += 1) {
    const error = validateStep(payload.steps[index], index);
    if (error) {
      return error;
    }
  }

  return null;
};

const toWsUrl = (raw: string): string => {
  const trimmed = raw.trim();
  if (trimmed.startsWith("ws://") || trimmed.startsWith("wss://")) {
    return trimmed;
  }
  return `ws://${trimmed}`;
};

const buildActionTimeoutResult = (actionId: string): ExecutionResult => {
  return {
    id: actionId,
    status: "error",
    executionTime: ACTION_TIMEOUT_MS,
    error: "Action timed out after 8 seconds.",
  };
};

export class ConnectionManager {
  private readonly socketService = new SocketService();
  private callbacks: ConnectionManagerCallbacks = {};
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private lastHeartbeat: number | null = null;
  private pendingActions = new Map<string, ReturnType<typeof setTimeout>>();
  private completedActionIds = new Set<string>();
  private completedActionOrder: string[] = [];
  private targetUrl: string | null = null;
  private authClientId: string | null = null;
  private authDeviceId: string | null = null;
  private appStateSubscription: NativeEventSubscription | null = null;
  private currentAppState: AppStateStatus = AppState.currentState;
  private reconnectSuspended = false;
  private actionNonce = 0;

  constructor() {
    this.socketService.setCallbacks({
      onConnected: () => this.handleSocketConnected(),
      onDisconnected: () => this.handleSocketDisconnected(),
      onError: () => this.handleSocketError("WebSocket connection error."),
      onMessage: (data) => this.handleSocketMessage(data),
    });
  }

  setCallbacks(callbacks: ConnectionManagerCallbacks): void {
    this.callbacks = callbacks;
  }

  initializeLifecycleHandling(): void {
    if (this.appStateSubscription) {
      return;
    }

    this.appStateSubscription = AppState.addEventListener(
      "change",
      this.handleAppStateChange,
    );
  }

  connect(rawUrl: string): void {
    const trimmed = rawUrl.trim();
    if (trimmed.length === 0) {
      this.emitError("IP address is required.");
      this.setState(ConnectionState.ERROR);
      return;
    }

    this.targetUrl = toWsUrl(trimmed);
    this.reconnectAttempt = 0;
    this.reconnectSuspended = false;
    this.clearReconnectTimer();
    this.clearPendingActions();
    this.openSocket(ConnectionState.CONNECTING);
  }

  disconnect(): void {
    this.reconnectSuspended = true;
    this.clearReconnectTimer();
    this.clearHeartbeatTimer();
    this.clearPendingActions();
    this.targetUrl = null;
    this.socketService.disconnect();
    this.setState(ConnectionState.DISCONNECTED);
  }

  async authenticate(clientId: string): Promise<boolean> {
    const trimmed = clientId.trim();
    if (trimmed.length === 0) {
      this.emitError("Client ID is required.");
      return false;
    }

    if (this.state !== ConnectionState.CONNECTED) {
      this.emitError("WebSocket is not connected.");
      return false;
    }

    try {
      this.authClientId = trimmed;
      this.authDeviceId = await getOrCreateDeviceId();
      return this.send({
        type: "AUTH",
        payload: {
          clientId: trimmed,
          deviceId: this.authDeviceId,
          protocolVersion: "1.0",
        },
      });
    } catch {
      this.emitError("Failed to load device identity.");
      return false;
    }
  }

  sendAction(action: Step): string | null {
    const actionId = this.buildActionId();
    const payload = {
      id: actionId,
      steps: [action],
    };
    const payloadValidationError = validateExecuteActionPayload(payload);
    if (payloadValidationError) {
      this.emitError(`Invalid EXECUTE_ACTION payload: ${payloadValidationError}`);
      return null;
    }

    const sent = this.send({
      type: "EXECUTE_ACTION",
      timestamp: Date.now(),
      payload,
    });

    if (!sent) {
      return null;
    }

    const timeout = setTimeout(() => {
      if (!this.removePendingAction(actionId)) {
        return;
      }
      this.markActionCompleted(actionId);
      this.callbacks.onActionTimeout?.(actionId);
      this.callbacks.onActionResult?.(buildActionTimeoutResult(actionId));
      this.emitError(`Action ${actionId} timed out after 8 seconds.`);
    }, ACTION_TIMEOUT_MS);

    this.pendingActions.set(actionId, timeout);

    return actionId;
  }

  getLastHeartbeat(): number | null {
    return this.lastHeartbeat;
  }

  getState(): ConnectionState {
    return this.state;
  }

  getReconnectAttempt(): number {
    return this.reconnectAttempt;
  }

  private openSocket(nextState: ConnectionState): void {
    if (!this.targetUrl) {
      this.emitError("Missing target WebSocket URL.");
      this.setState(ConnectionState.ERROR);
      return;
    }

    this.setState(nextState);
    this.socketService.connect(this.targetUrl);
  }

  private send(message: ClientEnvelopeMessage): boolean {
    if (message.type === "EXECUTE_ACTION") {
      const payloadValidationError = validateExecuteActionPayload(message.payload);
      if (payloadValidationError) {
        this.emitError(`Invalid EXECUTE_ACTION payload: ${payloadValidationError}`);
        return false;
      }
    }

    const sent = this.socketService.send(message);
    if (!sent) {
      this.emitError("WebSocket is not connected.");
    }
    return sent;
  }

  private handleSocketConnected(): void {
    this.reconnectAttempt = 0;
    this.setState(ConnectionState.CONNECTED);
    this.callbacks.onConnected?.();
    this.markHeartbeatNow();
    this.startHeartbeatTimer();

    if (this.authClientId) {
      void this.ensureAuthState().then((ready) => {
        if (!ready) {
          return;
        }

        const clientId = this.authClientId;
        const deviceId = this.authDeviceId;
        if (!clientId || !deviceId) {
          return;
        }

        this.send({
          type: "AUTH",
          payload: {
            clientId,
            deviceId,
            protocolVersion: "1.0",
          },
        });
      });
    }
  }

  private handleSocketDisconnected(): void {
    this.callbacks.onDisconnected?.();
    this.clearHeartbeatTimer();

    if (this.reconnectSuspended) {
      this.setState(ConnectionState.DISCONNECTED);
      return;
    }

    this.scheduleReconnect();
  }

  private handleSocketError(message: string): void {
    this.emitError(message);
    this.setState(ConnectionState.ERROR);
  }

  private handleSocketMessage(data: unknown): void {

    if (typeof data !== "string") {
      this.emitError("Unsupported message format from server.");
      return;
    }

    const parsed = this.parseJson(data);
    if (!parsed) {
      return;
    }

    if (isRecord(parsed) && parsed.type === "PING") {
      this.markHeartbeatNow();
      this.send({
        type: "PONG",
        timestamp: Date.now(),
      });
      return;
    }


    if (isRecord(parsed) && parsed.type === "AUTH_SUCCESS") {
      this.callbacks.onAuthSuccess?.();
      return;
    }

    if (isRecord(parsed) && parsed.type === "AUTH_FAILURE") {
      this.callbacks.onAuthFailure?.();
      return;
    }

    if (isRecord(parsed) && parsed.type === "ERROR") {
      const payloadMessage =
        isRecord(parsed.payload) && typeof parsed.payload.message === "string"
          ? parsed.payload.message
          : null;
      const directMessage =
        typeof parsed.message === "string" ? parsed.message : null;
      const serverError = payloadMessage ?? directMessage ?? "Server error.";
      if (this.isAuthError(serverError)) {
        this.callbacks.onAuthFailure?.();
        return;
      }
      this.emitError(serverError);
      return;
    }

    if (isRecord(parsed) && parsed.type === "ACTION_RESULT") {
      const payload = isRecord(parsed.payload) ? parsed.payload : null;
      if (!payload) {
        this.emitError("Invalid ACTION_RESULT payload.");
        return;
      }
      const result = this.extractActionResult(payload);
      if (!result) {
        this.emitError("Invalid ACTION_RESULT payload.");
        return;
      }
      if (this.completedActionIds.has(result.id)) {
        return;
      }
      const cleared = this.removePendingAction(result.id);
      if (!cleared) {
        this.emitError(`Unknown ACTION_RESULT id: ${result.id}`);
        return;
      }
      this.markActionCompleted(result.id);
      this.callbacks.onActionResult?.(result);
      return;
    }

    this.emitError("Invalid server message shape.");
  }

  private removePendingAction(actionId: string): boolean {
    const timeout = this.pendingActions.get(actionId);
    if (!timeout) {
      return false;
    }
    clearTimeout(timeout);
    this.pendingActions.delete(actionId);
    return true;
  }

  private clearPendingActions(): void {
    for (const timeout of this.pendingActions.values()) {
      clearTimeout(timeout);
    }
    this.pendingActions.clear();
  }

  private startHeartbeatTimer(): void {
    this.clearHeartbeatTimer();

    this.heartbeatTimer = setInterval(() => {
      if (!this.lastHeartbeat) {
        return;
      }

      const isStale = Date.now() - this.lastHeartbeat > HEARTBEAT_TIMEOUT_MS;
      if (!isStale) {
        return;
      }

      this.emitError("Heartbeat timeout. Reconnecting.");
      this.clearHeartbeatTimer();
      this.socketService.disconnect(4000, "Heartbeat timeout");
      this.scheduleReconnect();
    }, HEARTBEAT_CHECK_INTERVAL_MS);
  }

  private clearHeartbeatTimer(): void {
    if (!this.heartbeatTimer) {
      return;
    }
    clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  private markHeartbeatNow(): void {
    this.lastHeartbeat = Date.now();
    this.callbacks.onHeartbeat?.(this.lastHeartbeat);
  }

  private scheduleReconnect(): void {
    if (!this.targetUrl || this.reconnectSuspended) {
      this.setState(ConnectionState.DISCONNECTED);
      return;
    }

    if (this.reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
      this.emitError("Reconnect failed after 10 attempts.");
      this.setState(ConnectionState.ERROR);
      return;
    }

    this.reconnectAttempt += 1;
    const delay = Math.min(
      1_000 * 2 ** (this.reconnectAttempt - 1),
      MAX_RECONNECT_DELAY_MS,
    );

    this.setState(ConnectionState.RECONNECTING);
    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => {
      this.openSocket(ConnectionState.RECONNECTING);
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (!this.reconnectTimer) {
      return;
    }
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private setState(next: ConnectionState): void {
    if (!this.isValidStateTransition(this.state, next)) {
      this.emitError(`Illegal state transition: ${this.state} -> ${next}`);
      return;
    }
    this.state = next;
    this.callbacks.onStateChange?.(next, this.reconnectAttempt);
  }

  private parseJson(raw: string): unknown | null {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      this.emitError("Failed to parse server message JSON.");
      return null;
    }
  }

  private extractActionResult(payload: Record<string, unknown>): ExecutionResult | null {
    if (
      typeof payload.id !== "string" ||
      (payload.status !== "success" && payload.status !== "error") ||
      typeof payload.executionTime !== "number"
    ) {
      return null;
    }

    const error = typeof payload.error === "string" ? payload.error : undefined;

    return {
      id: payload.id,
      status: payload.status,
      executionTime: payload.executionTime,
      error,
    };
  }

  private emitError(message: string): void {
    this.callbacks.onError?.(message);
  }

  private async ensureAuthState(): Promise<boolean> {
    if (!this.authClientId) {
      return false;
    }

    if (this.state !== ConnectionState.CONNECTED) {
      return false;
    }

    if (this.authDeviceId) {
      return true;
    }

    try {
      this.authDeviceId = await getOrCreateDeviceId();
      return true;
    } catch {
      this.emitError("Failed to load device identity.");
      return false;
    }
  }

  private isAuthError(message: string): boolean {
    const normalized = message.toLowerCase();
    return (
      normalized.includes("auth") ||
      normalized.includes("unauthorized") ||
      normalized.includes("not authorized")
    );
  }

  private buildActionId(): string {
    this.actionNonce += 1;
    return `${Date.now()}-${this.actionNonce}`;
  }

  private markActionCompleted(actionId: string): void {
    this.completedActionIds.add(actionId);
    this.completedActionOrder.push(actionId);

    if (this.completedActionOrder.length <= 500) {
      return;
    }

    const oldest = this.completedActionOrder.shift();
    if (oldest) {
      this.completedActionIds.delete(oldest);
    }
  }

  private isValidStateTransition(
    current: ConnectionState,
    next: ConnectionState,
  ): boolean {
    if (current === next) {
      return true;
    }

    switch (current) {
      case ConnectionState.DISCONNECTED:
        return next === ConnectionState.CONNECTING || next === ConnectionState.ERROR;
      case ConnectionState.CONNECTING:
        return (
          next === ConnectionState.CONNECTED ||
          next === ConnectionState.RECONNECTING ||
          next === ConnectionState.DISCONNECTED ||
          next === ConnectionState.ERROR
        );
      case ConnectionState.CONNECTED:
        return (
          next === ConnectionState.RECONNECTING ||
          next === ConnectionState.DISCONNECTED ||
          next === ConnectionState.ERROR
        );
      case ConnectionState.RECONNECTING:
        return (
          next === ConnectionState.RECONNECTING ||
          next === ConnectionState.CONNECTED ||
          next === ConnectionState.DISCONNECTED ||
          next === ConnectionState.ERROR
        );
      case ConnectionState.ERROR:
        return (
          next === ConnectionState.CONNECTING ||
          next === ConnectionState.RECONNECTING ||
          next === ConnectionState.DISCONNECTED
        );
      default:
        return false;
    }
  }

  private handleAppStateChange = (nextState: AppStateStatus): void => {
    const wasActive = this.currentAppState === "active";
    const isActive = nextState === "active";
    this.currentAppState = nextState;

    if (wasActive && !isActive) {
      this.reconnectSuspended = true;
      this.clearReconnectTimer();
      this.clearHeartbeatTimer();
      this.clearPendingActions();
      this.socketService.disconnect();
      this.setState(ConnectionState.DISCONNECTED);
      return;
    }

    if (!wasActive && isActive && this.targetUrl) {
      this.reconnectSuspended = false;
      this.reconnectAttempt = 0;
      this.openSocket(ConnectionState.CONNECTING);
    }
  };
}

export const connectionManager = new ConnectionManager();
