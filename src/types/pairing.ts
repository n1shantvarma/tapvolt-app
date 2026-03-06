export const PAIRING_TOKEN_TTL_MS = 5 * 60 * 1000;

export type PairingQrPayload = {
  ip: string;
  port: number;
  pairingToken: string;
};

export type StoredTrustedDevice = {
  deviceId: string;
  serverUrl: string;
  trusted: true;
  pairedAt: number;
};

export type PairRequestPayload = {
  deviceId: string;
  pairingToken: string;
  protocolVersion: "2.0";
};

export type TrustedReconnectPayload = {
  deviceId: string;
  protocolVersion: "2.0";
};

export type PairSuccessPayload = {
  sessionNonce: string;
};

export type TrustedReconnectSuccessPayload = {
  sessionNonce: string;
};
