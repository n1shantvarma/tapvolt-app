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

export type AuthMessage = {
  type: "AUTH";
  timestamp?: number;
  payload: {
    clientId: string;
    deviceId: string;
    protocolVersion: "1.0";
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

export type ClientMessage = AuthMessage | ExecuteActionMessage;

export type AuthSuccessMessage = {
  type: "AUTH_SUCCESS";
  timestamp?: number;
};

export type AuthFailureMessage = {
  type: "AUTH_FAILURE";
  timestamp?: number;
  message?: string;
  payload?: {
    message?: string;
  };
};

export type ErrorMessage = {
  type: "ERROR";
  timestamp?: number;
  message: string;
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
  | AuthSuccessMessage
  | AuthFailureMessage
  | ErrorMessage
  | ActionResultMessage;

export type SocketMessage = ClientMessage | ServerMessage;
