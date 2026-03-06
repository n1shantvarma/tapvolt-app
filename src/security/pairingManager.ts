import type {
  PairingQrPayload,
  StoredTrustedDevice,
  TrustedReconnectPayload,
} from "../types/pairing";

const WS_PROTOCOL_PREFIX = "ws://";
const WSS_PROTOCOL_PREFIX = "wss://";

export const PAIRING_ERRORS = {
  INVALID_QR_JSON: "Invalid QR payload JSON.",
  INVALID_QR_SHAPE: "QR payload must include ip, port and pairingToken.",
  INVALID_IP: "QR payload has invalid IP or host.",
  INVALID_PORT: "QR payload has invalid port.",
  INVALID_TOKEN: "QR payload has invalid pairing token.",
  TRUSTED_DEVICE_MISSING: "Trusted device record is missing required fields.",
  TRUSTED_DEVICE_UNTRUSTED: "Trusted device record is not marked as trusted.",
} as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isValidHost = (value: string): boolean => {
  const trimmed = value.trim();
  return trimmed.length > 0 && !trimmed.includes(" ");
};

const normalizeUrl = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.startsWith(WS_PROTOCOL_PREFIX) || trimmed.startsWith(WSS_PROTOCOL_PREFIX)) {
    return trimmed;
  }

  return `${WS_PROTOCOL_PREFIX}${trimmed}`;
};

export const buildServerUrl = (ip: string, port: number): string => {
  const normalizedIp = ip.trim();
  return `${WS_PROTOCOL_PREFIX}${normalizedIp}:${port}`;
};

export const parsePairingQrPayload = (raw: string): PairingQrPayload => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error(PAIRING_ERRORS.INVALID_QR_JSON);
  }

  if (!isRecord(parsed)) {
    throw new Error(PAIRING_ERRORS.INVALID_QR_SHAPE);
  }

  const ip = parsed.ip;
  const port = parsed.port;
  const pairingToken = parsed.pairingToken;

  if (typeof ip !== "string" || typeof port !== "number" || typeof pairingToken !== "string") {
    throw new Error(PAIRING_ERRORS.INVALID_QR_SHAPE);
  }

  if (!isValidHost(ip)) {
    throw new Error(PAIRING_ERRORS.INVALID_IP);
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(PAIRING_ERRORS.INVALID_PORT);
  }

  if (pairingToken.trim().length < 16) {
    throw new Error(PAIRING_ERRORS.INVALID_TOKEN);
  }

  return {
    ip: ip.trim(),
    port,
    pairingToken: pairingToken.trim(),
  };
};

export const validateTrustedDevice = (raw: unknown): StoredTrustedDevice | null => {
  if (!isRecord(raw)) {
    return null;
  }

  if (
    typeof raw.deviceId !== "string" ||
    raw.deviceId.trim().length === 0 ||
    typeof raw.serverUrl !== "string" ||
    raw.serverUrl.trim().length === 0 ||
    raw.trusted !== true ||
    typeof raw.pairedAt !== "number"
  ) {
    return null;
  }

  return {
    deviceId: raw.deviceId.trim(),
    serverUrl: normalizeUrl(raw.serverUrl),
    trusted: true,
    pairedAt: raw.pairedAt,
  };
};

export const buildTrustedReconnectPayload = (
  deviceId: string,
): TrustedReconnectPayload => {
  return {
    deviceId,
    protocolVersion: "2.0",
  };
};

