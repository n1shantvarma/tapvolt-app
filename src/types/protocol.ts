export type StepType = "shortcut" | "text" | "delay" | "key" | "command";

export type ShortcutStep = {
  type: "shortcut";
  keys: string[];
};

export type TextStep = {
  type: "text";
  value: string;
};

export type DelayStep = {
  type: "delay";
  duration: number;
};

export type KeyStep = {
  type: "key";
  key: string;
};

export type CommandStep = {
  type: "command";
  command: string;
};

export type Step = ShortcutStep | TextStep | DelayStep | KeyStep | CommandStep;

export type PairRequestMessage = {
  type: "PAIR_REQUEST";
  timestamp?: number;
  payload: {
    deviceId: string;
    pairingToken: string;
    protocolVersion: "2.0";
  };
};

export type TrustedReconnectMessage = {
  type: "TRUSTED_RECONNECT";
  timestamp?: number;
  payload: {
    deviceId: string;
    protocolVersion: "2.0";
  };
};

export type ExecuteActionMessage = {
  type: "EXECUTE_ACTION";
  timestamp?: number;
  payload: {
    id: string;
    steps: Step[];
  };
};

export type PongMessage = {
  type: "PONG";
  timestamp: number;
};

export type ClientMessage =
  | PairRequestMessage
  | TrustedReconnectMessage
  | ExecuteActionMessage
  | PongMessage;

export type PairSuccessMessage = {
  type: "PAIR_SUCCESS";
  timestamp?: number;
  payload?: {
    sessionNonce?: string;
  };
};

export type TrustedReconnectSuccessMessage = {
  type: "TRUSTED_RECONNECT_SUCCESS";
  timestamp?: number;
  payload?: {
    sessionNonce?: string;
  };
};

export type EncryptedEnvelope = {
  iv: string;
  encryptedPayload: string;
};

export type ErrorMessage = {
  type: "ERROR";
  timestamp?: number;
  code?: string;
  message?: string;
  payload?: {
    code?: string;
    message?: string;
  };
};

export type ActionResultMessage = {
  type: "ACTION_RESULT";
  timestamp?: number;
  payload: {
    id: string;
    status: "success" | "error";
    executionTime: number;
    error?: string;
  };
};

export type ServerMessage =
  | PairSuccessMessage
  | TrustedReconnectSuccessMessage
  | ErrorMessage
  | ActionResultMessage;

export type SocketMessage = ClientMessage | ServerMessage | EncryptedEnvelope;
