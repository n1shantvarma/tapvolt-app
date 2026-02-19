import { create } from "zustand";

import {
  ConnectionState,
  connectionManager,
  type ExecutionResult,
} from "../services/connectionManager";
import type { Step } from "../types/protocol";

type ActionStatus = "pending" | "success" | "failed";

type ConnectionStore = {
  ipAddress: string;
  connectionState: ConnectionState;
  reconnectAttempt: number;
  isConnected: boolean;
  isAuthenticated: boolean;
  lastResult: ExecutionResult | null;
  lastHeartbeat: number | null;
  actionStatuses: Record<string, ActionStatus>;
  error: string | null;
  setIp: (ip: string) => void;
  connect: () => void;
  authenticate: () => void;
  sendAction: (action: Step) => string | null;
  sendTestAction: () => void;
  disconnect: () => void;
};

export const useConnectionStore = create<ConnectionStore>((set, get) => {
  connectionManager.setCallbacks({
    onStateChange: (connectionState, reconnectAttempt) => {
      set((state) => ({
        connectionState,
        reconnectAttempt,
        isConnected: connectionState === ConnectionState.CONNECTED,
        isAuthenticated:
          connectionState === ConnectionState.CONNECTED
            ? state.isAuthenticated
            : false,
        error: connectionState === ConnectionState.ERROR ? state.error : null,
      }));
    },
    onAuthSuccess: () => {
      set({
        connectionState: ConnectionState.CONNECTED,
        isConnected: true,
        isAuthenticated: true,
        error: null,
      });
    },
    onActionResult: (result) => {
      set((state) => {
        const actionStatuses = { ...state.actionStatuses };
        actionStatuses[result.id] = result.status === "success" ? "success" : "failed";

        return {
          connectionState: connectionManager.getState(),
          isConnected: connectionManager.getState() === ConnectionState.CONNECTED,
          isAuthenticated: state.isAuthenticated,
          actionStatuses,
          lastHeartbeat: connectionManager.getLastHeartbeat(),
          lastResult: result,
          error: result.status === "success" ? null : result.error ?? state.error,
        };
      });
    },
    onActionTimeout: (actionId) => {
      set((state) => ({
        actionStatuses: {
          ...state.actionStatuses,
          [actionId]: "failed",
        },
      }));
    },
    onHeartbeat: (timestamp) => {
      set({
        lastHeartbeat: timestamp,
      });
    },
    onError: (message) => {
      set({
        connectionState: connectionManager.getState(),
        reconnectAttempt: connectionManager.getReconnectAttempt(),
        isConnected: connectionManager.getState() === ConnectionState.CONNECTED,
        isAuthenticated:
          connectionManager.getState() === ConnectionState.CONNECTED
            ? get().isAuthenticated
            : false,
        error: message,
      });
    },
  });

  connectionManager.initializeLifecycleHandling();

  return {
    ipAddress: "",
    connectionState: ConnectionState.DISCONNECTED,
    reconnectAttempt: 0,
    isConnected: false,
    isAuthenticated: false,
    lastResult: null,
    lastHeartbeat: null,
    actionStatuses: {},
    error: null,
    setIp: (ip) => {
      set({ ipAddress: ip });
    },
    connect: () => {
      const ip = get().ipAddress.trim();

      if (ip.length === 0) {
        set({
          connectionState: ConnectionState.ERROR,
          reconnectAttempt: 0,
          isConnected: false,
          isAuthenticated: false,
          error: "IP address is required.",
        });
        return;
      }

      connectionManager.connect(ip);
      set({
        connectionState: ConnectionState.CONNECTING,
        reconnectAttempt: 0,
        isConnected: false,
        isAuthenticated: false,
        actionStatuses: {},
        lastHeartbeat: null,
        error: null,
      });
    },
    authenticate: () => {
      connectionManager.authenticate("mobile-client");
      set({
        connectionState: connectionManager.getState(),
        reconnectAttempt: connectionManager.getReconnectAttempt(),
        isConnected: connectionManager.getState() === ConnectionState.CONNECTED,
        isAuthenticated: get().isAuthenticated,
        error: null,
      });
    },
    sendAction: (action) => {
      const actionId = connectionManager.sendAction(action);
      if (!actionId) {
        return null;
      }

      set((state) => ({
        actionStatuses: {
          ...state.actionStatuses,
          [actionId]: "pending",
        },
        error: null,
      }));

      return actionId;
    },
    sendTestAction: () => {
      const actionId = connectionManager.sendAction({
        type: "text",
        value: "Hello from Phone\n",
      });

      if (!actionId) {
        return;
      }

      set((state) => ({
        actionStatuses: {
          ...state.actionStatuses,
          [actionId]: "pending",
        },
        error: null,
      }));
    },
    disconnect: () => {
      connectionManager.disconnect();
      set({
        connectionState: ConnectionState.DISCONNECTED,
        reconnectAttempt: 0,
        isConnected: false,
        isAuthenticated: false,
        lastResult: null,
        lastHeartbeat: null,
        actionStatuses: {},
        error: null,
      });
    },
  };
});
