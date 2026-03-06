import { create } from "zustand";

import { PROFILES, type Profile } from "../config/profiles";
import {
  parsePairingQrPayload,
  validateTrustedDevice,
} from "../security/pairingManager";
import {
  ConnectionState,
  connectionManager,
  type ExecutionResult,
} from "../services/connectionManager";
import {
  clearTrustedDevice,
  loadActiveProfile,
  loadIp,
  loadTrustedDevice,
  saveActiveProfile,
  saveIp,
  saveTrustedDevice,
} from "../services/persistence";
import type { PairingQrPayload, StoredTrustedDevice } from "../types/pairing";
import type { Step } from "../types/protocol";
import { getOrCreateDeviceId } from "../utils/deviceId";
import { mapServerError } from "../utils/mapServerError";

type ActionStatus = "pending" | "success" | "failed";
type ErrorCode =
  | "DEVICE_NOT_AUTHORIZED"
  | "GENERIC_CONNECTION_ERROR"
  | "PAIRING_REQUIRED";

type ConnectionError = {
  code: ErrorCode;
  message: string;
};

const DEVICE_NOT_AUTHORIZED_ERROR: ConnectionError = {
  code: "DEVICE_NOT_AUTHORIZED",
  message: "This device is not authorized on desktop. Please re-pair.",
};

const PAIRING_REQUIRED_ERROR: ConnectionError = {
  code: "PAIRING_REQUIRED",
  message: "Pairing required. Scan desktop QR to continue.",
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

  if (error.code === "PAIRING_REQUIRED") {
    return PAIRING_REQUIRED_ERROR;
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
  trustedDevice: StoredTrustedDevice | null;
  setIp: (ip: string) => void;
  setActiveProfile: (profileId: string) => void;
  hydrate: () => Promise<void>;
  getActiveProfile: () => Profile;
  connect: () => void;
  pairFromQrPayload: (rawQrPayload: string) => Promise<void>;
  sendAction: (action: Step) => string | null;
  sendTestAction: () => void;
  disconnect: () => void;
  clearTrustedPairing: () => Promise<void>;
};

const toPairingUrl = (payload: PairingQrPayload): string => {
  return `ws://${payload.ip}:${payload.port}`;
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
    trustedDevice: null,
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
        const [ipAddress, activeProfileId, trustedDeviceRaw] = await Promise.all([
          loadIp(),
          loadActiveProfile(),
          loadTrustedDevice(),
        ]);
        const deviceId = await getOrCreateDeviceId();
        const trustedDevice = validateTrustedDevice(trustedDeviceRaw);

        set((state) => {
          const nextState: Pick<
            ConnectionStore,
            "ipAddress" | "activeProfileId" | "isHydrated" | "trustedDevice"
          > = {
            ipAddress: ipAddress ?? state.ipAddress,
            activeProfileId: state.activeProfileId,
            isHydrated: true,
            trustedDevice:
              trustedDevice && trustedDevice.deviceId === deviceId ? trustedDevice : null,
          };

          if (activeProfileId !== null) {
            const profileExists = PROFILES.some(
              (profile) => profile.id === activeProfileId
            );
            if (profileExists) {
              nextState.activeProfileId = activeProfileId;
            }
          }

          if (trustedDevice && trustedDevice.deviceId === deviceId) {
            nextState.ipAddress = trustedDevice.serverUrl;
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
      const trustedDevice = get().trustedDevice;

      if (trustedDevice && trustedDevice.trusted) {
        connectionManager.connect(trustedDevice.serverUrl);
        set({
          ipAddress: trustedDevice.serverUrl,
          connectionState: ConnectionState.CONNECTING,
          reconnectAttempt: 0,
          isConnecting: true,
          isAuthenticated: false,
          actionStatuses: {},
          lastHeartbeat: null,
          error: null,
          warning: null,
        });
        return;
      }

      set({
        connectionState: ConnectionState.ERROR,
        reconnectAttempt: 0,
        isConnecting: false,
        isAuthenticated: false,
        error: PAIRING_REQUIRED_ERROR,
      });
    },
    pairFromQrPayload: async (rawQrPayload) => {
      try {
        const qrPayload = parsePairingQrPayload(rawQrPayload);
        const deviceId = await getOrCreateDeviceId();
        const serverUrl = toPairingUrl(qrPayload);

        connectionManager.connectWithPairingQr(qrPayload);
        set({
          ipAddress: serverUrl,
          connectionState: ConnectionState.CONNECTING,
          reconnectAttempt: 0,
          isConnecting: true,
          isAuthenticated: false,
          actionStatuses: {},
          lastHeartbeat: null,
          error: null,
          warning: null,
          trustedDevice: {
            deviceId,
            serverUrl,
            trusted: true,
            pairedAt: Date.now(),
          },
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Invalid QR payload.";
        set({ error: toConnectionError(message) });
      }
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
    clearTrustedPairing: async () => {
      await clearTrustedDevice();
      set({
        trustedDevice: null,
        isAuthenticated: false,
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
    const state = useConnectionStore.getState();
    const trustedDevice = state.trustedDevice;

    if (trustedDevice) {
      void saveTrustedDevice(trustedDevice);
      void saveIp(trustedDevice.serverUrl);
    }

    useConnectionStore.setState({
      connectionState: ConnectionState.CONNECTED,
      isConnected: true,
      isAuthenticated: true,
      error: null,
    });
  },
  onAuthFailure: () => {
    void clearTrustedDevice();
    useConnectionStore.setState({
      isAuthenticated: false,
      trustedDevice: null,
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
