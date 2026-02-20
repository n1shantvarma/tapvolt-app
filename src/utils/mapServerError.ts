type MappedServerError = {
  code: string;
  message: string;
};

const FALLBACK_MESSAGE = "Unexpected desktop error.";

const SERVER_ERROR_MESSAGES: Record<string, string> = {
  MAX_STEPS_EXCEEDED: "This macro is too large.",
  MAX_TEXT_LENGTH_EXCEEDED: "Text input exceeds allowed size.",
  COMMAND_EXECUTION_DISABLED: "Terminal commands are disabled on the desktop.",
  DEVICE_NOT_AUTHORIZED: "This device is not authorized. Please re-pair.",
};

export function mapServerError(code: string): MappedServerError {
  const normalizedCode = code.trim().toUpperCase();
  const message = SERVER_ERROR_MESSAGES[normalizedCode] ?? FALLBACK_MESSAGE;

  return {
    code: normalizedCode.length > 0 ? normalizedCode : "UNKNOWN_SERVER_ERROR",
    message,
  };
}
