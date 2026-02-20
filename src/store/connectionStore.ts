import { create } from "zustand";

import { PROFILES, type Profile } from "../config/profiles";
import {
  ConnectionState,
  connectionManager,
  type ExecutionResult,
} from "../services/connectionManager";
import {
  loadActiveProfile,
  loadIp,
  saveActiveProfile,
  saveIp,
} from "../services/persistence";
import type { Step } from "../types/protocol";
import { getOrCreateDeviceId } from "../utils/deviceId";
import { mapServerError } from "../utils/mapServerError";

type ActionStatus = "pending" | "success" | "failed";
type ErrorCode = "DEVICE_NOT_AUTHORIZED" | "GENERIC_CONNECTION_ERROR";

type ConnectionError = {
  code: ErrorCode;
  message: string;
};

const DEVICE_NOT_AUTHORIZED_ERROR: ConnectionError = {
  code: "DEVICE_NOT_AUTHORIZED",
  message: "This device is not authorized on desktop. Please re-pair.",
};

const toConnectionError = (message: string): ConnectionError => ({
  code: "GENERIC_CONNECTION_ERROR",
  message,
});

const toStoreError = (error: { code: string; message: string }): ConnectionError => {
  if (error.code === "DEVICE_NOT_AUTHORIZED") {
    return {
      code: "DEVICE_NOT_AUTHORIZED",
      message: "This device is not authorized. Please re-pair.",
    };
  }

  const mapped = mapServerError(error.code);

  return {
    code: "GENERIC_CONNECTION_ERROR",
    message:
      mapped.message === "Unexpected desktop error." ? error.message : mapped.message,
  };
};

type ConnectionStore = {
  ipAddress: string;
  activeProfileId: string;
  isHydrated: boolean;
  connectionState: ConnectionState;
  reconnectAttempt: number;
  isConnecting: boolean;
  isConnected: boolean;
  isAuthenticated: boolean;
  lastResult: ExecutionResult | null;
  lastHeartbeat: number | null;
  actionStatuses: Record<string, ActionStatus>;
  error: ConnectionError | null;
  warning: string | null;
  setIp: (ip: string) => void;
  setActiveProfile: (profileId: string) => void;
  hydrate: () => Promise<void>;
  getActiveProfile: () => Profile;
  connect: () => void;
  authenticate: () => Promise<void>;
  sendAction: (action: Step) => string | null;
  sendTestAction: () => void;
  disconnect: () => void;
};

export const useConnectionStore = create<ConnectionStore>((set, get) => {
  return {
    ipAddress: "",
    activeProfileId: PROFILES[0]?.id ?? "",
    isHydrated: false,
    connectionState: ConnectionState.DISCONNECTED,
    reconnectAttempt: 0,
    isConnecting: false,
    isConnected: false,
    isAuthenticated: false,
    lastResult: null,
    lastHeartbeat: null,
    actionStatuses: {},
    error: null,
    warning: null,
    setIp: (ip) => {
      set({
        ipAddress: ip,
        error: null,
      });
      void saveIp(ip);
    },
    setActiveProfile: (profileId) => {
      const profileExists = PROFILES.some((profile) => profile.id === profileId);
      if (!profileExists) {
        return;
      }
      set({ activeProfileId: profileId });
      void saveActiveProfile(profileId);
    },
    hydrate: async () => {
      try {
        const [ipAddress, activeProfileId] = await Promise.all([
          loadIp(),
          loadActiveProfile(),
        ]);
        await getOrCreateDeviceId();

        set((state) => {
          const nextState: Pick<
            ConnectionStore,
            "ipAddress" | "activeProfileId" | "isHydrated"
          > = {
            ipAddress: ipAddress ?? state.ipAddress,
            activeProfileId: state.activeProfileId,
            isHydrated: true,
          };

          if (activeProfileId !== null) {
            const profileExists = PROFILES.some(
              (profile) => profile.id === activeProfileId
            );
            if (profileExists) {
              nextState.activeProfileId = activeProfileId;
            }
          }

          return nextState;
        });
      } catch {
        set({ isHydrated: true });
      }
    },
    getActiveProfile: () => {
      const activeProfileId = get().activeProfileId;
      const profile = PROFILES.find((item) => item.id === activeProfileId);
      if (profile) {
        return profile;
      }

      return PROFILES[0];
    },
    connect: () => {
      const ip = get().ipAddress.trim();

      if (ip.length === 0) {
        set({
          connectionState: ConnectionState.ERROR,
          reconnectAttempt: 0,
          isConnecting: false,
          isAuthenticated: false,
          error: toConnectionError("IP address is required."),
        });
        return;
      }

      connectionManager.connect(ip);
      set({
        connectionState: ConnectionState.CONNECTING,
        reconnectAttempt: 0,
        isConnecting: true,
        isAuthenticated: false,
        actionStatuses: {},
        lastHeartbeat: null,
        error: null,
        warning: null,
      });
    },
    authenticate: async () => {
      set({ error: null });
      await connectionManager.authenticate("tapvolt-mobile");
      set({
        connectionState: connectionManager.getState(),
        reconnectAttempt: connectionManager.getReconnectAttempt(),
        isConnected: connectionManager.getState() === ConnectionState.CONNECTED,
        isConnecting: false,
        isAuthenticated: get().isAuthenticated,
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
        isConnecting: false,
        isConnected: false,
        isAuthenticated: false,
        lastResult: null,
        lastHeartbeat: null,
        actionStatuses: {},
        error: null,
        warning: null,
      });
    },
  };
});

const connectionCallbacks: Parameters<typeof connectionManager.setCallbacks>[0] = {
  onStateChange: (connectionState, reconnectAttempt) => {
    useConnectionStore.setState((state) => ({
      connectionState,
      reconnectAttempt,
      isAuthenticated:
        connectionState === ConnectionState.CONNECTED ? state.isAuthenticated : false,
      error: connectionState === ConnectionState.ERROR ? state.error : null,
      warning: connectionState === ConnectionState.DISCONNECTED ? null : state.warning,
    }));
  },
  onConnected: () => {
    useConnectionStore.setState({
      isConnected: true,
      isConnecting: false,
      error: null,
      warning: null,
    });
  },
  onDisconnected: () => {
    useConnectionStore.setState({
      isConnected: false,
      isAuthenticated: false,
      isConnecting: false,
      warning: null,
    });
  },
  onAuthSuccess: () => {
    useConnectionStore.setState({
      connectionState: ConnectionState.CONNECTED,
      isConnected: true,
      isAuthenticated: true,
      error: null,
    });
  },
  onAuthFailure: () => {
    useConnectionStore.setState({
      isAuthenticated: false,
      error: DEVICE_NOT_AUTHORIZED_ERROR,
    });
  },
  onActionResult: (result) => {
    useConnectionStore.setState((state) => {
      const actionStatuses = { ...state.actionStatuses };
      actionStatuses[result.id] = result.status === "success" ? "success" : "failed";

      return {
        connectionState: connectionManager.getState(),
        isConnected: connectionManager.getState() === ConnectionState.CONNECTED,
      isAuthenticated: state.isAuthenticated,
      actionStatuses,
      lastHeartbeat: connectionManager.getLastHeartbeat(),
      lastResult: result,
        error:
          result.status === "success"
            ? null
            : result.error
              ? toConnectionError(result.error)
              : state.error,
        warning: state.warning,
      };
    });
  },
  onActionTimeout: (actionId) => {
    useConnectionStore.setState((state) => ({
      actionStatuses: {
        ...state.actionStatuses,
        [actionId]: "failed",
      },
    }));
  },
  onHeartbeat: (timestamp) => {
    useConnectionStore.setState({
      lastHeartbeat: timestamp,
    });
  },
  onError: (error) => {
    useConnectionStore.setState((state) => ({
      connectionState: connectionManager.getState(),
      reconnectAttempt: connectionManager.getReconnectAttempt(),
      isConnected: connectionManager.getState() === ConnectionState.CONNECTED,
      isAuthenticated:
        connectionManager.getState() === ConnectionState.CONNECTED
          ? useConnectionStore.getState().isAuthenticated
          : false,
      isConnecting:
        state.connectionState === ConnectionState.CONNECTING
          ? false
          : state.isConnecting,
      error: toStoreError(error),
    }));
  },
  onWarning: (warning) => {
    useConnectionStore.setState({
      warning,
    });
  },
};

connectionManager.setCallbacks(connectionCallbacks);
connectionManager.initializeLifecycleHandling();
