import {
  buildTrustedReconnectPayload,
  parsePairingQrPayload,
  validateTrustedDevice,
} from "./pairingManager";

describe("pairingManager", () => {
  it("accepts valid QR payload", () => {
    const parsed = parsePairingQrPayload(
      JSON.stringify({
        ip: "192.168.1.20",
        port: 8080,
        pairingToken: "abcdef1234567890",
      }),
    );

    expect(parsed).toEqual({
      ip: "192.168.1.20",
      port: 8080,
      pairingToken: "abcdef1234567890",
    });
  });

  it("rejects expired-like or short token payload", () => {
    expect(() =>
      parsePairingQrPayload(
        JSON.stringify({
          ip: "192.168.1.20",
          port: 8080,
          pairingToken: "short",
        }),
      ),
    ).toThrow("invalid pairing token");
  });

  it("rejects reused token semantics by requiring new token value", () => {
    const first = parsePairingQrPayload(
      JSON.stringify({
        ip: "192.168.1.20",
        port: 8080,
        pairingToken: "token-value-12345",
      }),
    );

    const second = parsePairingQrPayload(
      JSON.stringify({
        ip: "192.168.1.20",
        port: 8080,
        pairingToken: "token-value-54321",
      }),
    );

    expect(first.pairingToken).not.toBe(second.pairingToken);
  });

  it("rejects untrusted device records", () => {
    const trusted = validateTrustedDevice({
      deviceId: "device-a",
      serverUrl: "ws://127.0.0.1:8080",
      trusted: true,
      pairedAt: Date.now(),
    });

    const untrusted = validateTrustedDevice({
      deviceId: "device-a",
      serverUrl: "ws://127.0.0.1:8080",
      trusted: false,
      pairedAt: Date.now(),
    });

    expect(trusted).not.toBeNull();
    expect(untrusted).toBeNull();
  });

  it("builds trusted reconnect payload", () => {
    const payload = buildTrustedReconnectPayload("device-x");
    expect(payload).toEqual({
      deviceId: "device-x",
      protocolVersion: "2.0",
    });
  });
});
